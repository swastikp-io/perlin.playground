import { describe, it } from 'vitest';
import { clone, defaults } from './defaults';
import { computeAnimationCoords, sample, render } from './renderer';
import { normalized, perlinForSeed } from '../noise/PerlinNoise';

describe('Performance Benchmark Baseline', () => {
  it('measures sampling and rendering execution time', async () => {
    const config = clone(defaults);
    const mockCtx = {
      globalAlpha: 1,
      getImageData: () => ({ data: new Uint8ClampedArray(config.canvas.width * config.canvas.height * 4) }),
      putImageData: () => {},
    };
    const mockP5 = {
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

    const timeCoords = computeAnimationCoords(config.time);

    // 1. Measure raw PerlinNoise 3D vs 4D fractal calls
    const engine = perlinForSeed(config.seed);
    const settings = {
      octaves: config.noise.octaves,
      persistence: config.noise.falloff,
      lacunarity: config.noise.lacunarity,
      amplitude: config.noise.strength,
    };

    const count = 10000;
    const start3D = performance.now();
    for (let i = 0; i < count; i++) {
      engine.fractal3D(i * 0.01, i * 0.01, 1.0, settings);
    }
    const duration3D = performance.now() - start3D;

    const start4D = performance.now();
    for (let i = 0; i < count; i++) {
      engine.fractal4D(i * 0.01, i * 0.01, 1.0, 0.5, settings);
    }
    const duration4D = performance.now() - start4D;

    console.log(`[BENCHMARK] 10,000 fractal3D calls: ${duration3D.toFixed(2)} ms (${(duration3D / count * 1000).toFixed(2)} µs/call)`);
    console.log(`[BENCHMARK] 10,000 fractal4D calls: ${duration4D.toFixed(2)} ms (${(duration4D / count * 1000).toFixed(2)} µs/call)`);

    // 2. Measure sample() function for 16,000 points
    const samplePoints = 16000;
    const startSample = performance.now();
    for (let i = 0; i < samplePoints; i++) {
      sample(mockP5, config, (i % 900), Math.floor(i / 900) * 8, timeCoords);
    }
    const durationSample = performance.now() - startSample;
    console.log(`[BENCHMARK] ${samplePoints} sample() calls (1 frame): ${durationSample.toFixed(2)} ms`);

    // 2.1 Fast sampler
    const samplerStart = performance.now();
    // Fast simulation: engine + settings in scope
    const rad = config.noise.domainRotation, co = Math.cos(rad), si = Math.sin(rad);
    const scX = config.noise.scale * config.noise.scaleX, scY = config.noise.scale * config.noise.scaleY;
    const offX = config.noise.offsetX, offY = config.noise.offsetY;
    const z4 = timeCoords.z4, w4 = timeCoords.w4;
    for (let i = 0; i < samplePoints; i++) {
      const x = (i % 900), y = Math.floor(i / 900) * 8;
      const rx = x * scX + offX, ry = y * scY + offY;
      const nx = rx * co - ry * si, ny = rx * si + ry * co;
      const v = normalized(engine.fractal4D(nx, ny, z4, w4, settings));
      const clamped = Math.max(0, Math.min(1, (v - 0.5) * config.noise.contrast + 0.5));
    }
    const samplerDuration = performance.now() - samplerStart;
    console.log(`[BENCHMARK] ${samplePoints} direct sampler calls (1 frame): ${samplerDuration.toFixed(2)} ms`);

    // 2.5 Measure mix() function for 16,000 points
    const { mix } = await import('./palettes');
    const startMix = performance.now();
    for (let i = 0; i < samplePoints; i++) {
      mix(config.color.foreground, config.color.secondary, (i % 100) / 100);
    }
    const durationMix = performance.now() - startMix;
    console.log(`[BENCHMARK] ${samplePoints} mix() calls (1 frame): ${durationMix.toFixed(2)} ms`);

    // 3. Measure full render() function (1 frame)
    const renderFrames = 5;
    const startRender = performance.now();
    for (let f = 0; f < renderFrames; f++) {
      config.time.offset = f * 0.016;
      render(mockP5, config);
    }
    const durationRender = (performance.now() - startRender) / renderFrames;
    console.log(`[BENCHMARK] Full render() 1 frame avg: ${durationRender.toFixed(2)} ms (equiv. ${(1000 / durationRender).toFixed(1)} FPS)`);

    // 4. Measure with 8 octaves (max)
    const config8 = clone(config);
    config8.noise.octaves = 8;
    const startRender8 = performance.now();
    for (let f = 0; f < renderFrames; f++) {
      config8.time.offset = f * 0.016;
      render(mockP5, config8);
    }
    const durationRender8 = (performance.now() - startRender8) / renderFrames;
    console.log(`[BENCHMARK] Full render() with 8 octaves avg: ${durationRender8.toFixed(2)} ms (equiv. ${(1000 / durationRender8).toFixed(1)} FPS)`);
  });
});
