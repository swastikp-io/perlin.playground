/**
 * Seeded improved Perlin noise. Values returned by noise2D/noise3D are signed;
 * normalized() maps the conservative [-1, 1] rendering convention to [0, 1].
 */
export type FractalSettings = {
  octaves: number;
  persistence: number;
  lacunarity: number;
  amplitude?: number;
};

const gradients2 = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [Math.SQRT1_2, Math.SQRT1_2], [-Math.SQRT1_2, Math.SQRT1_2],
  [Math.SQRT1_2, -Math.SQRT1_2], [-Math.SQRT1_2, -Math.SQRT1_2],
] as const;
const gradients3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
] as const;

// 32 hyperoctahedral 4D gradient vectors for seamless periodic animation
const SQRT1_3 = 0.5773502691896257;
const gradients4 = [
  [1, 1, 1, 0], [-1, 1, 1, 0], [1, -1, 1, 0], [-1, -1, 1, 0],
  [1, 1, -1, 0], [-1, 1, -1, 0], [1, -1, -1, 0], [-1, -1, -1, 0],
  [1, 1, 0, 1], [-1, 1, 0, 1], [1, -1, 0, 1], [-1, -1, 0, 1],
  [1, 1, 0, -1], [-1, 1, 0, -1], [1, -1, 0, -1], [-1, -1, 0, -1],
  [1, 0, 1, 1], [-1, 0, 1, 1], [1, 0, -1, 1], [-1, 0, -1, 1],
  [1, 0, 1, -1], [-1, 0, 1, -1], [1, 0, -1, -1], [-1, 0, -1, -1],
  [0, 1, 1, 1], [0, -1, 1, 1], [0, 1, -1, 1], [0, -1, -1, 1],
  [0, 1, 1, -1], [0, -1, 1, -1], [0, 1, -1, -1], [0, -1, -1, -1],
] as const;

const hashSeed = (seed: string | number) => {
  const source = String(seed);
  let value = 2166136261;
  for (let i = 0; i < source.length; i++) value = Math.imul(value ^ source.charCodeAt(i), 16777619);
  return value >>> 0 || 1;
};
const random = (state: { value: number }) => {
  state.value = (Math.imul(1664525, state.value) + 1013904223) >>> 0;
  return state.value / 0x100000000;
};
export const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
export const normalized = (signed: number, outputScale = 0.7) => clamp01(0.5 + signed * outputScale);

export class PerlinNoise {
  private readonly permutation = new Uint8Array(512);

  constructor(seed: string | number) {
    const values = Array.from({ length: 256 }, (_, index) => index);
    const state = { value: hashSeed(seed) };
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random(state) * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    for (let i = 0; i < 512; i++) this.permutation[i] = values[i & 255];
  }

  noise2D(x: number, y: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const u = x - x0, v = y - y0;
    const xi = x0 & 255, yi = y0 & 255;
    const aa = this.permutation[this.permutation[xi] + yi];
    const ab = this.permutation[this.permutation[xi] + yi + 1];
    const ba = this.permutation[this.permutation[xi + 1] + yi];
    const bb = this.permutation[this.permutation[xi + 1] + yi + 1];
    const dot = (index: number, dx: number, dy: number) => {
      const g = gradients2[index & 7];
      return g[0] * dx + g[1] * dy;
    };
    const fx = fade(u), fy = fade(v);
    return lerp(lerp(dot(aa, u, v), dot(ba, u - 1, v), fx), lerp(dot(ab, u, v - 1), dot(bb, u - 1, v - 1), fx), fy);
  }

  noise3D(x: number, y: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return 0;
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const u = x - x0, v = y - y0, w = z - z0;
    const xi = x0 & 255, yi = y0 & 255, zi = z0 & 255, p = this.permutation;
    const h = (dx: number, dy: number, dz: number, ox: number, oy: number, oz: number) => {
      const g = gradients3[p[p[p[xi + ox] + yi + oy] + zi + oz] % 12];
      return (g[0] * dx + g[1] * dy + g[2] * dz) * Math.SQRT1_2;
    };
    const fx = fade(u), fy = fade(v), fz = fade(w);
    const x00 = lerp(h(u, v, w, 0, 0, 0), h(u - 1, v, w, 1, 0, 0), fx);
    const x10 = lerp(h(u, v - 1, w, 0, 1, 0), h(u - 1, v - 1, w, 1, 1, 0), fx);
    const x01 = lerp(h(u, v, w - 1, 0, 0, 1), h(u - 1, v, w - 1, 1, 0, 1), fx);
    const x11 = lerp(h(u, v - 1, w - 1, 0, 1, 1), h(u - 1, v - 1, w - 1, 1, 1, 1), fx);
    return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
  }

  noise4D(x: number, y: number, z: number, w: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(w)) return 0;
    const flx = Math.floor(x), fly = Math.floor(y), flz = Math.floor(z), flw = Math.floor(w);
    const u = x - flx, v = y - fly, s = z - flz, t = w - flw;
    const xi = flx & 255, yi = fly & 255, zi = flz & 255, wi = flw & 255, p = this.permutation;
    const h = (dx: number, dy: number, dz: number, dw: number, ox: number, oy: number, oz: number, ow: number) => {
      const g = gradients4[p[p[p[p[xi + ox] + yi + oy] + zi + oz] + wi + ow] & 31];
      return (g[0] * dx + g[1] * dy + g[2] * dz + g[3] * dw) * SQRT1_3;
    };
    const fx = fade(u), fy = fade(v), fz = fade(s), fw = fade(t);

    // w = 0 hyper-slice
    const x000 = lerp(h(u, v, s, t, 0, 0, 0, 0), h(u - 1, v, s, t, 1, 0, 0, 0), fx);
    const x100 = lerp(h(u, v - 1, s, t, 0, 1, 0, 0), h(u - 1, v - 1, s, t, 1, 1, 0, 0), fx);
    const y00 = lerp(x000, x100, fy);

    const x010 = lerp(h(u, v, s - 1, t, 0, 0, 1, 0), h(u - 1, v, s - 1, t, 1, 0, 1, 0), fx);
    const x110 = lerp(h(u, v - 1, s - 1, t, 0, 1, 1, 0), h(u - 1, v - 1, s - 1, t, 1, 1, 1, 0), fx);
    const y10 = lerp(x010, x110, fy);

    const z0 = lerp(y00, y10, fz);

    // w = 1 hyper-slice
    const x001 = lerp(h(u, v, s, t - 1, 0, 0, 0, 1), h(u - 1, v, s, t - 1, 1, 0, 0, 1), fx);
    const x101 = lerp(h(u, v - 1, s, t - 1, 0, 1, 0, 1), h(u - 1, v - 1, s, t - 1, 1, 1, 0, 1), fx);
    const y01 = lerp(x001, x101, fy);

    const x011 = lerp(h(u, v, s - 1, t - 1, 0, 0, 1, 1), h(u - 1, v, s - 1, t - 1, 1, 0, 1, 1), fx);
    const x111 = lerp(h(u, v - 1, s - 1, t - 1, 0, 1, 1, 1), h(u - 1, v - 1, s - 1, t - 1, 1, 1, 1, 1), fx);
    const y11 = lerp(x011, x111, fy);

    const z1 = lerp(y01, y11, fz);

    return lerp(z0, z1, fw);
  }

  fractal2D(x: number, y: number, settings: FractalSettings): number {
    const octaves = Math.max(1, Math.min(12, Math.floor(settings.octaves)));
    const persistence = Math.max(0, Math.min(1, settings.persistence));
    const lacunarity = Math.max(0.0001, settings.lacunarity);
    let sum = 0, amplitude = 1, frequency = 1, amplitudeSum = 0;
    for (let octave = 0; octave < octaves; octave++) {
      sum += this.noise2D(x * frequency, y * frequency) * amplitude;
      amplitudeSum += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return (sum / Math.max(amplitudeSum, Number.EPSILON)) * (settings.amplitude ?? 1);
  }

  fractal3D(x: number, y: number, z: number, settings: FractalSettings): number {
    const octaves = Math.max(1, Math.min(12, Math.floor(settings.octaves)));
    const persistence = Math.max(0, Math.min(1, settings.persistence));
    const lacunarity = Math.max(0.0001, settings.lacunarity);
    let sum = 0, amplitude = 1, frequency = 1, amplitudeSum = 0;
    for (let octave = 0; octave < octaves; octave++) {
      sum += this.noise3D(x * frequency, y * frequency, z * frequency) * amplitude;
      amplitudeSum += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return (sum / Math.max(amplitudeSum, Number.EPSILON)) * (settings.amplitude ?? 1);
  }

  fractal4D(x: number, y: number, z: number, w: number, settings: FractalSettings): number {
    const octaves = Math.max(1, Math.min(12, Math.floor(settings.octaves)));
    const persistence = Math.max(0, Math.min(1, settings.persistence));
    const lacunarity = Math.max(0.0001, settings.lacunarity);
    let sum = 0, amplitude = 1, frequency = 1, amplitudeSum = 0;
    for (let octave = 0; octave < octaves; octave++) {
      sum += this.noise4D(x * frequency, y * frequency, z * frequency, w * frequency) * amplitude;
      amplitudeSum += amplitude;
      frequency *= lacunarity;
      amplitude *= persistence;
    }
    return (sum / Math.max(amplitudeSum, Number.EPSILON)) * (settings.amplitude ?? 1);
  }
}

const cache = new Map<string, PerlinNoise>();
export const perlinForSeed = (seed: string | number) => {
  const key = String(seed);
  let engine = cache.get(key);
  if (!engine) { engine = new PerlinNoise(key); cache.set(key, engine); }
  return engine;
};
