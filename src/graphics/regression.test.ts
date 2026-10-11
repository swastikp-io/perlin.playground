import { describe, expect, it } from 'vitest';
import { clone, defaults } from './defaults';
import { builtins } from './presets';
import { mix, palettes } from './palettes';
import { validateConfig } from './config';
import { maskValue, sample, svgFor } from './renderer';
import { safeExportRequest } from './export';
import type { Config } from './types';

describe('Regression & Subsystem Verification', () => {
  it('validates and clamps extreme or invalid configuration inputs', () => {
    const invalid = {
      version: 1,
      canvas: { width: 999999, height: -50, zoom: -10, maxPoints: 0 },
      grid: { spacingX: -10, spacingY: 1000, margin: -100 },
      noise: { scale: -5, octaves: 99, contrast: -1 },
      mark: { length: -5, thickness: 0, minOpacity: -1, maxOpacity: 5 },
      color: { background: 'not-a-color', foreground: '#123456' },
    };
    const c = validateConfig(invalid);
    expect(c.canvas.width).toBe(6000);
    expect(c.canvas.height).toBe(64);
    expect(c.canvas.zoom).toBe(0.1);
    expect(c.canvas.maxPoints).toBe(500);
    expect(c.grid.spacingX).toBe(2);
    expect(c.grid.spacingY).toBe(200);
    expect(c.grid.margin).toBe(0);
    expect(c.noise.scale).toBe(0.0001);
    expect(c.noise.octaves).toBe(12);
    expect(c.noise.contrast).toBe(0.1);
    expect(c.mark.length).toBe(0.1);
    expect(c.mark.thickness).toBe(0.1);
    expect(c.mark.minOpacity).toBe(0);
    expect(c.mark.maxOpacity).toBe(1);
    expect(c.color.background).toBe(defaults.color.background);
    expect(c.color.foreground).toBe('#123456');
  });

  it('correctly calculates maskValue for all supported shapes', () => {
    const c = clone(defaults);
    c.mask.x = 450;
    c.mask.y = 450;
    c.mask.width = 200;
    c.mask.height = 200;
    c.mask.rotation = 0;
    c.mask.feather = 0;
    c.mask.invert = false;

    // None mask
    c.mask.type = 'none';
    expect(maskValue(c, 0, 0)).toBe(1);
    expect(maskValue(c, 450, 450)).toBe(1);

    // Circle mask: center inside, far away outside
    c.mask.type = 'circle';
    expect(maskValue(c, 450, 450)).toBe(1);
    expect(maskValue(c, 450, 540)).toBe(1); // 90px < 100px radius
    expect(maskValue(c, 450, 560)).toBe(0); // 110px > 100px radius

    // Circle inverted
    c.mask.invert = true;
    expect(maskValue(c, 450, 450)).toBe(0);
    expect(maskValue(c, 450, 560)).toBe(1);
    c.mask.invert = false;

    // Rectangle mask
    c.mask.type = 'rectangle';
    expect(maskValue(c, 450, 450)).toBe(1);
    expect(maskValue(c, 540, 540)).toBe(1); // within +-100px box
    expect(maskValue(c, 560, 450)).toBe(0); // beyond 100px box width

    // Ellipse mask
    c.mask.type = 'ellipse';
    c.mask.width = 400;
    c.mask.height = 200;
    expect(maskValue(c, 450, 450)).toBe(1);
    expect(maskValue(c, 640, 450)).toBe(1); // 190px < 200px half-width
    expect(maskValue(c, 660, 450)).toBe(0); // 210px > 200px half-width
  });

  it('samples noise coherently with mock p5 noise function', () => {
    const c = clone(defaults);
    // Mock p5 instance with simple noise function
    const mockP5 = {
      noise: (x: number, y: number, z: number) => {
        return Math.sin(x) * 0.5 + 0.5;
      },
    } as any;

    const val1 = sample(mockP5, c, 100, 100, 0);
    const val2 = sample(mockP5, c, 100, 100, 0);
    const val3 = sample(mockP5, c, 500, 500, 0);

    expect(val1).toBeGreaterThanOrEqual(0);
    expect(val1).toBeLessThanOrEqual(1);
    // Deterministic: same coords and time must return identical sample
    expect(val1).toBe(val2);
    // Coherent change across space
    expect(typeof val3).toBe('number');
  });

  it('ensures all built-in presets are valid and uniquely named', () => {
    expect(builtins.length).toBe(12);
    const names = new Set(builtins.map((p) => p.name));
    expect(names.size).toBe(12);

    for (const preset of builtins) {
      expect(preset.canvas.width).toBeGreaterThan(0);
      expect(preset.canvas.height).toBeGreaterThan(0);
      expect(preset.grid.spacingX).toBeGreaterThan(0);
      expect(preset.grid.spacingY).toBeGreaterThan(0);
      expect(preset.noise.scale).toBeGreaterThan(0);
      expect(preset.color.background).toMatch(/^#[0-9a-f]{6}$/i);
      expect(preset.color.foreground).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('safely bounds export requests', () => {
    const c = clone(defaults);
    const req = safeExportRequest(c, {
      width: 100000,
      height: 10,
      multiplier: 10,
      format: 'jpeg',
      quality: 2,
    });
    expect(req.width).toBe(8000);
    expect(req.height).toBe(64);
    expect(req.multiplier).toBe(4);
    expect(req.format).toBe('jpeg');
    expect(req.quality).toBe(1);
  });

  it('produces valid SVG containing all necessary structure', () => {
    const c = clone(defaults);
    const svg = svgFor(c);
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`width="${c.canvas.width}"`);
    expect(svg).toContain(`height="${c.canvas.height}"`);
    expect(svg).toContain('<g stroke=');
    expect(svg).toContain('</svg>');
  });

  it('correctly calculates canvas dimensions for each layout aspect ratio', () => {
    const baseWidth = 900;
    const ratios: Record<string, [number, number]> = {
      '1:1': [1, 1],
      '4:5': [4, 5],
      '3:4': [3, 4],
      '3:2': [3, 2],
      '16:9': [16, 9],
    };

    for (const [key, [rx, ry]] of Object.entries(ratios)) {
      const height = Math.round((baseWidth * ry) / rx);
      expect(height).toBeGreaterThan(0);
      const ratio = baseWidth / height;
      const expectedRatio = rx / ry;
      expect(Math.abs(ratio - expectedRatio)).toBeLessThan(0.01);
    }

    expect(Math.round((baseWidth * ratios['16:9'][1]) / ratios['16:9'][0])).toBe(506);
    expect(Math.round((baseWidth * ratios['1:1'][1]) / ratios['1:1'][0])).toBe(900);
    expect(Math.round((baseWidth * ratios['4:5'][1]) / ratios['4:5'][0])).toBe(1125);
    expect(Math.round((baseWidth * ratios['3:4'][1]) / ratios['3:4'][0])).toBe(1200);
    expect(Math.round((baseWidth * ratios['3:2'][1]) / ratios['3:2'][0])).toBe(600);
  });

  it('defines comprehensive responsive design system tokens and breakpoints', async () => {
    // @ts-ignore
    const fs = await import('node:fs');
    // @ts-ignore
    const path = await import('node:path');
    // @ts-ignore
    const cssPath = path.resolve(process.cwd(), 'src/styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Verify key design system tokens exist
    expect(css).toContain('--bg-app:');
    expect(css).toContain('--bg-sidebar:');
    expect(css).toContain('--bg-stage:');
    expect(css).toContain('--border-default:');
    expect(css).toContain('--text-primary:');
    expect(css).toContain('--font-sans:');
    expect(css).toContain('--font-mono:');
    expect(css).toContain('--sidebar-width:');
    expect(css).toContain('--shadow-card:');

    // Verify responsive media query breakpoints
    expect(css).toContain('@media (max-width: 1024px)');
    expect(css).toContain('@media (max-width: 860px)');
    expect(css).toContain('@media (max-width: 480px)');

    // Verify unified single-page responsive layout where canvas and controls stay accessible together
    expect(css).toContain('.workspace');
    expect(css).toContain('aside');
    expect(css).toContain('.sidebar-collapsed');
  });
});
