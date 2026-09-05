declare module 'mind-ar/dist/mindar-image-three.prod.js' {
  import type { Group, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

  export interface MindARThreeAnchor {
    group: Group;
    targetIndex: number;
    visible: boolean;
    onTargetFound: (() => void) | null;
    onTargetLost: (() => void) | null;
    onTargetUpdate: (() => void) | null;
  }

  export class MindARThree {
    constructor(options: {
      container: HTMLElement;
      imageTargetSrc: string;
      maxTrack?: number;
      uiLoading?: 'yes' | 'no';
      uiScanning?: 'yes' | 'no';
      uiError?: 'yes' | 'no';
      warmupTolerance?: number;
      missTolerance?: number;
    });
    scene: Scene;
    renderer: WebGLRenderer;
    camera: PerspectiveCamera;
    video: HTMLVideoElement;
    addAnchor(targetIndex: number): MindARThreeAnchor;
    start(): Promise<void>;
    stop(): void;
  }
}

declare module 'mind-ar/dist/mindar-image.prod.js' {
  export class Compiler {
    compileImageTargets(images: HTMLImageElement[], progressCallback: (progress: number) => void): Promise<unknown>;
    exportData(): Uint8Array;
  }
}
