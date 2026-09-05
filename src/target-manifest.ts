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
  version: 2;
  targets: TargetDefinition[];
}

const imageTargetSrc = `${import.meta.env.BASE_URL}targets/M1-M5.mind`;

export const targetManifest: TargetManifest = {
  version: 2,
  targets: [
    {
      id: 'M1',
      sourceName: 'M1_scaled',
      targetIndex: 0,
      imageTargetSrc,
      physicalSize: { width: 0.729, height: 0.28183562 },
      // 以 target 中心為基準；z 讓透明翅膀落在圖像平面前方。
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 47, wingVariant: '02', variantPolicy: 'random' },
    },
    {
      id: 'M2',
      sourceName: 'M2_scaled',
      targetIndex: 1,
      imageTargetSrc,
      physicalSize: { width: 0.37730062, height: 0.3 },
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 28, wingVariant: '02', variantPolicy: 'random' },
    },
    {
      id: 'M3',
      sourceName: 'M3_scaled',
      targetIndex: 2,
      imageTargetSrc,
      physicalSize: { width: 0.7995077, height: 0.29 },
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 29, wingVariant: '02', variantPolicy: 'random' },
    },
    {
      id: 'M4',
      sourceName: 'M4_scaled',
      targetIndex: 3,
      imageTargetSrc,
      physicalSize: { width: 0.23389356, height: 0.25 },
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 20, wingVariant: '02', variantPolicy: 'random' },
    },
    {
      id: 'M5',
      sourceName: 'M5_scaled',
      targetIndex: 4,
      imageTargetSrc,
      physicalSize: { width: 0.249, height: 0.243 },
      anchorOffset: { x: 0, y: 0.06, z: 0.08 },
      group: { actorCount: 23, wingVariant: '02', variantPolicy: 'random' },
    },
  ],
};

export const m1Target = targetManifest.targets[0];
