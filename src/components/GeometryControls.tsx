import React from 'react';
import { GraphicsConfig, ShapeType } from '../engine/types';

interface GeometryControlsProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

const SHAPE_OPTIONS: ShapeType[] = ['Ellipse', 'Rectangle', 'Line'];

export const GeometryControls: React.FC<GeometryControlsProps> = ({ config, onChange }) => {
  return (
    <section className="control-section" id="section-geometry">
      <h2 className="section-title">Geometry</h2>

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
    </section>
  );
};
