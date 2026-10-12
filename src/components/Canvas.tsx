import React, { useEffect, useRef } from 'react';
import { GraphicsConfig } from '../engine/types';
import { SketchEngine } from '../engine/sketch';

interface CanvasProps {
  config: GraphicsConfig;
  onEngineReady?: (engine: SketchEngine) => void;
  onEngineDestroyed?: () => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  config,
  onEngineReady,
  onEngineDestroyed
}) => {
  const wrapperRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);

  // Initialize engine once on mount inside the 16:9 stage container
  useEffect(() => {
    if (!stageRef.current) return;

    const engine = new SketchEngine(stageRef.current, config);
    engineRef.current = engine;
    if (onEngineReady) {
      onEngineReady(engine);
    }

    // Measure available wrapper space and utilize full canvas for preview with zero margins
    const updateDimensions = (w: number, h: number) => {
      if (w <= 0 || h <= 0) return;
      const stageW = Math.floor(w);
      const stageH = Math.floor(h);

      if (stageRef.current) {
        stageRef.current.style.width = '100%';
        stageRef.current.style.height = '100%';
      }
      engine.resize(stageW, stageH);
    };

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateDimensions(width, height);
      }
    });

    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
      const rect = wrapperRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        updateDimensions(rect.width, rect.height);
      }
    }

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
      if (onEngineDestroyed) {
        onEngineDestroyed();
      }
    };
  }, []);

  // Update engine configuration whenever config changes without recreating canvas
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateConfig(config);
    }
  }, [config]);

  return (
    <main className="canvas-wrapper" id="artwork-canvas-container" ref={wrapperRef}>
      <div className="canvas-stage" id="artwork-canvas-stage" ref={stageRef}>
        {/* p5 canvas will be injected here */}
      </div>
    </main>
  );
};
