import { Group, Matrix4, Vector3 } from 'three';
import './ar-style.css';
import { M1ExperienceController } from './m1-experience-controller';
import { m1ButterflyPositions } from './m1-group-manifest';
import { MindARImageAdapter, type MindARThreeAnchor } from './mindar-image-adapter';
import { PoseStabilizer } from './pose-stabilizer';
import { m1Target } from './target-manifest';
import { disposePreparedWingVariant, prepareWingVariant, WingActor, type PreparedWingVariant } from './wing-actor';
import { randomWingVariantId, wingVariantUrl, type WingVariantId } from './wing-variants';

const arStage = document.querySelector<HTMLDivElement>('#ar-stage')!;
const startButton = document.querySelector<HTMLButtonElement>('#start-ar')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop-ar')!;
const statusValue = document.querySelector<HTMLSpanElement>('#tracking-status')!;
const statusDetail = document.querySelector<HTMLParagraphElement>('#tracking-detail')!;
const targetBadge = document.querySelector<HTMLSpanElement>('#target-badge')!;
const targetPreview = document.querySelector<HTMLImageElement>('#target-preview')!;

const STATUS_TEXT = {
  idle: ['尚未啟動', '正在自動啟動相機，準備尋找 M1 Target。'],
  loading: ['準備中', '正在請求相機權限並載入追蹤資料。'],
  scanning: ['掃描中', '請將 M1 圖像放入相機畫面。'],
  found: ['Target found', 'M1 已鎖定，翅膀正在跟隨 Target anchor。'],
  grace: ['短暫遺失', '保留最後位置，請把 M1 拉回畫面。'],
  lost: ['Target lost', '尚未偵測到 M1，保持相機對準圖像。'],
  insecure: ['需要 HTTPS', '手機請使用 https://區網IP:5173 開啟，HTTP 不允許相機。'],
  denied: ['相機不可用', '請在 HTTPS 或 localhost 開啟，並允許瀏覽器使用相機。'],
  error: ['啟動失敗', '追蹤資料或相機初始化失敗，請重新啟動。'],
} as const;

type TrackingState = keyof typeof STATUS_TEXT;
let trackingState: TrackingState = 'idle';
let trackingAdapter: MindARImageAdapter | undefined;
let anchor: MindARThreeAnchor | undefined;
let contentRoot: Group | undefined;
let actors: WingActor[] = [];
let loadedWingVariants = new Map<WingVariantId, PreparedWingVariant>();
let actorVariantIds: WingVariantId[] = [];
let lastVisibleMatrix = new Matrix4();
let hasVisibleMatrix = false;
let graceUntil = 0;
let startInFlight = false;
let lastPoseUpdateAt = 0;
let trackingGeneration = 0;
const poseStabilizer = new PoseStabilizer();
const cameraWorldPosition = new Vector3();
const cameraLocalPosition = new Vector3();
const experience = new M1ExperienceController({
  onRevealGroup: () => actors.forEach((item) => item.setRevealed(true)),
  onFadeOutGroup: () => actors.forEach((item) => item.setRevealed(false)),
  onLaunchGroup: () => actors.forEach((item) => item.setFlying(true)),
  onReset: () => actors.forEach((item) => {
    item.setFlying(false);
    item.setInteraction(false);
    item.setRevealed(false);
  }),
});

function setTrackingState(next: TrackingState): void {
  trackingState = next;
  const [title, detail] = STATUS_TEXT[next];
  statusValue.textContent = title;
  statusDetail.textContent = detail;
  targetBadge.textContent = next === 'found' ? 'M1 / TRACKING' : 'M1 / READY';
  document.body.dataset.trackingState = next;
}

function setButtons(): void {
  startButton.disabled = startInFlight || trackingState === 'loading' || trackingState === 'found' || trackingState === 'scanning' || trackingState === 'grace' || trackingState === 'lost';
  stopButton.disabled = !trackingAdapter || trackingState === 'idle';
}

function requestImmersiveFullscreen(): void {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  void document.documentElement.requestFullscreen().catch(() => {
    // Fullscreen API requires a user gesture on most mobile browsers; CSS viewport mode remains active.
  });
}

function retainAnchorDuringGrace(): void {
  if (!contentRoot || !hasVisibleMatrix) return;
  contentRoot.matrix.copy(lastVisibleMatrix);
  contentRoot.visible = true;
}

function captureFlightDirectionsFromCamera(): void {
  if (!contentRoot || !trackingAdapter || experience.getState() !== 'groupFlying') return;
  const runtime = trackingAdapter.runtime;
  runtime.scene.updateMatrixWorld(true);
  runtime.camera.getWorldPosition(cameraWorldPosition);
  contentRoot.worldToLocal(cameraLocalPosition.copy(cameraWorldPosition));
  actors.forEach((item) => item.setFlightCameraTarget(cameraLocalPosition));
}

function connectTrackingEvents(nextAnchor: MindARThreeAnchor): void {
  nextAnchor.onTargetFound = () => {
    graceUntil = 0;
    lastPoseUpdateAt = 0;
    poseStabilizer.reset(nextAnchor.group.matrix);
    if (contentRoot) {
      contentRoot.matrix.copy(nextAnchor.group.matrix);
      contentRoot.visible = true;
      lastVisibleMatrix.copy(contentRoot.matrix);
      hasVisibleMatrix = true;
    }
    experience.onTargetFound();
    setTrackingState('found');
    setButtons();
  };
  nextAnchor.onTargetLost = () => {
    graceUntil = performance.now() + 850;
    experience.onTargetLostGrace();
    retainAnchorDuringGrace();
    setTrackingState('grace');
    setButtons();
  };
  nextAnchor.onTargetUpdate = () => {
    if (!anchor || !contentRoot) return;
    if (anchor.visible) {
      const now = performance.now();
      const deltaSeconds = lastPoseUpdateAt === 0 ? 1 / 60 : (now - lastPoseUpdateAt) / 1000;
      lastPoseUpdateAt = now;
      contentRoot.matrix.copy(poseStabilizer.update(anchor.group.matrix, deltaSeconds));
      contentRoot.visible = true;
      lastVisibleMatrix.copy(contentRoot.matrix);
      hasVisibleMatrix = true;
      if (trackingState !== 'found') setTrackingState('found');
      return;
    }
    if (graceUntil > performance.now()) {
      retainAnchorDuringGrace();
    }
  };
}

async function setupTracking(): Promise<void> {
  const generation = ++trackingGeneration;
  const defaultWingVariant = await loadWingVariant(m1Target.group.wingVariant, generation);
  if (!defaultWingVariant) throw new Error('Default wing variant was not loaded.');
  trackingAdapter = new MindARImageAdapter(arStage, m1Target.imageTargetSrc);
  anchor = trackingAdapter.anchor;
  contentRoot = new Group();
  contentRoot.matrixAutoUpdate = false;
  contentRoot.visible = false;
  trackingAdapter.runtime.scene.add(contentRoot);
  actorVariantIds = m1ButterflyPositions
    .slice(0, m1Target.group.actorCount)
    .map(() => m1Target.group.variantPolicy === 'random' ? randomWingVariantId() : m1Target.group.wingVariant);
  actors = m1ButterflyPositions.slice(0, m1Target.group.actorCount).map((position, index) => {
    const item = new WingActor(index + 1, 0.075 + Math.random() * 0.065, 0.18);
    item.setHomePosition(position.x, position.y, m1Target.anchorOffset.z);
    item.setVariant(defaultWingVariant);
    item.setRevealed(false);
    contentRoot!.add(item.group);
    return item;
  });
  connectTrackingEvents(anchor);
  void loadAssignedWingVariants(actorVariantIds, generation);
}

async function loadWingVariant(id: WingVariantId, generation: number): Promise<PreparedWingVariant | undefined> {
  const cached = loadedWingVariants.get(id);
  if (cached) return cached;
  const variant = await prepareWingVariant(wingVariantUrl(id));
  if (generation !== trackingGeneration) {
    disposePreparedWingVariant(variant);
    return undefined;
  }
  loadedWingVariants.set(id, variant);
  return variant;
}

async function loadAssignedWingVariants(assignments: WingVariantId[], generation: number): Promise<void> {
  const pendingIds = [...new Set(assignments)].filter((id) => id !== m1Target.group.wingVariant);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < pendingIds.length) {
      const id = pendingIds[nextIndex++];
      try {
        const variant = await loadWingVariant(id, generation);
        if (!variant || generation !== trackingGeneration) return;
        assignments.forEach((assignedId, actorIndex) => {
          if (assignedId === id && actors[actorIndex]) actors[actorIndex].setVariant(variant);
        });
      } catch (error) {
        console.warn(`Wing variant ${id} could not be loaded; keeping the default variant.`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pendingIds.length) }, () => worker()));
}

async function startTracking(): Promise<void> {
  if (startInFlight || trackingState === 'found' || trackingState === 'scanning' || trackingState === 'grace') return;
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    setTrackingState('insecure');
    setButtons();
    return;
  }
  startInFlight = true;
  setTrackingState('loading');
  setButtons();
  try {
    if (!trackingAdapter) await setupTracking();
    if (!trackingAdapter || !anchor || actors.length === 0) throw new Error('MindAR tracking graph was not created.');
    await trackingAdapter.start();
    setTrackingState('scanning');
    setButtons();
    const runtime = trackingAdapter.runtime;
    const renderer = runtime.renderer;
    let previous = performance.now();
    renderer.setAnimationLoop((now: number) => {
      const deltaSeconds = Math.min(Math.max((now - previous) / 1000, 0), 0.05);
      previous = now;
      actors.forEach((item) => item.update(now / 1000, { speed: 0.92, amplitude: 0.9, burst: 0 }, { burstX: 0, burstY: 0, burst: 0 }, deltaSeconds));
      if (trackingState === 'grace' && performance.now() >= graceUntil) {
        if (contentRoot) contentRoot.visible = false;
        experience.onTargetLostExpired();
        setTrackingState('lost');
        setButtons();
      }
      renderer.render(runtime.scene, runtime.camera);
    });
  } catch (error: unknown) {
    console.error(error);
    stopTrackingRuntime();
    setTrackingState(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'error');
    setButtons();
  } finally {
    startInFlight = false;
    setButtons();
  }
}

function stopTracking(): void {
  if (!trackingAdapter) return;
  stopTrackingRuntime();
  setTrackingState('idle');
  setButtons();
}

function stopTrackingRuntime(): void {
  trackingGeneration += 1;
  experience.resetExperience();
  if (contentRoot && trackingAdapter) trackingAdapter.runtime.scene.remove(contentRoot);
  contentRoot = undefined;
  trackingAdapter?.stop();
  trackingAdapter = undefined;
  anchor = undefined;
  actors.forEach((item) => item.dispose());
  actors = [];
  actorVariantIds = [];
  loadedWingVariants.forEach((variant) => disposePreparedWingVariant(variant));
  loadedWingVariants.clear();
  hasVisibleMatrix = false;
  graceUntil = 0;
  lastPoseUpdateAt = 0;
  poseStabilizer.reset();
  arStage.querySelectorAll('video, canvas').forEach((node) => node.remove());
}

startButton.addEventListener('click', () => void startTracking());
stopButton.addEventListener('click', stopTracking);
arStage.addEventListener('click', () => {
  requestImmersiveFullscreen();
  if (trackingState === 'denied' || trackingState === 'insecure' || trackingState === 'error') {
    void startTracking();
    return;
  }
  if (trackingState !== 'found') return;
  if (experience.launchGroup()) {
    captureFlightDirectionsFromCamera();
    statusDetail.textContent = '群飛已穿過手機位置；重新掃描 M1 才會重置。';
  }
});
targetPreview.addEventListener('error', () => {
  targetPreview.alt = 'M1 Target 預覽載入失敗';
});
setTrackingState('idle');
setButtons();
void startTracking();
