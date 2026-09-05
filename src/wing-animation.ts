export interface WingMotionSample {
  leftFlap: number;
  rightFlap: number;
  leftTilt: number;
  rightTilt: number;
  bodyScale: number;
}

export interface WingAnimationOptions {
  speed: number;
  amplitude: number;
  burst: number;
}

export function sampleWingMotion(time: number, phase: number, options: WingAnimationOptions): WingMotionSample {
  // 群飛是位置上的短暫爆發，不讓它把揮翅頻率一起推得太快。
  const burstBoost = 1 + options.burst * 0.18;
  const frequency = (1.15 + (Math.sin(phase * 1.7) + 1) * 0.13) * options.speed * burstBoost;
  const cycle = time * Math.PI * 2 * frequency + phase;
  const primary = (Math.sin(cycle) + 1) / 2;
  const secondary = (Math.sin(cycle * 2.07 + 1.3) + 1) / 2;
  const asymmetry = Math.sin(time * 1.1 + phase * 2.4) * 0.055;
  const flap = 0.13 + primary * (0.72 + options.amplitude * 0.53) + secondary * 0.08;

  return {
    leftFlap: flap + asymmetry,
    rightFlap: flap - asymmetry,
    leftTilt: -0.08 + Math.sin(cycle * 0.51 + 0.7) * 0.08,
    rightTilt: 0.08 + Math.sin(cycle * 0.51 + 2.5) * 0.08,
    bodyScale: 1 + Math.sin(cycle + 0.4) * 0.018,
  };
}
