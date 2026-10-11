/**
 * Handles canvas image export (PNG) and video recording (WebM/MP4 via MediaRecorder).
 */

export function exportCanvasAsImage(canvas: HTMLCanvasElement, filename = 'perlin-playground.png'): void {
  if (!canvas) {
    throw new Error('Canvas element not available for export');
  }

  // Use toBlob for standard cross-browser PNG generation
  canvas.toBlob(blob => {
    if (!blob) {
      // Fallback to data URL if toBlob returns null
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

export function isVideoRecordingSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined';
  const hasCaptureStream = typeof HTMLCanvasElement !== 'undefined' &&
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

  // Fallback to default if empty string is accepted
  if (MediaRecorder.isTypeSupported('')) {
    return { mimeType: '', extension: 'webm' };
  }

  return null;
}

export interface VideoRecordingController {
  stop: () => void;
}

export function startCanvasVideoRecording(
  canvas: HTMLCanvasElement,
  options: {
    durationMs?: number;
    fps?: number;
    onProgress?: (secondsLeft: number) => void;
    onComplete?: () => void;
    onError?: (error: Error) => void;
  } = {}
): VideoRecordingController {
  if (!isVideoRecordingSupported()) {
    const err = new Error('Video recording is not supported in this browser.');
    options.onError?.(err);
    throw err;
  }

  const supported = getSupportedVideoMimeType();
  if (!supported) {
    const err = new Error('No supported video recording MIME format found in this browser.');
    options.onError?.(err);
    throw err;
  }

  const fps = options.fps || 30;
  const durationMs = options.durationMs || 3000;
  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];

  const recorderOptions: MediaRecorderOptions = supported.mimeType
    ? { mimeType: supported.mimeType }
    : {};

  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, recorderOptions);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    options.onError?.(err);
    stream.getTracks().forEach(t => t.stop());
    throw err;
  }

  let timerId: number | null = null;
  let intervalId: number | null = null;
  let stopped = false;

  const cleanup = () => {
    if (timerId !== null) {
      window.clearTimeout(timerId);
      timerId = null;
    }
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    stream.getTracks().forEach(t => t.stop());
  };

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.onerror = () => {
    cleanup();
    options.onError?.(new Error('Video recording failed during capture.'));
  };

  recorder.onstop = () => {
    cleanup();
    if (chunks.length > 0) {
      const mime = supported.mimeType || 'video/webm';
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `perlin-playground.${supported.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    options.onComplete?.();
  };

  // Start recording
  recorder.start(100); // 100ms time slice to gather chunks smoothly

  const startTime = Date.now();
  if (options.onProgress) {
    options.onProgress(Math.ceil(durationMs / 1000));
    intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      options.onProgress?.(remainingSec);
    }, 250);
  }

  timerId = window.setTimeout(() => {
    if (!stopped && recorder.state === 'recording') {
      stopped = true;
      recorder.stop();
    }
  }, durationMs);

  return {
    stop: () => {
      if (!stopped && recorder.state === 'recording') {
        stopped = true;
        recorder.stop();
      }
    }
  };
}
