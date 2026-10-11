import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import React from 'react';
import { Header } from './Header';
import { AnimationControls } from './AnimationControls';
import { NoiseControls } from './NoiseControls';
import { GeometryControls } from './GeometryControls';
import { LayoutControls } from './LayoutControls';
import { ColorControls } from './ColorControls';
import { Sidebar } from './Sidebar';
import { ExportVideoModal } from './ExportVideoModal';
import { DEFAULT_CONFIG } from '../engine/types';

describe('UI Components Render Tests', () => {
  it('renders Header with title, subtitle, Randomize and action buttons', () => {
    const html = renderToString(
      <Header
        onRandomize={() => {}}
        onExportImage={() => {}}
        onExportVideo={() => {}}
        isRecording={false}
        recordingCountdown={null}
        recordingError={null}
      />
    );
    expect(html).toContain('perlin.playground');
    expect(html).toContain('Procedural graphics generator');
    expect(html).toContain('Randomize');
    expect(html).toContain('btn-randomize');
    expect(html).toContain('Export Image');
    expect(html).toContain('Export Video');
    expect(html).toContain('btn-export-image');
    expect(html).toContain('btn-export-video');
  });

  it('renders Header during recording state', () => {
    const html = renderToString(
      <Header
        onRandomize={() => {}}
        onExportImage={() => {}}
        onExportVideo={() => {}}
        isRecording={true}
        recordingCountdown={3}
        recordingError={null}
      />
    );
    expect(html).toContain('Recording... (3s)');
    expect(html).toContain('btn-recording');
  });

  it('renders AnimationControls with Play/Pause, Speed, and Loop Duration', () => {
    const html = renderToString(
      <AnimationControls config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('Animation');
    expect(html).toContain('Pause');
    expect(html).toContain('btn-playback-active');
    expect(html).toContain('Animation Speed');
    expect(html).toContain('1.00×');
    expect(html).toContain('input-animation-speed');
    expect(html).toContain('Loop Duration');
    expect(html).toContain('6s');
    expect(html).toContain('input-loop-duration');
  });

  it('renders AnimationControls in paused state', () => {
    const pausedConfig = { ...DEFAULT_CONFIG, isPlaying: false };
    const html = renderToString(
      <AnimationControls config={pausedConfig} onChange={() => {}} />
    );
    expect(html).toContain('Play');
    expect(html).toContain('btn-playback-paused');
  });

  it('renders NoiseControls with Scale, Strength, and Falloff', () => {
    const html = renderToString(
      <NoiseControls config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('Noise');
    expect(html).toContain('Noise Scale');
    expect(html).toContain('Noise Strength');
    expect(html).toContain('Noise Falloff');
    expect(html).toContain('input-noise-scale');
    expect(html).toContain('input-noise-strength');
    expect(html).toContain('input-noise-falloff');
  });

  it('renders GeometryControls with all nine supported shape types and advanced controls', () => {
    const html = renderToString(
      <GeometryControls config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('Shape');
    expect(html).toContain('Shape Type');
    expect(html).toContain('Ellipse');
    expect(html).toContain('Rectangle');
    expect(html).toContain('Line');
    expect(html).toContain('Triangle');
    expect(html).toContain('Diamond');
    expect(html).toContain('Hexagon');
    expect(html).toContain('Arc');
    expect(html).toContain('Cross');
    expect(html).toContain('Ring');
    expect(html).toContain('select-shape-type');

    // Advanced controls in exact required order
    expect(html).toContain('Min Width (px)');
    expect(html).toContain('input-min-width');
    expect(html).toContain('32');

    expect(html).toContain('Max Width (px)');
    expect(html).toContain('input-max-width');
    expect(html).toContain('0');

    expect(html).toContain('Min Height (px)');
    expect(html).toContain('input-min-height');
    expect(html).toContain('50');

    expect(html).toContain('Max Height (px)');
    expect(html).toContain('input-max-height');
    expect(html).toContain('100');

    expect(html).toContain('Rotation Amount');
    expect(html).toContain('input-rotation-amount');
    expect(html).toContain('168°');
  });

  it('renders LayoutControls with Rows, Columns, Padding, and Offsets', () => {
    const html = renderToString(
      <LayoutControls config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('Layout');
    expect(html).toContain('Rows');
    expect(html).toContain('Columns');
    expect(html).toContain('Canvas Padding');
    expect(html).toContain('X Offset');
    expect(html).toContain('Y Offset');
    expect(html).toContain('input-rows');
    expect(html).toContain('input-columns');
    expect(html).toContain('input-canvas-padding');
    expect(html).toContain('input-x-offset');
    expect(html).toContain('input-y-offset');
  });

  it('renders ColorControls with all 10 presets and opacity sliders', () => {
    const html = renderToString(
      <ColorControls config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('Color');
    expect(html).toContain('Palette');
    expect(html).toContain('Blueprint');
    expect(html).toContain('Signal Depth');
    expect(html).toContain('Pixel Midnight');
    expect(html).toContain('Alert Mode');
    expect(html).toContain('Steel Red');
    expect(html).toContain('Gold Dust');
    expect(html).toContain('Dark Violet');
    expect(html).toContain('Rustfade');
    expect(html).toContain('Heatwave');
    expect(html).toContain('Custom');
    expect(html).toContain('Foreground Minimum Opacity');
    expect(html).toContain('Foreground Maximum Opacity');
  });

  it('renders Custom palette color pickers when Custom is selected', () => {
    const customConfig = { ...DEFAULT_CONFIG, palette: 'Custom' as const };
    const html = renderToString(
      <ColorControls config={customConfig} onChange={() => {}} />
    );
    expect(html).toContain('Background Color');
    expect(html).toContain('Foreground Color');
    expect(html).toContain('input-custom-bg');
    expect(html).toContain('input-custom-fg');
  });

  it('renders Sidebar containing Animation, Noise, Geometry, Layout and Color sections', () => {
    const html = renderToString(
      <Sidebar config={DEFAULT_CONFIG} onChange={() => {}} />
    );
    expect(html).toContain('section-animation');
    expect(html).toContain('section-noise');
    expect(html).toContain('section-geometry');
    expect(html).toContain('section-layout');
    expect(html).toContain('section-color');
  });

  it('renders ExportVideoModal settings view with Resolution, Duration, FPS and Quality', () => {
    const html = renderToString(
      <ExportVideoModal
        isOpen={true}
        onClose={() => {}}
        onStartExport={() => {}}
        onCancelExport={() => {}}
        progress={null}
        isExporting={false}
      />
    );
    expect(html).toContain('Export Video Settings');
    expect(html).toContain('Resolution');
    expect(html).toContain('1080p — 1920 × 1080');
    expect(html).toContain('1440p — 2560 × 1440');
    expect(html).toContain('4K — 3840 × 2160');
    expect(html).toContain('Duration (seconds)');
    expect(html).toContain('Frame Rate');
    expect(html).toContain('30 FPS');
    expect(html).toContain('60 FPS');
    expect(html).toContain('Export Quality');
    expect(html).toContain('High');
    expect(html).toContain('Very High');
    expect(html).toContain('Maximum');
    expect(html).toContain('Estimated File Size:');
    expect(html).toContain('Start Export');
  });

  it('renders ExportVideoModal live progress view during active export', () => {
    const progress = {
      elapsedSeconds: 5.2,
      targetSeconds: 15,
      percentage: 35,
      status: 'rendering' as const
    };
    const html = renderToString(
      <ExportVideoModal
        isOpen={true}
        onClose={() => {}}
        onStartExport={() => {}}
        onCancelExport={() => {}}
        progress={progress}
        isExporting={true}
      />
    );
    expect(html).toContain('Exporting Video');
    expect(html).toContain('35%');
    expect(html).toContain('5.2s / 15s');
    expect(html).toContain('Rendering offscreen high-resolution frames...');
    expect(html).toContain('Cancel Export');
  });
});

