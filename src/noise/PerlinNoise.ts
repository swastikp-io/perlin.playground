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

// Flat typed gradient arrays for zero-allocation, direct index access
const G2_X = new Float64Array([1, -1, 0, 0, Math.SQRT1_2, -Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2]);
const G2_Y = new Float64Array([0, 0, 1, -1, Math.SQRT1_2, Math.SQRT1_2, -Math.SQRT1_2, -Math.SQRT1_2]);

const G3_X = new Float64Array([1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0]);
const G3_Y = new Float64Array([1, 1, -1, -1, 0, 0, 0, 0, 1, -1, 1, -1]);
const G3_Z = new Float64Array([0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1]);

const SQRT1_3 = 0.5773502691896257;
const G4_X = new Float64Array([1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 1, -1, 0, 0, 0, 0, 0, 0, 0, 0]);
const G4_Y = new Float64Array([1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 1, -1, 1, -1, 1, -1, 1, -1]);
const G4_Z = new Float64Array([1, 1, 1, 1, -1, -1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, 1, -1, -1]);
const G4_W = new Float64Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, 1, -1, -1, -1, -1]);

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
    const flx = Math.floor(x), fly = Math.floor(y);
    const u = x - flx, v = y - fly;
    const xi = flx & 255, yi = fly & 255;
    const p = this.permutation;

    const a = p[xi], b = p[xi + 1];
    const aa = p[a + yi] & 7, ab = p[a + yi + 1] & 7;
    const ba = p[b + yi] & 7, bb = p[b + yi + 1] & 7;

    const u1 = u - 1, v1 = v - 1;
    const d00 = G2_X[aa] * u + G2_Y[aa] * v;
    const d10 = G2_X[ba] * u1 + G2_Y[ba] * v;
    const d01 = G2_X[ab] * u + G2_Y[ab] * v1;
    const d11 = G2_X[bb] * u1 + G2_Y[bb] * v1;

    const fx = fade(u), fy = fade(v);
    const x0 = d00 + (d10 - d00) * fx;
    const x1 = d01 + (d11 - d01) * fx;
    return x0 + (x1 - x0) * fy;
  }

  noise3D(x: number, y: number, z: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return 0;
    const flx = Math.floor(x), fly = Math.floor(y), flz = Math.floor(z);
    const u = x - flx, v = y - fly, w = z - flz;
    const xi = flx & 255, yi = fly & 255, zi = flz & 255;
    const p = this.permutation;

    const a = p[xi], b = p[xi + 1];
    const aa = p[a + yi], ab = p[a + yi + 1];
    const ba = p[b + yi], bb = p[b + yi + 1];

    const g000 = p[aa + zi] % 12, g100 = p[ba + zi] % 12;
    const g010 = p[ab + zi] % 12, g110 = p[bb + zi] % 12;
    const g001 = p[aa + zi + 1] % 12, g101 = p[ba + zi + 1] % 12;
    const g011 = p[ab + zi + 1] % 12, g111 = p[bb + zi + 1] % 12;

    const u1 = u - 1, v1 = v - 1, w1 = w - 1;
    const s2 = Math.SQRT1_2;

    const d000 = (G3_X[g000] * u + G3_Y[g000] * v + G3_Z[g000] * w) * s2;
    const d100 = (G3_X[g100] * u1 + G3_Y[g100] * v + G3_Z[g100] * w) * s2;
    const d010 = (G3_X[g010] * u + G3_Y[g010] * v1 + G3_Z[g010] * w) * s2;
    const d110 = (G3_X[g110] * u1 + G3_Y[g110] * v1 + G3_Z[g110] * w) * s2;

    const d001 = (G3_X[g001] * u + G3_Y[g001] * v + G3_Z[g001] * w1) * s2;
    const d101 = (G3_X[g101] * u1 + G3_Y[g101] * v + G3_Z[g101] * w1) * s2;
    const d011 = (G3_X[g011] * u + G3_Y[g011] * v1 + G3_Z[g011] * w1) * s2;
    const d111 = (G3_X[g111] * u1 + G3_Y[g111] * v1 + G3_Z[g111] * w1) * s2;

    const fx = fade(u), fy = fade(v), fz = fade(w);
    const x00 = d000 + (d100 - d000) * fx;
    const x10 = d010 + (d110 - d010) * fx;
    const x01 = d001 + (d101 - d001) * fx;
    const x11 = d011 + (d111 - d011) * fx;

    const y0 = x00 + (x10 - x00) * fy;
    const y1 = x01 + (x11 - x01) * fy;

    return y0 + (y1 - y0) * fz;
  }

  noise4D(x: number, y: number, z: number, w: number): number {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(w)) return 0;
    const flx = Math.floor(x), fly = Math.floor(y), flz = Math.floor(z), flw = Math.floor(w);
    const u = x - flx, v = y - fly, s = z - flz, t = w - flw;
    const xi = flx & 255, yi = fly & 255, zi = flz & 255, wi = flw & 255;
    const p = this.permutation;

    const p0 = p[xi], p1 = p[xi + 1];
    const p00 = p[p0 + yi], p01 = p[p0 + yi + 1];
    const p10 = p[p1 + yi], p11 = p[p1 + yi + 1];

    const p000 = p[p00 + zi], p001 = p[p00 + zi + 1];
    const p010 = p[p01 + zi], p011 = p[p01 + zi + 1];
    const p100 = p[p10 + zi], p101 = p[p10 + zi + 1];
    const p110 = p[p11 + zi], p111 = p[p11 + zi + 1];

    const g0000 = p[p000 + wi] & 31, g1000 = p[p100 + wi] & 31;
    const g0100 = p[p010 + wi] & 31, g1100 = p[p110 + wi] & 31;
    const g0010 = p[p001 + wi] & 31, g1010 = p[p101 + wi] & 31;
    const g0110 = p[p011 + wi] & 31, g1110 = p[p111 + wi] & 31;

    const wi1 = wi + 1;
    const g0001 = p[p000 + wi1] & 31, g1001 = p[p100 + wi1] & 31;
    const g0101 = p[p010 + wi1] & 31, g1101 = p[p110 + wi1] & 31;
    const g0011 = p[p001 + wi1] & 31, g1011 = p[p101 + wi1] & 31;
    const g0111 = p[p011 + wi1] & 31, g1111 = p[p111 + wi1] & 31;

    const u1 = u - 1, v1 = v - 1, s1 = s - 1, t1 = t - 1;

    // w = 0 hyper-slice (dw = t)
    const d0000 = (G4_X[g0000] * u + G4_Y[g0000] * v + G4_Z[g0000] * s + G4_W[g0000] * t) * SQRT1_3;
    const d1000 = (G4_X[g1000] * u1 + G4_Y[g1000] * v + G4_Z[g1000] * s + G4_W[g1000] * t) * SQRT1_3;
    const d0100 = (G4_X[g0100] * u + G4_Y[g0100] * v1 + G4_Z[g0100] * s + G4_W[g0100] * t) * SQRT1_3;
    const d1100 = (G4_X[g1100] * u1 + G4_Y[g1100] * v1 + G4_Z[g1100] * s + G4_W[g1100] * t) * SQRT1_3;

    const d0010 = (G4_X[g0010] * u + G4_Y[g0010] * v + G4_Z[g0010] * s1 + G4_W[g0010] * t) * SQRT1_3;
    const d1010 = (G4_X[g1010] * u1 + G4_Y[g1010] * v + G4_Z[g1010] * s1 + G4_W[g1010] * t) * SQRT1_3;
    const d0110 = (G4_X[g0110] * u + G4_Y[g0110] * v1 + G4_Z[g0110] * s1 + G4_W[g0110] * t) * SQRT1_3;
    const d1110 = (G4_X[g1110] * u1 + G4_Y[g1110] * v1 + G4_Z[g1110] * s1 + G4_W[g1110] * t) * SQRT1_3;

    // w = 1 hyper-slice (dw = t1)
    const d0001 = (G4_X[g0001] * u + G4_Y[g0001] * v + G4_Z[g0001] * s + G4_W[g0001] * t1) * SQRT1_3;
    const d1001 = (G4_X[g1001] * u1 + G4_Y[g1001] * v + G4_Z[g1001] * s + G4_W[g1001] * t1) * SQRT1_3;
    const d0101 = (G4_X[g0101] * u + G4_Y[g0101] * v1 + G4_Z[g0101] * s + G4_W[g0101] * t1) * SQRT1_3;
    const d1101 = (G4_X[g1101] * u1 + G4_Y[g1101] * v1 + G4_Z[g1101] * s + G4_W[g1101] * t1) * SQRT1_3;

    const d0011 = (G4_X[g0011] * u + G4_Y[g0011] * v + G4_Z[g0011] * s1 + G4_W[g0011] * t1) * SQRT1_3;
    const d1011 = (G4_X[g1011] * u1 + G4_Y[g1011] * v + G4_Z[g1011] * s1 + G4_W[g1011] * t1) * SQRT1_3;
    const d0111 = (G4_X[g0111] * u + G4_Y[g0111] * v1 + G4_Z[g0111] * s1 + G4_W[g0111] * t1) * SQRT1_3;
    const d1111 = (G4_X[g1111] * u1 + G4_Y[g1111] * v1 + G4_Z[g1111] * s1 + G4_W[g1111] * t1) * SQRT1_3;

    const fx = fade(u), fy = fade(v), fz = fade(s), fw = fade(t);

    const x000 = d0000 + (d1000 - d0000) * fx;
    const x100 = d0100 + (d1100 - d0100) * fx;
    const y00 = x000 + (x100 - x000) * fy;

    const x010 = d0010 + (d1010 - d0010) * fx;
    const x110 = d0110 + (d1110 - d0110) * fx;
    const y10 = x010 + (x110 - x010) * fy;

    const z0 = y00 + (y10 - y00) * fz;

    const x001 = d0001 + (d1001 - d0001) * fx;
    const x101 = d0101 + (d1101 - d0101) * fx;
    const y01 = x001 + (x101 - x001) * fy;

    const x011 = d0011 + (d1011 - d0011) * fx;
    const x111 = d0111 + (d1111 - d0111) * fx;
    const y11 = x011 + (x111 - x011) * fy;

    const z1 = y01 + (y11 - y01) * fz;

    return z0 + (z1 - z0) * fw;
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
