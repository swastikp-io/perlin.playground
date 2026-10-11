import { PaletteDef, PaletteName } from './types';

export const PALETTE_PRESETS: Record<Exclude<PaletteName, 'Custom'>, PaletteDef> = {
  Blueprint: {
    name: 'Blueprint',
    background: '#0d1f30',
    foreground: ['#48cae4', '#90e0ef', '#caf0f8', '#0096c7']
  },
  'Signal Depth': {
    name: 'Signal Depth',
    background: '#081719',
    foreground: ['#06d6a0', '#118ab2', '#00f5d4', '#52b788']
  },
  'Pixel Midnight': {
    name: 'Pixel Midnight',
    background: '#0b0d18',
    foreground: ['#4361ee', '#7209b7', '#4cc9f0', '#3f37c9']
  },
  'Alert Mode': {
    name: 'Alert Mode',
    background: '#180e0e',
    foreground: ['#e63946', '#f77f00', '#fcbf49', '#ff5722']
  },
  'Steel Red': {
    name: 'Steel Red',
    background: '#1a1d23',
    foreground: ['#e63946', '#ff4d6d', '#c9184a', '#8d99ae']
  },
  'Gold Dust': {
    name: 'Gold Dust',
    background: '#16130d',
    foreground: ['#ffd166', '#f4a261', '#e7c169', '#cca43b']
  },
  'Dark Violet': {
    name: 'Dark Violet',
    background: '#140a20',
    foreground: ['#7209b7', '#b5179e', '#f72585', '#480ca8']
  },
  Rustfade: {
    name: 'Rustfade',
    background: '#19120c',
    foreground: ['#d97736', '#b85d19', '#e09f67', '#8c4f2d']
  },
  Heatwave: {
    name: 'Heatwave',
    background: '#190804',
    foreground: ['#ff0055', '#ff5400', '#ffaa00', '#ff3300']
  }
};

export const PALETTE_NAMES: PaletteName[] = [
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
];

/**
 * Returns background color and an array of foreground colors for the given palette selection.
 */
export function getPaletteColors(
  paletteName: PaletteName,
  customBg: string,
  customFg: string
): { background: string; foreground: string[] } {
  if (paletteName === 'Custom') {
    return {
      background: customBg || '#111111',
      foreground: [customFg || '#ffffff']
    };
  }
  const preset = PALETTE_PRESETS[paletteName];
  if (preset) {
    return {
      background: preset.background,
      foreground: preset.foreground
    };
  }
  return {
    background: '#0d1f30',
    foreground: ['#48cae4', '#90e0ef']
  };
}

/**
 * Parses hex color (e.g. #ffffff or #fff) to RGB components [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) {
    return [255, 255, 255];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
