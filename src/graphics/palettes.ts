import type { PaletteName } from './types';
export const palettes: Record<Exclude<PaletteName,'Custom'>,[string,string,string]> = {
  'Electric Blue / Coral':['#f04f43','#1230e8','#54d5ff'], 'Ink / Tangerine':['#ff6b22','#151515','#853000'], 'Midnight Flow':['#0c0d1d','#7264ff','#49b2ff'], 'Monochrome Field':['#f3eddf','#171614','#867f72'], 'Acid Study':['#090909','#b5ff32','#eaffb6'], 'Violet / Yellow':['#fff29d','#4828a8','#cc51c8']
};
const rgbCache = new Map<string, { r: number; g: number; b: number }>();
const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

export function hexToRgb(hex: string) {
  let cached = rgbCache.get(hex);
  if (cached) return cached;
  const h = hex.replace('#', '');
  cached = {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  };
  rgbCache.set(hex, cached);
  return cached;
}

export function mix(a: string, b: string, t: number) {
  const x = hexToRgb(a), y = hexToRgb(b);
  const clampedT = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const r = Math.round(x.r + (y.r - x.r) * clampedT) | 0;
  const g = Math.round(x.g + (y.g - x.g) * clampedT) | 0;
  const bl = Math.round(x.b + (y.b - x.b) * clampedT) | 0;
  return `#${HEX_TABLE[r < 0 ? 0 : r > 255 ? 255 : r]}${HEX_TABLE[g < 0 ? 0 : g > 255 ? 255 : g]}${HEX_TABLE[bl < 0 ? 0 : bl > 255 ? 255 : bl]}`;
}
