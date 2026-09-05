import { m1Target, targetManifest } from './target-manifest';

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

// M2-M5 positions are extracted from the corresponding Unity prefabs. Their x/z plane
// maps to MindAR's target-local x/y plane, just like M1 above.
const unityPositionsByTargetId: Record<string, UnityM1Position[]> = {
  M2: [
    { x: 0.026799971, z: 0.1338 }, { x: 0.0288, z: 0.0452 }, { x: -0.0158, z: 0.0972 },
    { x: -0.010900029, z: 0.110999994 }, { x: -0.0102, z: 0.0615 }, { x: 0.0015999712, z: 0.1228 },
    { x: -0.014500029, z: 0.07699999 }, { x: 0.04579997, z: 0.0861 }, { x: 0.023199972, z: 0.085099995 },
    { x: 0.05859997, z: 0.058399998 }, { x: 0.0257, z: 0.0601 }, { x: 0.0216, z: 0.1039 },
    { x: 0.04269997, z: 0.0995 }, { x: -0.00070002885, z: 0.0853 }, { x: 0.05639997, z: 0.110999994 },
    { x: 0.03349997, z: 0.113299996 }, { x: 0.023199972, z: 0.085099995 }, { x: -0.0013, z: 0.0465 },
    { x: 0.008799971, z: 0.0945 }, { x: 0.0676, z: 0.0966 }, { x: 0.0727, z: 0.0706 },
    { x: 0.0402, z: 0.1307 }, { x: 0.0244, z: 0.0727 }, { x: 0.049399972, z: 0.0714 },
    { x: -0.0278, z: 0.0649 }, { x: 0.011999971, z: 0.1285 }, { x: 0.0712, z: 0.0845 },
    { x: 0.0496, z: 0.1232 },
  ],
  M3: [
    { x: 0.3133, z: 0.093 }, { x: 0.344, z: 0.1363 }, { x: 0.3194, z: 0.1084 },
    { x: 0.2443, z: 0.104 }, { x: 0.2663, z: 0.0969 }, { x: 0.3818, z: 0.1004 },
    { x: 0.2826, z: 0.1375 }, { x: 0.2296, z: 0.0965 }, { x: 0.1813, z: 0.0771 },
    { x: 0.3684, z: 0.1125 }, { x: 0.3017, z: 0.1302 }, { x: 0.3337, z: 0.1274 },
    { x: 0.3038, z: 0.1577 }, { x: 0.3109, z: 0.1421 }, { x: 0.1969, z: 0.0837 },
    { x: 0.3297, z: 0.1465 }, { x: 0.2935, z: 0.1479 }, { x: 0.2522, z: 0.0816 },
    { x: 0.308, z: 0.0791 }, { x: 0.2591, z: 0.1136 }, { x: 0.2718, z: 0.1265 },
    { x: 0.293, z: 0.1202 }, { x: 0.2818, z: 0.1059 }, { x: 0.214, z: 0.0883 },
    { x: 0.3163, z: 0.1557 }, { x: 0.3269, z: 0.1179 }, { x: 0.354, z: 0.1242 },
    { x: 0.308, z: 0.0791 }, { x: 0.3818, z: 0.1004 },
  ],
  M4: [
    { x: 0.0312, z: 0.0449 }, { x: 0.0261, z: 0.0711 }, { x: 0.0042, z: 0.0676 },
    { x: -0.0279, z: 0.0592 }, { x: -0.0264, z: 0.0695 }, { x: -0.0243, z: 0.0803 },
    { x: 0.0111, z: 0.077 }, { x: -0.0033, z: 0.0279 }, { x: -0.0279, z: 0.0592 },
    { x: 0.0052, z: 0.101 }, { x: -0.0031, z: 0.0816 }, { x: -0.0326, z: 0.043 },
    { x: -0.0277, z: 0.0256 }, { x: -0.0083, z: 0.0974 }, { x: 0.0335, z: 0.0311 },
    { x: -0.0183, z: 0.0905 }, { x: -0.004, z: 0.0542 }, { x: 0.0295, z: 0.0592 },
    { x: 0.0062, z: 0.0876 }, { x: -0.0039, z: 0.0429 },
  ],
  M5: [
    { x: 0.0051, z: 0.0103 }, { x: -0.0047, z: -0.0106 }, { x: 0.019, z: -0.0051 },
    { x: -0.0424, z: -0.0109 }, { x: -0.0273, z: -0.0013 }, { x: -0.005, z: -0.0482 },
    { x: -0.0001, z: -0.0402 }, { x: 0.0138, z: 0.0195 }, { x: -0.03, z: -0.014 },
    { x: 0.0183, z: -0.0179 }, { x: 0.0219, z: -0.028 }, { x: -0.0515, z: -0.0177 },
    { x: -0.0012, z: -0.0008 }, { x: -0.0115, z: -0.0213 }, { x: -0.007, z: 0.0272 },
    { x: 0.0239, z: 0.0089 }, { x: -0.0196, z: 0.0079 }, { x: 0.0386, z: -0.0133 },
    { x: 0.0355, z: -0.0389 }, { x: 0.0015, z: 0.0344 }, { x: -0.0119, z: 0.018 },
    { x: 0.0322, z: -0.0012 }, { x: 0.01, z: -0.0314 },
  ],
};

function normalizePositions(targetId: string, positions: UnityM1Position[]): TargetLocalPosition[] {
  const target = targetManifest.targets.find((item) => item.id === targetId);
  if (!target) throw new Error(`Missing target definition for ${targetId}.`);
  return positions.map(({ x, z }) => ({
    x: x / target.physicalSize.width,
    y: z / target.physicalSize.width,
  }));
}

export const butterflyPositionsByTargetId: Record<string, TargetLocalPosition[]> = {
  M1: m1ButterflyPositions,
  ...Object.fromEntries(
    Object.entries(unityPositionsByTargetId).map(([targetId, positions]) => [targetId, normalizePositions(targetId, positions)]),
  ),
};
