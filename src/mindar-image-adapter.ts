import { MindARThree, type MindARThreeAnchor } from 'mind-ar/dist/mindar-image-three.prod.js';

export type { MindARThreeAnchor };

export class MindARImageAdapter {
  readonly runtime: MindARThree;
  readonly anchor: MindARThreeAnchor;

  constructor(container: HTMLElement, imageTargetSrc: string) {
    this.runtime = new MindARThree({
      container,
      imageTargetSrc,
      maxTrack: 1,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'no',
      warmupTolerance: 5,
      missTolerance: 8,
    });
    this.anchor = this.runtime.addAnchor(0);
  }

  start(): Promise<void> {
    return this.runtime.start();
  }

  stop(): void {
    this.runtime.renderer.setAnimationLoop(null);
    try {
      this.runtime.stop();
    } catch (error) {
      console.warn('MindAR stopped before a controller was ready.', error);
    }
  }
}
