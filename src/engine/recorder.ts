import p5 from 'p5';
import {
  GraphicsConfig,
  VideoExportSettings,
  VideoExportProgress,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption
} from './types';
import { renderGraphicsFrame } from './sketch';

export const RESOLUTION_DIMENSIONS: Record<VideoResolutionOption, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 }
};

/**
 * Validates the requested export duration.
 * Must be at least 15 seconds.
 */
export function validateExportDuration(duration: number): { valid: boolean; error?: string } {
  if (typeof duration !== 'number' || isNaN(duration)) {
    return { valid: false, error: 'Duration must be a valid number' };
  }
  if (duration < 15) {
    return { valid: false, error: 'Export duration must be at least 15 seconds' };
  }
  return { valid: true };
}

/**
 * Calculates appropriate target bitrates based on resolution, framerate, and quality.
 */
export function getVideoBitrate(
  resolution: VideoResolutionOption,
  fps: VideoFpsOption,
  quality: VideoQualityOption
): number {
  let baseBitrate = 12_000_000; // 12 Mbps default for 1080p 30fps High

  if (resolution === '1080p') {
    if (quality === 'High') baseBitrate = 12_000_000;
    else if (quality === 'Very High') baseBitrate = 20_000_000;
    else baseBitrate = 32_000_000; // Maximum
  } else if (resolution === '1440p') {
    if (quality === 'High') baseBitrate = 22_000_000;
    else if (quality === 'Very High') baseBitrate = 36_000_000;
    else baseBitrate = 52_000_000; // Maximum
  } else if (resolution === '4K') {
    if (quality === 'High') baseBitrate = 45_000_000;
    else if (quality === 'Very High') baseBitrate = 70_000_000;
    else baseBitrate = 100_000_000; // Maximum
  }

  if (fps === 60) {
    baseBitrate = Math.round(baseBitrate * 1.4);
  }

  return baseBitrate;
}

/**
 * Estimates final file size in MB.
 */
export function estimateFileSizeMB(
  resolution: VideoResolutionOption,
  fps: VideoFpsOption,
  quality: VideoQualityOption,
  durationSec: number
): number {
  const bitrate = getVideoBitrate(resolution, fps, quality);
  const totalBits = bitrate * durationSec;
  const bytes = totalBits / 8;
  return parseFloat((bytes / (1024 * 1024)).toFixed(1));
}

export function isVideoRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined';
  const hasCaptureStream =
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function';
  return hasMediaRecorder && hasCaptureStream;
}

export function getSupportedVideoMimeType(): { mimeType: string; extension: string } | null {
  if (!isVideoRecordingSupported()) return null;

  const candidateTypes = [
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' }
  ];

  for (const candidate of candidateTypes) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  if (MediaRecorder.isTypeSupported('')) {
    return { mimeType: '', extension: 'webm' };
  }

  return null;
}

export function exportCanvasAsImage(canvas: HTMLCanvasElement, filename = 'perlin-playground.png'): void {
  if (!canvas) {
    throw new Error('Canvas element not available for export');
  }

  canvas.toBlob(blob => {
    if (!blob) {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

export interface HighQualityExportOptions {
  config: GraphicsConfig;
  settings: VideoExportSettings;
  referenceWidth?: number;
  referenceHeight?: number;
  initialProgress?: number;
  onProgress?: (progress: VideoExportProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface VideoExportController {
  cancel: () => void;
}

/**
 * Executes a high-quality video export at the requested resolution, duration (min 15s), and framerate.
 * Uses an isolated offscreen p5 rendering surface, ensuring the preview canvas remains untouched.
 */
export function startHighQualityVideoExport(options: HighQualityExportOptions): VideoExportController {
  const { config, settings } = options;

  // 1. Validate duration (min 15 seconds)
  const validation = validateExportDuration(settings.duration);
  if (!validation.valid) {
    const err = new Error(validation.error || 'Invalid duration');
    options.onError?.(err);
    throw err;
  }

  // 2. Validate browser recording support
  if (!isVideoRecordingSupported()) {
    const err = new Error('Video recording is not supported in this browser.');
    options.onError?.(err);
    throw err;
  }

  const supported = getSupportedVideoMimeType();
  if (!supported) {
    const err = new Error('No supported video recording format found in this browser.');
    options.onError?.(err);
    throw err;
  }

  const dims = RESOLUTION_DIMENSIONS[settings.resolution] || RESOLUTION_DIMENSIONS['1080p'];
  const exportWidth = dims.width;
  const exportHeight = dims.height;
  const targetDurationSec = settings.duration;
  const targetDurationMs = targetDurationSec * 1000;
  const targetFps = settings.fps;
  const bitrate = getVideoBitrate(settings.resolution, settings.fps, settings.quality);

  // 3. Create isolated offscreen container element
  const container = document.createElement('div');
  container.id = `offscreen-export-${Date.now()}`;
  container.style.cssText = `position:fixed;left:-99999px;top:-99999px;width:${exportWidth}px;height:${exportHeight}px;opacity:0;pointer-events:none;z-index:-9999;`;
  document.body.appendChild(container);

  let offscreenP5: p5 | null = null;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  const chunks: Blob[] = [];

  let isCancelled = false;
  let isFinalized = false;
  let animFrameId: number | null = null;
  let progressIntervalId: number | null = null;

  const cleanup = () => {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    if (progressIntervalId !== null) {
      clearInterval(progressIntervalId);
      progressIntervalId = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (offscreenP5) {
      offscreenP5.remove();
      offscreenP5 = null;
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  };

  const cancelController = () => {
    if (isCancelled || isFinalized) return;
    isCancelled = true;
    options.onProgress?.({
      elapsedSeconds: 0,
      targetSeconds: targetDurationSec,
      percentage: 0,
      status: 'cancelled'
    });
    if (recorder && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch (_) {}
    }
    cleanup();
  };

  try {
    const sketch = (p: p5) => {
      p.setup = () => {
        const renderer = p.createCanvas(exportWidth, exportHeight);
        const canvasElt = renderer.elt as HTMLCanvasElement;
        p.pixelDensity(1); // Standard 1:1 pixel density at exact export resolution
        p.noiseSeed(config.noiseSeed);
        p.noiseDetail(4, config.noiseFalloff);

        // Capture stream at selected framerate
        stream = canvasElt.captureStream(targetFps);

        const recorderOpts: MediaRecorderOptions = {
          videoBitsPerSecond: bitrate
        };
        if (supported.mimeType) {
          recorderOpts.mimeType = supported.mimeType;
        }

        try {
          recorder = new MediaRecorder(stream, recorderOpts);
        } catch (recErr) {
          cleanup();
          const err = recErr instanceof Error ? recErr : new Error(String(recErr));
          options.onError?.(err);
          return;
        }

        recorder.ondataavailable = (e: BlobEvent) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onerror = () => {
          cleanup();
          options.onError?.(new Error('MediaRecorder encountered an error during capture.'));
        };

        recorder.onstop = () => {
          if (isCancelled) {
            cleanup();
            return;
          }

          isFinalized = true;
          options.onProgress?.({
            elapsedSeconds: targetDurationSec,
            targetSeconds: targetDurationSec,
            percentage: 100,
            status: 'finalizing'
          });

          if (chunks.length > 0) {
            const finalMime = supported.mimeType || 'video/webm';
            const blob = new Blob(chunks, { type: finalMime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `perlin-playground-${settings.resolution}-${Math.round(targetDurationSec)}s.${supported.extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
          }

          cleanup();
          options.onProgress?.({
            elapsedSeconds: targetDurationSec,
            targetSeconds: targetDurationSec,
            percentage: 100,
            status: 'completed'
          });
          options.onComplete?.();
        };

        // Start recording with 100ms slice
        recorder.start(100);

        const startTime = performance.now();
        const baseProgress = options.initialProgress || 0;

        // Custom animation render loop driving exact timestamps
        const renderLoop = (currentTime: number) => {
          if (isCancelled || isFinalized) return;

          const elapsedMs = currentTime - startTime;
          const elapsedSec = elapsedMs / 1000;
          const percentage = Math.min(100, Math.round((elapsedMs / targetDurationMs) * 100));

          options.onProgress?.({
            elapsedSeconds: Math.min(targetDurationSec, parseFloat(elapsedSec.toFixed(1))),
            targetSeconds: targetDurationSec,
            percentage,
            status: 'rendering'
          });

          // Calculate deterministic loop phase from elapsed time
          const currentLoopProgress =
            (baseProgress + (elapsedSec * config.animationSpeed) / config.loopDuration) % 1;

          // Render high-res frame using shared renderGraphicsFrame
          renderGraphicsFrame(
            p,
            config,
            exportWidth,
            exportHeight,
            currentLoopProgress,
            options.referenceWidth,
            options.referenceHeight
          );

          if (elapsedMs < targetDurationMs) {
            animFrameId = requestAnimationFrame(renderLoop);
          } else {
            // Target duration reached: finalize
            if (recorder && recorder.state === 'recording') {
              recorder.stop();
            }
          }
        };

        animFrameId = requestAnimationFrame(renderLoop);
      };
    };

    offscreenP5 = new p5(sketch, container);
  } catch (err) {
    cleanup();
    const errorObj = err instanceof Error ? err : new Error(String(err));
    options.onError?.(errorObj);
    throw errorObj;
  }

  return {
    cancel: cancelController
  };
}
