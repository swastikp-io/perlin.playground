import { PaletteDef, PaletteName } from './types';

export const PALETTE_PRESETS: Record<Exclude<PaletteName, 'Custom'>, PaletteDef> = {
  Blueprint: {
    name: 'Blueprint',
    background: '#000000',
    foreground: ['#48cae4', '#90e0ef', '#caf0f8', '#0096c7']
  },
  Heatwave: {
    name: 'Heatwave',
    background: '#000000',
    foreground: ['#ff0055', '#ff5400', '#ffaa00', '#ff3300']
  },
  'Purple Raindrops': {
    name: 'Purple Raindrops',
    background: '#000000',
    foreground: [
      '#f72585',
      '#b5179e',
      '#7209b7',
      '#560bad',
      '#480ca8',
      '#3a0ca3',
      '#3f37c9',
      '#4361ee',
      '#4895ef',
      '#4cc9f0'
    ]
  },
  'Deep Sea Blue': {
    name: 'Deep Sea Blue',
    background: '#000000',
    foreground: ['#85c2ffff', '#0353a4', '#007bffff']
  },
  'Pink Fantasy': {
    name: 'Pink Fantasy',
    background: '#000000',
    foreground: [
      '#ff499e',
      '#d264b6',
      '#a480cf',
      '#779be7',
      '#49b6ff'
    ]
  },
  'Sunset Gradient': {
    name: 'Sunset Gradient',
    background: '#000000',
    foreground: [
      '#ff7b00',
      '#ff8800',
      '#ff9500',
      '#ffa200',
      '#ffaa00',
      '#ffb700',
      '#ffc300',
      '#ffd000',
      '#ffdd00',
      '#ffea00'
    ]
  },
  'Whispering Woods': {
    name: 'Whispering Woods',
    background: '#000000',
    foreground: [
      '#e8f1f2',
      '#b3efb2',
      '#7a9e7e',
      '#31493c'
    ]
  },
  'Enchanted Night': {
    name: 'Enchanted Night',
    background: '#000000',
    foreground: [
      '#faa6ff',
      '#7353ba',
      '#2f195f',
      '#efc3f5'
    ]
  },
  'Pastel Dreamy Hues': {
    name: 'Pastel Dreamy Hues',
    background: '#000000',
    foreground: [
      '#696eff',
      '#8178ff',
      '#9983ff',
      '#b18dff',
      '#c897ff',
      '#e0a2ff',
      '#f8acff'
    ]
  },
  'Pastel Skies': {
    name: 'Pastel Skies',
    background: '#000000',
    foreground: [
      '#e5d9f2',
      '#f5efff',
      '#cdc1ff',
      '#a594f9',
      '#7371fc'
    ]
  }
};

export const PALETTE_NAMES: PaletteName[] = [
  'Blueprint',
  'Heatwave',
  'Purple Raindrops',
  'Deep Sea Blue',
  'Pink Fantasy',
  'Sunset Gradient',
  'Whispering Woods',
  'Enchanted Night',
  'Pastel Dreamy Hues',
  'Pastel Skies',
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
      background: customBg || '#000000',
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
    background: '#000000',
    foreground: ['#48cae4', '#90e0ef']
  };
}

/**
 * Parses hex color (e.g. #ffffff or #fff or #ffffffff) to RGB components [r, g, b].
 */
export function hexToRgb(hex: string): [number, number, number] {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length === 8) {
    cleaned = cleaned.slice(0, 6);
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num) || cleaned.length !== 6) {
    return [255, 255, 255];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
