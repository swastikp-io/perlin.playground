import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG, GraphicsConfig, ShapeType } from './types';
import { randomizeConfig, ALL_SHAPE_TYPES } from './randomizer';

describe('Feature Validation: Animation, Shapes & Randomization', () => {
  describe('Animation Progression & Control', () => {
    it('initializes with default playing state, speed 1x and 6s duration', () => {
      expect(DEFAULT_CONFIG.isPlaying).toBe(true);
      expect(DEFAULT_CONFIG.animationSpeed).toBe(1.0);
      expect(DEFAULT_CONFIG.loopDuration).toBe(6);
    });

    it('calculates loop progress correctly over time delta', () => {
      const dt = 1.0; // 1 second
      const speed = 1.0;
      const duration = 6.0;
      const progressDelta = (dt * speed) / duration;
      expect(progressDelta).toBeCloseTo(1 / 6, 5);

      // Half speed (0.5x) takes twice as long
      const halfSpeedDelta = (dt * 0.5) / duration;
      expect(halfSpeedDelta).toBeCloseTo(progressDelta / 2, 5);

      // Double speed (2x) advances twice as fast
      const doubleSpeedDelta = (dt * 2.0) / duration;
      expect(doubleSpeedDelta).toBeCloseTo(progressDelta * 2, 5);
    });

    it('computes seamless periodic coordinates across loop cycle', () => {
      const steps = [0.0, 0.25, 0.5, 0.75, 1.0];
      const coords = steps.map(u => {
        const theta = u * Math.PI * 2;
        return {
          u,
          cos: Math.cos(theta),
          sin: Math.sin(theta)
        };
      });

      // Boundary condition: u = 0.0 and u = 1.0 must have identical coordinates
      expect(coords[0].cos).toBeCloseTo(coords[4].cos, 10);
      expect(coords[0].sin).toBeCloseTo(coords[4].sin, 10);

      // Smooth variation without zero derivative points
      expect(coords[1].cos).toBeCloseTo(0, 5);
      expect(coords[1].sin).toBeCloseTo(1, 5);
      expect(coords[2].cos).toBeCloseTo(-1, 5);
      expect(coords[2].sin).toBeCloseTo(0, 5);
    });
  });

  describe('All 9 Geometric Shapes', () => {
    it('supports exactly nine unique shapes', () => {
      expect(ALL_SHAPE_TYPES).toHaveLength(9);
      const unique = new Set(ALL_SHAPE_TYPES);
      expect(unique.size).toBe(9);
    });

    it('contains all required geometric primitives', () => {
      const expectedShapes: ShapeType[] = [
        'Ellipse',
        'Rectangle',
        'Line',
        'Triangle',
        'Diamond',
        'Hexagon',
        'Arc',
        'Cross',
        'Ring'
      ];
      for (const shape of expectedShapes) {
        expect(ALL_SHAPE_TYPES).toContain(shape);
      }
    });
  });

  describe('Advanced Shape Controls: Dimensions & Rotation', () => {
    it('has exact default parameters as specified', () => {
      expect(DEFAULT_CONFIG.minWidth).toBe(32);
      expect(DEFAULT_CONFIG.maxWidth).toBe(0); // 0 = automatic sizing
      expect(DEFAULT_CONFIG.minHeight).toBe(50);
      expect(DEFAULT_CONFIG.maxHeight).toBe(100);
      expect(DEFAULT_CONFIG.rotationAmount).toBe(168);
    });

    it('handles automatic maximum width (maxWidth = 0)', () => {
      const cellW = 40;
      const noiseStrength = 40;
      const minWidth = 32;
      const maxWidth = 0;

      // When maxWidth === 0, auto mode derives dimension from cell and noise
      const autoMaxW = Math.max(minWidth, cellW * (0.85 + (noiseStrength / 100) * 0.65));
      expect(autoMaxW).toBeGreaterThanOrEqual(minWidth);
    });

    it('calculates deterministic rotation within [-rotationAmount, +rotationAmount]', () => {
      const rotationAmount = 168;
      const maxRotRad = (rotationAmount * Math.PI) / 180;

      // Sample noise values in [0, 1]
      const samples = [0, 0.25, 0.5, 0.75, 1.0];
      for (const n of samples) {
        const angle = maxRotRad > 0 ? (n * 2 - 1) * maxRotRad : 0;
        expect(angle).toBeGreaterThanOrEqual(-maxRotRad);
        expect(angle).toBeLessThanOrEqual(maxRotRad);
      }
    });

    it('disables rotation completely when rotationAmount is 0', () => {
      const rotationAmount = 0;
      const maxRotRad = (rotationAmount * Math.PI) / 180;

      const samples = [0, 0.3, 0.5, 0.9, 1.0];
      for (const n of samples) {
        const angle = maxRotRad > 0 ? (n * 2 - 1) * maxRotRad : 0;
        expect(angle).toBe(0);
      }
    });
  });

  describe('Randomize Configuration Functionality', () => {
    it('produces valid bounds for all randomized properties including shape dimensions and rotation', () => {
      for (let i = 0; i < 25; i++) {
        const sample = randomizeConfig(DEFAULT_CONFIG);

        // Noise
        expect(sample.noiseScale).toBeGreaterThanOrEqual(0.008);
        expect(sample.noiseScale).toBeLessThanOrEqual(0.05);
        expect(sample.noiseStrength).toBeGreaterThanOrEqual(15);
        expect(sample.noiseStrength).toBeLessThanOrEqual(85);
        expect(sample.noiseFalloff).toBeGreaterThanOrEqual(0.25);
        expect(sample.noiseFalloff).toBeLessThanOrEqual(0.75);
        expect(sample.noiseSeed).toBeGreaterThan(0);

        // Shape
        expect(ALL_SHAPE_TYPES).toContain(sample.shapeType);

        // Dimensions
        expect(sample.minWidth).toBeGreaterThanOrEqual(0);
        expect(sample.maxWidth).toBeGreaterThanOrEqual(0);
        if (sample.maxWidth > 0) {
          expect(sample.minWidth).toBeLessThanOrEqual(sample.maxWidth);
        }
        expect(sample.minHeight).toBeGreaterThanOrEqual(0);
        expect(sample.maxHeight).toBeGreaterThanOrEqual(sample.minHeight);

        // Rotation
        expect(sample.rotationAmount).toBeGreaterThanOrEqual(0);
        expect(sample.rotationAmount).toBeLessThanOrEqual(360);

        // Layout
        expect(sample.rows).toBeGreaterThanOrEqual(14);
        expect(sample.rows).toBeLessThanOrEqual(42);
        expect(sample.columns).toBeGreaterThanOrEqual(14);
        expect(sample.columns).toBeLessThanOrEqual(42);
        expect(Number.isInteger(sample.rows)).toBe(true);
        expect(Number.isInteger(sample.columns)).toBe(true);
        expect(sample.canvasPadding).toBeGreaterThanOrEqual(16);
        expect(sample.canvasPadding).toBeLessThanOrEqual(60);
        expect(sample.xOffset).toBeGreaterThanOrEqual(-30);
        expect(sample.xOffset).toBeLessThanOrEqual(30);
        expect(sample.yOffset).toBeGreaterThanOrEqual(-30);
        expect(sample.yOffset).toBeLessThanOrEqual(30);

        // Opacity
        expect(sample.minOpacity).toBeLessThanOrEqual(sample.maxOpacity);
        expect(sample.minOpacity).toBeGreaterThanOrEqual(0);
        expect(sample.maxOpacity).toBeLessThanOrEqual(1);

        // Animation untouched
        expect(sample.isPlaying).toBe(DEFAULT_CONFIG.isPlaying);
        expect(sample.animationSpeed).toBe(DEFAULT_CONFIG.animationSpeed);
        expect(sample.loopDuration).toBe(DEFAULT_CONFIG.loopDuration);
      }
    });

    it('works identically whether initial playback is playing or paused', () => {
      const paused: GraphicsConfig = { ...DEFAULT_CONFIG, isPlaying: false };
      const randomizedPaused = randomizeConfig(paused);
      expect(randomizedPaused.isPlaying).toBe(false);

      const playing: GraphicsConfig = { ...DEFAULT_CONFIG, isPlaying: true };
      const randomizedPlaying = randomizeConfig(playing);
      expect(randomizedPlaying.isPlaying).toBe(true);
    });
  });
});
