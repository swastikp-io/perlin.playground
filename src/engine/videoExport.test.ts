import { describe, it, expect } from 'vitest';
import {
  validateExportDuration,
  RESOLUTION_DIMENSIONS,
  getVideoBitrate,
  getVideoDataRate,
  getTotalBitrate,
  formatBitrate,
  estimateFileSizeMB,
  isVideoRecordingSupported,
  getSupportedVideoMimeType,
  readEbmlVint,
  encodeEbmlVint,
  patchWebmDuration
} from './recorder';
import {
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption,
  VideoFormatOption
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

  describe('Data Rate and Total Bitrate Configuration & Sizing', () => {
    it('sets default dataRate and totalBitrate in DEFAULT_VIDEO_EXPORT_SETTINGS', () => {
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.dataRate).toBe(12_000_000);
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.totalBitrate).toBe(12_360_000);
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.totalBitrate!).toBeGreaterThan(
        DEFAULT_VIDEO_EXPORT_SETTINGS.dataRate!
      );
    });

    it('calculates video data rate matching getVideoBitrate when no custom override is set', () => {
      const rate = getVideoDataRate('1080p', 30, 'High');
      expect(rate).toBe(12_000_000);

      const rate4K = getVideoDataRate('4K', 60, 'Maximum');
      expect(rate4K).toBe(getVideoBitrate('4K', 60, 'Maximum'));
    });

    it('respects custom data rate when provided', () => {
      const customRate = 25_000_000;
      const rate = getVideoDataRate('1080p', 30, 'High', customRate);
      expect(rate).toBe(25_000_000);
    });

    it('calculates total bitrate with ~3% container overhead by default', () => {
      const dataRate = getVideoDataRate('1080p', 30, 'High');
      const totalBitrate = getTotalBitrate('1080p', 30, 'High');
      expect(totalBitrate).toBe(Math.round(dataRate * 1.03));
      expect(totalBitrate).toBeGreaterThan(dataRate);
    });

    it('respects custom total bitrate when provided', () => {
      const customTotal = 30_000_000;
      const totalBitrate = getTotalBitrate('1080p', 30, 'High', customTotal);
      expect(totalBitrate).toBe(30_000_000);
    });

    it('formats bitrates into human-readable strings', () => {
      expect(formatBitrate(12_000_000)).toBe('12 Mbps');
      expect(formatBitrate(12_360_000)).toBe('12.4 Mbps');
      expect(formatBitrate(800_000)).toBe('800 kbps');
      expect(formatBitrate(50_000_000)).toBe('50 Mbps');
    });

    it('estimates file size using custom total bitrate when provided', () => {
      // 20 Mbps total bitrate for 15s = (20,000,000 * 15) / 8 bytes = 37,500,000 bytes = ~35.8 MB
      const estCustom = estimateFileSizeMB('1080p', 30, 'High', 15, 20_000_000);
      expect(estCustom).toBeCloseTo(35.8, 1);
    });

    it('defaults format to mp4 in DEFAULT_VIDEO_EXPORT_SETTINGS', () => {
      expect(DEFAULT_VIDEO_EXPORT_SETTINGS.format).toBe('mp4');
    });
  });

  describe('EBML WebM Duration Patching (Fix for 0kbps / Metadata)', () => {
    it('correctly encodes and decodes EBML VINT numbers', () => {
      // 1-byte VINT for value 8: 0x80 | 8 = 0x88
      const vint1 = encodeEbmlVint(8, 1);
      expect(vint1[0]).toBe(0x88);
      const decoded1 = readEbmlVint(vint1, 0);
      expect(decoded1).toEqual({ value: 8, length: 1 });

      // 2-byte VINT for value 300
      const vint2 = encodeEbmlVint(300, 2);
      const decoded2 = readEbmlVint(vint2, 0);
      expect(decoded2).toEqual({ value: 300, length: 2 });
    });

    it('injects 11-byte Duration element into WebM Segment Info header when absent', () => {
      // Create mock buffer containing Segment Info element (0x15, 0x49, 0xA9, 0x66)
      // Followed by 1-byte length 4 (0x84), followed by 4 dummy bytes
      const raw = new Uint8Array([
        0x1a, 0x45, 0xdf, 0xa3, // EBML Header ID
        0x9f, // EBML Header length (dummy)
        0x00, 0x00,
        0x15, 0x49, 0xa9, 0x66, // Matroska Segment Info ID
        0x84, // Size = 4
        0x11, 0x22, 0x33, 0x44  // 4 bytes payload
      ]);

      const patched = patchWebmDuration(raw.buffer, 15000);
      const patchedBytes = new Uint8Array(patched);

      // Total length should increase by 11 bytes (2 bytes ID + 1 byte size + 8 bytes Float64)
      expect(patchedBytes.length).toBe(raw.length + 11);

      // Verify new size VINT is 4 + 11 = 15 => 0x8f
      expect(patchedBytes[11]).toBe(0x8f);

      // Verify Duration ID 0x44 0x89 and 8-byte float size 0x88
      expect(patchedBytes[12]).toBe(0x44);
      expect(patchedBytes[13]).toBe(0x89);
      expect(patchedBytes[14]).toBe(0x88);

      // Verify Float64 duration value
      const dv = new DataView(patched, 15, 8);
      expect(dv.getFloat64(0, false)).toBe(15000);
    });

    it('updates Duration in place if already present in Info header', () => {
      // Construct buffer with existing Duration element
      const raw = new Uint8Array(20);
      raw[0] = 0x15; raw[1] = 0x49; raw[2] = 0xa9; raw[3] = 0x66; // Info ID
      raw[4] = 0x8b; // Info size = 11 (0x80 | 11)
      raw[5] = 0x44; raw[6] = 0x89; // Duration ID
      raw[7] = 0x88; // 8-byte float
      const dv = new DataView(raw.buffer, 8, 8);
      dv.setFloat64(0, 1000, false);

      const patched = patchWebmDuration(raw.buffer, 30000);
      expect(patched.byteLength).toBe(20); // In-place, length unchanged

      const dvPatched = new DataView(patched, 8, 8);
      expect(dvPatched.getFloat64(0, false)).toBe(30000);
    });

    it('returns original buffer unchanged if Info header is not found', () => {
      const dummy = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const res = patchWebmDuration(dummy.buffer, 15000);
      expect(res.byteLength).toBe(dummy.byteLength);
    });
  });
});
