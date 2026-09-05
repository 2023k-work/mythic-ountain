import { m1Target } from './target-manifest';

interface UnityM1Position {
  x: number;
  z: number;
}

export interface TargetLocalPosition {
  x: number;
  y: number;
}

// repository-verified positions from Assets/Prefabs/M1.prefab. Unity's x/z plane maps to
// MindAR's target-local x/y plane; dividing by target width matches MindAR's anchor scale.
const unityM1Positions: UnityM1Position[] = [
  { x: -0.1792, z: -0.0086 },
  { x: -0.1683, z: 0.0031 },
  { x: -0.1573, z: 0.0184 },
  { x: -0.1512, z: 0.0372 },
  { x: -0.1402, z: 0.0525 },
  { x: -0.1395, z: 0.032 },
  { x: -0.1389, z: -0.0053 },
  { x: -0.1315, z: 0.0409 },
  { x: -0.1246, z: 0.0104 },
  { x: -0.1228, z: 0.0586 },
  { x: -0.117, z: 0.0444 },
  { x: -0.1103, z: 0.0181 },
  { x: -0.1058, z: 0.056 },
  { x: -0.097, z: 0.0249 },
  { x: -0.0911, z: 0.044200003 },
  { x: -0.0784, z: 0.035400003 },
  { x: -0.075, z: 0.0102 },
  { x: -0.0647, z: 0.0237 },
  { x: -0.058, z: 0.039200004 },
  { x: -0.0404, z: 0.044400003 },
  { x: -0.0327, z: 0.017800003 },
  { x: -0.0253, z: 0.050300006 },
  { x: -0.0133, z: 0.022900004 },
  { x: -0.0085, z: 0.0571 },
  { x: 0.0019, z: -0.001 },
  { x: 0.0019, z: 0.032300003 },
  { x: 0.0041, z: 0.06480001 },
  { x: 0.0145, z: 0.05730001 },
  { x: 0.0155, z: 0.041800003 },
  { x: 0.0175, z: 0.07370001 },
  { x: 0.0191, z: 0.001 },
  { x: 0.0268, z: 0.047100008 },
  { x: 0.0295, z: 0.062800005 },
  { x: 0.0357, z: 0.0077 },
  { x: 0.0418, z: 0.041100003 },
  { x: 0.0423, z: 0.052100006 },
  { x: 0.048, z: 0.0155 },
  { x: 0.0542, z: 0.0316 },
  { x: 0.0567, z: 0.045700002 },
  { x: 0.0712, z: 0.0288 },
  { x: 0.0732, z: 0.039600004 },
  { x: 0.0846, z: 0.0291 },
  { x: 0.0923, z: 0.041300002 },
  { x: 0.0961, z: 0.0276 },
  { x: 0.1082, z: 0.0294 },
  { x: 0.1098, z: 0.044300005 },
  { x: 0.1223, z: 0.033100005 },
];

export const m1ButterflyPositions: TargetLocalPosition[] = unityM1Positions.map(({ x, z }) => ({
  x: x / m1Target.physicalSize.width,
  y: z / m1Target.physicalSize.width,
}));
