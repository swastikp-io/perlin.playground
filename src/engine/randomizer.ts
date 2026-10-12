import { GraphicsConfig, ShapeType, PaletteName } from './types';
import { PALETTE_NAMES } from './palettes';

export const ALL_SHAPE_TYPES: ShapeType[] = [
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

const CURATED_CUSTOM_PAIRS: Array<{ bg: string; fg: string }> = [
  { bg: '#000000', fg: '#00e5ff' },
  { bg: '#000000', fg: '#ff2a85' },
  { bg: '#000000', fg: '#00ff88' },
  { bg: '#000000', fg: '#ffb703' },
  { bg: '#000000', fg: '#a78bfa' },
  { bg: '#000000', fg: '#38bdf8' }
];

/**
 * Produces a freshly randomized GraphicsConfig.
 * Strictly respects all control bounds, integer constraints, and opacity ordering.
 * Preserves animation settings (isPlaying, animationSpeed, loopDuration).
 */
export function randomizeConfig(current: GraphicsConfig): GraphicsConfig {
  // 1. Noise parameters
  const noiseScale = parseFloat((0.008 + Math.random() * 0.042).toFixed(3)); // 0.008 to 0.050
  const noiseStrength = Math.round(15 + Math.random() * 70); // 15 to 85
  const noiseFalloff = parseFloat((0.25 + Math.random() * 0.50).toFixed(2)); // 0.25 to 0.75
  const noiseSeed = Math.floor(Math.random() * 900000) + 1000;

  // 2. Shape type from all nine options
  const shapeIndex = Math.floor(Math.random() * ALL_SHAPE_TYPES.length);
  const shapeType = ALL_SHAPE_TYPES[shapeIndex];

  // 3. Layout parameters (integer rows & columns)
  const rows = Math.floor(14 + Math.random() * 28); // 14 to 41
  const columns = Math.floor(14 + Math.random() * 28); // 14 to 41
  const canvasPadding = Math.round(16 + Math.random() * 44); // 16 to 60
  const xOffset = Math.round(-30 + Math.random() * 60); // -30 to 30
  const yOffset = Math.round(-30 + Math.random() * 60); // -30 to 30

  // 4. Color palette from all 10 presets
  const paletteIndex = Math.floor(Math.random() * PALETTE_NAMES.length);
  const palette = PALETTE_NAMES[paletteIndex] as PaletteName;

  // Valid custom colors if Custom selected or fallback
  const pairIndex = Math.floor(Math.random() * CURATED_CUSTOM_PAIRS.length);
  const customBgColor = CURATED_CUSTOM_PAIRS[pairIndex].bg;
  const customFgColor = CURATED_CUSTOM_PAIRS[pairIndex].fg;

  // 5. Opacity ordering validation (min <= max)
  const rawMin = parseFloat((0.10 + Math.random() * 0.35).toFixed(2)); // 0.10 to 0.45
  const rawMax = parseFloat((0.60 + Math.random() * 0.35).toFixed(2)); // 0.60 to 0.95
  const minOpacity = Math.min(rawMin, rawMax);
  const maxOpacity = Math.max(rawMin, rawMax);

  // 6. Advanced shape dimension and rotation controls
  const minWidth = Math.floor(16 + Math.random() * 36); // 16 to 52
  // ~35% chance for automatic sizing (0), otherwise bounded max width >= minWidth
  const useAutoWidth = Math.random() < 0.35;
  const maxWidth = useAutoWidth ? 0 : minWidth + Math.floor(10 + Math.random() * 60);

  const minHeight = Math.floor(25 + Math.random() * 45); // 25 to 70
  const maxHeight = minHeight + Math.floor(20 + Math.random() * 70); // maxHeight >= minHeight

  const rotationAmount = Math.round(Math.random() * 360); // 0° to 360°

  return {
    ...current,
    noiseScale,
    noiseStrength,
    noiseFalloff,
    noiseSeed,
    shapeType,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    rotationAmount,
    rows,
    columns,
    canvasPadding,
    xOffset,
    yOffset,
    palette,
    customBgColor,
    customFgColor,
    minOpacity,
    maxOpacity
    // Animation controls are strictly preserved:
    // isPlaying, animationSpeed, loopDuration remain unchanged
  };
}
