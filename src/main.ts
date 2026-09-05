import {
  AmbientLight,
  Color,
  Group,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import './style.css';
import { prepareWingVariant, WingActor, type PreparedWingVariant } from './wing-actor';

type VariantId = '02' | '10' | '20' | '57';

const stage = document.querySelector<HTMLDivElement>('#stage')!;
const countInput = document.querySelector<HTMLInputElement>('#count')!;
const speedInput = document.querySelector<HTMLInputElement>('#speed')!;
const amplitudeInput = document.querySelector<HTMLInputElement>('#amplitude')!;
const countValue = document.querySelector<HTMLOutputElement>('#count-value')!;
const speedValue = document.querySelector<HTMLOutputElement>('#speed-value')!;
const amplitudeValue = document.querySelector<HTMLOutputElement>('#amplitude-value')!;
const variantValue = document.querySelector<HTMLSpanElement>('#variant-value')!;
const playToggle = document.querySelector<HTMLButtonElement>('#play-toggle')!;
const burstButton = document.querySelector<HTMLButtonElement>('#burst')!;
const fpsReadout = document.querySelector<HTMLSpanElement>('#fps-readout')!;

if (!stage || !countInput || !speedInput || !amplitudeInput || !countValue || !speedValue || !amplitudeValue || !variantValue || !playToggle || !burstButton || !fpsReadout) {
  throw new Error('Playground UI is incomplete.');
}

const variantUrls: Record<VariantId, string> = {
  '02': '/assets/wings-02.png',
  '10': '/assets/wings-10.png',
  '20': '/assets/wings-20.png',
  '57': '/assets/wings-57.png',
};

const scene = new Scene();
scene.background = new Color('#171916');
scene.add(new AmbientLight('#ffffff', 1));
const camera = new OrthographicCamera(-4, 4, 3.1, -3.1, 0.1, 100);
camera.position.z = 10;
const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('#171916', 0);
stage.appendChild(renderer.domElement);

const actorLayer = new Group();
scene.add(actorLayer);
const actors: WingActor[] = [];
const variants = new Map<VariantId, PreparedWingVariant>();
const seeds: number[] = [];
let selectedVariant: VariantId = '02';
let playing = true;
let lastTime = performance.now();
let elapsed = 0;
let burstClock = 0;
let burstDirection = { x: 0, y: 0 };
let frames = 0;
let fpsClock = performance.now();

function updateCamera(): void {
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  const aspect = width / height;
  const viewHeight = 6.2;
  camera.left = -(viewHeight * aspect) / 2;
  camera.right = (viewHeight * aspect) / 2;
  camera.top = viewHeight / 2;
  camera.bottom = -viewHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function placeActor(actor: WingActor, index: number): void {
  const width = Math.max(stage.clientWidth, 1);
  const height = Math.max(stage.clientHeight, 1);
  const aspect = width / height;
  const worldWidth = 6.2 * aspect;
  const columns = Math.max(2, Math.ceil(Math.sqrt(actors.length * aspect)));
  const rows = Math.max(1, Math.ceil(actors.length / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const xStep = worldWidth / (columns + 1);
  const yStep = 4.65 / (rows + 1);
  const x = -worldWidth / 2 + xStep * (column + 1) + randomBetween(-0.22, 0.22);
  const y = 2.18 - yStep * (row + 1) + randomBetween(-0.17, 0.17);
  actor.setHomePosition(x, y);
}

function createActors(count: number): void {
  while (actors.length > count) {
    const actor = actors.pop();
    if (actor) {
      actorLayer.remove(actor.group);
      actor.dispose();
    }
  }
  while (actors.length < count) {
    const index = actors.length;
    const actor = new WingActor(index + 1, randomBetween(1.18, 1.56));
    const seed = Math.random() * 10;
    seeds[index] = seed;
    actorLayer.add(actor.group);
    actors.push(actor);
    placeActor(actor, index);
  }
  actors.forEach((actor, index) => placeActor(actor, index));
  const variant = variants.get(selectedVariant);
  if (variant) actors.forEach((actor) => actor.setVariant(variant));
  countValue.textContent = String(count);
}

function triggerBurst(): void {
  burstClock = 1;
  const angle = randomBetween(0, Math.PI * 2);
  burstDirection = { x: Math.cos(angle) * 0.55, y: Math.sin(angle) * 0.36 };
}

function applyVariant(id: VariantId): void {
  selectedVariant = id;
  const variant = variants.get(id);
  if (!variant) return;
  actors.forEach((actor) => actor.setVariant(variant));
  variantValue.textContent = `${id} / 57`;
  document.querySelectorAll<HTMLButtonElement>('.variant').forEach((button) => {
    const active = button.dataset.variant === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

function updateLabels(): void {
  speedValue.textContent = `${Number(speedInput.value).toFixed(2)}×`;
  amplitudeValue.textContent = Number(amplitudeInput.value).toFixed(2);
}

function animate(now: number): void {
  const rawDelta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (playing) elapsed += rawDelta;
  burstClock = Math.max(0, burstClock - rawDelta * 0.85);
  const burstEase = Math.sin(burstClock * Math.PI);
  const motion = {
    burstX: burstDirection.x * burstEase,
    burstY: burstDirection.y * burstEase,
    burst: burstEase,
  };
  const options = {
    speed: Number(speedInput.value),
    amplitude: Number(amplitudeInput.value),
    burst: burstEase,
  };
  actors.forEach((actor) => actor.update(elapsed, options, motion, rawDelta));
  renderer.render(scene, camera);
  frames += 1;
  if (now - fpsClock > 1000) {
    fpsReadout.textContent = `${Math.round((frames * 1000) / (now - fpsClock))} FPS · ${actors.length} sprites`;
    frames = 0;
    fpsClock = now;
  }
  requestAnimationFrame(animate);
}

function setPlaying(nextPlaying: boolean): void {
  playing = nextPlaying;
  const icon = playToggle.querySelector<HTMLSpanElement>('.button-icon');
  const label = playToggle.querySelector<HTMLSpanElement>('span:last-child');
  if (icon) icon.textContent = playing ? 'Ⅱ' : '▶';
  if (label) label.textContent = playing ? '暫停動畫' : '播放動畫';
}

countInput.addEventListener('input', () => createActors(Number(countInput.value)));
speedInput.addEventListener('input', updateLabels);
amplitudeInput.addEventListener('input', updateLabels);
playToggle.addEventListener('click', () => setPlaying(!playing));
burstButton.addEventListener('click', triggerBurst);
stage.addEventListener('pointerdown', triggerBurst);
document.querySelectorAll<HTMLButtonElement>('.variant').forEach((button) => {
  button.addEventListener('click', () => applyVariant((button.dataset.variant ?? '02') as VariantId));
});
window.addEventListener('resize', () => {
  updateCamera();
  actors.forEach((actor, index) => placeActor(actor, index));
});

async function boot(): Promise<void> {
  updateCamera();
  updateLabels();
  createActors(Number(countInput.value));
  await Promise.all((Object.keys(variantUrls) as VariantId[]).map(async (id) => {
    const variant = await prepareWingVariant(variantUrls[id]);
    variants.set(id, variant);
  }));
  applyVariant(selectedVariant);
  requestAnimationFrame(animate);
}

boot().catch((error: unknown) => {
  console.error(error);
  stage.innerHTML = '<div style="padding:24px;color:#f4f0e9;font:14px system-ui">翅膀素材載入失敗，請確認以 Vite 啟動此 playground。</div>';
});
