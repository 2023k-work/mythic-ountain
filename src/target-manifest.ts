import type { WingVariantId } from './wing-variants';

export interface TargetDefinition {
  id: string;
  sourceName: string;
  targetIndex: number;
  imageTargetSrc: string;
  physicalSize: { width: number; height: number };
  anchorOffset: { x: number; y: number; z: number };
  group: { actorCount: number; wingVariant: WingVariantId; variantPolicy: 'fixed' | 'random' };
}

export interface TargetManifest {
  version: 1;
  targets: TargetDefinition[];
}

export const targetManifest: TargetManifest = {
  version: 1,
  targets: [
    {
      id: 'M1',
      sourceName: 'M1_scaled',
      targetIndex: 0,
      imageTargetSrc: `${import.meta.env.BASE_URL}targets/M1.mind`,
      physicalSize: { width: 0.729, height: 0.28183562 },
      // 以 target 中心為基準；z 讓透明翅膀落在圖像平面前方。
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 47, wingVariant: '02', variantPolicy: 'random' },
    },
  ],
};

export const m1Target = targetManifest.targets[0];
