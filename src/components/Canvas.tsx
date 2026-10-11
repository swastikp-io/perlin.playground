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
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);

  // Initialize engine once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new SketchEngine(containerRef.current, config);
    engineRef.current = engine;
    if (onEngineReady) {
      onEngineReady(engine);
    }

    // Set up ResizeObserver to handle fluid container resizing
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          engine.resize(Math.floor(width), Math.floor(height));
        }
      }
    });

    resizeObserver.observe(containerRef.current);

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
    <main className="canvas-wrapper" id="artwork-canvas-container" ref={containerRef}>
      {/* p5 canvas will be injected here */}
    </main>
  );
};
