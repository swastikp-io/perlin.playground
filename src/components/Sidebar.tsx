import React from 'react';
import { GraphicsConfig } from '../engine/types';
import { AnimationControls } from './AnimationControls';
import { NoiseControls } from './NoiseControls';
import { GeometryControls } from './GeometryControls';
import { LayoutControls } from './LayoutControls';
import { ColorControls } from './ColorControls';

interface SidebarProps {
  config: GraphicsConfig;
  onChange: (updates: Partial<GraphicsConfig>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange }) => {
  return (
    <aside className="controls-sidebar" id="controls-sidebar">
      <AnimationControls config={config} onChange={onChange} />
      <NoiseControls config={config} onChange={onChange} />
      <GeometryControls config={config} onChange={onChange} />
      <LayoutControls config={config} onChange={onChange} />
      <ColorControls config={config} onChange={onChange} />
    </aside>
  );
};
