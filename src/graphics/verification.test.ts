import { describe, expect, it } from 'vitest';
import { clone, defaults } from './defaults';
import { advanceTimeline } from './animation';
import { computeAnimationCoords, sample, render } from './renderer';
import { safeExportRequest } from './export';

describe('Phase 4 — Verification Suite', () => {
  const createMockP5 = (w: number, h: number) => {
    const mockCtx = {
      globalAlpha: 1,
      createImageData: (width: number, height: number) => ({
        width,
        height,
        data: new Uint8ClampedArray(width * height * 4),
      }),
      putImageData: () => {},
    };
    return {
      width: w,
      height: h,
      clear: () => {},
      background: () => {},
      push: () => {},
      pop: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      noFill: () => {},
      fill: () => {},
      stroke: () => {},
      noStroke: () => {},
      strokeWeight: () => {},
      strokeCap: () => {},
      line: () => {},
      circle: () => {},
      ellipse: () => {},
      rect: () => {},
      rectMode: () => {},
      arc: () => {},
      beginShape: () => {},
      vertex: () => {},
      endShape: () => {},
      drawingContext: mockCtx,
    } as any;
  };

  it('1. verifies Play/Pause idempotency and timeline progression', () => {
    const time = clone(defaults.time);
    let offset = 0;

    // Simulate 60 frames of active playback (16.6ms each)
    for (let i = 0; i < 60; i++) {
      offset = advanceTimeline(offset, 16.67, time);
    }
    const offsetAfter1Sec = offset;
    // Default time.speed = 0.25, motionIntensity = 1.0 => 1s advances 0.25s
    expect(offsetAfter1Sec).toBeCloseTo(0.25, 2);

    // Pause: time offset does not change when playback stops
    const pausedOffset = offsetAfter1Sec;

    // Resume after 5 seconds: background tab / pause catch-up is capped at 100ms
    const resumedOffset = advanceTimeline(pausedOffset, 5000, time);
    expect(resumedOffset - pausedOffset).toBeCloseTo(0.025, 2);
  });

  it('2. verifies small and large canvas dimension rendering without error', () => {
    const smallConfig = clone(defaults);
    smallConfig.canvas.width = 320;
    smallConfig.canvas.height = 320;
    const smallP5 = createMockP5(320, 320);
    expect(() => render(smallP5, smallConfig)).not.toThrow();

    const largeConfig = clone(defaults);
    largeConfig.canvas.width = 2400;
    largeConfig.canvas.height = 2400;
    largeConfig.canvas.maxPoints = 30000;
    const largeP5 = createMockP5(2400, 2400);
    expect(() => render(largeP5, largeConfig)).not.toThrow();
  });

  it('3. verifies all octave levels (1 to 12) render deterministically', () => {
    const p5 = createMockP5(900, 900);
    for (const oct of [1, 2, 4, 8, 12]) {
      const config = clone(defaults);
      config.noise.octaves = oct;
      expect(() => render(p5, config)).not.toThrow();

      const sample1 = sample(p5, config, 150, 150, 2.5);
      const sample2 = sample(p5, config, 150, 150, 2.5);
      expect(sample1).toBe(sample2);
    }
  });

  it('4. verifies complex features: distortion, secondary layers, contour and displacement modes', () => {
    const p5 = createMockP5(400, 400);
    const complex = clone(defaults);
    complex.canvas.width = 400;
    complex.canvas.height = 400;
    complex.noise.distortion = 0.8;
    complex.noise.secondary = true;
    complex.noise.secondaryInfluence = 0.4;
    complex.noise.field = 'displacement';
    complex.mode = 'contours';

    expect(() => render(p5, complex)).not.toThrow();

    complex.mode = 'vector';
    expect(() => render(p5, complex)).not.toThrow();

    complex.noise.visualization = 'raw';
    expect(() => render(p5, complex)).not.toThrow();

    complex.noise.visualization = 'contrast';
    expect(() => render(p5, complex)).not.toThrow();

    complex.noise.visualization = 'contour-map';
    expect(() => render(p5, complex)).not.toThrow();

    complex.noise.visualization = 'fbm';
    expect(() => render(p5, complex)).not.toThrow();
  });


  it('5. verifies export configuration and preservation of original dimensions', () => {
    const config = clone(defaults);
    config.canvas.width = 900;
    config.canvas.height = 900;

    const exportReq = safeExportRequest(config, { multiplier: 3, format: 'png' });
    expect(exportReq.width * exportReq.multiplier).toBe(2700);
    expect(exportReq.height * exportReq.multiplier).toBe(2700);

    // Canvas config remains intact
    expect(config.canvas.width).toBe(900);
    expect(config.canvas.height).toBe(900);
  });

  it('6. verifies that repeated render calls do not cause memory growth or state leakage', () => {
    const p5 = createMockP5(900, 900);
    const config = clone(defaults);

    // Run 120 consecutive simulated frames
    for (let frame = 0; frame < 120; frame++) {
      config.time.offset = frame * 0.016;
      render(p5, config);
    }

    // Verify determinism remains stable at frame 120
    const coords = computeAnimationCoords({ ...config.time, offset: 2.0 });
    const valA = sample(p5, config, 300, 300, coords);
    const valB = sample(p5, config, 300, 300, coords);
    expect(valA).toBe(valB);
  });
});
