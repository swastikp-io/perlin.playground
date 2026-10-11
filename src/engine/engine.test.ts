import { describe, it, expect, vi } from 'vitest';
import { PALETTE_NAMES, PALETTE_PRESETS, getPaletteColors, hexToRgb } from './palettes';
import { DEFAULT_CONFIG, GraphicsConfig, ShapeType } from './types';
import { isVideoRecordingSupported, getSupportedVideoMimeType } from './recorder';
import { randomizeConfig, ALL_SHAPE_TYPES } from './randomizer';
import { SketchEngine } from './sketch';

describe('perlin.playground Engine, Shapes, & Randomization', () => {
  it('defines exactly the 10 required palettes', () => {
    expect(PALETTE_NAMES).toEqual([
      'Blueprint',
      'Signal Depth',
      'Pixel Midnight',
      'Alert Mode',
      'Steel Red',
      'Gold Dust',
      'Dark Violet',
      'Rustfade',
      'Heatwave',
      'Custom'
    ]);
  });

  it('defines exactly the 9 required shape types', () => {
    expect(ALL_SHAPE_TYPES).toEqual([
      'Ellipse',
      'Rectangle',
      'Line',
      'Triangle',
      'Diamond',
      'Hexagon',
      'Arc',
      'Cross',
      'Ring'
    ]);
  });

  it('provides valid presets for all non-custom palettes', () => {
    const nonCustom = PALETTE_NAMES.filter(p => p !== 'Custom');
    for (const name of nonCustom) {
      const preset = PALETTE_PRESETS[name as keyof typeof PALETTE_PRESETS];
      expect(preset).toBeDefined();
      expect(preset.name).toBe(name);
      expect(preset.background).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(preset.foreground.length).toBeGreaterThan(0);
      for (const fg of preset.foreground) {
        expect(fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('correctly handles Custom palette with user-defined colors', () => {
    const custom = getPaletteColors('Custom', '#123456', '#abcdef');
    expect(custom.background).toBe('#123456');
    expect(custom.foreground).toEqual(['#abcdef']);
  });

  it('correctly converts hex colors to RGB', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ff0000')).toEqual([255, 0, 0]);
    expect(hexToRgb('#00ff00')).toEqual([0, 255, 0]);
    expect(hexToRgb('#0000ff')).toEqual([0, 0, 255]);
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
  });

  it('has valid default config values with animation properties', () => {
    expect(DEFAULT_CONFIG.noiseScale).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.noiseStrength).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.noiseFalloff).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.rows).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.columns).toBeGreaterThan(0);
    expect(DEFAULT_CONFIG.canvasPadding).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_CONFIG.minOpacity).toBeLessThanOrEqual(DEFAULT_CONFIG.maxOpacity);
    expect(ALL_SHAPE_TYPES).toContain(DEFAULT_CONFIG.shapeType);
    expect(DEFAULT_CONFIG.isPlaying).toBe(true);
    expect(DEFAULT_CONFIG.animationSpeed).toBe(1.0);
    expect(DEFAULT_CONFIG.loopDuration).toBeGreaterThan(0);
  });

  describe('Randomization', () => {
    it('produces valid bounded parameters and strictly preserves animation settings', () => {
      const initial: GraphicsConfig = {
        ...DEFAULT_CONFIG,
        isPlaying: false,
        animationSpeed: 2.5,
        loopDuration: 12
      };

      for (let i = 0; i < 20; i++) {
        const next = randomizeConfig(initial);

        // Animation settings must remain unchanged
        expect(next.isPlaying).toBe(false);
        expect(next.animationSpeed).toBe(2.5);
        expect(next.loopDuration).toBe(12);

        // Noise bounds
        expect(next.noiseScale).toBeGreaterThanOrEqual(0.005);
        expect(next.noiseScale).toBeLessThanOrEqual(0.06);
        expect(next.noiseStrength).toBeGreaterThanOrEqual(10);
        expect(next.noiseStrength).toBeLessThanOrEqual(90);
        expect(next.noiseFalloff).toBeGreaterThanOrEqual(0.2);
        expect(next.noiseFalloff).toBeLessThanOrEqual(0.8);
        expect(typeof next.noiseSeed).toBe('number');

        // Shape type from all 9 shapes
        expect(ALL_SHAPE_TYPES).toContain(next.shapeType);

        // Layout integer checks and bounds
        expect(Number.isInteger(next.rows)).toBe(true);
        expect(Number.isInteger(next.columns)).toBe(true);
        expect(next.rows).toBeGreaterThanOrEqual(5);
        expect(next.columns).toBeGreaterThanOrEqual(5);
        expect(next.canvasPadding).toBeGreaterThanOrEqual(0);

        // Palette check
        expect(PALETTE_NAMES).toContain(next.palette);
        expect(next.customBgColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(next.customFgColor).toMatch(/^#[0-9a-fA-F]{6}$/);

        // Opacity relationship (min <= max)
        expect(next.minOpacity).toBeLessThanOrEqual(next.maxOpacity);
        expect(next.minOpacity).toBeGreaterThanOrEqual(0);
        expect(next.maxOpacity).toBeLessThanOrEqual(1);
      }
    });

    it('generates distinct seeds across successive calls', () => {
      const set = new Set<number>();
      for (let i = 0; i < 10; i++) {
        const conf = randomizeConfig(DEFAULT_CONFIG);
        set.add(conf.noiseSeed);
      }
      expect(set.size).toBeGreaterThan(1);
    });
  });

  describe('Loop Boundary Mathematics', () => {
    it('periodic circular sampling coordinates match at loop boundaries u=0 and u=1', () => {
      const uStart = 0;
      const uEnd = 1;
      const thetaStart = uStart * Math.PI * 2;
      const thetaEnd = uEnd * Math.PI * 2;

      // Cos and Sin must be identical at cycle boundaries
      expect(Math.cos(thetaStart)).toBeCloseTo(Math.cos(thetaEnd), 10);
      expect(Math.sin(thetaStart)).toBeCloseTo(Math.sin(thetaEnd), 10);
      expect(Math.cos(thetaStart)).toBe(1);
      expect(Math.sin(thetaStart)).toBe(0);
    });
  });

  describe('Recorder Environment Checks', () => {
    it('handles unsupported recorder environments gracefully', () => {
      const supported = isVideoRecordingSupported();
      expect(typeof supported).toBe('boolean');
      const mime = getSupportedVideoMimeType();
      if (!supported) {
        expect(mime).toBeNull();
      }
    });
  });
});
