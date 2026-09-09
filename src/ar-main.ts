import { Group, Matrix4 } from 'three';
import './ar-style.css';
import { M1ExperienceController } from './m1-experience-controller';
import { butterflyPositionsByTargetId } from './m1-group-manifest';
import { MindARImageAdapter, type MindARThreeAnchor } from './mindar-image-adapter';
import { PoseStabilizer } from './pose-stabilizer';
import { targetManifest, type TargetDefinition } from './target-manifest';
import { disposePreparedWingVariant, prepareWingVariant, WingActor, type PreparedWingVariant } from './wing-actor';
import { randomWingVariantId, wingVariantUrl, type WingVariantId } from './wing-variants';

const arStage = document.querySelector<HTMLDivElement>('#ar-stage')!;
const startButton = document.querySelector<HTMLButtonElement>('#start-ar')!;
const stopButton = document.querySelector<HTMLButtonElement>('#stop-ar')!;
const statusValue = document.querySelector<HTMLSpanElement>('#tracking-status')!;
const statusDetail = document.querySelector<HTMLParagraphElement>('#tracking-detail')!;
const targetBadge = document.querySelector<HTMLSpanElement>('#target-badge')!;
const targetPreview = document.querySelector<HTMLImageElement>('#target-preview')!;
const repositoryLink = document.querySelector<HTMLAnchorElement>('.repository-link')!;

const targetLabel = 'M1-M5';
const STATUS_TEXT = {
  idle: ['尚未啟動', `正在自動啟動相機，準備尋找 ${targetLabel}。`],
  loading: ['準備中', `正在請求相機權限並載入 ${targetLabel} 追蹤資料。`],
  scanning: ['掃描中', `請將 ${targetLabel} 任一圖像放入相機畫面。`],
  found: ['Target found', '目前圖像已鎖定，翅膀正在跟隨 Target anchor。'],
  grace: ['短暫遺失', '保留最後位置，請把目前圖像拉回畫面。'],
  lost: ['Target lost', `尚未偵測到 ${targetLabel}，保持相機對準圖像。`],
  insecure: ['需要 HTTPS', '手機請使用 https://區網IP:5173 開啟，HTTP 不允許相機。'],
  denied: ['相機不可用', '請在 HTTPS 或 localhost 開啟，並允許瀏覽器使用相機。'],
  error: ['啟動失敗', '追蹤資料或相機初始化失敗，請重新啟動。'],
} as const;

type TrackingState = keyof typeof STATUS_TEXT;

interface TargetRuntime {
  target: TargetDefinition;
  anchor: MindARThreeAnchor;
  contentRoot: Group;
  actors: WingActor[];
  actorVariantIds: WingVariantId[];
  poseStabilizer: PoseStabilizer;
  lastVisibleMatrix: Matrix4;
  hasVisibleMatrix: boolean;
  graceUntil: number;
  lastPoseUpdateAt: number;
  experience: M1ExperienceController;
}

let trackingState: TrackingState = 'idle';
let trackingAdapter: MindARImageAdapter | undefined;
let targetRuntimes: TargetRuntime[] = [];
let activeRuntime: TargetRuntime | undefined;
let loadedWingVariants = new Map<WingVariantId, PreparedWingVariant>();
let startInFlight = false;
let trackingGeneration = 0;

function setTrackingState(next: TrackingState): void {
  trackingState = next;
  const [title, detail] = STATUS_TEXT[next];
  statusValue.textContent = title;
  statusDetail.textContent = detail;
  targetBadge.textContent = activeRuntime ? `${activeRuntime.target.id} / TRACKING` : `${targetLabel} / READY`;
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

function hideInactiveRuntimes(visibleRuntime: TargetRuntime): void {
  targetRuntimes.forEach((runtime) => {
    if (runtime !== visibleRuntime) runtime.contentRoot.visible = false;
  });
}

function retainAnchorDuringGrace(runtime: TargetRuntime): void {
  if (!runtime.hasVisibleMatrix) return;
  runtime.contentRoot.matrix.copy(runtime.lastVisibleMatrix);
  runtime.contentRoot.visible = true;
}

function connectTrackingEvents(runtime: TargetRuntime): void {
  runtime.anchor.onTargetFound = () => {
    activeRuntime = runtime;
    runtime.graceUntil = 0;
    runtime.lastPoseUpdateAt = 0;
    runtime.poseStabilizer.reset(runtime.anchor.group.matrix);
    hideInactiveRuntimes(runtime);
    runtime.contentRoot.matrix.copy(runtime.anchor.group.matrix);
    runtime.contentRoot.visible = true;
    runtime.lastVisibleMatrix.copy(runtime.contentRoot.matrix);
    runtime.hasVisibleMatrix = true;
    runtime.experience.onTargetFound();
    setTrackingState('found');
    setButtons();
  };

  runtime.anchor.onTargetLost = () => {
    runtime.graceUntil = performance.now() + 850;
    runtime.experience.onTargetLostGrace();
    if (activeRuntime === runtime) {
      retainAnchorDuringGrace(runtime);
      setTrackingState('grace');
      setButtons();
    }
  };

  runtime.anchor.onTargetUpdate = () => {
    if (runtime.anchor.visible) {
      activeRuntime = runtime;
      hideInactiveRuntimes(runtime);
      const now = performance.now();
      const deltaSeconds = runtime.lastPoseUpdateAt === 0 ? 1 / 60 : (now - runtime.lastPoseUpdateAt) / 1000;
      runtime.lastPoseUpdateAt = now;
      runtime.contentRoot.matrix.copy(runtime.poseStabilizer.update(runtime.anchor.group.matrix, deltaSeconds));
      runtime.contentRoot.visible = true;
      runtime.lastVisibleMatrix.copy(runtime.contentRoot.matrix);
      runtime.hasVisibleMatrix = true;
      if (trackingState !== 'found') setTrackingState('found');
      return;
    }
    if (activeRuntime === runtime && runtime.graceUntil > performance.now()) {
      retainAnchorDuringGrace(runtime);
    }
  };
}

function createTargetRuntime(
  target: TargetDefinition,
  anchor: MindARThreeAnchor,
  defaultVariant: PreparedWingVariant,
): TargetRuntime {
  const positions = butterflyPositionsByTargetId[target.id];
  if (!positions || positions.length < target.group.actorCount) {
    throw new Error(`Missing butterfly positions for ${target.id}.`);
  }

  // Keep the butterfly-to-target proportion consistent across the differently sized images.
  const sizeScale = target.physicalSize.width / 0.729;
  const baseSize = 0.075 * sizeScale;
  const sizeRange = 0.065 * sizeScale;
  const actorVariantIds = positions.slice(0, target.group.actorCount).map(() => (
    target.group.variantPolicy === 'random' ? randomWingVariantId() : target.group.wingVariant
  ));
  const contentRoot = new Group();
  contentRoot.matrixAutoUpdate = false;
  contentRoot.visible = false;
  const actors = positions.slice(0, target.group.actorCount).map((position, index) => {
    const item = new WingActor(target.targetIndex * 100 + index + 1, baseSize + Math.random() * sizeRange, 0.18);
    item.setHomePosition(position.x, position.y, target.anchorOffset.z);
    item.setVariant(defaultVariant);
    item.setRevealed(false);
    contentRoot.add(item.group);
    return item;
  });

  const runtime: TargetRuntime = {
    target,
    anchor,
    contentRoot,
    actors,
    actorVariantIds,
    poseStabilizer: new PoseStabilizer(),
    lastVisibleMatrix: new Matrix4(),
    hasVisibleMatrix: false,
    graceUntil: 0,
    lastPoseUpdateAt: 0,
    experience: undefined as unknown as M1ExperienceController,
  };
  runtime.experience = new M1ExperienceController({
    onRevealGroup: () => runtime.actors.forEach((item) => item.setRevealed(true)),
    onFadeOutGroup: () => runtime.actors.forEach((item) => item.setRevealed(false)),
    onLaunchGroup: () => runtime.actors.forEach((item) => item.setFlying(true)),
    onReset: () => runtime.actors.forEach((item) => {
      item.setFlying(false);
      item.setInteraction(false);
      item.setRevealed(false);
    }),
  });
  return runtime;
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

async function loadAssignedWingVariants(runtimes: TargetRuntime[], generation: number): Promise<void> {
  const pendingIds = [...new Set(runtimes.flatMap((runtime) => runtime.actorVariantIds))]
    .filter((id) => !loadedWingVariants.has(id));
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    while (nextIndex < pendingIds.length) {
      const id = pendingIds[nextIndex++];
      try {
        const variant = await loadWingVariant(id, generation);
        if (!variant || generation !== trackingGeneration) return;
        runtimes.forEach((runtime) => {
          runtime.actorVariantIds.forEach((assignedId, actorIndex) => {
            if (assignedId === id && runtime.actors[actorIndex]) runtime.actors[actorIndex].setVariant(variant);
          });
        });
      } catch (error) {
        console.warn(`Wing variant ${id} could not be loaded; keeping the default variant.`, error);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pendingIds.length) }, () => worker()));
}

async function setupTracking(): Promise<void> {
  const generation = ++trackingGeneration;
  const defaultVariantIds = [...new Set(targetManifest.targets.map((target) => target.group.wingVariant))];
  const defaultVariants = new Map<WingVariantId, PreparedWingVariant>();
  await Promise.all(defaultVariantIds.map(async (id) => {
    const variant = await loadWingVariant(id, generation);
    if (!variant) throw new Error(`Default wing variant ${id} was not loaded.`);
    defaultVariants.set(id, variant);
  }));

  const firstTarget = targetManifest.targets[0];
  trackingAdapter = new MindARImageAdapter(arStage, firstTarget.imageTargetSrc, targetManifest.targets.length);
  targetRuntimes = targetManifest.targets.map((target, index) => {
    const defaultVariant = defaultVariants.get(target.group.wingVariant);
    if (!defaultVariant) throw new Error(`Missing default wing variant for ${target.id}.`);
    const runtime = createTargetRuntime(target, trackingAdapter!.anchors[index], defaultVariant);
    trackingAdapter!.runtime.scene.add(runtime.contentRoot);
    connectTrackingEvents(runtime);
    return runtime;
  });
  activeRuntime = undefined;
  void loadAssignedWingVariants(targetRuntimes, generation);
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
    if (!trackingAdapter || targetRuntimes.length !== targetManifest.targets.length) {
      throw new Error('MindAR multi-target tracking graph was not created.');
    }
    await trackingAdapter.start();
    setTrackingState('scanning');
    setButtons();
    const runtime = trackingAdapter.runtime;
    const renderer = runtime.renderer;
    let previous = performance.now();
    renderer.setAnimationLoop((now: number) => {
      const deltaSeconds = Math.min(Math.max((now - previous) / 1000, 0), 0.05);
      previous = now;
      targetRuntimes.forEach((targetRuntime) => {
        targetRuntime.actors.forEach((item) => item.update(now / 1000, { speed: 0.92, amplitude: 0.9, burst: 0 }, { burstX: 0, burstY: 0, burst: 0 }, deltaSeconds));
        if (targetRuntime.graceUntil !== 0 && performance.now() >= targetRuntime.graceUntil) {
          targetRuntime.graceUntil = 0;
          targetRuntime.contentRoot.visible = false;
          targetRuntime.experience.onTargetLostExpired();
          if (activeRuntime === targetRuntime) {
            activeRuntime = undefined;
            setTrackingState('lost');
            setButtons();
          }
        }
      });
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
  targetRuntimes.forEach((runtime) => {
    runtime.experience.resetExperience();
    if (trackingAdapter) trackingAdapter.runtime.scene.remove(runtime.contentRoot);
    runtime.actors.forEach((item) => item.dispose());
  });
  trackingAdapter?.stop();
  trackingAdapter = undefined;
  targetRuntimes = [];
  activeRuntime = undefined;
  loadedWingVariants.forEach((variant) => disposePreparedWingVariant(variant));
  loadedWingVariants.clear();
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
  if (trackingState !== 'found' || !activeRuntime) return;
  const experience = activeRuntime.experience;
  if (experience.getState() === 'interactionReady' && experience.launchGroup()) {
    statusDetail.textContent = `${activeRuntime.target.id} 群飛已直線飛離；再次點擊才會漸淡，重新掃描才會重置。`;
    return;
  }
  if (experience.getState() === 'groupFlying' && experience.fadeGroup()) {
    statusDetail.textContent = `${activeRuntime.target.id} 蝴蝶正在漸淡；重新掃描才會重置。`;
  }
});
repositoryLink.addEventListener('click', (event) => event.stopPropagation());
targetPreview.addEventListener('error', () => {
  targetPreview.alt = 'AR Target 預覽載入失敗';
});
setTrackingState('idle');
setButtons();
void startTracking();
