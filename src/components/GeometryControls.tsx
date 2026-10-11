import React, { useState } from 'react';
import { GraphicsConfig, ShapeType } from '../engine/types';

interface GeometryControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

const SHAPE_OPTIONS: ShapeType[] = [
  'Ellipse',
  'Rectangle',
  'Line',
  'Triangle',
  'Diamond',
  'Hexagon',
  'Arc',
  'Cross',
  'Ring'
];

export const GeometryControls: React.FC<GeometryControlsProps> = ({ config, onChange }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleMinWidthChange = (val: number) => {
    if (config.maxWidth > 0 && val > config.maxWidth) {
      onChange({ minWidth: val, maxWidth: val });
    } else {
      onChange({ minWidth: val });
    }
  };

  const handleMaxWidthChange = (val: number) => {
    if (val > 0 && val < config.minWidth) {
      onChange({ maxWidth: val, minWidth: val });
    } else {
      onChange({ maxWidth: val });
    }
  };

  const handleMinHeightChange = (val: number) => {
    if (val > config.maxHeight) {
      onChange({ minHeight: val, maxHeight: val });
    } else {
      onChange({ minHeight: val });
    }
  };

  const handleMaxHeightChange = (val: number) => {
    if (val < config.minHeight) {
      onChange({ maxHeight: val, minHeight: val });
    } else {
      onChange({ maxHeight: val });
    }
  };

  const handleRotationChange = (val: number) => {
    onChange({ rotationAmount: Math.max(0, Math.min(360, val)) });
  };

  return (
    <section className="control-section" id="section-geometry" data-section="shape">
      <div
        className="collapsible-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsCollapsed(!isCollapsed);
          }
        }}
      >
        <h2 className="section-title">Shape</h2>
        <span className="collapse-toggle" aria-label={isCollapsed ? 'Expand Shape section' : 'Collapse Shape section'}>
          {isCollapsed ? '+' : '−'}
        </span>
      </div>

      {!isCollapsed && (
        <div className="section-body" id="body-shape-controls">
          {/* 1. Shape Type */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="select-shape-type">Shape Type</label>
            </div>
            <select
              id="select-shape-type"
              className="select-dropdown"
              value={config.shapeType}
              onChange={e => onChange({ shapeType: e.target.value as ShapeType })}
            >
              {SHAPE_OPTIONS.map(shape => (
                <option key={shape} value={shape}>
                  {shape}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Min Width (px) */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-min-width">Min Width (px)</label>
              <span className="control-value">{config.minWidth}</span>
            </div>
            <input
              id="input-min-width"
              type="range"
              min="0"
              max="200"
              step="1"
              value={config.minWidth}
              onChange={e => handleMinWidthChange(parseInt(e.target.value, 10))}
              className="slider"
            />
          </div>

          {/* 3. Max Width (px) */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-max-width">Max Width (px)</label>
              <span className="control-value">
                {config.maxWidth === 0 ? '0' : config.maxWidth}
              </span>
            </div>
            <input
              id="input-max-width"
              type="range"
              min="0"
              max="300"
              step="1"
              value={config.maxWidth}
              onChange={e => handleMaxWidthChange(parseInt(e.target.value, 10))}
              className="slider"
            />
          </div>

          {/* 4. Min Height (px) */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-min-height">Min Height (px)</label>
              <span className="control-value">{config.minHeight}</span>
            </div>
            <input
              id="input-min-height"
              type="range"
              min="0"
              max="250"
              step="1"
              value={config.minHeight}
              onChange={e => handleMinHeightChange(parseInt(e.target.value, 10))}
              className="slider"
            />
          </div>

          {/* 5. Max Height (px) */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-max-height">Max Height (px)</label>
              <span className="control-value">{config.maxHeight}</span>
            </div>
            <input
              id="input-max-height"
              type="range"
              min="10"
              max="350"
              step="1"
              value={config.maxHeight}
              onChange={e => handleMaxHeightChange(parseInt(e.target.value, 10))}
              className="slider"
            />
          </div>

          {/* 6. Rotation Amount */}
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-rotation-amount">Rotation Amount</label>
              <span className="control-value">{`${Math.round(config.rotationAmount)}°`}</span>
            </div>
            <input
              id="input-rotation-amount"
              type="range"
              min="0"
              max="360"
              step="1"
              value={config.rotationAmount}
              onChange={e => handleRotationChange(parseFloat(e.target.value))}
              className="slider"
            />
          </div>
        </div>
      )}
    </section>
  );
};
