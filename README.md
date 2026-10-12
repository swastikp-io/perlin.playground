# perlin.playground

A minimal, design-oriented procedural graphics generator powered by **p5.js**, **React**, and **TypeScript**.

## Overview

`perlin.playground` provides a desktop-first creative workspace for exploring Perlin noise vector fields and generative compositions.

### Features

- **Procedural Graphics Engine**: High-performance p5.js instance rendering continuous time-dependent Perlin noise geometry with seamless, boundary-free periodic loop sampling.
- **Animation Controls**:
  - `Play / Pause`: Toggle animation playback, freezing the frame without clearing the canvas.
  - `Animation Speed`: Rate multiplier (`0.25×` to `3.00×`, default `1.00×`).
  - `Loop Duration`: Loop duration in seconds (`2s` to `20s`, default `6s`).
- **Advanced Shape Controls** (Collapsible Shape Section):
  - `Shape Type`: 9 selectable primitives (`Ellipse`, `Rectangle`, `Line`, `Triangle`, `Diamond`, `Hexagon`, `Arc`, `Cross`, and `Ring`).
  - `Min Width (px)`: Minimum element width (default `32`).
  - `Max Width (px)`: Maximum element width (default `0`, where `0` enables automatic sizing based on grid cell dimensions).
  - `Min Height (px)`: Minimum element height (default `50`).
  - `Max Height (px)`: Maximum element height (default `100`).
  - `Rotation Amount`: Maximum magnitude of noise-driven rotation in degrees (`0°` to `360°`, default `168°`; `0°` disables rotation). Rotates each element around its local center.
- **Randomize**:
  - Generates new procedural compositions with bounded random parameters for noise, geometry, layout, colors, and the advanced shape dimensions and rotation, while preserving animation settings.
- **Noise Controls**:
  - `Noise Scale`: Spatial frequency of the Perlin noise field.
  - `Noise Strength`: Intensity of geometric displacement and deformation.
  - `Noise Falloff`: Perlin noise octave harmonic falloff.
- **Layout Controls**:
  - `Rows` & `Columns` grid divisions.
  - `Canvas Padding` inset.
  - `X Offset` & `Y Offset` translation.
- **Color Controls**:
  - 10 Presets: `Blueprint`, `Signal Depth`, `Pixel Midnight`, `Alert Mode`, `Steel Red`, `Gold Dust`, `Dark Violet`, `Rustfade`, `Heatwave`, and `Custom`.
  - Custom palette background and foreground color pickers.
  - `Foreground Minimum Opacity` and `Foreground Maximum Opacity` with automatic range validation.
- **Export**:
  - `Export Video`: High-quality, offscreen video export powered by `MediaRecorder`:
    - **Resolutions**: `1080p` (1920 × 1080, default), `1440p` (2560 × 1440), and `4K` (3840 × 2160).
    - **Duration**: Minimum 15 seconds (enforced by validation) with interactive slider and numeric input.
    - **Frame Rates**: `30 FPS` (default) and `60 FPS`.
    - **Quality Presets**: `High` (default), `Very High`, and `Maximum` mapped to tuned bitrate targets.
    - **Data Rate & Total Bitrate Controls**: Real-time configuration of video data rate (`videoBitsPerSecond`) and total multiplexed bitrate (`bitsPerSecond`), with interactive sliders, numeric inputs (in Mbps), and live badges.
    - **Offscreen Rendering**: Independent rendering pipeline preserving preview state and composition aspect ratio without stretching or distortion.
    - **Progress & Cancellation**: Real-time progress bar, elapsed time tracker, data rate and total bitrate status badges, estimated file size, and clean abort/resource disposal.
    - **Output**: Automatic download with structured naming (`perlin-playground-[resolution]-[duration]s.[ext]`).

## Getting Started

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Testing
```bash
npm run test
```
