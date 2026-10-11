import React, { useState } from 'react';
import {
  VideoExportSettings,
  VideoExportProgress,
  DEFAULT_VIDEO_EXPORT_SETTINGS,
  VideoResolutionOption,
  VideoFpsOption,
  VideoQualityOption
} from '../engine/types';
import { estimateFileSizeMB, validateExportDuration } from '../engine/recorder';

interface ExportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartExport: (settings: VideoExportSettings) => void;
  onCancelExport: () => void;
  progress: VideoExportProgress | null;
  isExporting: boolean;
}

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
  const estimatedMB = estimateFileSizeMB(
    settings.resolution,
    settings.fps,
    settings.quality,
    Math.max(15, settings.duration)
  );

  const handleDurationChange = (val: number) => {
    setSettings(prev => ({ ...prev, duration: Math.max(1, val) }));
  };

  const handleStart = () => {
    if (!isValid || isExporting) return;
    onStartExport(settings);
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
              <span className="export-meta-badge">{settings.resolution}</span>
              <span className="export-meta-badge">{`${settings.fps} FPS`}</span>
              <span className="export-meta-badge">{`${settings.quality} Quality`}</span>
              <span className="export-meta-badge">{`${settings.duration}s`}</span>
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
            {/* Resolution */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="select-export-resolution">Resolution</label>
              </div>
              <select
                id="select-export-resolution"
                className="select-dropdown"
                value={settings.resolution}
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    resolution: e.target.value as VideoResolutionOption
                  }))
                }
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
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    fps: parseInt(e.target.value, 10) as VideoFpsOption
                  }))
                }
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
                onChange={e =>
                  setSettings(prev => ({
                    ...prev,
                    quality: e.target.value as VideoQualityOption
                  }))
                }
              >
                {QUALITY_OPTIONS.map(q => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            {/* File Size Estimate */}
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
