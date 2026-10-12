import React from 'react';

interface HeaderProps {
  onRandomize: () => void;
  onExportImage: () => void;
  onExportVideo: () => void;
  isRecording: boolean;
  recordingCountdown?: number | null;
  recordingError?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  onRandomize,
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
          id="btn-randomize"
          className="btn-action btn-randomize"
          onClick={onRandomize}
          disabled={isRecording}
          type="button"
          title="Generate a randomized composition"
        >
          <svg
            className="btn-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 3h5v5" />
            <path d="M4 20L21 3" />
            <path d="M21 16v5h-5" />
            <path d="M15 15l6 6" />
            <path d="M4 4l5 5" />
          </svg>
          <span className="btn-text-full">Randomize</span>
          <span className="btn-text-short" aria-hidden="true">Random</span>
        </button>

        <button
          id="btn-export-image"
          className="btn-action btn-export"
          onClick={onExportImage}
          disabled={isRecording}
          type="button"
          title="Export current canvas frame as PNG image"
        >
          <span className="btn-text-full">Export Image</span>
          <span className="btn-text-short" aria-hidden="true">Image</span>
        </button>

        <button
          id="btn-export-video"
          className={`btn-action btn-export ${isRecording ? 'btn-recording' : ''}`}
          onClick={onExportVideo}
          type="button"
          title={isRecording ? 'View recording progress / Cancel' : 'Open Video Export settings'}
        >
          {isRecording ? (
            <>
              <span className="btn-text-full">{`Recording... ${recordingCountdown ? `(${recordingCountdown}s)` : ''}`}</span>
              <span className="btn-text-short" aria-hidden="true">{`Rec ${recordingCountdown ? `${recordingCountdown}s` : ''}`}</span>
            </>
          ) : (
            <>
              <span className="btn-text-full">Export Video</span>
              <span className="btn-text-short" aria-hidden="true">Video</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
