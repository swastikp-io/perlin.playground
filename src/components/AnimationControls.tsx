import React from 'react';
import { GraphicsConfig } from '../engine/types';

interface AnimationControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({ config, onChange }) => {
  const togglePlay = () => {
    onChange({ isPlaying: !config.isPlaying });
  };

  return (
    <section className="control-section" id="section-animation">
      <h2 className="section-title">Animation</h2>

      <div className="control-group">
        <button
          id="btn-playback-toggle"
          type="button"
          className={`btn-playback ${config.isPlaying ? 'btn-playback-active' : 'btn-playback-paused'}`}
          onClick={togglePlay}
        >
          {config.isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-animation-speed">Animation Speed</label>
          <span className="control-value">{`${config.animationSpeed.toFixed(2)}×`}</span>
        </div>
        <input
          id="input-animation-speed"
          type="range"
          min="0.25"
          max="3.0"
          step="0.05"
          value={config.animationSpeed}
          onChange={e => onChange({ animationSpeed: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-loop-duration">Loop Duration</label>
          <span className="control-value">{`${Math.round(config.loopDuration)}s`}</span>
        </div>
        <input
          id="input-loop-duration"
          type="range"
          min="2"
          max="20"
          step="1"
          value={config.loopDuration}
          onChange={e => onChange({ loopDuration: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>
    </section>
  );
};
