import React from 'react';
import { GraphicsConfig, PaletteName } from '../engine/types';
import { PALETTE_NAMES } from '../engine/palettes';

interface ColorControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

export const ColorControls: React.FC<ColorControlsProps> = ({ config, onChange }) => {
  const handleMinOpacityChange = (val: number) => {
    // If min exceeds max, we adjust max or clamp
    if (val > config.maxOpacity) {
      onChange({ minOpacity: val, maxOpacity: val });
    } else {
      onChange({ minOpacity: val });
    }
  };

  const handleMaxOpacityChange = (val: number) => {
    // If max is below min, we adjust min or clamp
    if (val < config.minOpacity) {
      onChange({ maxOpacity: val, minOpacity: val });
    } else {
      onChange({ maxOpacity: val });
    }
  };

  return (
    <section className="control-section" id="section-color">
      <h2 className="section-title">Color</h2>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="select-palette">Palette</label>
        </div>
        <select
          id="select-palette"
          className="select-dropdown"
          value={config.palette}
          onChange={e => onChange({ palette: e.target.value as PaletteName })}
        >
          {PALETTE_NAMES.map(pName => (
            <option key={pName} value={pName}>
              {pName}
            </option>
          ))}
        </select>
      </div>

      {config.palette === 'Custom' && (
        <div className="custom-palette-group" id="group-custom-palette">
          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-custom-bg">Background Color</label>
            </div>
            <div className="color-picker-row">
              <input
                id="input-custom-bg"
                type="color"
                value={config.customBgColor}
                onChange={e => onChange({ customBgColor: e.target.value })}
                className="color-input"
              />
              <span className="color-hex-label">{config.customBgColor}</span>
            </div>
          </div>

          <div className="control-group">
            <div className="control-label-row">
              <label htmlFor="input-custom-fg">Foreground Color</label>
            </div>
            <div className="color-picker-row">
              <input
                id="input-custom-fg"
                type="color"
                value={config.customFgColor}
                onChange={e => onChange({ customFgColor: e.target.value })}
                className="color-input"
              />
              <span className="color-hex-label">{config.customFgColor}</span>
            </div>
          </div>
        </div>
      )}

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-min-opacity">Foreground Minimum Opacity</label>
          <span className="control-value">{(config.minOpacity * 100).toFixed(0)}%</span>
        </div>
        <input
          id="input-min-opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={config.minOpacity}
          onChange={e => handleMinOpacityChange(parseFloat(e.target.value))}
          className="slider"
        />
      </div>

      <div className="control-group">
        <div className="control-label-row">
          <label htmlFor="input-max-opacity">Foreground Maximum Opacity</label>
          <span className="control-value">{(config.maxOpacity * 100).toFixed(0)}%</span>
        </div>
        <input
          id="input-max-opacity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={config.maxOpacity}
          onChange={e => handleMaxOpacityChange(parseFloat(e.target.value))}
          className="slider"
        />
      </div>
    </section>
  );
};
