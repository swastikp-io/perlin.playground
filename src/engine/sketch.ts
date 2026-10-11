import p5 from 'p5';
import { GraphicsConfig, DEFAULT_CONFIG } from './types';
import { getPaletteColors, hexToRgb } from './palettes';

export interface GridCell {
  baseX: number;
  baseY: number;
  cellW: number;
  cellH: number;
}

export class SketchEngine {
  private p5Instance: p5 | null = null;
  private container: HTMLElement;
  private config: GraphicsConfig;
  private gridCache: GridCell[] = [];
  private lastGridKey = '';
  private lastFalloff = -1;
  private time = 0;
  private canvasElement: HTMLCanvasElement | null = null;

  constructor(container: HTMLElement, initialConfig: GraphicsConfig = DEFAULT_CONFIG) {
    this.container = container;
    this.config = { ...initialConfig };
    this.initP5();
  }

  private initP5(): void {
    const sketch = (p: p5) => {
      p.setup = () => {
        const w = Math.max(100, this.container.clientWidth || 800);
        const h = Math.max(100, this.container.clientHeight || 800);
        const renderer = p.createCanvas(w, h);
        this.canvasElement = renderer.elt as HTMLCanvasElement;

        // Ensure canvas has crisp crisp rendering
        p.pixelDensity(window.devicePixelRatio || 1);
        p.noiseSeed(1337);
        p.noiseDetail(4, this.config.noiseFalloff);
        this.lastFalloff = this.config.noiseFalloff;

        this.updateGridCache(w, h);
      };

      p.draw = () => {
        const w = p.width;
        const h = p.height;

        // Check if noise falloff changed
        if (this.config.noiseFalloff !== this.lastFalloff) {
          p.noiseDetail(4, this.config.noiseFalloff);
          this.lastFalloff = this.config.noiseFalloff;
        }

        // Check if grid layout changed
        this.updateGridCache(w, h);

        // Advance time for continuous smooth noise evolution
        this.time += this.config.speed;

        // Fetch current palette
        const palette = getPaletteColors(
          this.config.palette,
          this.config.customBgColor,
          this.config.customFgColor
        );

        // Background color
        const [bgR, bgG, bgB] = hexToRgb(palette.background);
        p.background(bgR, bgG, bgB);

        // Precompute color RGB arrays
        const fgRgbList = palette.foreground.map(hex => hexToRgb(hex));
        const fgCount = fgRgbList.length;

        // Validate opacity relationship
        const minOp = Math.min(this.config.minOpacity, this.config.maxOpacity);
        const maxOp = Math.max(this.config.minOpacity, this.config.maxOpacity);
        const opRange = maxOp - minOp;

        const cells = this.gridCache;
        const cellCount = cells.length;
        const { noiseScale, noiseStrength, shapeType, xOffset, yOffset } = this.config;

        for (let i = 0; i < cellCount; i++) {
          const cell = cells[i];
          const bx = cell.baseX;
          const by = cell.baseY;

          // Sample Perlin noise in 3D (X, Y, time)
          const n = p.noise(bx * noiseScale, by * noiseScale, this.time);

          // Calculate distortion angle and displacement
          const angle = n * Math.PI * 2 * (1 + noiseStrength * 0.02);
          const maxDisplacement = Math.min(cell.cellW, cell.cellH) * (noiseStrength / 40);
          const disp = (n - 0.5) * maxDisplacement;

          const cx = bx + Math.cos(angle) * disp + xOffset;
          const cy = by + Math.sin(angle) * disp + yOffset;

          // Calculate dimensions
          const sizeRatio = (0.3 + n * 1.5) * (1 + noiseStrength / 120);
          const wElem = cell.cellW * sizeRatio * 0.72;
          const hElem = cell.cellH * sizeRatio * 0.72;

          // Opacity mapped from noise
          const alphaNorm = minOp + opRange * n;
          const alpha255 = Math.floor(Math.max(0, Math.min(1, alphaNorm)) * 255);

          // Deterministic color assignment based on noise value and index
          const colorIdx = Math.floor(n * fgCount * 0.999) % fgCount;
          const [r, g, b] = fgRgbList[colorIdx];

          p.push();
          p.translate(cx, cy);
          p.rotate(angle);

          if (shapeType === 'Ellipse') {
            p.noStroke();
            p.fill(r, g, b, alpha255);
            p.ellipse(0, 0, wElem, hElem * 0.88);
          } else if (shapeType === 'Rectangle') {
            p.noStroke();
            p.fill(r, g, b, alpha255);
            p.rectMode(p.CENTER);
            p.rect(0, 0, wElem, hElem);
          } else if (shapeType === 'Line') {
            p.noFill();
            p.stroke(r, g, b, alpha255);
            const lineThickness = Math.max(1, Math.min(cell.cellW, cell.cellH) * 0.12);
            p.strokeWeight(lineThickness);
            const lineLength = Math.max(cell.cellW, cell.cellH) * (0.35 + n * 1.2);
            p.line(-lineLength / 2, 0, lineLength / 2, 0);
          }

          p.pop();
        }
      };
    };

    this.p5Instance = new p5(sketch, this.container);
  }

  private updateGridCache(canvasW: number, canvasH: number): void {
    const { rows, columns, canvasPadding } = this.config;
    const key = `${rows}_${columns}_${canvasPadding}_${canvasW}_${canvasH}`;

    if (key === this.lastGridKey && this.gridCache.length > 0) {
      return;
    }

    this.lastGridKey = key;
    const safePadding = Math.min(canvasPadding, Math.min(canvasW, canvasH) * 0.45);
    const usableW = Math.max(10, canvasW - 2 * safePadding);
    const usableH = Math.max(10, canvasH - 2 * safePadding);

    const safeCols = Math.max(1, Math.floor(columns));
    const safeRows = Math.max(1, Math.floor(rows));

    const cellW = usableW / safeCols;
    const cellH = usableH / safeRows;

    const newCells: GridCell[] = [];
    for (let r = 0; r < safeRows; r++) {
      for (let c = 0; c < safeCols; c++) {
        const baseX = safePadding + (c + 0.5) * cellW;
        const baseY = safePadding + (r + 0.5) * cellH;
        newCells.push({ baseX, baseY, cellW, cellH });
      }
    }

    this.gridCache = newCells;
  }

  public updateConfig(newConfig: Partial<GraphicsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public resize(width: number, height: number): void {
    if (this.p5Instance && width > 0 && height > 0) {
      this.p5Instance.resizeCanvas(width, height);
      this.updateGridCache(width, height);
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
    this.gridCache = [];
  }
}
