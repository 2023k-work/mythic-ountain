import {
  CanvasTexture,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
  type Texture,
} from 'three';
import { sampleWingMotion, type WingAnimationOptions } from './wing-animation';

const FLIGHT_SPEED_SCALE = 0.5;
const FLIGHT_BASE_SPEED = 0.8;

export interface AlphaBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreparedWingVariant {
  left: CanvasTexture;
  right: CanvasTexture;
  leftBounds: AlphaBounds;
  rightBounds: AlphaBounds;
  sourceWidth: number;
  splitX: number;
}

export interface ActorMotion {
  burstX: number;
  burstY: number;
  burst: number;
}

export function disposePreparedWingVariant(variant: PreparedWingVariant): void {
  variant.left.dispose();
  variant.right.dispose();
}

function makeMaterial(texture: Texture): MeshBasicMaterial {
  return new MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.035,
    depthWrite: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

function disposeMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  if (mesh.material instanceof MeshBasicMaterial) mesh.material.dispose();
}

export class WingActor {
  readonly group = new Group();
  private readonly leftPivot = new Group();
  private readonly rightPivot = new Group();
  private readonly leftScale = new Group();
  private readonly rightScale = new Group();
  private readonly phase: number;
  private readonly size: number;
  private readonly speedVariation: number;
  private readonly amplitudeVariation: number;
  private readonly driftScale: number;
  private readonly flightFrequency: number;
  private readonly flightRotationSpeed: number;
  private readonly flightRotationWobble: number;
  private readonly flightSpeed: number;
  private readonly flightAimSpeed: number;
  private readonly flightNormalSpeed: number;
  private homeZ = 0;
  private opacity = 0;
  private opacityTarget = 0;
  private flightProgress = 0;
  private flightTarget = 0;
  private flightTime = 0;
  private flightWingSpeed?: number;
  private flightAngle = 0;
  private flightPassedCamera = false;
  private readonly flightForward = new Vector3();
  private readonly flightNormal = new Vector3(0, 0, 1);
  private readonly flightCameraPosition = new Vector3(0, 0, 1);
  private readonly flightCurrentPosition = new Vector3();
  private readonly flightAim = new Vector3(0, 0, 1);
  private readonly flightPosition = new Vector3();
  private readonly flightOffset = new Vector3();
  private interaction = 0;
  private interactionTarget = 0;
  private homeX = 0;
  private homeY = 0;
  private leftMesh?: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private rightMesh?: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private variant?: PreparedWingVariant;

  constructor(seed: number, size: number, driftScale = 1) {
    this.phase = seed * 17.213;
    this.size = size;
    this.speedVariation = 0.78 + Math.random() * 0.42;
    this.amplitudeVariation = 0.72 + Math.random() * 0.52;
    this.driftScale = driftScale;
    this.flightFrequency = 0.85 + Math.random() * 0.7;
    const rotationDirection = Math.random() < 0.5 ? -1 : 1;
    this.flightRotationSpeed = rotationDirection * (0.24 + Math.random() * 0.34);
    this.flightRotationWobble = 0.06 + Math.random() * 0.08;
    this.flightSpeed = (FLIGHT_BASE_SPEED * FLIGHT_SPEED_SCALE) * (0.88 + Math.random() * 0.24);
    this.flightAimSpeed = (0.01 + Math.random() * 0.09) * (0.9 + Math.random() * 0.1) * FLIGHT_SPEED_SCALE;
    this.flightNormalSpeed = (FLIGHT_BASE_SPEED * FLIGHT_SPEED_SCALE) * (0.22 + Math.random() * 0.12);
    this.leftPivot.add(this.leftScale);
    this.rightPivot.add(this.rightScale);
    this.group.add(this.leftPivot, this.rightPivot);
    this.group.renderOrder = 2;
  }

  setHomePosition(x: number, y: number, z = 0): void {
    this.homeX = x;
    this.homeY = y;
    this.homeZ = z;
    this.group.position.set(x, y, z);
  }

  setInteraction(active: boolean): void {
    this.interactionTarget = active ? 1 : 0;
  }

  setRevealed(revealed: boolean): void {
    this.opacityTarget = revealed ? 1 : 0;
    if (revealed) this.group.visible = true;
  }

  setFlying(flying: boolean): void {
    if (flying && this.flightTarget === 0) {
      this.flightTime = 0;
      // The sprite's local +Y is its visual forward direction. Give every butterfly
      // an independent full-circle heading when it takes off.
      this.flightAngle = Math.random() * Math.PI * 2;
      this.flightPassedCamera = false;
      this.flightAim.set(0, 0, 1);
    }
    this.flightTarget = flying ? 1 : 0;
    if (!flying) {
      this.flightPosition.set(0, 0, 0);
      this.flightOffset.set(0, 0, 0);
      this.flightWingSpeed = undefined;
    }
  }

  setFlightCameraTarget(cameraPosition: Vector3): void {
    this.flightCameraPosition.copy(cameraPosition);
  }

  setVariant(variant: PreparedWingVariant): void {
    if (this.leftMesh) {
      this.leftScale.remove(this.leftMesh);
      disposeMesh(this.leftMesh);
    }
    if (this.rightMesh) {
      this.rightScale.remove(this.rightMesh);
      disposeMesh(this.rightMesh);
    }
    this.variant = variant;

    // Place each pivot at the source image's actual wing root. The previous fixed +/-0.025
    // spacing was tuned for the large playground actors and separated the wings at AR scale.
    const leftRootX = variant.leftBounds.x + variant.leftBounds.width;
    const rightRootX = variant.splitX + variant.rightBounds.x;
    const sourceCenterX = variant.sourceWidth / 2;
    this.leftPivot.position.x = ((leftRootX - sourceCenterX) / variant.sourceWidth) * this.size;
    this.rightPivot.position.x = ((rightRootX - sourceCenterX) / variant.sourceWidth) * this.size;

    const leftWidth = variant.leftBounds.width / 1024 * this.size;
    const leftHeight = variant.leftBounds.height / 1024 * this.size;
    const rightWidth = variant.rightBounds.width / 1024 * this.size;
    const rightHeight = variant.rightBounds.height / 1024 * this.size;

    this.leftMesh = new Mesh(new PlaneGeometry(leftWidth, leftHeight), makeMaterial(variant.left));
    this.rightMesh = new Mesh(new PlaneGeometry(rightWidth, rightHeight), makeMaterial(variant.right));
    this.leftMesh.material.opacity = this.opacity;
    this.rightMesh.material.opacity = this.opacity;
    this.leftMesh.position.x = -leftWidth / 2;
    this.rightMesh.position.x = rightWidth / 2;
    this.leftMesh.position.y = 0;
    this.rightMesh.position.y = 0;
    this.leftScale.add(this.leftMesh);
    this.rightScale.add(this.rightMesh);
  }

  update(time: number, options: WingAnimationOptions, motion: ActorMotion, deltaSeconds = 1 / 60): void {
    const fadeFactor = 1 - Math.exp((-Math.LN2 * Math.min(Math.max(deltaSeconds, 0), 0.1)) / 0.14);
    this.opacity += (this.opacityTarget - this.opacity) * fadeFactor;
    const flightFactor = 1 - Math.exp((-Math.LN2 * Math.min(Math.max(deltaSeconds, 0), 0.1)) / 0.24);
    this.flightProgress += (this.flightTarget - this.flightProgress) * flightFactor;
    const flightEase = this.flightProgress * this.flightProgress * (3 - 2 * this.flightProgress);
    const idleWingSpeed = options.speed * this.speedVariation * (1 + this.interaction * 0.12);
    if (this.flightTarget === 1 && this.flightWingSpeed === undefined) this.flightWingSpeed = idleWingSpeed;
    if (this.flightTarget === 1) {
      this.flightTime += deltaSeconds;
      const travel = deltaSeconds * this.flightSpeed;
      const turnWave = Math.sin(this.flightTime * this.flightFrequency * Math.PI * 2 + this.phase) * this.flightRotationWobble;
      this.flightAngle += (this.flightRotationSpeed + turnWave) * deltaSeconds;
      // Positive Z rotation maps the sprite's local +Y forward vector to (-sin, cos).
      // Keeping this sign aligned with group.rotation.z prevents the flight turn from
      // appearing opposite to the butterfly's visual rotation.
      this.flightForward.set(-Math.sin(this.flightAngle), Math.cos(this.flightAngle), 0);
      this.flightPosition.addScaledVector(this.flightForward, travel);
      this.flightCurrentPosition.set(
        this.homeX + this.flightPosition.x,
        this.homeY + this.flightPosition.y,
        this.homeZ + this.flightPosition.z,
      );
      if (!this.flightPassedCamera) {
        this.flightAim.copy(this.flightCameraPosition).sub(this.flightCurrentPosition);
        const cameraDistance = this.flightAim.length();
        if (cameraDistance < 0.05) this.flightPassedCamera = true;
        if (cameraDistance > 0.000001) this.flightAim.multiplyScalar(1 / cameraDistance);
        else this.flightAim.set(0, 0, 1);
      }
      // Equivalent to Unity's transform.Translate(..., Space.Self) after LookAt:
      // follow the camera-facing direction with a separate, slower parent motion.
      this.flightPosition.addScaledVector(this.flightAim, deltaSeconds * this.flightAimSpeed);
      // The target anchor's local +Z is the scanned image normal. This depth component
      // remains independent from the in-plane heading, so every butterfly leaves the image.
      this.flightPosition.addScaledVector(this.flightNormal, deltaSeconds * this.flightNormalSpeed);
    }
    this.flightOffset.copy(this.flightPosition).multiplyScalar(flightEase);
    if (this.leftMesh) this.leftMesh.material.opacity = this.opacity;
    if (this.rightMesh) this.rightMesh.material.opacity = this.opacity;
    if (this.opacityTarget === 0 && this.opacity < 0.004) {
      this.opacity = 0;
      this.group.visible = false;
    } else {
      this.group.visible = true;
    }
    this.interaction += (this.interactionTarget - this.interaction) * 0.12;
    const sample = sampleWingMotion(time, this.phase, {
      speed: this.flightWingSpeed ?? idleWingSpeed,
      amplitude: options.amplitude * this.amplitudeVariation * (1 + this.interaction * 0.18 + flightEase * 0.1),
      burst: options.burst,
    });
    const idleFactor = 1 - flightEase;
    const idleX = (Math.sin(time * 0.37 + this.phase) * 0.11 + Math.sin(time * 0.19 + this.phase * 0.7) * 0.07) * this.driftScale * idleFactor;
    const idleY = (Math.sin(time * 0.53 + this.phase * 1.2) * 0.095 + Math.cos(time * 0.23 + this.phase) * 0.04) * this.driftScale * idleFactor;
    const burstEase = motion.burst * motion.burst;

    this.group.position.x = this.homeX + idleX + this.flightOffset.x + motion.burstX * burstEase;
    this.group.position.y = this.homeY + idleY + this.flightOffset.y + motion.burstY * burstEase + this.interaction * 0.04;
    this.group.position.z = this.homeZ + this.flightOffset.z;
    const idleRotation = Math.sin(time * 0.29 + this.phase) * 0.045 + motion.burstX * 0.025;
    this.group.rotation.z = idleRotation * idleFactor + this.flightAngle * flightEase;
    this.leftScale.rotation.y = sample.leftFlap;
    this.rightScale.rotation.y = -sample.rightFlap;
    this.leftScale.rotation.z = sample.leftTilt;
    this.rightScale.rotation.z = sample.rightTilt;
    this.leftScale.scale.y = sample.bodyScale;
    this.rightScale.scale.y = sample.bodyScale;
    this.group.scale.setScalar(0.82 + Math.sin(this.phase * 2.7) * 0.07);
    this.group.scale.multiplyScalar(1 + flightEase * 0.1 + motion.burst * 0.06);
  }

  getHomePosition(): { x: number; y: number } {
    return { x: this.homeX, y: this.homeY };
  }

  dispose(): void {
    if (this.leftMesh) disposeMesh(this.leftMesh);
    if (this.rightMesh) disposeMesh(this.rightMesh);
    this.group.clear();
  }
}

function findAlphaBounds(context: CanvasRenderingContext2D, xOffset: number, width: number, height: number): AlphaBounds {
  const pixels = context.getImageData(xOffset, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 20) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, width, height };
  return {
    x: Math.max(0, minX - 4),
    y: Math.max(0, minY - 4),
    width: Math.min(width - Math.max(0, minX - 4), maxX - Math.max(0, minX - 4) + 5),
    height: Math.min(height - Math.max(0, minY - 4), maxY - Math.max(0, minY - 4) + 5),
  };
}

function cropTexture(source: HTMLImageElement, bounds: AlphaBounds, xOffset: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = bounds.width;
  canvas.height = bounds.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.drawImage(source, xOffset + bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export async function prepareWingVariant(url: string): Promise<PreparedWingVariant> {
  const source = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load wing texture: ${url}`));
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context is unavailable.');
  context.drawImage(source, 0, 0);
  const halfWidth = Math.floor(source.naturalWidth / 2);
  const leftBounds = findAlphaBounds(context, 0, halfWidth, source.naturalHeight);
  const rightBounds = findAlphaBounds(context, halfWidth, source.naturalWidth - halfWidth, source.naturalHeight);
  return {
    left: cropTexture(source, leftBounds, 0),
    right: cropTexture(source, rightBounds, halfWidth),
    leftBounds,
    rightBounds,
    sourceWidth: source.naturalWidth,
    splitX: halfWidth,
  };
}
