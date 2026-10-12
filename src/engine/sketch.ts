import p5 from 'p5';
import { GraphicsConfig, DEFAULT_CONFIG } from './types';
import { getPaletteColors, hexToRgb } from './palettes';

export interface GridCell {
  baseX: number;
  baseY: number;
  cellW: number;
  cellH: number;
}

/**
 * Shared, deterministic frame rendering function.
 * Used by both the preview sketch and the high-resolution offscreen export renderer.
 * Scales dimensions, padding, and offsets proportionally when reference dimensions are given,
 * while letterboxing the composition centered in the target canvas to preserve aspect ratio.
 */
export function renderGraphicsFrame(
  p: p5,
  config: GraphicsConfig,
  canvasW: number,
  canvasH: number,
  loopProgress: number,
  referenceW?: number,
  referenceH?: number
): void {
  // Determine scale factor and centered viewport
  const refW = referenceW || canvasW;
  const refH = referenceH || canvasH;
  const scale = Math.min(canvasW / refW, canvasH / refH);

  const viewportW = refW * scale;
  const viewportH = refH * scale;
  const viewportX = (canvasW - viewportW) / 2;
  const viewportY = (canvasH - viewportH) / 2;

  // Background color fills entire canvas
  const palette = getPaletteColors(
    config.palette,
    config.customBgColor,
    config.customFgColor
  );
  const [bgR, bgG, bgB] = hexToRgb(palette.background);
  p.background(bgR, bgG, bgB);

  // Precompute foreground RGB colors
  const fgRgbList = palette.foreground.map(hex => hexToRgb(hex));
  const fgCount = fgRgbList.length;

  // Opacity range
  const minOp = Math.min(config.minOpacity, config.maxOpacity);
  const maxOp = Math.max(config.minOpacity, config.maxOpacity);
  const opRange = maxOp - minOp;

  // Grid layout
  const { rows, columns, canvasPadding, xOffset, yOffset } = config;
  const safeCols = Math.max(1, Math.floor(columns));
  const safeRows = Math.max(1, Math.floor(rows));

  const scaledPadding = Math.min(canvasPadding * scale, Math.min(viewportW, viewportH) * 0.45);
  const usableW = Math.max(10, viewportW - 2 * scaledPadding);
  const usableH = Math.max(10, viewportH - 2 * scaledPadding);

  const cellW = usableW / safeCols;
  const cellH = usableH / safeRows;

  // Periodic circular trajectory in noise space for seamless looping
  const theta = loopProgress * Math.PI * 2;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);
  const rOrbit = 0.75;
  const nz = (config.noiseSeed % 1000) * 0.05;

  const {
    noiseScale,
    noiseStrength,
    shapeType,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    rotationAmount
  } = config;

  const maxRotRad = (Math.max(0, Math.min(360, rotationAmount)) * Math.PI) / 180;

  for (let r = 0; r < safeRows; r++) {
    for (let c = 0; c < safeCols; c++) {
      const baseX = viewportX + scaledPadding + (c + 0.5) * cellW;
      const baseY = viewportY + scaledPadding + (r + 0.5) * cellH;

      // Sample noise using coordinates mapped to reference space to keep spatial frequency invariant
      const refBx = (baseX - viewportX) / scale;
      const refBy = (baseY - viewportY) / scale;
      const nx = refBx * noiseScale + rOrbit * cosTheta;
      const ny = refBy * noiseScale + rOrbit * sinTheta;
      const n = p.noise(nx, ny, nz);

      // Noise displacement of element center
      const dispAngle = n * Math.PI * 2 * (1 + noiseStrength * 0.02);
      const maxDisplacement = Math.min(cellW, cellH) * (noiseStrength / 40);
      const disp = (n - 0.5) * maxDisplacement;

      const cx = baseX + Math.cos(dispAngle) * disp + xOffset * scale;
      const cy = baseY + Math.sin(dispAngle) * disp + yOffset * scale;

      // Calculate width
      let wElem: number;
      if (maxWidth === 0) {
        // Automatic sizing based on grid cell dimensions
        const cellBasedW = Math.max(minWidth * scale, cellW * (0.85 + (noiseStrength / 100) * 0.65));
        const effectiveMinW = Math.min(minWidth * scale, cellBasedW);
        wElem = effectiveMinW + (cellBasedW - effectiveMinW) * n;
      } else {
        const effectiveMinW = Math.min(minWidth * scale, maxWidth * scale);
        wElem = effectiveMinW + (maxWidth * scale - effectiveMinW) * n;
      }

      // Calculate height
      const effectiveMinH = Math.min(minHeight * scale, maxHeight * scale);
      const effectiveMaxH = Math.max(minHeight * scale, maxHeight * scale);
      let hElem = effectiveMinH + (effectiveMaxH - effectiveMinH) * n;

      // Constrain against canvas bounds
      wElem = Math.max(1, Math.min(wElem, canvasW - 20));
      hElem = Math.max(1, Math.min(hElem, canvasH - 20));

      // Deterministic rotation around element center: 0° disables rotation
      const shapeRotAngle = maxRotRad > 0 ? (n * 2 - 1) * maxRotRad : 0;

      // Opacity
      const alphaNorm = minOp + opRange * n;
      const alpha255 = Math.floor(Math.max(0, Math.min(1, alphaNorm)) * 255);

      // Color from palette
      const colorIdx = Math.floor(n * fgCount * 0.999) % fgCount;
      const [rCol, gCol, bCol] = fgRgbList[colorIdx];

      p.push();
      p.translate(cx, cy);
      p.rotate(shapeRotAngle);

      // Reset drawing state per shape
      switch (shapeType) {
        case 'Ellipse':
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          p.ellipse(0, 0, wElem, hElem);
          break;
        case 'Rectangle':
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          p.rectMode(p.CENTER);
          p.rect(0, 0, wElem, hElem);
          break;
        case 'Line':
          p.noFill();
          p.stroke(rCol, gCol, bCol, alpha255);
          p.strokeWeight(Math.max(1, Math.min(cellW, cellH) * 0.12));
          p.line(-wElem / 2, 0, wElem / 2, 0);
          break;
        case 'Triangle': {
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          const halfW = wElem * 0.5;
          const halfH = hElem * 0.5;
          p.beginShape();
          p.vertex(0, -halfH);
          p.vertex(halfW, halfH);
          p.vertex(-halfW, halfH);
          p.endShape(p.CLOSE);
          break;
        }
        case 'Diamond': {
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          const halfW = wElem * 0.5;
          const halfH = hElem * 0.5;
          p.beginShape();
          p.vertex(0, -halfH);
          p.vertex(halfW, 0);
          p.vertex(0, halfH);
          p.vertex(-halfW, 0);
          p.endShape(p.CLOSE);
          break;
        }
        case 'Hexagon': {
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          const rx = wElem * 0.5;
          const ry = hElem * 0.5;
          p.beginShape();
          for (let k = 0; k < 6; k++) {
            const a = (k * Math.PI) / 3 - Math.PI / 6;
            p.vertex(rx * Math.cos(a), ry * Math.sin(a));
          }
          p.endShape(p.CLOSE);
          break;
        }
        case 'Arc':
          p.noFill();
          p.stroke(rCol, gCol, bCol, alpha255);
          p.strokeWeight(Math.max(1.5, Math.min(cellW, cellH) * 0.12));
          p.arc(0, 0, wElem, hElem, 0, p.PI * 1.5);
          break;
        case 'Cross': {
          p.noStroke();
          p.fill(rCol, gCol, bCol, alpha255);
          p.rectMode(p.CENTER);
          const crossThickness = Math.max(1.5, Math.min(wElem, hElem) * 0.22);
          p.rect(0, 0, wElem, crossThickness);
          p.rect(0, 0, crossThickness, hElem);
          break;
        }
        case 'Ring': {
          p.noFill();
          p.stroke(rCol, gCol, bCol, alpha255);
          const ringWeight = Math.max(1.5, Math.min(cellW, cellH) * 0.14);
          p.strokeWeight(ringWeight);
          p.ellipse(0, 0, Math.max(1, wElem - ringWeight), Math.max(1, hElem - ringWeight));
          break;
        }
      }

      p.pop();
    }
  }
}

export class SketchEngine {
  private p5Instance: p5 | null = null;
  private container: HTMLElement;
  private config: GraphicsConfig;
  private lastFalloff = -1;
  private lastNoiseSeed = -1;
  private loopProgress = 0; // Normalized loop phase in [0, 1)
  private temporaryPlaying = false;
  private canvasElement: HTMLCanvasElement | null = null;

  constructor(container: HTMLElement, initialConfig: GraphicsConfig = DEFAULT_CONFIG) {
    this.container = container;
    this.config = { ...initialConfig };
    this.initP5();
  }

  private initP5(): void {
    const sketch = (p: p5) => {
      p.setup = () => {
        const rawW = this.container.clientWidth || 960;
        const rawH = this.container.clientHeight || Math.round(rawW / (16 / 9));
        const w = Math.max(160, Math.floor(rawW));
        const h = Math.max(90, Math.floor(rawH));
        const renderer = p.createCanvas(w, h);
        this.canvasElement = renderer.elt as HTMLCanvasElement;

        p.pixelDensity(window.devicePixelRatio || 1);
        p.noiseSeed(this.config.noiseSeed);
        this.lastNoiseSeed = this.config.noiseSeed;
        p.noiseDetail(4, this.config.noiseFalloff);
        this.lastFalloff = this.config.noiseFalloff;
      };

      p.draw = () => {
        const w = p.width;
        const h = p.height;

        // Apply noise seed update if changed
        if (this.config.noiseSeed !== this.lastNoiseSeed) {
          p.noiseSeed(this.config.noiseSeed);
          this.lastNoiseSeed = this.config.noiseSeed;
        }

        // Apply noise falloff if changed
        if (this.config.noiseFalloff !== this.lastFalloff) {
          p.noiseDetail(4, this.config.noiseFalloff);
          this.lastFalloff = this.config.noiseFalloff;
        }

        // Advance animation progress if playing or temporarily recording
        const shouldAnimate = this.config.isPlaying || this.temporaryPlaying;
        if (shouldAnimate) {
          const dt = Math.min(0.1, (p.deltaTime || 16.67) / 1000);
          const safeSpeed = Math.max(0.01, this.config.animationSpeed);
          const safeDuration = Math.max(0.5, this.config.loopDuration);
          const progressDelta = (dt * safeSpeed) / safeDuration;
          this.loopProgress = (this.loopProgress + progressDelta) % 1;
        }

        // Render current frame with shared renderer
        renderGraphicsFrame(p, this.config, w, h, this.loopProgress);
      };
    };

    this.p5Instance = new p5(sketch, this.container);
  }

  public updateConfig(newConfig: Partial<GraphicsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public setTemporaryPlaying(active: boolean): void {
    this.temporaryPlaying = active;
  }

  public getLoopProgress(): number {
    return this.loopProgress;
  }

  public setLoopProgress(progress: number): void {
    this.loopProgress = Math.max(0, Math.min(1, progress)) % 1;
  }

  public resize(width: number, height: number): void {
    if (this.p5Instance && width > 0 && height > 0) {
      this.p5Instance.resizeCanvas(width, height);
    }
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvasElement;
  }

  public getConfig(): GraphicsConfig {
    return { ...this.config };
  }

  public destroy(): void {
    if (this.p5Instance) {
      this.p5Instance.remove();
      this.p5Instance = null;
    }
    this.canvasElement = null;
  }
}
