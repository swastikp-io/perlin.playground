export type Mode = 'flow' | 'displacement' | 'density' | 'contours' | 'stipple' | 'vector';
export type Visualization = 'art' | 'raw' | 'contrast' | 'contour-map' | 'fbm' | 'animated' | 'threshold';
export type Mark = 'line' | 'long-line' | 'ellipse' | 'circle' | 'rectangle' | 'arc' | 'dot' | 'polygon';
export type MaskKind = 'none' | 'circle' | 'ellipse' | 'rectangle' | 'rounded' | 'image';
export type PaletteName = 'Electric Blue / Coral' | 'Ink / Tangerine' | 'Midnight Flow' | 'Monochrome Field' | 'Acid Study' | 'Violet / Yellow' | 'Custom';
export interface Config {
  version: 1; seed: string; name: string; mode: Mode;
  locks: { palette:boolean; noise:boolean; geometry:boolean; seed:boolean };
  canvas: { width:number; height:number; aspect:string; zoom:number; quality:'draft'|'balanced'|'high'; maxPoints:number };
  grid: { spacingX:number; spacingY:number; jitter:number; rotation:number; scale:number; margin:number; distribution:'uniform'|'staggered'|'jittered'|'polar' };
  noise: { scale:number; scaleX:number; scaleY:number; strength:number; offsetX:number; offsetY:number; octaves:number; falloff:number; lacunarity:number; contrast:number; threshold:number; visualization:Visualization; domainRotation:number; distortion:number; secondary:boolean; secondaryInfluence:number; field:'angle'|'displacement'|'density'|'length'|'rotation'|'combined'; directionMultiplier:number; directionOffset:number; turbulence:number };
  time: { offset:number; scale:number; speed:number; motionIntensity:number; temporalFrequency:number; playing:boolean; loop:boolean; loopDuration:number; resetToken:number };
  mark: { type:Mark; width:number; length:number; thickness:number; rotation:number; rotationRandom:number; jitter:number; density:number; minOpacity:number; maxOpacity:number };
  mask: { type:MaskKind; x:number; y:number; width:number; height:number; rotation:number; threshold:number; invert:boolean; feather:number; influence:number; insideDensity:number; outsideDensity:number; fit:'contain'|'cover'|'stretch'; imageData?:ImageData };
  color: { palette:PaletteName; background:string; foreground:string; secondary:string; accent:string; transparent:boolean; invert:boolean; mapping:'single'|'alternate'|'gradient'|'noise'|'position'; colorVariation:number };
}
