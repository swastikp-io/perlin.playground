import type { Config } from './types';

/** Advances elapsed seconds independently of draw cadence and caps background-tab catch-up. */
export const advanceTimeline = (current: number, elapsedMilliseconds: number, time: Config['time']) =>
  current + Math.min(100, Math.max(0, elapsedMilliseconds)) / 1000 * time.speed * time.motionIntensity;
