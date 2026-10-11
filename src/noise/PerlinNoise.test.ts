import { describe, expect, it } from 'vitest';
import { PerlinNoise, normalized } from './PerlinNoise';

describe('seeded gradient Perlin noise', () => {
  const a = new PerlinNoise('correctness-seed');
  it('is deterministic and varies by seed', () => {
    expect(a.noise2D(1.25, -3.75)).toBe(a.noise2D(1.25, -3.75));
    expect(a.noise2D(1.25, -3.75)).not.toBe(new PerlinNoise('other-seed').noise2D(1.25, -3.75));
  });
  it('is zero on integer lattice corners', () => {
    expect(a.noise2D(-4, 7)).toBeCloseTo(0, 12);
    expect(a.noise3D(2, -3, 9)).toBeCloseTo(0, 12);
    expect(a.noise4D(1, -2, 5, -8)).toBeCloseTo(0, 12);
  });
  it('is continuous across lattice boundaries, including negative coordinates', () => {
    expect(a.noise2D(1 - 1e-6, -0.3)).toBeCloseTo(a.noise2D(1 + 1e-6, -0.3), 4);
    expect(a.noise2D(-0.001, 2.2)).not.toBe(a.noise2D(0.001, 2.2));
    expect(a.noise4D(1 - 1e-6, 2, -1, 0.5)).toBeCloseTo(a.noise4D(1 + 1e-6, 2, -1, 0.5), 4);
  });
  it('has finite, spatially coherent 2D, 3D, and 4D output', () => {
    const near = Math.abs(a.noise2D(2.1, 4.2) - a.noise2D(2.101, 4.201));
    expect(near).toBeLessThan(0.02);
    expect(Math.abs(a.noise3D(1, 2, 0.1) - a.noise3D(1, 2, 0.101))).toBeLessThan(0.02);
    expect(Math.abs(a.noise4D(1, 2, 0.1, 0.2) - a.noise4D(1, 2, 0.101, 0.201))).toBeLessThan(0.02);
    for (let x = -5; x <= 5; x += 0.125) expect(Number.isFinite(a.noise2D(x, x * 0.7))).toBe(true);
  });
  it('normalizes fBm to the documented rendering range', () => {
    for (let x = -3; x < 3; x += 0.1) {
      const value = a.fractal2D(x, x * 1.31, { octaves: 5, persistence: 0.5, lacunarity: 2 });
      expect(normalized(value)).toBeGreaterThanOrEqual(0);
      expect(normalized(value)).toBeLessThanOrEqual(1);

      const val4 = a.fractal4D(x, x * 0.7, 0.5, 0.5, { octaves: 4, persistence: 0.5, lacunarity: 2 });
      expect(normalized(val4)).toBeGreaterThanOrEqual(0);
      expect(normalized(val4)).toBeLessThanOrEqual(1);
    }
  });
  it('keeps fBm deterministic while its parameters affect the field', () => {
    const base = { octaves: 1, persistence: 0.5, lacunarity: 2 };
    const single = a.fractal2D(0.37, 0.81, base);
    expect(single).toBeCloseTo(a.noise2D(0.37, 0.81), 12);
    expect(a.fractal2D(0.37, 0.81, { ...base, octaves: 5 })).not.toBeCloseTo(single, 6);
    expect(a.fractal2D(0.37, 0.81, { ...base, octaves: 5, persistence: 0.8 })).not.toBeCloseTo(a.fractal2D(0.37, 0.81, { ...base, octaves: 5 }), 6);
    expect(a.fractal2D(0.37, 0.81, { ...base, octaves: 5, lacunarity: 3 })).not.toBeCloseTo(a.fractal2D(0.37, 0.81, { ...base, octaves: 5 }), 6);

    const f4Single = a.fractal4D(0.2, 0.4, 0.6, 0.8, base);
    expect(f4Single).toBeCloseTo(a.noise4D(0.2, 0.4, 0.6, 0.8), 12);
    expect(a.fractal4D(0.2, 0.4, 0.6, 0.8, { ...base, octaves: 4 })).not.toBeCloseTo(f4Single, 6);
  });
});
