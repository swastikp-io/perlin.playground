# perlin.playground

A browser-based procedural generative playground built with React, TypeScript, and p5.js.

## Some Graphics generated using perlin.playground

<p align="center">
  <img src="./perlin-playground-untitled-variation-seed50986110-t72.47s-900x900.png" alt="Seed 50986110" width="48%" />
  <img src="./perlin-playground-untitled-variation-seed933796824-t72.47s-900x900.png" alt="Seed 933796824" width="48%" />
</p>

<p align="center">
  <img src="./perlin-playground-untitled-variation-seed1002276056-t72.47s-900x900.png" alt="Seed 1002276056" width="48%" />
  <img src="./perlin-playground-untitled-variation-seed1392516032-t72.47s-900x900.png" alt="Seed 1392516032" width="48%" />
</p>

<p align="center">
  <img src="./perlin-playground-untitled-variation-seed1417886534-t72.47s-900x900.png" alt="Seed 1417886534" width="48%" />
</p>

## Run locally

```bash
npm install
npm run dev
```

Create a production bundle with `npm run build`, and run the unit checks with `npm test`.

## Included capabilities

- A seeded, deterministic improved-gradient Perlin engine: normalized gradient vectors, corner dot products, quintic fade interpolation, and cached permutation tables. It supports 2D fields, 3D time-continuous fields, and normalized fBm (octaves, persistence/falloff, and lacunarity).
- Raw, high-contrast, contour-map, fBm, animated, and threshold reference visualizations alongside the existing flow, displacement, density, contour, stipple, and vector artwork modes.
- Cartesian, staggered, jittered, and polar grids; editable masks and locally processed image masks.
- Playback/scrubbing controls, named built-in presets, locally persisted custom presets, randomization, and undo/redo.
- High-resolution offscreen PNG/JPEG exports, deterministic SVG geometry, and validated JSON configuration import/export.

Image masks intentionally remain session-scoped and are not stored in local storage.
