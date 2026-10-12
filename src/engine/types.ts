export type ShapeType =
  | 'Ellipse'
  | 'Rectangle'
  | 'Line'
  | 'Triangle'
  | 'Diamond'
  | 'Hexagon'
  | 'Arc'
  | 'Cross'
  | 'Ring';

export type PaletteName =
  | 'Blueprint'
  | 'Heatwave'
  | 'Purple Raindrops'
  | 'Deep Sea Blue'
  | 'Pink Fantasy'
  | 'Sunset Gradient'
  | 'Whispering Woods'
  | 'Enchanted Night'
  | 'Pastel Dreamy Hues'
  | 'Pastel Skies'
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
  noiseSeed: number;       // Deterministic seed for reproducible patterns

  // Geometry & shape controls
  shapeType: ShapeType;
  minWidth: number;        // Default 32, minimum shape width
  maxWidth: number;        // Default 0, where 0 means auto sizing based on grid cell
  minHeight: number;       // Default 50, minimum shape height
  maxHeight: number;       // Default 100, maximum shape height
  rotationAmount: number;  // Default 168, maximum rotation in degrees (0 to 360)

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

  // Animation controls
  isPlaying: boolean;       // Playback state toggle
  animationSpeed: number;  // Speed multiplier (e.g. 0.25x to 3x, default 1x)
  loopDuration: number;    // Loop cycle duration in seconds (e.g. 2s to 20s)
}

export const DEFAULT_CONFIG: GraphicsConfig = {
  noiseScale: 0.02,
  noiseStrength: 40,
  noiseFalloff: 0.5,
  noiseSeed: 1337,

  shapeType: 'Ellipse',
  minWidth: 32,
  maxWidth: 0,
  minHeight: 50,
  maxHeight: 100,
  rotationAmount: 168,

  rows: 28,
  columns: 28,
  canvasPadding: 0,
  xOffset: 0,
  yOffset: 0,

  palette: 'Blueprint',
  customBgColor: '#000000',
  customFgColor: '#58a6ff',
  minOpacity: 0.2,
  maxOpacity: 0.9,

  isPlaying: true,
  animationSpeed: 1.0,
  loopDuration: 6
};

// Video Export Types & Settings
export type VideoFormatOption = 'mp4' | 'webm';
export type VideoResolutionOption = '1080p' | '1440p' | '4K';
export type VideoFpsOption = 30 | 60;
export type VideoQualityOption = 'High' | 'Very High' | 'Maximum';

export interface VideoExportSettings {
  format?: VideoFormatOption;
  resolution: VideoResolutionOption;
  duration: number; // Minimum 15 seconds
  fps: VideoFpsOption;
  quality: VideoQualityOption;
  dataRate?: number; // Video data rate in bits per second (e.g. 12,000,000 for 12 Mbps)
  totalBitrate?: number; // Total multiplexed bitrate in bits per second (e.g. 12,360,000 for 12.36 Mbps)
}

export const DEFAULT_VIDEO_EXPORT_SETTINGS: VideoExportSettings = {
  format: 'webm',
  resolution: '1080p',
  duration: 15,
  fps: 30,
  quality: 'High',
  dataRate: 12_000_000,
  totalBitrate: 12_360_000
};

export interface VideoExportProgress {
  elapsedSeconds: number;
  targetSeconds: number;
  percentage: number;
  status: 'idle' | 'rendering' | 'finalizing' | 'completed' | 'cancelled' | 'error';
  error?: string;
}

