import { memo, useEffect, useRef } from 'react';
import p5 from 'p5';
import type { Config } from '../graphics/types';
import { render } from '../graphics/renderer';
import { advanceTimeline } from '../graphics/animation';

export type RenderExporter = (
  width: number,
  height: number,
  format: 'png' | 'jpeg',
  quality: number
) => Promise<Blob>;

export const Canvas = memo(function Canvas({
  config,
  onReady,
  onExporter,
  onTimeChange,
  onFpsChange,
}: {
  config: Config;
  onReady: (canvas: HTMLCanvasElement) => void;
  onExporter: (exporter: RenderExporter) => void;
  onTimeChange?: (seconds: number) => void;
  onFpsChange?: (fps: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<p5 | null>(null);
  const isReadyRef = useRef(false);
  const configRef = useRef(structuredClone(config));
  const timelineRef = useRef(config.time.offset);
  const lastTimestampRef = useRef<number | null>(null);
  const resetTokenRef = useRef(config.time.resetToken);
  const wasPlayingRef = useRef(config.time.playing);
  const onReadyRef = useRef(onReady);
  const onExporterRef = useRef(onExporter);
  const onTimeChangeRef = useRef(onTimeChange);
  const onFpsChangeRef = useRef(onFpsChange);
  const lastReportedTimeRef = useRef(-Infinity);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  onReadyRef.current = onReady;
  onExporterRef.current = onExporter;
  onTimeChangeRef.current = onTimeChange;
  onFpsChangeRef.current = onFpsChange;

  useEffect(() => {
    if (!host.current) return;

    let isCancelled = false;
    isReadyRef.current = false;

    const handleVisibility = () => {
      if (document.hidden) {
        lastTimestampRef.current = null;
      } else {
        lastTimestampRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const sketch = (p: p5) => {
      p.setup = () => {
        if (isCancelled || !host.current) return;
        const c = p.createCanvas(configRef.current.canvas.width, configRef.current.canvas.height);
        p.pixelDensity(1);
        isReadyRef.current = true;

        if (c && (c as any).elt) {
          const elt = (c as any).elt as HTMLCanvasElement;
          elt.style.width = '';
          elt.style.height = '';
          onReadyRef.current(elt);
        }

        const exporter: RenderExporter = async (width, height, format, quality) => {
          const liveCanvas = ((p as any).canvas || (p as any)._renderer?.canvas) as HTMLCanvasElement;
          const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
          if (width === p.width && height === p.height && liveCanvas) {
            return new Promise<Blob>((resolve, reject) =>
              liveCanvas.toBlob(
                (blob) => (blob ? resolve(blob) : reject(new Error('Failed to encode current frame'))),
                mimeType,
                quality
              )
            );
          }
          const out = structuredClone(configRef.current);
          out.time.offset = timelineRef.current;
          out.canvas.width = width;
          out.canvas.height = height;
          out.canvas.maxPoints = Math.min(
            100000,
            Math.round(
              (out.canvas.maxPoints * (width * height)) /
                (configRef.current.canvas.width * configRef.current.canvas.height)
            )
          );

          const g = p.createGraphics(width, height);
          g.pixelDensity(1);
          render(g as unknown as p5, out, p);

          const canvasElement = ((g as any).elt || (g as any).canvas) as HTMLCanvasElement;
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvasElement.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Failed to encode image blob'))),
              mimeType,
              quality
            );
          });
          g.remove();
          return blob;
        };

        onExporterRef.current(exporter);

        wasPlayingRef.current = configRef.current.time.playing;
        if (configRef.current.time.playing) {
          lastTimestampRef.current = performance.now();
          lastFpsTimeRef.current = performance.now();
          frameCountRef.current = 0;
          p.loop();
        } else {
          p.noLoop();
          render(p, configRef.current);
          onFpsChangeRef.current?.(0);
        }
      };

      p.draw = () => {
        if (!isReadyRef.current || isCancelled) return;
        if (configRef.current.time.playing) {
          const now = performance.now();
          const previous = lastTimestampRef.current ?? now;
          lastTimestampRef.current = now;
          timelineRef.current = advanceTimeline(timelineRef.current, now - previous, configRef.current.time);

          frameCountRef.current++;
          if (now - lastFpsTimeRef.current >= 500) {
            const elapsed = (now - lastFpsTimeRef.current) / 1000;
            const fps = Math.round(frameCountRef.current / Math.max(elapsed, 0.001));
            frameCountRef.current = 0;
            lastFpsTimeRef.current = now;
            onFpsChangeRef.current?.(fps);
          }
        }
        configRef.current.time.offset = timelineRef.current;
        render(p, configRef.current);
        if (timelineRef.current - lastReportedTimeRef.current >= 0.1 || !configRef.current.time.playing) {
          lastReportedTimeRef.current = timelineRef.current;
          onTimeChangeRef.current?.(timelineRef.current);
        }
      };
    };

    instance.current = new p5(sketch, host.current);

    return () => {
      isCancelled = true;
      isReadyRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        instance.current?.noLoop();
        instance.current?.remove();
      } catch {
        // Safe cleanup
      }
      instance.current = null;
      if (host.current) {
        host.current.innerHTML = '';
      }
    };
  }, []);

  useEffect(() => {
    const resetRequested = config.time.resetToken !== resetTokenRef.current;
    resetTokenRef.current = config.time.resetToken;
    if (resetRequested) timelineRef.current = config.time.offset;
    configRef.current = structuredClone(config);
    configRef.current.time.offset = timelineRef.current;

    const p = instance.current;
    if (!p || !isReadyRef.current) return;

    if (p.width !== config.canvas.width || p.height !== config.canvas.height) {
      p.resizeCanvas(config.canvas.width, config.canvas.height);
      const liveCanvas = ((p as any).canvas || (p as any)._renderer?.canvas) as HTMLCanvasElement | undefined;
      if (liveCanvas) {
        liveCanvas.style.width = '';
        liveCanvas.style.height = '';
      }
    }

    const playingChanged = config.time.playing !== wasPlayingRef.current;
    wasPlayingRef.current = config.time.playing;

    if (playingChanged) {
      if (config.time.playing) {
        lastTimestampRef.current = performance.now();
        lastFpsTimeRef.current = performance.now();
        frameCountRef.current = 0;
        p.loop();
      } else {
        p.noLoop();
        render(p, configRef.current);
        onFpsChangeRef.current?.(0);
      }
    } else if (!config.time.playing) {
      render(p, configRef.current);
    }
  }, [config]);

  return <div className="canvas-host" ref={host} />;
});

