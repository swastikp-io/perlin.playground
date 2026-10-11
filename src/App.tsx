import React, { useState, useRef, useCallback } from 'react';
import { GraphicsConfig, DEFAULT_CONFIG, VideoExportSettings, VideoExportProgress } from './engine/types';
import { SketchEngine } from './engine/sketch';
import { exportCanvasAsImage, startHighQualityVideoExport, VideoExportController } from './engine/recorder';
import { randomizeConfig } from './engine/randomizer';
import { Header } from './components/Header';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { ExportVideoModal } from './components/ExportVideoModal';

export const App: React.FC = () => {
  const [config, setConfig] = useState<GraphicsConfig>(DEFAULT_CONFIG);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<VideoExportProgress | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const engineRef = useRef<SketchEngine | null>(null);
  const exportControllerRef = useRef<VideoExportController | null>(null);

  const isExporting = Boolean(exportProgress && (exportProgress.status === 'rendering' || exportProgress.status === 'finalizing'));

  const handleConfigChange = useCallback((updates: Partial<GraphicsConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleRandomize = useCallback(() => {
    setConfig(prev => randomizeConfig(prev));
  }, []);

  const handleEngineReady = useCallback((engine: SketchEngine) => {
    engineRef.current = engine;
  }, []);

  const handleEngineDestroyed = useCallback(() => {
    engineRef.current = null;
  }, []);

  const handleExportImage = useCallback(() => {
    const canvas = engineRef.current?.getCanvas();
    if (!canvas) {
      alert('Canvas is not ready yet.');
      return;
    }
    try {
      exportCanvasAsImage(canvas, 'perlin-playground.png');
    } catch (err) {
      console.error('Image export failed:', err);
      alert('Failed to export image: ' + (err instanceof Error ? err.message : String(err)));
    }
  }, []);

  const handleOpenVideoExport = useCallback(() => {
    setRecordingError(null);
    setIsExportModalOpen(true);
  }, []);

  const handleStartExport = useCallback((settings: VideoExportSettings) => {
    const previewCanvas = engineRef.current?.getCanvas();
    const refW = previewCanvas?.width || 900;
    const refH = previewCanvas?.height || 900;
    const initialProgress = engineRef.current?.getLoopProgress() || 0;

    setRecordingError(null);
    setExportProgress({
      elapsedSeconds: 0,
      targetSeconds: settings.duration,
      percentage: 0,
      status: 'rendering'
    });

    try {
      exportControllerRef.current = startHighQualityVideoExport({
        config,
        settings,
        referenceWidth: refW,
        referenceHeight: refH,
        initialProgress,
        onProgress: p => {
          setExportProgress(p);
        },
        onComplete: () => {
          exportControllerRef.current = null;
          setTimeout(() => {
            setIsExportModalOpen(false);
            setExportProgress(null);
          }, 600);
        },
        onError: err => {
          exportControllerRef.current = null;
          setExportProgress(null);
          const msg = err instanceof Error ? err.message : String(err);
          setRecordingError(msg);
          alert('Video export error: ' + msg);
        }
      });
    } catch (err) {
      exportControllerRef.current = null;
      setExportProgress(null);
      const msg = err instanceof Error ? err.message : String(err);
      setRecordingError(msg);
      alert('Video export error: ' + msg);
    }
  }, [config]);

  const handleCancelExport = useCallback(() => {
    if (exportControllerRef.current) {
      exportControllerRef.current.cancel();
      exportControllerRef.current = null;
    }
    setExportProgress(null);
    setIsExportModalOpen(false);
  }, []);

  return (
    <div className="app-container" id="perlin-playground-root">
      <Header
        onRandomize={handleRandomize}
        onExportImage={handleExportImage}
        onExportVideo={handleOpenVideoExport}
        isRecording={isExporting}
        recordingCountdown={
          exportProgress
            ? Math.max(0, Math.ceil(exportProgress.targetSeconds - exportProgress.elapsedSeconds))
            : null
        }
        recordingError={recordingError}
      />
      <div className="workspace-main" id="workspace-main">
        <Canvas
          config={config}
          onEngineReady={handleEngineReady}
          onEngineDestroyed={handleEngineDestroyed}
        />
        <Sidebar config={config} onChange={handleConfigChange} />
      </div>

      <ExportVideoModal
        isOpen={isExportModalOpen}
        onClose={() => {
          if (!isExporting) setIsExportModalOpen(false);
        }}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
        progress={exportProgress}
        isExporting={isExporting}
      />
    </div>
  );
};
