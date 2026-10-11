import React from 'react';
import { GraphicsConfig } from '../engine/types';

interface LayoutControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

export const LayoutControls: React.FC<LayoutControlsProps> = ({ config, onChange }) => {
  return (
    <section className="control-section" id="section-layout">
      <h2 className="section-title">Layout</h2>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-rows">Rows</label>
          <span className="control-value">{config.rows}</span>
        </div>
        <input
          id="input-rows"
          type="range"
          min="5"
          max="64"
          step="1"
          value={config.rows}
          onChange={e => onChange({ rows: parseInt(e.target.value, 10) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-columns">Columns</label>
          <span className="control-value">{config.columns}</span>
        </div>
        <input
          id="input-columns"
          type="range"
          min="5"
          max="64"
          step="1"
          value={config.columns}
          onChange={e => onChange({ columns: parseInt(e.target.value, 10) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-canvas-padding">Canvas Padding</label>
          <span className="control-value">{Math.round(config.canvasPadding)}px</span>
        </div>
        <input
          id="input-canvas-padding"
          type="range"
          min="0"
          max="120"
          step="2"
          value={config.canvasPadding}
          onChange={e => onChange({ canvasPadding: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-x-offset">X Offset</label>
          <span className="control-value">{Math.round(config.xOffset)}px</span>
        </div>
        <input
          id="input-x-offset"
          type="range"
          min="-150"
          max="150"
          step="1"
          value={config.xOffset}
          onChange={e => onChange({ xOffset: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-y-offset">Y Offset</label>
          <span className="control-value">{Math.round(config.yOffset)}px</span>
        </div>
        <input
          id="input-y-offset"
          type="range"
          min="-150"
          max="150"
          step="1"
          value={config.yOffset}
          onChange={e => onChange({ yOffset: parseFloat(e.target.value) })}
          className="slider"
        />
      </div>
    </section>
  );
};
