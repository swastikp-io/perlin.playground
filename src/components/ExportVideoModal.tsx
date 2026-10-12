import React, { useState } from 'react';
import {
  VideoExportSettings,
  VideoExportProgress,
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  VideoFormatOption,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption
} from '../engine/types';
import {
  estimateFileSizeMB,
  validateExportDuration,
  getVideoDataRate,
  getTotalBitrate,
  formatBitrate
} from '../engine/recorder';

interface ExportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (settings: VideoExportSettings) => void;
  onCancelExport: () => void;
  progress: VideoExportProgress | null;
  isExporting: boolean;
}

const FORMAT_OPTIONS: Array<{ value: VideoFormatOption; label: string }> = [
  { value: 'webm', label: 'WebM — VP9 (Recommended: Ultra-Smooth & High Performance)' },
  { value: 'mp4', label: 'MP4 — H.264 (Standard Video)' }
];

const RESOLUTION_OPTIONS: Array<{ value: VideoResolutionOption; label: string }> = [
  { value: '1080p', label: '1080p — 1920 × 1080' },
  { value: '1440p', label: '1440p — 2560 × 1440' },
  { value: '4K', label: '4K — 3840 × 2160' }
];

const FPS_OPTIONS: VideoFpsOption[] = [30, 60];
const QUALITY_OPTIONS: VideoQualityOption[] = ['High', 'Very High', 'Maximum'];

export const ExportVideoModal: React.FC<ExportVideoModalProps> = ({
  isOpen,
  onClose,
  onStartExport,
  onCancelExport,
  progress,
  isExporting
}) => {
  const [settings, setSettings] = useState<VideoExportSettings>(DEFAULT_VIDEO_EXPORT_SETTINGS);

  if (!isOpen) return null;

  const validation = validateExportDuration(settings.duration);
  const isValid = validation.valid;

  const defaultDataRate = getVideoDataRate(settings.resolution, settings.fps, settings.quality);
  const defaultTotalBitrate = getTotalBitrate(settings.resolution, settings.fps, settings.quality);

  const dataRate = settings.dataRate !== undefined ? settings.dataRate : defaultDataRate;
  const totalBitrate = settings.totalBitrate !== undefined ? settings.totalBitrate : defaultTotalBitrate;

  const estimatedMB = estimateFileSizeMB(
    settings.resolution,
    settings.fps,
    settings.quality,
    Math.max(15, settings.duration),
    totalBitrate
  );

  const handleDurationChange = (val: number) => {
    setSettings(prev => ({ ...prev, duration: Math.max(1, val) }));
  };

  const handleStart = () => {
    if (!isValid || isExporting) return;
    onStartExport({
      ...settings,
      dataRate,
      totalBitrate
    });
  };

  return (
    <div className="modal-backdrop" id="modal-export-video-backdrop" onClick={e => {
      // Prevent closing backdrop while active recording
      if (e.target === e.currentTarget && !isExporting) {
        onClose();
      }
    }}>
      <div className="modal-dialog" id="modal-export-video" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">{isExporting ? 'Exporting Video' : 'Export Video Settings'}</h2>
          {!isExporting && (
            <button
              className="modal-close-btn"
              onClick={onClose}
              type="button"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {isExporting && progress ? (
          /* Live Progress View */
          <div className="export-progress-view" id="export-progress-view">
            <div className="export-meta-row">
              <span className="export-meta-badge">{(settings.format || 'mp4').toUpperCase()}</span>
              <span className="export-meta-badge">{settings.resolution}</span>
              <span className="export-meta-badge">{`${settings.fps} FPS`}</span>
              <span className="export-meta-badge">{`${settings.quality} Quality`}</span>
              <span className="export-meta-badge">{`${settings.duration}s`}</span>
              <span className="export-meta-badge" id="badge-export-data-rate">{`${formatBitrate(dataRate)} Data Rate`}</span>
              <span className="export-meta-badge" id="badge-export-total-bitrate">{`${formatBitrate(totalBitrate)} Total Bitrate`}</span>
            </div>

            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <div className="progress-info-row">
              <span className="progress-time">
                {`${progress.elapsedSeconds.toFixed(1)}s / ${progress.targetSeconds}s`}
              </span>
              <span className="progress-percent">{`${progress.percentage}%`}</span>
            </div>

            <div className="progress-status-row">
              <span className="progress-status-text">
                {progress.status === 'finalizing'
                  ? 'Finalizing and encoding video file...'
                  : progress.status === 'rendering'
                  ? 'Rendering offscreen high-resolution frames...'
                  : progress.status}
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal btn-cancel"
                onClick={onCancelExport}
              >
                Cancel Export
              </button>
            </div>
          </div>
        ) : (
          /* Settings Configuration View */
          <div className="export-settings-form">
            {/* Video Format */}
            <div className="form-group" id="form-group-format">
              <div className="form-label-row">
                <label htmlFor="select-export-format">Video Format</label>
              </div>
              <select
                id="select-export-format"
                className="select-dropdown"
                value={settings.format || 'mp4'}
                onChange={e => {
                  const newFormat = e.target.value as VideoFormatOption;
                  setSettings(prev => ({
                    ...prev,
                    format: newFormat
                  }));
                }}
              >
                {FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Resolution */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="select-export-resolution">Resolution</label>
              </div>
              <select
                id="select-export-resolution"
                className="select-dropdown"
                value={settings.resolution}
                onChange={e => {
                  const newRes = e.target.value as VideoResolutionOption;
                  const newRate = getVideoDataRate(newRes, settings.fps, settings.quality);
                  const newTotal = getTotalBitrate(newRes, settings.fps, settings.quality, undefined, newRate);
                  setSettings(prev => ({
                    ...prev,
                    resolution: newRes,
                    dataRate: newRate,
                    totalBitrate: newTotal
                  }));
                }}
              >
                {RESOLUTION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="input-export-duration">Duration (seconds)</label>
                <span className="form-value">{`${settings.duration}s`}</span>
              </div>
              <div className="duration-inputs-row">
                <input
                  id="input-export-duration"
                  type="range"
                  min="15"
                  max="60"
                  step="1"
                  value={settings.duration}
                  onChange={e => handleDurationChange(parseInt(e.target.value, 10))}
                  className="slider"
                />
                <input
                  id="input-export-duration-number"
                  type="number"
                  min="15"
                  max="120"
                  value={settings.duration}
                  onChange={e => handleDurationChange(parseInt(e.target.value, 10) || 15)}
                  className="number-input"
                />
              </div>
              {!isValid && (
                <span className="validation-error">{validation.error}</span>
              )}
            </div>

            {/* Frame Rate */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="select-export-fps">Frame Rate</label>
              </div>
              <select
                id="select-export-fps"
                className="select-dropdown"
                value={settings.fps}
                onChange={e => {
                  const newFps = parseInt(e.target.value, 10) as VideoFpsOption;
                  const newRate = getVideoDataRate(settings.resolution, newFps, settings.quality);
                  const newTotal = getTotalBitrate(settings.resolution, newFps, settings.quality, undefined, newRate);
                  setSettings(prev => ({
                    ...prev,
                    fps: newFps,
                    dataRate: newRate,
                    totalBitrate: newTotal
                  }));
                }}
              >
                {FPS_OPTIONS.map(fps => (
                  <option key={fps} value={fps}>
                    {`${fps} FPS`}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Quality */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="select-export-quality">Export Quality</label>
              </div>
              <select
                id="select-export-quality"
                className="select-dropdown"
                value={settings.quality}
                onChange={e => {
                  const newQuality = e.target.value as VideoQualityOption;
                  const newRate = getVideoDataRate(settings.resolution, settings.fps, newQuality);
                  const newTotal = getTotalBitrate(settings.resolution, settings.fps, newQuality, undefined, newRate);
                  setSettings(prev => ({
                    ...prev,
                    quality: newQuality,
                    dataRate: newRate,
                    totalBitrate: newTotal
                  }));
                }}
              >
                {QUALITY_OPTIONS.map(q => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Data Rate */}
            <div className="form-group" id="form-group-data-rate">
              <div className="form-label-row">
                <label htmlFor="input-export-data-rate">Data Rate</label>
                <span className="form-value" id="value-export-data-rate">{formatBitrate(dataRate)}</span>
              </div>
              <div className="duration-inputs-row">
                <input
                  id="input-export-data-rate"
                  type="range"
                  min="2"
                  max="120"
                  step="1"
                  value={Math.round(dataRate / 1_000_000)}
                  onChange={e => {
                    const mbps = parseInt(e.target.value, 10);
                    const newRate = mbps * 1_000_000;
                    setSettings(prev => ({
                      ...prev,
                      dataRate: newRate,
                      totalBitrate: Math.round(newRate * 1.03)
                    }));
                  }}
                  className="slider"
                />
                <div className="bitrate-input-group">
                  <input
                    id="input-export-data-rate-number"
                    type="number"
                    min="1"
                    max="200"
                    value={parseFloat((dataRate / 1_000_000).toFixed(1))}
                    onChange={e => {
                      const mbps = parseFloat(e.target.value) || 1;
                      const newRate = Math.round(mbps * 1_000_000);
                      setSettings(prev => ({
                        ...prev,
                        dataRate: newRate,
                        totalBitrate: Math.round(newRate * 1.03)
                      }));
                    }}
                    className="number-input"
                  />
                  <span className="input-unit">Mbps</span>
                </div>
              </div>
            </div>

            {/* Total Bitrate */}
            <div className="form-group" id="form-group-total-bitrate">
              <div className="form-label-row">
                <label htmlFor="input-export-total-bitrate">Total Bitrate</label>
                <span className="form-value" id="value-export-total-bitrate">{formatBitrate(totalBitrate)}</span>
              </div>
              <div className="duration-inputs-row">
                <input
                  id="input-export-total-bitrate"
                  type="range"
                  min="2"
                  max="130"
                  step="1"
                  value={Math.round(totalBitrate / 1_000_000)}
                  onChange={e => {
                    const mbps = parseInt(e.target.value, 10);
                    setSettings(prev => ({
                      ...prev,
                      totalBitrate: mbps * 1_000_000
                    }));
                  }}
                  className="slider"
                />
                <div className="bitrate-input-group">
                  <input
                    id="input-export-total-bitrate-number"
                    type="number"
                    min="1"
                    max="210"
                    value={parseFloat((totalBitrate / 1_000_000).toFixed(1))}
                    onChange={e => {
                      const mbps = parseFloat(e.target.value) || 1;
                      setSettings(prev => ({
                        ...prev,
                        totalBitrate: Math.round(mbps * 1_000_000)
                      }));
                    }}
                    className="number-input"
                  />
                  <span className="input-unit">Mbps</span>
                </div>
              </div>
            </div>

            {/* Estimates */}
            <div className="estimate-row">
              <span className="estimate-label">Data Rate:</span>
              <span className="estimate-value">{formatBitrate(dataRate)}</span>
            </div>
            <div className="estimate-row">
              <span className="estimate-label">Total Bitrate:</span>
              <span className="estimate-value">{formatBitrate(totalBitrate)}</span>
            </div>
            <div className="estimate-row">
              <span className="estimate-label">Estimated File Size:</span>
              <span className="estimate-value">{`~${estimatedMB} MB (estimate)`}</span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal btn-cancel"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-export-video"
                className="btn-modal btn-confirm"
                onClick={handleStart}
                disabled={!isValid}
              >
                Start Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
