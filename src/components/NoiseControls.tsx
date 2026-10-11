import React from 'react';
import { GraphicsConfig } from '../engine/types';

interface NoiseControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

export const NoiseControls: React.FC<NoiseControlsProps> = ({ config, onChange }) => {
  return (
    <section className="control-section" id="section-noise">
      <h2 className="section-title">Noise</h2>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-noise-scale">Noise Scale</label>
          <span className="control-value">{config.noiseScale.toFixed(3)}</span>
        </div>
        <input
          id="input-noise-scale"
          type="range"
          min="0.002"
          max="0.08"
          step="0.001"
          value={config.noiseScale}
          onChange={e => onChange({ noiseScale: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-noise-strength">Noise Strength</label>
          <span className="control-value">{Math.round(config.noiseStrength)}</span>
        </div>
        <input
          id="input-noise-strength"
          type="range"
          min="0"
          max="100"
          step="1"
          value={config.noiseStrength}
          onChange={e => onChange({ noiseStrength: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-noise-falloff">Noise Falloff</label>
          <span className="control-value">{config.noiseFalloff.toFixed(2)}</span>
        </div>
        <input
          id="input-noise-falloff"
          type="range"
          min="0.10"
          max="0.85"
          step="0.01"
          value={config.noiseFalloff}
          onChange={e => onChange({ noiseFalloff: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>
    </section>
  );
};
