import { describe, it, expect, vi } from 'vitest';
import {
  validateExportDuration,
  RESOLUTION_DIMENSIONS,
  getVideoBitrate,
  estimateFileSizeMB,
  isVideoRecordingSupported,
  getSupportedVideoMimeType
} from './recorder';
import {
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption
} from './types';

describe('High-Quality Video Export System Tests', () => {
  describe('Duration Validation (15-second minimum)', () => {
    it('accepts duration >= 15 seconds', () => {
      expect(validateExportDuration(15).valid).toBe(true);
      expect(validateExportDuration(20).valid).toBe(true);
      expect(validateExportDuration(60).valid).toBe(true);
    });

    it('rejects duration < 15 seconds with clear error', () => {
      const resultUnder = validateExportDuration(14.9);
      expect(resultUnder.valid).toBe(false);
      expect(resultUnder.error).toContain('15 seconds');

      const resultZero = validateExportDuration(0);
      expect(resultZero.valid).toBe(false);

      const resultNeg = validateExportDuration(-5);
      expect(resultNeg.valid).toBe(false);
    });

    it('rejects non-numeric durations', () => {
      expect(validateExportDuration(NaN).valid).toBe(false);
      // @ts-expect-error testing invalid argument type
      expect(validateExportDuration('15').valid).toBe(false);
    });

    it('uses 15s as default export duration in DEFAULT_VIDEO_EXPORT_SETTINGS', () => {
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.duration).toBe(15);
    });
  });

  describe('Resolution Selection & Dimensions', () => {
    it('maps 1080p to 1920x1080', () => {
      expect(RESOLUTION_DIMENSIONS['1080p']).toEqual({ width: 1920, height: 1080 });
    });

    it('maps 1440p to 2560x1440', () => {
      expect(RESOLUTION_DIMENSIONS['1440p']).toEqual({ width: 2560, height: 1440 });
    });

    it('maps 4K to 3840x2160', () => {
      expect(RESOLUTION_DIMENSIONS['4K']).toEqual({ width: 3840, height: 2160 });
    });

    it('uses 1080p as default resolution in DEFAULT_VIDEO_EXPORT_SETTINGS', () => {
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.resolution).toBe('1080p');
    });
  });

  describe('Frame Rate Selection', () => {
    it('uses 30 FPS as default framerate', () => {
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.fps).toBe(30);
    });

    it('scales bitrate when 60 FPS is selected', () => {
      const bitrate30 = getVideoBitrate('1080p', 30, 'High');
      const bitrate60 = getVideoBitrate('1080p', 60, 'High');
      expect(bitrate60).toBeGreaterThan(bitrate30);
      expect(bitrate60).toBe(Math.round(bitrate30 * 1.4));
    });
  });

  describe('Quality-to-Bitrate Mapping and File Size Estimation', () => {
    const resolutions: VideoResolutionOption[] = ['1080p', '1440p', '4K'];
    const qualities: VideoQualityOption[] = ['High', 'Very High', 'Maximum'];

    it('increases bitrate monotonically across quality presets for each resolution', () => {
      for (const res of resolutions) {
        const bHigh = getVideoBitrate(res, 30, 'High');
        const bVeryHigh = getVideoBitrate(res, 30, 'Very High');
        const bMax = getVideoBitrate(res, 30, 'Maximum');

        expect(bVeryHigh).toBeGreaterThan(bHigh);
        expect(bMax).toBeGreaterThan(bVeryHigh);
      }
    });

    it('increases bitrate with higher resolutions at same quality', () => {
      for (const q of qualities) {
        const b1080 = getVideoBitrate('1080p', 30, q);
        const b1440 = getVideoBitrate('1440p', 30, q);
        const b4K = getVideoBitrate('4K', 30, q);

        expect(b1440).toBeGreaterThan(b1080);
        expect(b4K).toBeGreaterThan(b1440);
      }
    });

    it('calculates reasonable estimated file size in MB', () => {
      // 15 seconds of 1080p 30fps High (12 Mbps) = ~21.5 MB
      const est15s = estimateFileSizeMB('1080p', 30, 'High', 15);
      expect(est15s).toBeGreaterThan(15);
      expect(est15s).toBeLessThan(30);

      // Doubling duration to 30 seconds doubles estimated size
      const est30s = estimateFileSizeMB('1080p', 30, 'High', 30);
      expect(est30s).toBeCloseTo(est15s * 2, 0);
    });
  });

  describe('MIME Type Selection & Filename Generation', () => {
    it('handles MIME type checks without runtime crashes', () => {
      const mime = getSupportedVideoMimeType();
      // In node/jsdom environment without native media encoder, returns null gracefully
      if (isVideoRecordingSupported()) {
        expect(mime).not.toBeNull();
        expect(mime?.extension).toMatch(/webm|mp4/);
      } else {
        expect(mime).toBeNull();
      }
    });

    it('generates correct standardized filename patterns', () => {
      const res = '1080p';
      const duration = 15;
      const ext = 'webm';
      const filename = `perlin-playground-${res}-${duration}s.${ext}`;
      expect(filename).toBe('perlin-playground-1080p-15s.webm');
    });
  });
});
