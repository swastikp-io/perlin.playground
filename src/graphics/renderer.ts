import type p5 from 'p5';
import type { Config } from './types';
import { mix } from './palettes';
import { normalized, perlinForSeed } from '../noise/PerlinNoise';

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

export function sample(_p: p5, c: Config, x: number, y: number, tOrCoords?: number | AnimationTimeCoords, _pInst?: p5) {
  const n = c.noise, rad = n.domainRotation, co = Math.cos(rad), si = Math.sin(rad);
  let nx = (x * n.scale * n.scaleX + n.offsetX), ny = (y * n.scale * n.scaleY + n.offsetY);
  [nx, ny] = [nx * co - ny * si, nx * si + ny * co];
  const engine = perlinForSeed(c.seed);
  const settings = { octaves: n.octaves, persistence: n.falloff, lacunarity: n.lacunarity, amplitude: n.strength };

  let coords: AnimationTimeCoords;
  if (typeof tOrCoords === 'object' && tOrCoords !== null && 'isLoop' in tOrCoords) {
    coords = tOrCoords;
  } else if (typeof tOrCoords === 'number') {
    coords = { isLoop: false, t3: tOrCoords, z4: 0, w4: 0, phase: 0 };
  } else {
    coords = computeAnimationCoords(c.time);
  }

  const sampleNoise = coords.isLoop
    ? (a: number, b: number, scale = 1) =>
        normalized(engine.fractal4D(a, b, coords.z4 * scale, coords.w4 * scale, settings))
    : (a: number, b: number, scale = 1) =>
        normalized(engine.fractal3D(a, b, coords.t3 * scale, settings));

  if (n.distortion) {
    const d = sampleNoise(nx * 1.7, ny * 1.7) * n.distortion * 8;
    nx += d;
    ny += d * 0.7;
  }

  let v = sampleNoise(nx, ny);

  if (n.secondary) {
    const vSec = sampleNoise(nx * 2.37 + 17, ny * 2.37 - 9, coords.isLoop ? 0.8 : 0.7);
    v = (1 - n.secondaryInfluence) * v + n.secondaryInfluence * vSec;
  }
  return clamp((v - 0.5) * n.contrast + 0.5);
}

function renderField(p: p5, c: Config, timeCoords: AnimationTimeCoords) {
  const width = c.canvas.width, height = c.canvas.height;
  const context = p.drawingContext as CanvasRenderingContext2D;
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  const mode = c.noise.visualization;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let value = sample(p, c, x, y, timeCoords);
    if (mode === 'raw' || mode === 'animated') value = value;
    if (mode === 'fbm') value = normalized(perlinForSeed(c.seed).fractal2D(x * c.noise.scale, y * c.noise.scale, { octaves: c.noise.octaves, persistence: c.noise.falloff, lacunarity: c.noise.lacunarity, amplitude: c.noise.strength }));
    if (mode === 'contrast') value = clamp((value - 0.5) * c.noise.contrast + 0.5);
    if (mode === 'threshold') value = value >= c.noise.threshold ? 1 : 0;
    if (mode === 'contour-map') {
      const bands = 10;
      value = Math.abs(value * bands - Math.round(value * bands)) < 0.035 ? 0.08 : 0.94;
    }
    const color = Math.round(value * 255), index = (y * width + x) * 4;
    data[index] = color; data[index + 1] = color; data[index + 2] = color; data[index + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
}

export function render(p: p5, c: Config, pInst?: p5) {
  const { width: w, height: h } = c.canvas;
  const rand = rng(c.seed);
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
  p.noFill();
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
  let count = 0;
  const rows = Math.max(0, Math.ceil((h - margin * 2) / sy));
  const timeCoords = computeAnimationCoords(c.time);

  if (c.noise.visualization !== 'art') {
    p.pop();
    renderField(p, c, timeCoords);
    return;
  }

  for (let row = 0; row <= rows; row++) {
    for (let x = margin; x <= w - margin; x += sx) {
      if (++count > max) break;
      const y = margin + row * sy;
      const stagger = c.grid.distribution === 'staggered' && row % 2 ? sx / 2 : 0;
      const jitter = (c.grid.distribution === 'jittered' ? c.grid.jitter : 0);
      let px = x + stagger + (rand() - 0.5) * jitter * 2;
      let py = y + (rand() - 0.5) * jitter * 2;
      if (c.grid.distribution === 'polar') {
        const theta = ((x - margin) / Math.max(1, w - margin * 2)) * Math.PI * 2;
        const radius = (row / Math.max(rows, 1)) * (Math.min(w, h) / 2 - margin);
        px = w / 2 + Math.cos(theta) * radius;
        py = h / 2 + Math.sin(theta) * radius;
      }
      const v = sample(p, c, px, py, timeCoords, pInst);
      const inside = maskValue(c, px, py);
      const density = (c.mask.outsideDensity + (c.mask.insideDensity - c.mask.outsideDensity) * inside) * c.mark.density;
      if (rand() > density * (c.mode === 'density' ? v : 0.98)) continue;

      let angle = v * c.noise.directionMultiplier + c.noise.directionOffset + c.mark.rotation + (rand() - 0.5) * c.mark.rotationRandom;
      let dx = 0, dy = 0;
      if (c.mode === 'displacement' || c.mode === 'vector') {
        dx = Math.cos(angle) * v * c.noise.strength * 30;
        dy = Math.sin(angle) * v * c.noise.strength * 30;
      }
      if (c.mode === 'contours') {
        if (Math.abs(v - 0.5) > 0.045) continue;
        angle = Math.atan2(sample(p, c, px, py + 2, timeCoords, pInst) - v, sample(p, c, px + 2, py, timeCoords, pInst) - v) + Math.PI / 2;
      }
      if (c.noise.field === 'displacement' && c.mode === 'flow') {
        dx += (v - 0.5) * c.noise.strength * 36;
        dy += (sample(p, c, px + 91, py - 37, timeCoords, pInst) - 0.5) * c.noise.strength * 36;
      }
      if (c.noise.field === 'rotation') angle += v * Math.PI * 2;
      if (c.noise.field === 'combined') angle += (sample(p, c, px + 73, py + 11, timeCoords, pInst) - 0.5) * c.noise.turbulence;

      const len = c.mark.length * (c.noise.field === 'length' ? 0.2 + v * 1.8 : 0.4 + v) * c.noise.strength;
      const alpha = c.mark.minOpacity + (c.mark.maxOpacity - c.mark.minOpacity) * (c.mode === 'density' || c.noise.field === 'density' ? v : rand());
      let col = c.color.foreground;
      if (c.color.mapping === 'alternate') {
        col = rand() > 0.5 ? c.color.foreground : c.color.secondary;
      } else if (c.color.mapping === 'gradient' || c.color.mapping === 'noise') {
        col = mix(c.color.foreground, c.color.secondary, c.color.mapping === 'noise' ? v : px / Math.max(1, w));
      }
      if (c.color.invert) col = c.color.background;

      p.stroke(col);
      p.fill(col);
      p.strokeWeight(c.mark.thickness);
      ctx.globalAlpha = clamp(alpha * (c.mask.type === 'none' ? 1 : c.mask.influence + (1 - c.mask.influence) * inside), 0, 1);

      const X = px + dx + (rand() - 0.5) * c.mark.jitter;
      const Y = py + dy + (rand() - 0.5) * c.mark.jitter;

      if (c.mode === 'stipple' || c.mark.type === 'dot') {
        p.noStroke();
        p.circle(X, Y, Math.max(1, c.mark.width * (0.4 + v * 2)));
        continue;
      }
      if (c.mark.type === 'ellipse' || c.mark.type === 'circle') {
        p.noStroke();
        p.ellipse(X, Y, c.mark.width * (0.5 + v), c.mark.type === 'circle' ? c.mark.width * (0.5 + v) : len * 0.45);
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
        p.noFill();
        p.arc(X, Y, len, len, angle, angle + Math.PI * 0.8);
        continue;
      }
      if (c.mark.type === 'polygon') {
        p.push();
        p.translate(X, Y);
        p.rotate(angle);
        p.noStroke();
        p.beginShape();
        for (let q = 0; q < 5; q++) {
          const a = q * Math.PI * 2 / 5 - Math.PI / 2;
          p.vertex(Math.cos(a) * len * 0.35, Math.sin(a) * len * 0.35);
        }
        p.endShape('close' as any);
        p.pop();
        continue;
      }

      const lineLength = c.mark.type === 'long-line' ? len * 2.6 : len;
      p.line(
        X - Math.cos(angle) * lineLength / 2,
        Y - Math.sin(angle) * lineLength / 2,
        X + Math.cos(angle) * lineLength / 2,
        Y + Math.sin(angle) * lineLength / 2
      );
    }
    if (count > max) break;
  }

  ctx.globalAlpha = 1;
  p.pop();
}
export function svgFor(c:Config){ const pts:string[]=[];const rand=rng(c.seed),sx=c.grid.spacingX,sy=c.grid.spacingY,engine=perlinForSeed(c.seed),settings={octaves:c.noise.octaves,persistence:c.noise.falloff,lacunarity:c.noise.lacunarity,amplitude:c.noise.strength};let n=0;for(let y=c.grid.margin;y<c.canvas.height-c.grid.margin;y+=sy)for(let x=c.grid.margin;x<c.canvas.width-c.grid.margin;x+=sx){if(++n>Math.min(c.canvas.maxPoints,20000))break;const v=normalized(engine.fractal2D(x*c.noise.scale*c.noise.scaleX+c.noise.offsetX,y*c.noise.scale*c.noise.scaleY+c.noise.offsetY,settings));if(rand()>c.mark.density)continue;const a=v*c.noise.directionMultiplier+c.mark.rotation,L=c.mark.length*(.5+v);pts.push(`<line x1="${(x-Math.cos(a)*L/2).toFixed(2)}" y1="${(y-Math.sin(a)*L/2).toFixed(2)}" x2="${(x+Math.cos(a)*L/2).toFixed(2)}" y2="${(y+Math.sin(a)*L/2).toFixed(2)}"/>`);}const bg=c.color.transparent?'none':c.color.background;return `<svg xmlns="http://www.w3.org/2000/svg" width="${c.canvas.width}" height="${c.canvas.height}" viewBox="0 0 ${c.canvas.width} ${c.canvas.height}"><rect width="100%" height="100%" fill="${bg}"/><g stroke="${c.color.foreground}" stroke-width="${c.mark.thickness}" stroke-linecap="round">${pts.join('')}</g></svg>`;}
