import { Matrix4, Quaternion, Vector3 } from 'three';

export interface PoseStabilizerOptions {
  positionHalfLifeSeconds: number;
  rotationHalfLifeSeconds: number;
  scaleHalfLifeSeconds: number;
}

const DEFAULT_OPTIONS: PoseStabilizerOptions = {
  positionHalfLifeSeconds: 0.09,
  rotationHalfLifeSeconds: 0.08,
  scaleHalfLifeSeconds: 0.1,
};

function smoothingFactor(deltaSeconds: number, halfLifeSeconds: number): number {
  if (halfLifeSeconds <= 0) return 1;
  return 1 - Math.exp((-Math.LN2 * Math.min(Math.max(deltaSeconds, 0), 0.1)) / halfLifeSeconds);
}

export class PoseStabilizer {
  readonly matrix = new Matrix4();
  private readonly options: PoseStabilizerOptions;
  private readonly targetPosition = new Vector3();
  private readonly targetRotation = new Quaternion();
  private readonly targetScale = new Vector3(1, 1, 1);
  private readonly currentPosition = new Vector3();
  private readonly currentRotation = new Quaternion();
  private readonly currentScale = new Vector3(1, 1, 1);
  private initialized = false;

  constructor(options: Partial<PoseStabilizerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  reset(source?: Matrix4): void {
    if (!source) {
      this.initialized = false;
      this.matrix.identity();
      return;
    }
    source.decompose(this.currentPosition, this.currentRotation, this.currentScale);
    this.matrix.compose(this.currentPosition, this.currentRotation, this.currentScale);
    this.initialized = true;
  }

  update(source: Matrix4, deltaSeconds: number): Matrix4 {
    source.decompose(this.targetPosition, this.targetRotation, this.targetScale);
    if (!this.initialized) {
      this.reset(source);
      return this.matrix;
    }

    this.currentPosition.lerp(
      this.targetPosition,
      smoothingFactor(deltaSeconds, this.options.positionHalfLifeSeconds),
    );
    this.currentRotation.slerp(
      this.targetRotation,
      smoothingFactor(deltaSeconds, this.options.rotationHalfLifeSeconds),
    );
    this.currentScale.lerp(
      this.targetScale,
      smoothingFactor(deltaSeconds, this.options.scaleHalfLifeSeconds),
    );
    this.matrix.compose(this.currentPosition, this.currentRotation, this.currentScale);
    return this.matrix;
  }
}
