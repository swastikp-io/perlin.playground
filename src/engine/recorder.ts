import p5 from 'p5';
import {
  GraphicsConfig,
  VideoExportSettings,
  VideoExportProgress,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption,
  VideoFormatOption
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
 * Returns the target video data rate in bits per second (bps).
 * If a custom data rate is specified (> 0), it is returned; otherwise calculates from resolution, fps, and quality.
 */
export function getVideoDataRate(
  resolution: VideoResolutionOption,
  fps: VideoFpsOption,
  quality: VideoQualityOption,
  customDataRate?: number
): number {
  if (typeof customDataRate === 'number' && customDataRate > 0) {
    return customDataRate;
  }
  return getVideoBitrate(resolution, fps, quality);
}

/**
 * Returns the target total bitrate in bits per second (bps) including container multiplexing overhead.
 * If a custom total bitrate is specified (> 0), it is returned; otherwise calculates based on data rate with ~3% container overhead.
 */
export function getTotalBitrate(
  resolution: VideoResolutionOption,
  fps: VideoFpsOption,
  quality: VideoQualityOption,
  customTotalBitrate?: number,
  customDataRate?: number
): number {
  if (typeof customTotalBitrate === 'number' && customTotalBitrate > 0) {
    return customTotalBitrate;
  }
  const dataRate = getVideoDataRate(resolution, fps, quality, customDataRate);
  return Math.round(dataRate * 1.03);
}

/**
 * Formats a bitrate or data rate in bits per second into a clean human-readable string (e.g. "12.0 Mbps" or "800 kbps").
 */
export function formatBitrate(bps: number): string {
  if (bps >= 1_000_000) {
    const mbps = bps / 1_000_000;
    return `${mbps % 1 === 0 ? mbps.toFixed(0) : mbps.toFixed(1)} Mbps`;
  }
  return `${Math.round(bps / 1000)} kbps`;
}

/**
 * Estimates final file size in MB based on total bitrate and duration.
 */
export function estimateFileSizeMB(
  resolution: VideoResolutionOption,
  fps: VideoFpsOption,
  quality: VideoQualityOption,
  durationSec: number,
  customBitrate?: number
): number {
  const bitrate = customBitrate && customBitrate > 0
    ? customBitrate
    : getTotalBitrate(resolution, fps, quality);
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

export function getSupportedVideoMimeType(
  preferredFormat?: VideoFormatOption
): { mimeType: string; extension: string } | null {
  if (!isVideoRecordingSupported()) return null;

  const mp4Types = [
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' }
  ];

  const webmTypes = [
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' }
  ];

  // If user requested webm, try webm first; otherwise prioritize mp4 for native Windows metadata & H.264 quality
  const candidateTypes =
    preferredFormat === 'webm'
      ? [...webmTypes, ...mp4Types]
      : [...mp4Types, ...webmTypes];

  for (const candidate of candidateTypes) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) {
      return candidate;
    }
  }

  if (MediaRecorder.isTypeSupported('')) {
    return { mimeType: '', extension: preferredFormat === 'webm' ? 'webm' : 'mp4' };
  }

  return null;
}

/**
 * Reads an EBML Variable-length integer (VINT) at position offset.
 */
export function readEbmlVint(
  bytes: Uint8Array,
  offset: number
): { value: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const firstByte = bytes[offset];
  let vintLen = 0;
  for (let b = 0; b < 8; b++) {
    if (firstByte & (0x80 >> b)) {
      vintLen = b + 1;
      break;
    }
  }
  if (vintLen === 0 || offset + vintLen > bytes.length) return null;

  let val = firstByte & (0xff >> vintLen);
  for (let i = 1; i < vintLen; i++) {
    val = val * 256 + bytes[offset + i];
  }
  return { value: val, length: vintLen };
}

/**
 * Encodes an integer into an EBML VINT with a specified byte length (1 to 8 bytes).
 */
export function encodeEbmlVint(value: number, byteLength: number): Uint8Array {
  const result = new Uint8Array(byteLength);
  let v = value;
  for (let i = byteLength - 1; i > 0; i--) {
    result[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  result[0] = (0x80 >> (byteLength - 1)) | (v & 0xff);
  return result;
}

/**
 * Injects or updates the EBML Duration element inside a WebM container's Info master element.
 * Without this header element, Chromium-generated WebMs omit the Duration tag,
 * which causes Windows Explorer to display "0kbps Data rate / 0kbps Total bitrate"
 * and prevents video players from properly calculating bitrates and seeking.
 */
export function patchWebmDuration(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  const bytes = new Uint8Array(buffer);

  // Search for the Matroska Segment Info ID: 0x15, 0x49, 0xA9, 0x66
  let infoPos = -1;
  const searchLimit = Math.min(bytes.length - 4, 4096);
  for (let i = 0; i < searchLimit; i++) {
    if (
      bytes[i] === 0x15 &&
      bytes[i + 1] === 0x49 &&
      bytes[i + 2] === 0xa9 &&
      bytes[i + 3] === 0x66
    ) {
      infoPos = i;
      break;
    }
  }

  if (infoPos === -1) {
    return buffer;
  }

  // Read current Info element size
  const infoHeaderEnd = infoPos + 4;
  const infoVint = readEbmlVint(bytes, infoHeaderEnd);
  if (!infoVint) return buffer;

  const infoContentStart = infoHeaderEnd + infoVint.length;
  const infoContentEnd = infoContentStart + infoVint.value;

  // Check if Duration (0x44 0x89) is already present inside Info
  for (let i = infoContentStart; i < Math.min(bytes.length - 2, infoContentEnd - 2); i++) {
    if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
      const sizeByte = bytes[i + 2];
      if (sizeByte === 0x84 && i + 7 <= bytes.length) {
        // 4-byte float
        const view = new DataView(buffer, i + 3, 4);
        view.setFloat32(0, durationMs, false);
        return buffer;
      } else if (sizeByte === 0x88 && i + 11 <= bytes.length) {
        // 8-byte float
        const view = new DataView(buffer, i + 3, 8);
        view.setFloat64(0, durationMs, false);
        return buffer;
      }
    }
  }

  // Duration not present. Construct 11-byte Duration element:
  // ID: 0x44 0x89 (2 bytes), VINT size: 0x88 (8 bytes float), Float64 value (8 bytes, big-endian)
  const durationElem = new Uint8Array(11);
  durationElem[0] = 0x44;
  durationElem[1] = 0x89;
  durationElem[2] = 0x88;
  const dv = new DataView(durationElem.buffer, 3, 8);
  dv.setFloat64(0, durationMs, false);

  const newInfoSize = infoVint.value + 11;
  const newVintBytes = encodeEbmlVint(newInfoSize, infoVint.length);

  // Allocate new buffer with the 11 bytes inserted
  const patched = new Uint8Array(bytes.length + 11);
  // 1. Copy everything before Info size VINT
  patched.set(bytes.subarray(0, infoHeaderEnd), 0);
  // 2. Set new Info size VINT
  patched.set(newVintBytes, infoHeaderEnd);
  // 3. Insert duration element right at the start of Info payload
  patched.set(durationElem, infoContentStart);
  // 4. Copy rest of the file
  patched.set(bytes.subarray(infoContentStart), infoContentStart + 11);

  return patched.buffer;
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

  const supported = getSupportedVideoMimeType(settings.format);
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
  const dataRate = getVideoDataRate(settings.resolution, settings.fps, settings.quality, settings.dataRate);
  const totalBitrate = getTotalBitrate(settings.resolution, settings.fps, settings.quality, settings.totalBitrate, settings.dataRate);

  // 3. Create isolated offscreen container element.
  // We keep it in the active viewport (left:0, top:0) at full dimensions with opacity:0.01
  // so modern browser compositors allocate full GPU hardware rasterization threads
  // without layer-downscaling throttling, while remaining invisible to user interactions.
  const container = document.createElement('div');
  container.id = `offscreen-export-${Date.now()}`;
  container.style.cssText = `position:fixed;left:0;top:0;width:${exportWidth}px;height:${exportHeight}px;opacity:0.01;pointer-events:none;z-index:-9999;overflow:hidden;`;
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
        const videoTrack = stream.getVideoTracks()[0];

        const recorderOpts: MediaRecorderOptions = {
          videoBitsPerSecond: dataRate,
          bitsPerSecond: totalBitrate
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

        recorder.onstop = async () => {
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
            let finalBlob = new Blob(chunks, { type: finalMime });

            // If WebM format, patch the EBML Segment Info header with the explicit Duration
            // metadata float. Without this, Windows Explorer Details shows "0kbps Data rate / 0kbps Total bitrate"
            // and players fail to compute bitrate or seek properly.
            if (supported.extension === 'webm') {
              try {
                const arrayBuffer = await finalBlob.arrayBuffer();
                const patchedBuffer = patchWebmDuration(arrayBuffer, targetDurationMs);
                finalBlob = new Blob([patchedBuffer], { type: finalMime });
              } catch (patchErr) {
                console.warn('Failed to patch WebM duration header:', patchErr);
              }
            }

            const url = URL.createObjectURL(finalBlob);
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

        // Start recording continuously without fragmented timeslices.
        // A single continuous stream prevents GOP fragmentation and timestamp stutter in MP4/H.264
        // and produces pristine playback across Windows Media Player, QuickTime, and VLC.
        recorder.start();

        const frameIntervalMs = 1000 / targetFps;
        const totalFrames = Math.round(targetDurationSec * targetFps);
        let currentFrame = 0;
        let lastRenderTime = performance.now();
        const baseProgress = options.initialProgress || 0;

        // Synchronized animation render loop paced to exact targetFps cadence
        const renderLoop = (timestamp: number) => {
          if (isCancelled || isFinalized) return;

          const delta = timestamp - lastRenderTime;
          // Synchronize rendering to targetFps intervals
          if (delta >= frameIntervalMs || currentFrame === 0) {
            lastRenderTime = timestamp - (delta % frameIntervalMs);

            const elapsedSec = currentFrame / targetFps;
            const percentage = Math.min(100, Math.round((currentFrame / totalFrames) * 100));

            options.onProgress?.({
              elapsedSeconds: Math.min(targetDurationSec, parseFloat(elapsedSec.toFixed(1))),
              targetSeconds: targetDurationSec,
              percentage,
              status: 'rendering'
            });

            // Exact mathematical progress per frame - zero phase skips or timing jitter
            const currentLoopProgress =
              (baseProgress + (elapsedSec * config.animationSpeed) / config.loopDuration) % 1;

            // Render high-res frame
            renderGraphicsFrame(
              p,
              config,
              exportWidth,
              exportHeight,
              currentLoopProgress,
              options.referenceWidth,
              options.referenceHeight
            );

            currentFrame++;
          }

          if (currentFrame < totalFrames) {
            animFrameId = requestAnimationFrame(renderLoop);
          } else {
            // All frames delivered. Wait briefly to allow hardware encoder to flush final samples.
            setTimeout(() => {
              if (recorder && recorder.state === 'recording') {
                recorder.stop();
              }
            }, 100);
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
