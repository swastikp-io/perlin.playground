import React from 'react';

interface HeaderProps {
  onExportImage: () => void;
  onExportVideo: () => void;
  isRecording: boolean;
  recordingCountdown: number | null;
  recordingError: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onExportImage,
  onExportVideo,
  isRecording,
  recordingCountdown,
  recordingError
}) => {
  return (
    <header className="app-header" id="app-header">
      <div className="header-brand">
        <h1 className="app-title">perlin.playground</h1>
        <span className="app-subtitle">Procedural graphics generator</span>
      </div>

      <div className="header-actions">
        {recordingError && (
          <span className="recording-error" title={recordingError}>
            {recordingError}
          </span>
        )}

        <button
          id="btn-export-image"
          className="btn-export"
          onClick={onExportImage}
          disabled={isRecording}
          type="button"
        >
          Export Image
        </button>

        <button
          id="btn-export-video"
          className={`btn-export ${isRecording ? 'btn-recording' : ''}`}
          onClick={onExportVideo}
          disabled={isRecording}
          type="button"
        >
          {isRecording
            ? `Recording... ${recordingCountdown !== null ? `(${recordingCountdown}s)` : ''}`
            : 'Export Video'}
        </button>
      </div>
    </header>
  );
};
