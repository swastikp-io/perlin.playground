import { describe, expect, it } from 'vitest';
import { clone, defaults } from './defaults';
import { advanceTimeline } from './animation';
import { computeAnimationCoords, sample, render } from './renderer';
import { safeExportRequest } from './export';
import { perlinForSeed } from '../noise/PerlinNoise';

describe('Real-Time Generative Animation Engine & Renderer', () => {
  it('generates spatially coherent, non-flickering 3D and 4D noise samples', () => {
    const config = clone(defaults);
    const mockP5 = {} as any;

    // Spatial coherence: neighboring spatial points have small delta
    const s1 = sample(mockP5, config, 100, 100);
    const s2 = sample(mockP5, config, 100.5, 100.5);
    expect(Math.abs(s1 - s2)).toBeLessThan(0.05);

    // Temporal coherence: consecutive time frames evolve smoothly
    const tCoords1 = computeAnimationCoords({ ...config.time, offset: 1.0 });
    const tCoords2 = computeAnimationCoords({ ...config.time, offset: 1.016 }); // 16ms later
    const st1 = sample(mockP5, config, 200, 200, tCoords1);
    const st2 = sample(mockP5, config, 200, 200, tCoords2);
    expect(Math.abs(st1 - st2)).toBeLessThan(0.05);
  });

  it('guarantees seamless looping: first and last loop frames match within numerical tolerance', () => {
    const config = clone(defaults);
    config.time.loop = true;
    config.time.loopDuration = 8.0;
    config.time.temporalFrequency = 2;
    config.noise.secondary = true; // Test secondary layer looping
    config.noise.distortion = 0.5; // Test distortion layer looping

    const startCoords = computeAnimationCoords({ ...config.time, offset: 0.0 });
    const endCoords = computeAnimationCoords({ ...config.time, offset: config.time.loopDuration });

    expect(startCoords.z4).toBeCloseTo(endCoords.z4, 12);
    expect(startCoords.w4).toBeCloseTo(endCoords.w4, 12);

    const mockP5 = {} as any;
    for (let x = 50; x <= 450; x += 100) {
      for (let y = 50; y <= 450; y += 100) {
        const valStart = sample(mockP5, config, x, y, startCoords);
        const valEnd = sample(mockP5, config, x, y, endCoords);
        expect(valStart).toBeCloseTo(valEnd, 10);
      }
    }
  });

  it('preserves determinism across identical seeds and parameters', () => {
    const configA = clone(defaults);
    const configB = clone(defaults);
    configA.seed = 'art-test-42';
    configB.seed = 'art-test-42';

    const coordsA = computeAnimationCoords({ ...configA.time, offset: 3.5 });
    const coordsB = computeAnimationCoords({ ...configB.time, offset: 3.5 });

    const mockP5 = {} as any;
    const a = sample(mockP5, configA, 300, 300, coordsA);
    const b = sample(mockP5, configB, 300, 300, coordsB);
    expect(a).toBe(b);

    // Changing seed alters the output
    const configC = clone(defaults);
    configC.seed = 'different-seed-99';
    const c = sample(mockP5, configC, 300, 300, coordsA);
    expect(c).not.toBe(a);
  });

  it('evaluates frame-rate independent animation across 30, 60, and 120 FPS', () => {
    const time = clone(defaults).time;
    time.speed = 1.0;
    time.motionIntensity = 1.5;

    // Simulate 1 second at 30 FPS (30 steps of ~33.33ms)
    let t30 = 0;
    for (let i = 0; i < 30; i++) {
      t30 = advanceTimeline(t30, 1000 / 30, time);
    }

    // Simulate 1 second at 60 FPS (60 steps of ~16.66ms)
    let t60 = 0;
    for (let i = 0; i < 60; i++) {
      t60 = advanceTimeline(t60, 1000 / 60, time);
    }

    // Simulate 1 second at 120 FPS (120 steps of ~8.33ms)
    let t120 = 0;
    for (let i = 0; i < 120; i++) {
      t120 = advanceTimeline(t120, 1000 / 120, time);
    }

    expect(t30).toBeCloseTo(1.5, 5);
    expect(t60).toBeCloseTo(1.5, 5);
    expect(t120).toBeCloseTo(1.5, 5);
    expect(t30).toBeCloseTo(t120, 6);
  });

  it('caps inactive-tab catch-up to avoid sudden large timeline jumps', () => {
    const time = clone(defaults).time;
    // An inactive tab sleeps for 10 seconds (10,000ms)
    const afterSleep = advanceTimeline(2.0, 10000, time);
    // Should be capped at 100ms * speed (0.25) * motionIntensity (1.0) = 0.025s
    expect(afterSleep - 2.0).toBeCloseTo(0.025, 6);
  });

  it('updates live animation parameters without resetting timeline', () => {
    const time = clone(defaults).time;
    const initialTime = 4.25;

    // Adjust speed
    time.speed = 2.0;
    const nextTime = advanceTimeline(initialTime, 16.67, time);
    expect(nextTime).toBeGreaterThan(initialTime);

    // Adjusting spatial noise parameters affects output at same timestamp
    const config = clone(defaults);
    const coords = computeAnimationCoords({ ...config.time, offset: nextTime });
    const mockP5 = {} as any;

    const baseVal = sample(mockP5, config, 200, 200, coords);
    config.noise.scale = 0.03;
    const scaledVal = sample(mockP5, config, 200, 200, coords);
    expect(scaledVal).not.toBe(baseVal);
  });

  it('safely handles high-resolution export configuration without mutating canvas settings', () => {
    const config = clone(defaults);
    config.canvas.width = 800;
    config.canvas.height = 600;

    const req2x = safeExportRequest(config, { multiplier: 2 });
    expect(req2x.width * req2x.multiplier).toBe(1600);
    expect(req2x.height * req2x.multiplier).toBe(1200);

    // Original config remains unmodified
    expect(config.canvas.width).toBe(800);
    expect(config.canvas.height).toBe(600);
  });
});
