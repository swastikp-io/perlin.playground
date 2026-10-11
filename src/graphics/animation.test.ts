import { describe, expect, it } from 'vitest';
import { defaults, clone } from './defaults';
import { advanceTimeline } from './animation';
import { animationCoordinate } from './renderer';

describe('animation timing', () => {
  it('is frame-rate independent and caps inactive-tab catch-up', () => {
    const time = clone(defaults).time;
    const at30 = Array.from({ length: 30 }).reduce<number>((value) => advanceTimeline(value, 1000 / 30, time), 0);
    const at120 = Array.from({ length: 120 }).reduce<number>((value) => advanceTimeline(value, 1000 / 120, time), 0);
    expect(at30).toBeCloseTo(at120, 10);
    expect(advanceTimeline(5, 3000, time) - 5).toBeCloseTo(0.025, 12);
  });

  it('returns to exactly the same periodic Perlin coordinate at loop boundaries', () => {
    const time = clone(defaults).time;
    time.offset = 0;
    const start = animationCoordinate(time);
    time.offset = time.loopDuration;
    expect(animationCoordinate(time)).toBeCloseTo(start, 12);
    time.offset = time.loopDuration * 3;
    expect(animationCoordinate(time)).toBeCloseTo(start, 12);
  });
});
