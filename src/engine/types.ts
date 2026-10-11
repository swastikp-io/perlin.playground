export type ShapeType = 'Ellipse' | 'Rectangle' | 'Line';

export type PaletteName =
  | 'Blueprint'
  | 'Signal Depth'
  | 'Pixel Midnight'
  | 'Alert Mode'
  | 'Steel Red'
  | 'Gold Dust'
  | 'Dark Violet'
  | 'Rustfade'
  | 'Heatwave'
  | 'Custom';

export interface PaletteDef {
  name: PaletteName;
  background: string;
  foreground: string[];
}

export interface GraphicsConfig {
  // Noise controls
  noiseScale: number;      // e.g. 0.005 to 0.08
  noiseStrength: number;   // e.g. 0 to 100
  noiseFalloff: number;    // e.g. 0.1 to 0.85

  // Geometry controls
  shapeType: ShapeType;

  // Layout controls
  rows: number;            // e.g. 5 to 60
  columns: number;         // e.g. 5 to 60
  canvasPadding: number;   // e.g. 0 to 120
  xOffset: number;         // e.g. -150 to 150
  yOffset: number;         // e.g. -150 to 150

  // Color controls
  palette: PaletteName;
  customBgColor: string;
  customFgColor: string;
  minOpacity: number;      // 0 to 1
  maxOpacity: number;      // 0 to 1

  // Animation state
  speed: number;           // internal animation speed factor
}

export const DEFAULT_CONFIG: GraphicsConfig = {
  noiseScale: 0.02,
  noiseStrength: 40,
  noiseFalloff: 0.5,

  shapeType: 'Ellipse',

  rows: 28,
  columns: 28,
  canvasPadding: 32,
  xOffset: 0,
  yOffset: 0,

  palette: 'Blueprint',
  customBgColor: '#0c1017',
  customFgColor: '#58a6ff',
  minOpacity: 0.2,
  maxOpacity: 0.9,

  speed: 0.008
};
