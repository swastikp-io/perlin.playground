import type p5 from 'p5';
import type { Config } from './types';
import { mix } from './palettes';
import { normalized, perlinForSeed, type PerlinNoise } from '../noise/PerlinNoise';

const hash=(s:string)=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0};
const rng=(seed:string)=>{let s=hash(seed)||1;return()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)};
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export interface AnimationTimeCoords {
  isLoop: boolean;
  t3: number;
  z4: number;
  w4: number;
  phase: number;
}

/** Converts elapsed seconds into periodic 4D or progressive 3D coordinates. */
export function computeAnimationCoords(time: Config['time']): AnimationTimeCoords {
  const duration = Math.max(0.1, time.loopDuration);
  const phase = (((time.offset % duration) + duration) % duration) / duration;
  if (!time.loop) {
    return {
      isLoop: false,
      t3: time.offset * time.scale,
      z4: 0,
      w4: 0,
      phase,
    };
  }
  const cycles = Math.max(1, Math.round(time.temporalFrequency));
  const angle = phase * Math.PI * 2 * cycles;
  const radius = Math.max(0.01, time.scale * 1.5);
  return {
    isLoop: true,
    t3: 0,
    z4: radius * Math.cos(angle),
    w4: radius * Math.sin(angle),
    phase,
  };
}

/** Converts elapsed seconds into a 3D Perlin coordinate.
 * Maintained for direct scalar sampling and backward compatibility. */
export function animationCoordinate(time: Config['time']) {
  if (!time.loop) return time.offset * time.scale;
  const duration = Math.max(0.1, time.loopDuration);
  const phase = ((time.offset % duration) + duration) % duration / duration;
  return phase * 256 * time.temporalFrequency;
}
export function maskValue(c: Config, x: number, y: number) {
  const m = c.mask, dx = x - m.x, dy = y - m.y, co = Math.cos(-m.rotation), si = Math.sin(-m.rotation), xx = dx * co - dy * si, yy = dx * si + dy * co;
  let inside = 1, signed = 0;
  if (m.type === 'none') return 1;
  if (m.type === 'circle') {
    signed = Math.hypot(xx, yy) - m.width / 2;
    inside = signed <= 0 ? 1 : 0;
  } else if (m.type === 'ellipse') {
    signed = (Math.sqrt(xx * xx / (m.width * m.width / 4) + yy * yy / (m.height * m.height / 4)) - 1) * Math.min(m.width, m.height) / 2;
    inside = signed <= 0 ? 1 : 0;
  } else if (m.type === 'rectangle' || m.type === 'rounded') {
    signed = Math.max(Math.abs(xx) - m.width / 2, Math.abs(yy) - m.height / 2);
    inside = signed <= 0 ? 1 : 0;
  } else if (m.type === 'image' && m.imageData) {
    let boxW = m.width, boxH = m.height, originX = m.x - boxW / 2, originY = m.y - boxH / 2;
    const imageRatio = m.imageData.width / m.imageData.height, boxRatio = boxW / boxH;
    if (m.fit === 'contain') {
      if (imageRatio > boxRatio) {
        boxH = boxW / imageRatio;
        originY = m.y - boxH / 2;
      } else {
        boxW = boxH * imageRatio;
        originX = m.x - boxW / 2;
      }
    } else if (m.fit === 'cover') {
      if (imageRatio > boxRatio) {
        const sourceWidth = m.imageData.height * boxRatio;
        const sx = (x - (m.x - m.width / 2)) / m.width * sourceWidth + (m.imageData.width - sourceWidth) / 2;
        const iy = Math.floor((y - (m.y - m.height / 2)) / m.height * m.imageData.height), ix = Math.floor(sx);
        if (ix < 0 || iy < 0 || ix >= m.imageData.width || iy >= m.imageData.height) inside = 0;
        else {
          const p = (iy * m.imageData.width + ix) * 4;
          inside = (m.imageData.data[p] * 0.2126 + m.imageData.data[p + 1] * 0.7152 + m.imageData.data[p + 2] * 0.0722) / 255;
          inside = inside >= m.threshold ? 1 : 0;
        }
        return m.invert ? 1 - inside : inside;
      } else {
        const sourceHeight = m.imageData.width / boxRatio;
        const ix = Math.floor((x - (m.x - m.width / 2)) / m.width * m.imageData.width), sy = (y - (m.y - m.height / 2)) / m.height * sourceHeight + (m.imageData.height - sourceHeight) / 2, iy = Math.floor(sy);
        if (ix < 0 || iy < 0 || ix >= m.imageData.width || iy >= m.imageData.height) inside = 0;
        else {
          const p = (iy * m.imageData.width + ix) * 4;
          inside = (m.imageData.data[p] * 0.2126 + m.imageData.data[p + 1] * 0.7152 + m.imageData.data[p + 2] * 0.0722) / 255;
          inside = inside >= m.threshold ? 1 : 0;
        }
        return m.invert ? 1 - inside : inside;
      }
    }
    const ix = Math.floor((x - originX) / boxW * m.imageData.width), iy = Math.floor((y - originY) / boxH * m.imageData.height);
    if (ix < 0 || iy < 0 || ix >= m.imageData.width || iy >= m.imageData.height) inside = 0;
    else {
      const p = (iy * m.imageData.width + ix) * 4;
      inside = (m.imageData.data[p] * 0.2126 + m.imageData.data[p + 1] * 0.7152 + m.imageData.data[p + 2] * 0.0722) / 255;
      inside = inside >= m.threshold ? 1 : 0;
    }
  }
  if (m.type !== 'image' && m.feather > 0) {
    inside = clamp((-signed + Math.min(m.width, m.height) * m.feather) / Math.max(1, Math.min(m.width, m.height) * m.feather));
  }
  return m.invert ? 1 - inside : inside;
}

export class FastNoiseSampler {
  readonly engine: PerlinNoise;
  readonly settings: { octaves: number; persistence: number; lacunarity: number; amplitude?: number };
  readonly coords: AnimationTimeCoords;
  readonly n: Config['noise'];
  readonly co: number;
  readonly si: number;
  readonly hasDistortion: boolean;
  readonly hasSecondary: boolean;
  readonly isLoop: boolean;
  readonly z4: number;
  readonly w4: number;
  readonly t3: number;
  readonly contrast: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly distortionMul: number;
  readonly secondaryInfluence: number;

  constructor(c: Config, tOrCoords?: number | AnimationTimeCoords) {
    this.n = c.noise;
    this.co = Math.cos(this.n.domainRotation);
    this.si = Math.sin(this.n.domainRotation);
    this.scaleX = this.n.scale * this.n.scaleX;
    this.scaleY = this.n.scale * this.n.scaleY;
    this.offsetX = this.n.offsetX;
    this.offsetY = this.n.offsetY;
    this.contrast = this.n.contrast;
    this.hasDistortion = Boolean(this.n.distortion);
    this.distortionMul = this.n.distortion * 8;
    this.hasSecondary = Boolean(this.n.secondary);
    this.secondaryInfluence = this.n.secondaryInfluence;
    this.engine = perlinForSeed(c.seed);
    this.settings = {
      octaves: this.n.octaves,
      persistence: this.n.falloff,
      lacunarity: this.n.lacunarity,
      amplitude: this.n.strength,
    };

    if (typeof tOrCoords === 'object' && tOrCoords !== null && 'isLoop' in tOrCoords) {
      this.coords = tOrCoords;
    } else if (typeof tOrCoords === 'number') {
      this.coords = { isLoop: false, t3: tOrCoords, z4: 0, w4: 0, phase: 0 };
    } else {
      this.coords = computeAnimationCoords(c.time);
    }
    this.isLoop = this.coords.isLoop;
    this.z4 = this.coords.z4;
    this.w4 = this.coords.w4;
    this.t3 = this.coords.t3;
  }

  sample(x: number, y: number): number {
    const rawX = x * this.scaleX + this.offsetX;
    const rawY = y * this.scaleY + this.offsetY;
    let nx = rawX * this.co - rawY * this.si;
    let ny = rawX * this.si + rawY * this.co;

    const engine = this.engine;
    const settings = this.settings;

    if (this.hasDistortion) {
      const d = (this.isLoop
        ? normalized(engine.fractal4D(nx * 1.7, ny * 1.7, this.z4, this.w4, settings))
        : normalized(engine.fractal3D(nx * 1.7, ny * 1.7, this.t3, settings))) * this.distortionMul;
      nx += d;
      ny += d * 0.7;
    }

    let v = this.isLoop
      ? normalized(engine.fractal4D(nx, ny, this.z4, this.w4, settings))
      : normalized(engine.fractal3D(nx, ny, this.t3, settings));

    if (this.hasSecondary) {
      const vSec = this.isLoop
        ? normalized(engine.fractal4D(nx * 2.37 + 17, ny * 2.37 - 9, this.z4 * 0.8, this.w4 * 0.8, settings))
        : normalized(engine.fractal3D(nx * 2.37 + 17, ny * 2.37 - 9, this.t3 * 0.7, settings));
      v = (1 - this.secondaryInfluence) * v + this.secondaryInfluence * vSec;
    }

    return clamp((v - 0.5) * this.contrast + 0.5);
  }
}

export function sample(_p: p5, c: Config, x: number, y: number, tOrCoords?: number | AnimationTimeCoords, _pInst?: p5) {
  return new FastNoiseSampler(c, tOrCoords).sample(x, y);
}

let cachedFieldPixels: ImageData | null = null;
let cachedFieldDim = '';

function renderField(p: p5, c: Config, timeCoords: AnimationTimeCoords) {
  const width = c.canvas.width, height = c.canvas.height;
  const context = p.drawingContext as CanvasRenderingContext2D;
  const dimKey = `${width}x${height}`;
  if (!cachedFieldPixels || cachedFieldDim !== dimKey) {
    cachedFieldPixels = context.createImageData(width, height);
    cachedFieldDim = dimKey;
  }
  const data = cachedFieldPixels.data;
  const mode = c.noise.visualization;
  const sampler = new FastNoiseSampler(c, timeCoords);
  const fbmEngine = mode === 'fbm' ? perlinForSeed(c.seed) : null;
  const fbmSettings = mode === 'fbm'
    ? { octaves: c.noise.octaves, persistence: c.noise.falloff, lacunarity: c.noise.lacunarity, amplitude: c.noise.strength }
    : null;

  const step = c.canvas.quality === 'draft' ? 3 : c.canvas.quality === 'balanced' ? 2 : 1;

  if (step === 1) {
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        let value = sampler.sample(x, y);
        if (mode === 'fbm' && fbmEngine && fbmSettings) {
          value = normalized(fbmEngine.fractal2D(x * c.noise.scale, y * c.noise.scale, fbmSettings));
        } else if (mode === 'contrast') {
          value = clamp((value - 0.5) * c.noise.contrast + 0.5);
        } else if (mode === 'threshold') {
          value = value >= c.noise.threshold ? 1 : 0;
        } else if (mode === 'contour-map') {
          const bands = 10;
          value = Math.abs(value * bands - Math.round(value * bands)) < 0.035 ? 0.08 : 0.94;
        }
        const color = (value * 255 + 0.5) | 0;
        const index = rowOffset + x * 4;
        data[index] = color;
        data[index + 1] = color;
        data[index + 2] = color;
        data[index + 3] = 255;
      }
    }
  } else {
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        let value = sampler.sample(x, y);
        if (mode === 'fbm' && fbmEngine && fbmSettings) {
          value = normalized(fbmEngine.fractal2D(x * c.noise.scale, y * c.noise.scale, fbmSettings));
        } else if (mode === 'contrast') {
          value = clamp((value - 0.5) * c.noise.contrast + 0.5);
        } else if (mode === 'threshold') {
          value = value >= c.noise.threshold ? 1 : 0;
        } else if (mode === 'contour-map') {
          const bands = 10;
          value = Math.abs(value * bands - Math.round(value * bands)) < 0.035 ? 0.08 : 0.94;
        }
        const color = (value * 255 + 0.5) | 0;
        const maxY = Math.min(height, y + step);
        const maxX = Math.min(width, x + step);
        for (let dy = y; dy < maxY; dy++) {
          const rowOffset = dy * width * 4;
          for (let dx = x; dx < maxX; dx++) {
            const index = rowOffset + dx * 4;
            data[index] = color;
            data[index + 1] = color;
            data[index + 2] = color;
            data[index + 3] = 255;
          }
        }
      }
    }
  }
  context.putImageData(cachedFieldPixels, 0, 0);
}


interface CachedGridPoint {
  px: number;
  py: number;
  inside: number;
  density: number;
  randRot: number;
  randAlpha: number;
  randAlt: number;
  randJitterX: number;
  randJitterY: number;
}

let cachedGridPoints: CachedGridPoint[] | null = null;
let cachedGridKey = '';

function getStaticGridPoints(
  c: Config,
  w: number,
  h: number,
  margin: number,
  sx: number,
  sy: number,
  rows: number,
  max: number
): CachedGridPoint[] | null {
  if (c.mode === 'density') return null; // density mode depends on v

  const key = `${c.seed}|${w}|${h}|${margin}|${sx.toFixed(4)}|${sy.toFixed(4)}|${rows}|${max}|${c.grid.distribution}|${c.grid.jitter}|${c.mask.type}|${c.mask.x}|${c.mask.y}|${c.mask.width}|${c.mask.height}|${c.mask.rotation}|${c.mask.feather}|${c.mask.invert}|${c.mask.threshold}|${c.mask.insideDensity}|${c.mask.outsideDensity}|${c.mark.density}|${c.mark.rotationRandom}|${c.mark.jitter}|${c.noise.field}|${c.color.mapping}`;

  if (cachedGridPoints && cachedGridKey === key) {
    return cachedGridPoints;
  }

  const rand = rng(c.seed);
  const pts: CachedGridPoint[] = [];
  let count = 0;

  for (let row = 0; row <= rows; row++) {
    for (let x = margin; x <= w - margin; x += sx) {
      if (++count > max) break;
      const y = margin + row * sy;
      const stagger = c.grid.distribution === 'staggered' && row % 2 ? sx / 2 : 0;
      const jitter = c.grid.distribution === 'jittered' ? c.grid.jitter : 0;
      let px = x + stagger + (rand() - 0.5) * jitter * 2;
      let py = y + (rand() - 0.5) * jitter * 2;
      if (c.grid.distribution === 'polar') {
        const theta = ((x - margin) / Math.max(1, w - margin * 2)) * Math.PI * 2;
        const radius = (row / Math.max(rows, 1)) * (Math.min(w, h) / 2 - margin);
        px = w / 2 + Math.cos(theta) * radius;
        py = h / 2 + Math.sin(theta) * radius;
      }
      const inside = maskValue(c, px, py);
      const density = (c.mask.outsideDensity + (c.mask.insideDensity - c.mask.outsideDensity) * inside) * c.mark.density;

      if (rand() > density * 0.98) continue;

      const randRot = (rand() - 0.5) * c.mark.rotationRandom;
      const randAlpha = c.noise.field === 'density' ? 0 : rand();
      const randAlt = c.color.mapping === 'alternate' ? (rand() > 0.5 ? 1 : 0) : 0;
      const randJitterX = (rand() - 0.5) * c.mark.jitter;
      const randJitterY = (rand() - 0.5) * c.mark.jitter;

      pts.push({
        px,
        py,
        inside,
        density,
        randRot,
        randAlpha,
        randAlt,
        randJitterX,
        randJitterY,
      });
    }
    if (count > max) break;
  }

  cachedGridPoints = pts;
  cachedGridKey = key;
  return pts;
}

export function render(p: p5, c: Config, pInst?: p5) {
  const { width: w, height: h } = c.canvas;
  const q = c.canvas.quality === 'draft' ? 1.8 : c.canvas.quality === 'high' ? 0.75 : 1;
  const ctx = p.drawingContext as CanvasRenderingContext2D | null;
  if (!ctx) return;

  p.clear();
  if (!c.color.transparent) {
    p.background(c.color.invert ? c.color.foreground : c.color.background);
  }
  p.push();
  p.translate(w / 2, h / 2);
  p.rotate(c.grid.rotation);
  p.scale(c.grid.scale);
  p.translate(-w / 2, -h / 2);
  p.strokeWeight(c.mark.thickness);
  p.strokeCap('round' as any);

  let sx = Math.max(2, c.grid.spacingX * q);
  let sy = Math.max(2, c.grid.spacingY * q);
  const margin = c.grid.margin;
  const max = c.canvas.maxPoints;
  const cols = Math.max(1, Math.ceil((w - margin * 2) / sx));
  const rawRows = Math.max(0, Math.ceil((h - margin * 2) / sy));
  const estimatedPoints = cols * (rawRows + 1);
  if (estimatedPoints > max) {
    const scaleFactor = Math.sqrt(estimatedPoints / max);
    sx = Math.max(2, sx * scaleFactor);
    sy = Math.max(2, sy * scaleFactor);
  }
  const rows = Math.max(0, Math.ceil((h - margin * 2) / sy));
  const timeCoords = computeAnimationCoords(c.time);

  if (c.noise.visualization !== 'art') {
    p.pop();
    renderField(p, c, timeCoords);
    return;
  }

  const sampler = new FastNoiseSampler(c, timeCoords);

  // Precompute 256-level palette LUT for instant color mapping
  const usePaletteLUT = c.color.mapping === 'noise' || c.color.mapping === 'gradient';
  let paletteLUT: string[] | null = null;
  if (usePaletteLUT) {
    paletteLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      paletteLUT[i] = mix(c.color.foreground, c.color.secondary, i / 255);
    }
  }

  const isLineType = c.mark.type === 'line' || c.mark.type === 'long-line';
  const isNoStrokeType =
    c.mode === 'stipple' ||
    c.mark.type === 'dot' ||
    c.mark.type === 'ellipse' ||
    c.mark.type === 'circle' ||
    c.mark.type === 'polygon';

  if (isLineType) {
    p.noFill();
  }
  if (isNoStrokeType) {
    p.noStroke();
  }

  let lastStroke = '';
  let lastFill = '';

  const staticPts = getStaticGridPoints(c, w, h, margin, sx, sy, rows, max);

  if (staticPts) {
    // Fast path: cached invariant grid points
    const ptsLen = staticPts.length;
    for (let i = 0; i < ptsLen; i++) {
      const pt = staticPts[i];
      const px = pt.px;
      const py = pt.py;
      const v = sampler.sample(px, py);

      let angle =
        v * c.noise.directionMultiplier +
        c.noise.directionOffset +
        c.mark.rotation +
        pt.randRot;
      let dx = 0,
        dy = 0;
      if (c.mode === 'displacement' || c.mode === 'vector') {
        dx = Math.cos(angle) * v * c.noise.strength * 30;
        dy = Math.sin(angle) * v * c.noise.strength * 30;
      }
      if (c.mode === 'contours') {
        if (Math.abs(v - 0.5) > 0.045) continue;
        angle =
          Math.atan2(
            sampler.sample(px, py + 2) - v,
            sampler.sample(px + 2, py) - v
          ) +
          Math.PI / 2;
      }
      if (c.noise.field === 'displacement' && c.mode === 'flow') {
        dx += (v - 0.5) * c.noise.strength * 36;
        dy += (sampler.sample(px + 91, py - 37) - 0.5) * c.noise.strength * 36;
      }
      if (c.noise.field === 'rotation') angle += v * Math.PI * 2;
      if (c.noise.field === 'combined') {
        angle +=
          (sampler.sample(px + 73, py + 11) - 0.5) * c.noise.turbulence;
      }

      const len =
        c.mark.length *
        (c.noise.field === 'length' ? 0.2 + v * 1.8 : 0.4 + v) *
        c.noise.strength;
      const alpha =
        c.mark.minOpacity +
        (c.mark.maxOpacity - c.mark.minOpacity) *
          (c.noise.field === 'density' ? v : pt.randAlpha);

      let col: string;
      if (c.color.mapping === 'alternate') {
        col = pt.randAlt ? c.color.foreground : c.color.secondary;
      } else if (usePaletteLUT && paletteLUT) {
        const lutIdx =
          c.color.mapping === 'noise'
            ? (v * 255 + 0.5) | 0
            : ((px / Math.max(1, w)) * 255 + 0.5) | 0;
        col = paletteLUT[lutIdx < 0 ? 0 : lutIdx > 255 ? 255 : lutIdx];
      } else {
        col = c.color.foreground;
      }
      if (c.color.invert) col = c.color.background;

      if (!isNoStrokeType && col !== lastStroke) {
        p.stroke(col);
        lastStroke = col;
      }
      if (!isLineType && col !== lastFill) {
        p.fill(col);
        lastFill = col;
      }

      ctx.globalAlpha = clamp(
        alpha *
          (c.mask.type === 'none'
            ? 1
            : c.mask.influence + (1 - c.mask.influence) * pt.inside),
        0,
        1
      );

      const X = px + dx + pt.randJitterX;
      const Y = py + dy + pt.randJitterY;

      if (c.mode === 'stipple' || c.mark.type === 'dot') {
        p.circle(X, Y, Math.max(1, c.mark.width * (0.4 + v * 2)));
        continue;
      }
      if (c.mark.type === 'ellipse' || c.mark.type === 'circle') {
        p.ellipse(
          X,
          Y,
          c.mark.width * (0.5 + v),
          c.mark.type === 'circle' ? c.mark.width * (0.5 + v) : len * 0.45
        );
        continue;
      }
      if (c.mark.type === 'rectangle') {
        p.push();
        p.translate(X, Y);
        p.rotate(angle);
        p.rectMode('center' as any);
        p.rect(0, 0, len, c.mark.width);
        p.pop();
        continue;
      }
      if (c.mark.type === 'arc') {
        p.arc(X, Y, len, len, angle, angle + Math.PI * 0.8);
        continue;
      }
      if (c.mark.type === 'polygon') {
        p.push();
        p.translate(X, Y);
        p.rotate(angle);
        p.beginShape();
        for (let q = 0; q < 5; q++) {
          const a = (q * Math.PI * 2) / 5 - Math.PI / 2;
          p.vertex(Math.cos(a) * len * 0.35, Math.sin(a) * len * 0.35);
        }
        p.endShape('close' as any);
        p.pop();
        continue;
      }

      const lineLength = c.mark.type === 'long-line' ? len * 2.6 : len;
      const cosA = Math.cos(angle) * lineLength * 0.5;
      const sinA = Math.sin(angle) * lineLength * 0.5;
      p.line(X - cosA, Y - sinA, X + cosA, Y + sinA);
    }
  } else {
    // Dynamic path for density mode
    const rand = rng(c.seed);
    let count = 0;
    for (let row = 0; row <= rows; row++) {
      for (let x = margin; x <= w - margin; x += sx) {
        if (++count > max) break;
        const y = margin + row * sy;
        const stagger = c.grid.distribution === 'staggered' && row % 2 ? sx / 2 : 0;
        const jitter = c.grid.distribution === 'jittered' ? c.grid.jitter : 0;
        let px = x + stagger + (rand() - 0.5) * jitter * 2;
        let py = y + (rand() - 0.5) * jitter * 2;
        if (c.grid.distribution === 'polar') {
          const theta = ((x - margin) / Math.max(1, w - margin * 2)) * Math.PI * 2;
          const radius = (row / Math.max(rows, 1)) * (Math.min(w, h) / 2 - margin);
          px = w / 2 + Math.cos(theta) * radius;
          py = h / 2 + Math.sin(theta) * radius;
        }
        const v = sampler.sample(px, py);
        const inside = maskValue(c, px, py);
        const density =
          (c.mask.outsideDensity +
            (c.mask.insideDensity - c.mask.outsideDensity) * inside) *
          c.mark.density;
        if (rand() > density * (c.mode === 'density' ? v : 0.98)) continue;

        let angle =
          v * c.noise.directionMultiplier +
          c.noise.directionOffset +
          c.mark.rotation +
          (rand() - 0.5) * c.mark.rotationRandom;
        let dx = 0,
          dy = 0;
        if (c.mode === 'displacement' || c.mode === 'vector') {
          dx = Math.cos(angle) * v * c.noise.strength * 30;
          dy = Math.sin(angle) * v * c.noise.strength * 30;
        }
        if (c.mode === 'contours') {
          if (Math.abs(v - 0.5) > 0.045) continue;
          angle =
            Math.atan2(
              sampler.sample(px, py + 2) - v,
              sampler.sample(px + 2, py) - v
            ) +
            Math.PI / 2;
        }
        if (c.noise.field === 'displacement' && c.mode === 'flow') {
          dx += (v - 0.5) * c.noise.strength * 36;
          dy += (sampler.sample(px + 91, py - 37) - 0.5) * c.noise.strength * 36;
        }
        if (c.noise.field === 'rotation') angle += v * Math.PI * 2;
        if (c.noise.field === 'combined') {
          angle += (sampler.sample(px + 73, py + 11) - 0.5) * c.noise.turbulence;
        }

        const len =
          c.mark.length *
          (c.noise.field === 'length' ? 0.2 + v * 1.8 : 0.4 + v) *
          c.noise.strength;
        const alpha =
          c.mark.minOpacity +
          (c.mark.maxOpacity - c.mark.minOpacity) *
            (c.mode === 'density' || c.noise.field === 'density' ? v : rand());
        let col = c.color.foreground;
        if (c.color.mapping === 'alternate') {
          col = rand() > 0.5 ? c.color.foreground : c.color.secondary;
        } else if (usePaletteLUT && paletteLUT) {
          const lutIdx =
            c.color.mapping === 'noise'
              ? (v * 255 + 0.5) | 0
              : ((px / Math.max(1, w)) * 255 + 0.5) | 0;
          col = paletteLUT[lutIdx < 0 ? 0 : lutIdx > 255 ? 255 : lutIdx];
        } else if (c.color.mapping === 'gradient' || c.color.mapping === 'noise') {
          col = mix(
            c.color.foreground,
            c.color.secondary,
            c.color.mapping === 'noise' ? v : px / Math.max(1, w)
          );
        }
        if (c.color.invert) col = c.color.background;

        if (!isNoStrokeType && col !== lastStroke) {
          p.stroke(col);
          lastStroke = col;
        }
        if (!isLineType && col !== lastFill) {
          p.fill(col);
          lastFill = col;
        }

        ctx.globalAlpha = clamp(
          alpha *
            (c.mask.type === 'none'
              ? 1
              : c.mask.influence + (1 - c.mask.influence) * inside),
          0,
          1
        );

        const X = px + dx + (rand() - 0.5) * c.mark.jitter;
        const Y = py + dy + (rand() - 0.5) * c.mark.jitter;

        if (c.mode === 'stipple' || c.mark.type === 'dot') {
          p.circle(X, Y, Math.max(1, c.mark.width * (0.4 + v * 2)));
          continue;
        }
        if (c.mark.type === 'ellipse' || c.mark.type === 'circle') {
          p.ellipse(
            X,
            Y,
            c.mark.width * (0.5 + v),
            c.mark.type === 'circle' ? c.mark.width * (0.5 + v) : len * 0.45
          );
          continue;
        }
        if (c.mark.type === 'rectangle') {
          p.push();
          p.translate(X, Y);
          p.rotate(angle);
          p.rectMode('center' as any);
          p.rect(0, 0, len, c.mark.width);
          p.pop();
          continue;
        }
        if (c.mark.type === 'arc') {
          p.arc(X, Y, len, len, angle, angle + Math.PI * 0.8);
          continue;
        }
        if (c.mark.type === 'polygon') {
          p.push();
          p.translate(X, Y);
          p.rotate(angle);
          p.beginShape();
          for (let q = 0; q < 5; q++) {
            const a = (q * Math.PI * 2) / 5 - Math.PI / 2;
            p.vertex(Math.cos(a) * len * 0.35, Math.sin(a) * len * 0.35);
          }
          p.endShape('close' as any);
          p.pop();
          continue;
        }

        const lineLength = c.mark.type === 'long-line' ? len * 2.6 : len;
        const cosA = Math.cos(angle) * lineLength * 0.5;
        const sinA = Math.sin(angle) * lineLength * 0.5;
        p.line(X - cosA, Y - sinA, X + cosA, Y + sinA);
      }
      if (count > max) break;
    }
  }

  ctx.globalAlpha = 1;
  p.pop();
}

export function svgFor(c:Config){ const pts:string[]=[];const rand=rng(c.seed),sx=c.grid.spacingX,sy=c.grid.spacingY,engine=perlinForSeed(c.seed),settings={octaves:c.noise.octaves,persistence:c.noise.falloff,lacunarity:c.noise.lacunarity,amplitude:c.noise.strength};let n=0;for(let y=c.grid.margin;y<c.canvas.height-c.grid.margin;y+=sy)for(let x=c.grid.margin;x<c.canvas.width-c.grid.margin;x+=sx){if(++n>Math.min(c.canvas.maxPoints,20000))break;const v=normalized(engine.fractal2D(x*c.noise.scale*c.noise.scaleX+c.noise.offsetX,y*c.noise.scale*c.noise.scaleY+c.noise.offsetY,settings));if(rand()>c.mark.density)continue;const a=v*c.noise.directionMultiplier+c.mark.rotation,L=c.mark.length*(.5+v);pts.push(`<line x1="${(x-Math.cos(a)*L/2).toFixed(2)}" y1="${(y-Math.sin(a)*L/2).toFixed(2)}" x2="${(x+Math.cos(a)*L/2).toFixed(2)}" y2="${(y+Math.sin(a)*L/2).toFixed(2)}"/>`);}const bg=c.color.transparent?'none':c.color.background;return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.canvas.width}" height="${c.canvas.height}" viewBox="0 0 ${c.canvas.width} ${c.canvas.height}"><rect width="100%" height="100%" fill="${bg}"/><g stroke="${c.color.foreground}" stroke-width="${c.mark.thickness}" stroke-linecap="round">${pts.join('')}</g></svg>`;}
