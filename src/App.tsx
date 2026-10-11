import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, type RenderExporter } from './components/Canvas';
import { Color, Range, Section, Select, Toggle } from './components/Controls';
import { builtins } from './graphics/presets';
import { clone, defaults } from './graphics/defaults';
import { palettes } from './graphics/palettes';
import { svgFor } from './graphics/renderer';
import { safeExportRequest, type ExportRequest } from './graphics/export';
import { validateConfig } from './graphics/config';
import type { Config, PaletteName } from './graphics/types';

const sections = ['Layout', 'Noise', 'Time', 'Shape', 'Color', 'Render', 'Export'];
const localPresetKey = 'gg-custom-presets';
const safePreset = (c: Config): Config => ({ ...clone(c), mask: { ...clone(c).mask, imageData: undefined } });

const download = (name: string, data: BlobPart, type: string) => {
  const blob = new Blob([data], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

export function App() {
  const [config, setConfig] = useState<Config>(() => {
    try {
      const stored = localStorage.getItem('gg-config');
      return stored ? validateConfig(JSON.parse(stored)) : clone(defaults);
    } catch {
      return clone(defaults);
    }
  });

  const [customPresets, setCustomPresets] = useState<Config[]>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(localPresetKey) || '[]');
      return Array.isArray(raw) ? raw.map(validateConfig) : [];
    } catch {
      return [];
    }
  });

  const [open, setOpen] = useState(() =>
    Object.fromEntries(sections.map((x) => [x, ['Layout', 'Noise', 'Shape', 'Color'].includes(x)]))
  );

  const [history, setHistory] = useState<Config[]>([]);
  const [future, setFuture] = useState<Config[]>([]);
  const [toast, setToast] = useState('');
  const [frameTime, setFrameTime] = useState(0);
  const [fps, setFps] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [exportSettings, setExportSettings] = useState<ExportRequest>(() => safeExportRequest(defaults, {}));
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exporterRef = useRef<RenderExporter | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  const lastCommit = useRef(0);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // Cleanup
        }
      }
    };
  }, []);

  useEffect(() => {
    const safe = { ...config, mask: { ...config.mask, imageData: undefined } };
    localStorage.setItem('gg-config', JSON.stringify(safe));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(localPresetKey, JSON.stringify(customPresets.map(safePreset)));
  }, [customPresets]);

  const commit = useCallback(
    (next: Config) => {
      const clean = validateConfig(next);
      const now = performance.now();
      if (now - lastCommit.current > 240) {
        setHistory((h) => [...h.slice(-39), clone(config)]);
        setFuture([]);
      }
      lastCommit.current = now;
      setConfig(clean);
    },
    [config]
  );

  const update = useCallback(
    (fn: (c: Config) => void) => {
      const n = clone(config);
      fn(n);
      commit(n);
    },
    [config, commit]
  );

  const set = useCallback(
    (group: keyof Config, key: string, value: unknown) => {
      update((c) => {
        (c[group] as unknown as Record<string, unknown>)[key] = value;
      });
    },
    [update]
  );

  const seekTime = useCallback((offset: number) => {
    update((c) => {
      c.time.offset = Math.max(0, offset);
      c.time.resetToken += 1;
    });
  }, [update]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [clone(config), ...f]);
      setConfig(prev);
      return h.slice(0, -1);
    });
  }, [config]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h, clone(config)]);
      setConfig(next);
      return f.slice(1);
    });
  }, [config]);

  // Keyboard undo/redo shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  const changePalette = (p: string) => {
    if (p === 'Custom') return set('color', 'palette', p);
    const [background, foreground, secondary] = palettes[p as Exclude<PaletteName, 'Custom'>];
    update((c) => {
      c.color = { ...c.color, palette: p as PaletteName, background, foreground, secondary };
    });
  };

  const savePreset = () => {
    const name = window.prompt('Name this custom preset', config.name);
    if (!name?.trim()) return;
    if (customPresets.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
      setToast('A custom preset with that name already exists.');
      return;
    }
    const p = safePreset({ ...config, name: name.trim() });
    setCustomPresets((all) => [...all, p]);
    commit(p);
    setToast('Custom preset saved.');
  };

  const duplicatePreset = () => {
    const base = `${config.name} copy`;
    let n = base,
      i = 2;
    while (customPresets.some((p) => p.name === n) || builtins.some((p) => p.name === n)) {
      n = `${base} ${i++}`;
    }
    const p = safePreset({ ...config, name: n });
    setCustomPresets((all) => [...all, p]);
    commit(p);
    setToast('Preset duplicated.');
  };

  const deletePreset = () => {
    if (!customPresets.some((p) => p.name === config.name)) {
      setToast('Built-in presets cannot be deleted.');
      return;
    }
    if (!window.confirm(`Delete “${config.name}”?`)) return;
    setCustomPresets((all) => all.filter((p) => p.name !== config.name));
    commit(clone(defaults));
    setToast('Custom preset deleted.');
  };

  const restorePreset = () => {
    const builtIn = builtins.find((p) => p.name === config.name);
    if (!builtIn) {
      setToast('This is a custom preset; use Reset for studio defaults.');
      return;
    }
    commit(clone(builtIn));
    setToast('Built-in preset restored.');
  };

  const resetSection = (section: string) =>
    update((c) => {
      const d = clone(defaults);
      if (section === 'Layout') {
        c.canvas = { ...d.canvas, zoom: c.canvas.zoom };
        c.grid = d.grid;
      } else if (section === 'Noise') {
        c.noise = d.noise;
      } else if (section === 'Time') {
        c.time = { ...d.time, resetToken: c.time.resetToken + 1 };
      } else if (section === 'Shape') {
        c.mark = d.mark;
        c.mask = d.mask;
        c.mode = d.mode;
      } else if (section === 'Color') {
        c.color = d.color;
      } else if (section === 'Render') {
        c.locks = d.locks;
        c.seed = d.seed;
        c.canvas.quality = d.canvas.quality;
        c.canvas.maxPoints = d.canvas.maxPoints;
        c.canvas.zoom = d.canvas.zoom;
      }
    });

  const randomize = () =>
    update((c) => {
      if (!c.locks.seed) c.seed = String(Math.floor(Math.random() * 2 ** 31));
      if (!c.locks.noise) {
        c.noise.scale = 0.003 + Math.random() * 0.02;
        c.noise.directionOffset = Math.random() * Math.PI * 2;
        c.noise.distortion = Math.random() * 0.9;
      }
      if (!c.locks.geometry) {
        c.mark.length = 5 + Math.random() * 24;
        c.grid.spacingX = c.grid.spacingY = 4 + Math.random() * 13;
        c.mark.rotationRandom = Math.random() * 1.1;
      }
      if (!c.locks.palette && Math.random() > 0.55) {
        const names = Object.keys(palettes) as Exclude<PaletteName, 'Custom'>[];
        const name = names[Math.floor(Math.random() * names.length)];
        const colors = palettes[name];
        c.color = { ...c.color, palette: name, background: colors[0], foreground: colors[1], secondary: colors[2] };
      }
      c.name = 'Untitled variation';
    });

  const exportImage = async (format: ExportRequest['format'] = exportSettings.format) => {
    if (!exporterRef.current) {
      setToast('Renderer is still initializing.');
      return;
    }
    try {
      const req = safeExportRequest(config, { ...exportSettings, format });
      const targetW = Math.round(req.width * req.multiplier);
      const targetH = Math.round(req.height * req.multiplier);
      const blob = await exporterRef.current(targetW, targetH, req.format, req.quality);
      const safeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const name = `perlin-playground-${safeName}-seed${config.seed}-t${frameTime.toFixed(2)}s-${targetW}x${targetH}.${req.format === 'png' ? 'png' : 'jpg'}`;
      download(name, blob, req.format === 'png' ? 'image/png' : 'image/jpeg');
      setToast(`Exported ${req.format.toUpperCase()} (${targetW}×${targetH})`);
    } catch (err) {
      setToast(`Export failed: ${(err as Error)?.message || 'Reduce output size and try again.'}`);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setRecording(false);
      setRecordTime(0);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setToast('Canvas is not ready for recording.');
      return;
    }

    if (typeof (canvas as any).captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setToast('MediaRecorder video capture is not supported in this browser.');
      return;
    }

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mimeType = 'video/webm;codecs=vp9';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    }

    try {
      const stream = (canvas as any).captureStream(60);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const safeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const name = `perlin-playground-${safeName}-seed${config.seed}-anim.webm`;
        download(name, blob, 'video/webm');
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setToast('Video recording saved as WebM.');
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setToast('Video recording encountered an error.');
        setRecording(false);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = window.setInterval(() => {
        setRecordTime((t) => t + 1);
      }, 1000);
      setToast('Recording canvas animation...');
    } catch (err) {
      setToast(`Recording failed: ${(err as Error)?.message || 'Unsupported format'}`);
    }
  };

  const importConfig = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const val = JSON.parse(String(r.result));
        if (!val?.canvas || !val?.noise || !val?.version) throw new Error();
        commit(validateConfig(val));
        setToast('Configuration imported.');
      } catch {
        setToast('That file is not a compatible configuration.');
      }
    };
    r.readAsText(file);
  };

  const uploadMask = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      setToast('Choose a PNG, JPEG, or WebP image.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setToast('Mask images must be smaller than 12 MB.');
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas');
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      c.width = Math.max(1, Math.round(img.width * scale));
      c.height = Math.max(1, Math.round(img.height * scale));
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      update((x) => {
        x.mask = { ...x.mask, type: 'image', imageData: data };
      });
      URL.revokeObjectURL(url);
      setToast('Image mask loaded locally.');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setToast('That image could not be processed.');
    };
    img.src = url;
  };

  const status = useMemo(
    () => `${config.canvas.width} × ${config.canvas.height} · ${config.time.playing ? 'playing' : 'paused'}`,
    [config.canvas.width, config.canvas.height, config.time.playing]
  );

  const onCanvasReady = useCallback((element: HTMLCanvasElement) => {
    canvasRef.current = element;
  }, []);

  const onExporterReady = useCallback((value: RenderExporter) => {
    exporterRef.current = value;
  }, []);

  return (
    <main className={sidebarOpen ? '' : 'sidebar-collapsed'}>
      <aside>
        <div className="brand">
          <b>perlin.playground</b>
        </div>

        <div className="preset">
          <label>
            Preset
            <select
              value={config.name}
              onChange={(e) => {
                const p = [...builtins, ...customPresets].find((x) => x.name === e.target.value);
                if (p) commit(clone(p));
              }}
            >
              <option value={config.name}>{config.name}</option>
              {[...builtins, ...customPresets]
                .filter((x) => x.name !== config.name)
                .map((x) => (
                  <option key={x.name} value={x.name}>
                    {x.name}
                    {customPresets.includes(x) ? ' • custom' : ''}
                  </option>
                ))}
            </select>
          </label>
          <div className="preset-actions">
            <button type="button" onClick={savePreset}>Save as</button>
            <button type="button" onClick={duplicatePreset}>Duplicate</button>
            <button type="button" onClick={deletePreset}>Delete</button>
            <button type="button" onClick={restorePreset}>Restore</button>
            <button type="button" onClick={() => commit(clone(defaults))}>Reset</button>
          </div>
        </div>

        <Section
          title="Layout"
          open={open.Layout}
          toggle={() => setOpen((o) => ({ ...o, Layout: !o.Layout }))}
          onReset={() => resetSection('Layout')}
        >
          <Select
            label="Aspect ratio"
            value={config.canvas.aspect}
            options={['1:1', '4:5', '3:4', '3:2', '16:9', 'Custom']}
            onChange={(v) => {
              const ratios: Record<string, [number, number]> = {
                '1:1': [1, 1],
                '4:5': [4, 5],
                '3:4': [3, 4],
                '3:2': [3, 2],
                '16:9': [16, 9],
              };
              if (ratios[v]) {
                update((c) => {
                  c.canvas.aspect = v;
                  c.canvas.height = Math.round((c.canvas.width * ratios[v][1]) / ratios[v][0]);
                  c.canvas.maxPoints = Math.max(
                    16000,
                    Math.round(((c.canvas.width * c.canvas.height) / (900 * 900)) * 16000)
                  );
                });
              } else {
                set('canvas', 'aspect', v);
              }
            }}
          />
          <Range
            label="Canvas width"
            value={config.canvas.width}
            min={320}
            max={2400}
            step={10}
            onChange={(v) => set('canvas', 'width', v)}
          />
          <Range
            label="Canvas height"
            value={config.canvas.height}
            min={320}
            max={2400}
            step={10}
            onChange={(v) => set('canvas', 'height', v)}
          />
          <Range
            label="Grid spacing X"
            value={config.grid.spacingX}
            min={3}
            max={40}
            step={1}
            onChange={(v) => set('grid', 'spacingX', v)}
          />
          <Range
            label="Grid spacing Y"
            value={config.grid.spacingY}
            min={3}
            max={40}
            step={1}
            onChange={(v) => set('grid', 'spacingY', v)}
          />
          <Range
            label="Grid jitter"
            value={config.grid.jitter}
            min={0}
            max={20}
            step={0.1}
            onChange={(v) => set('grid', 'jitter', v)}
          />
          <Range
            label="Grid rotation"
            value={config.grid.rotation}
            min={-3.14}
            max={3.14}
            step={0.01}
            onChange={(v) => set('grid', 'rotation', v)}
          />
          <Range
            label="Margins"
            value={config.grid.margin}
            min={0}
            max={200}
            step={1}
            onChange={(v) => set('grid', 'margin', v)}
          />
          <Select
            label="Distribution"
            value={config.grid.distribution}
            options={['uniform', 'staggered', 'jittered', 'polar']}
            onChange={(v) => set('grid', 'distribution', v)}
          />
        </Section>

        <Section
          title="Noise"
          open={open.Noise}
          toggle={() => setOpen((o) => ({ ...o, Noise: !o.Noise }))}
          onReset={() => resetSection('Noise')}
        >
          <Range
            label="Noise scale"
            value={config.noise.scale}
            min={0.001}
            max={0.04}
            step={0.001}
            onChange={(v) => set('noise', 'scale', v)}
          />
          <Range
            label="Scale X"
            value={config.noise.scaleX}
            min={0.1}
            max={4}
            step={0.05}
            onChange={(v) => set('noise', 'scaleX', v)}
          />
          <Range
            label="Scale Y"
            value={config.noise.scaleY}
            min={0.1}
            max={4}
            step={0.05}
            onChange={(v) => set('noise', 'scaleY', v)}
          />
          <Range
            label="Strength"
            value={config.noise.strength}
            min={0.1}
            max={3}
            step={0.05}
            onChange={(v) => set('noise', 'strength', v)}
          />
          <Range
            label="Octaves"
            value={config.noise.octaves}
            min={1}
            max={8}
            step={1}
            onChange={(v) => set('noise', 'octaves', v)}
          />
          <Range
            label="Falloff"
            value={config.noise.falloff}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('noise', 'falloff', v)}
          />
          <Range
            label="Lacunarity"
            value={config.noise.lacunarity}
            min={1}
            max={4}
            step={0.05}
            onChange={(v) => set('noise', 'lacunarity', v)}
          />
          <Select
            label="Noise visualization"
            value={config.noise.visualization}
            options={['art', 'raw', 'contrast', 'contour-map', 'fbm', 'animated', 'threshold']}
            onChange={(v) => set('noise', 'visualization', v)}
          />
          <Range
            label="Threshold"
            value={config.noise.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('noise', 'threshold', v)}
          />
          <Range
            label="Contrast"
            value={config.noise.contrast}
            min={0.2}
            max={3}
            step={0.05}
            onChange={(v) => set('noise', 'contrast', v)}
          />
          <Range
            label="Domain distortion"
            value={config.noise.distortion}
            min={0}
            max={2}
            step={0.05}
            onChange={(v) => set('noise', 'distortion', v)}
          />
          <Range
            label="Turbulence"
            value={config.noise.turbulence}
            min={0}
            max={4}
            step={0.05}
            onChange={(v) => set('noise', 'turbulence', v)}
          />
          <Select
            label="Field"
            value={config.noise.field}
            options={['angle', 'displacement', 'density', 'length', 'rotation', 'combined']}
            onChange={(v) => set('noise', 'field', v)}
          />
          <Toggle
            label="Secondary layer"
            value={config.noise.secondary}
            onChange={(v) => set('noise', 'secondary', v)}
          />
        </Section>

        <Section
          title="Time"
          open={open.Time}
          toggle={() => setOpen((o) => ({ ...o, Time: !o.Time }))}
          onReset={() => resetSection('Time')}
        >
          <div className="row">
            <button type="button" onClick={() => set('time', 'playing', !config.time.playing)}>
              {config.time.playing ? 'Pause' : 'Play'}
            </button>
            <button type="button" onClick={() => seekTime(Math.max(0, frameTime - 0.1))}>
              Step −
            </button>
            <button type="button" onClick={() => seekTime(frameTime + 0.1)}>
              Step +
            </button>
            <button type="button" onClick={() => seekTime(0)}>
              Reset
            </button>
          </div>
          <Range
            label="Time offset"
            value={frameTime}
            min={0}
            max={20}
            step={0.01}
            onChange={seekTime}
          />
          <Range
            label="Time scale"
            value={config.time.scale}
            min={0}
            max={3}
            step={0.01}
            onChange={(v) => set('time', 'scale', v)}
          />
          <Range
            label="Speed"
            value={config.time.speed}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => set('time', 'speed', v)}
          />
          <Range
            label="Motion intensity"
            value={config.time.motionIntensity}
            min={0.05}
            max={3}
            step={0.05}
            onChange={(v) => set('time', 'motionIntensity', v)}
          />
          <Range
            label="Cycles per loop"
            value={config.time.temporalFrequency}
            min={1}
            max={6}
            step={1}
            onChange={(v) => set('time', 'temporalFrequency', v)}
          />
          <Range
            label="Loop duration"
            value={config.time.loopDuration}
            min={0.5}
            max={30}
            step={0.5}
            onChange={(v) => set('time', 'loopDuration', v)}
          />
          <Toggle
            label="Seamless loop"
            value={config.time.loop}
            onChange={(v) => set('time', 'loop', v)}
          />
        </Section>

        <Section
          title="Shape"
          open={open.Shape}
          toggle={() => setOpen((o) => ({ ...o, Shape: !o.Shape }))}
          onReset={() => resetSection('Shape')}
        >
          <Select
            label="Graphics mode"
            value={config.mode}
            options={['flow', 'displacement', 'density', 'contours', 'stipple', 'vector']}
            onChange={(v) => update((c) => { c.mode = v as Config['mode']; })}
          />
          <Select
            label="Mark type"
            value={config.mark.type}
            options={['line', 'long-line', 'ellipse', 'circle', 'rectangle', 'arc', 'dot', 'polygon']}
            onChange={(v) => set('mark', 'type', v)}
          />
          <Range
            label="Mark length"
            value={config.mark.length}
            min={1}
            max={60}
            step={0.5}
            onChange={(v) => set('mark', 'length', v)}
          />
          <Range
            label="Mark width"
            value={config.mark.width}
            min={0.5}
            max={20}
            step={0.1}
            onChange={(v) => set('mark', 'width', v)}
          />
          <Range
            label="Stroke thickness"
            value={config.mark.thickness}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(v) => set('mark', 'thickness', v)}
          />
          <Range
            label="Rotation"
            value={config.mark.rotation}
            min={-3.14}
            max={3.14}
            step={0.01}
            onChange={(v) => set('mark', 'rotation', v)}
          />
          <Range
            label="Rotation randomness"
            value={config.mark.rotationRandom}
            min={0}
            max={3.14}
            step={0.01}
            onChange={(v) => set('mark', 'rotationRandom', v)}
          />
          <Range
            label="Shape jitter"
            value={config.mark.jitter}
            min={0}
            max={20}
            step={0.1}
            onChange={(v) => set('mark', 'jitter', v)}
          />
          <Range
            label="Density"
            value={config.mark.density}
            min={0.02}
            max={1}
            step={0.01}
            onChange={(v) => set('mark', 'density', v)}
          />
          <Range
            label="Minimum opacity"
            value={config.mark.minOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mark', 'minOpacity', v)}
          />
          <Range
            label="Maximum opacity"
            value={config.mark.maxOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mark', 'maxOpacity', v)}
          />
          <Select
            label="Mask"
            value={config.mask.type}
            options={['none', 'circle', 'ellipse', 'rectangle', 'rounded', 'image']}
            onChange={(v) => set('mask', 'type', v)}
          />
          <Range
            label="Mask X"
            value={config.mask.x}
            min={0}
            max={config.canvas.width}
            step={1}
            onChange={(v) => set('mask', 'x', v)}
          />
          <Range
            label="Mask Y"
            value={config.mask.y}
            min={0}
            max={config.canvas.height}
            step={1}
            onChange={(v) => set('mask', 'y', v)}
          />
          <Range
            label="Mask width"
            value={config.mask.width}
            min={30}
            max={900}
            step={5}
            onChange={(v) => set('mask', 'width', v)}
          />
          <Range
            label="Mask height"
            value={config.mask.height}
            min={30}
            max={900}
            step={5}
            onChange={(v) => set('mask', 'height', v)}
          />
          <Range
            label="Mask feather"
            value={config.mask.feather}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mask', 'feather', v)}
          />
          <Range
            label="Mask influence"
            value={config.mask.influence}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mask', 'influence', v)}
          />
          <Range
            label="Mask threshold"
            value={config.mask.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mask', 'threshold', v)}
          />
          <Range
            label="Inside density"
            value={config.mask.insideDensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mask', 'insideDensity', v)}
          />
          <Range
            label="Outside density"
            value={config.mask.outsideDensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => set('mask', 'outsideDensity', v)}
          />
          <Toggle
            label="Invert mask"
            value={config.mask.invert}
            onChange={(v) => set('mask', 'invert', v)}
          />
          <label className="upload">
            Upload image mask
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => uploadMask(e.target.files?.[0])}
            />
          </label>
        </Section>

        <Section
          title="Color"
          open={open.Color}
          toggle={() => setOpen((o) => ({ ...o, Color: !o.Color }))}
          onReset={() => resetSection('Color')}
        >
          <Select
            label="Palette"
            value={config.color.palette}
            options={[...Object.keys(palettes), 'Custom']}
            onChange={changePalette}
          />
          <Color
            label="Background"
            value={config.color.background}
            onChange={(v) => set('color', 'background', v)}
          />
          <Color
            label="Foreground"
            value={config.color.foreground}
            onChange={(v) => set('color', 'foreground', v)}
          />
          <Color
            label="Secondary"
            value={config.color.secondary}
            onChange={(v) => set('color', 'secondary', v)}
          />
          <Select
            label="Color mapping"
            value={config.color.mapping}
            options={['single', 'alternate', 'gradient', 'noise', 'position']}
            onChange={(v) => set('color', 'mapping', v)}
          />
          <Toggle
            label="Invert colors"
            value={config.color.invert}
            onChange={(v) => set('color', 'invert', v)}
          />
          <Toggle
            label="Transparent background"
            value={config.color.transparent}
            onChange={(v) => set('color', 'transparent', v)}
          />
        </Section>

        <Section
          title="Render"
          open={open.Render}
          toggle={() => setOpen((o) => ({ ...o, Render: !o.Render }))}
          onReset={() => resetSection('Render')}
        >
          <Select
            label="Preview quality"
            value={config.canvas.quality}
            options={['draft', 'balanced', 'high']}
            onChange={(v) => set('canvas', 'quality', v)}
          />
          <Range
            label="Canvas zoom"
            value={config.canvas.zoom}
            min={0.2}
            max={2}
            step={0.05}
            onChange={(v) => set('canvas', 'zoom', v)}
          />
          <Range
            label="Maximum points"
            value={config.canvas.maxPoints}
            min={1000}
            max={40000}
            step={1000}
            onChange={(v) => set('canvas', 'maxPoints', v)}
          />
          <label className="seed">
            Seed
            <input
              value={config.seed}
              onChange={(e) => update((c) => { c.seed = e.target.value; })}
            />
          </label>
          <div className="locks">
            <span>Randomize locks</span>
            <Toggle label="Seed" value={config.locks.seed} onChange={(v) => set('locks', 'seed', v)} />
            <Toggle label="Noise" value={config.locks.noise} onChange={(v) => set('locks', 'noise', v)} />
            <Toggle label="Geometry" value={config.locks.geometry} onChange={(v) => set('locks', 'geometry', v)} />
            <Toggle label="Palette" value={config.locks.palette} onChange={(v) => set('locks', 'palette', v)} />
          </div>
        </Section>

        <Section
          title="Export"
          open={open.Export}
          toggle={() => setOpen((o) => ({ ...o, Export: !o.Export }))}
          onReset={() => setExportSettings(safeExportRequest(config, {}))}
        >
          <Range
            label="Output width"
            value={exportSettings.width}
            min={64}
            max={8000}
            step={1}
            onChange={(v) => setExportSettings((s) => ({ ...s, width: v }))}
          />
          <Range
            label="Output height"
            value={exportSettings.height}
            min={64}
            max={8000}
            step={1}
            onChange={(v) => setExportSettings((s) => ({ ...s, height: v }))}
          />
          <Range
            label="Resolution multiplier"
            value={exportSettings.multiplier}
            min={0.25}
            max={4}
            step={0.25}
            onChange={(v) => setExportSettings((s) => ({ ...s, multiplier: v }))}
          />
          <Range
            label="JPEG quality"
            value={exportSettings.quality}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(v) => setExportSettings((s) => ({ ...s, quality: v }))}
          />
          <div className="export-grid">
            <button type="button" onClick={() => exportImage('png')}>PNG</button>
            <button type="button" onClick={() => exportImage('jpeg')}>JPEG</button>
            <button
              type="button"
              onClick={() => download('perlin-playground.svg', svgFor(config), 'image/svg+xml')}
            >
              SVG
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  'perlin-playground.json',
                  JSON.stringify({ ...config, mask: { ...config.mask, imageData: undefined } }, null, 2),
                  'application/json'
                )
              }
            >
              JSON
            </button>
          </div>
          <label className="upload">
            Import configuration
            <input
              type="file"
              accept="application/json"
              onChange={(e) => e.target.files?.[0] && importConfig(e.target.files[0])}
            />
          </label>
        </Section>
      </aside>

      <section className="workspace">
        <header>
          <div className="header-left">
            <button
              type="button"
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen((s) => !s)}
              title={sidebarOpen ? 'Hide controls sidebar' : 'Show controls sidebar'}
              aria-label="Toggle sidebar"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <line x1="6.5" y1="2" x2="6.5" y2="14" />
              </svg>
            </button>
            <div className="header-preset-info">
              <span className="eyebrow">CURRENT PRESET</span>
              <strong>{config.name}</strong>
            </div>
          </div>

          <div className="header-actions">
            <button type="button" onClick={undo} disabled={!history.length} title="Undo (Ctrl+Z)">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)">
              ↷
            </button>
            <button type="button" onClick={randomize} title="Randomize unlocked parameters">
              Randomize
            </button>
            <button
              type="button"
              className={recording ? 'recording-active' : ''}
              onClick={toggleRecording}
              title={recording ? 'Stop WebM video recording' : 'Record canvas animation to WebM video'}
            >
              {recording ? `● REC ${Math.floor(recordTime / 60)}:${String(recordTime % 60).padStart(2, '0')}` : 'Record'}
            </button>
            <button type="button" className="primary" onClick={() => exportImage('png')}>
              Export
            </button>
          </div>
        </header>

        <div className={`stage ${config.color.transparent ? 'checker' : ''}`}>
          <div
            className="art"
            style={{
              transform: `scale(${config.canvas.zoom})`,
            }}
          >
            <Canvas
              config={config}
              onReady={onCanvasReady}
              onExporter={onExporterReady}
              onTimeChange={setFrameTime}
              onFpsChange={setFps}
            />
          </div>
        </div>

        <footer>
          <span>{status}</span>
          <span>t {frameTime.toFixed(2)}s</span>
          {config.time.loop ? (
            <span>loop {(frameTime % config.time.loopDuration).toFixed(1)}s / {config.time.loopDuration.toFixed(1)}s</span>
          ) : (
            <span>continuous</span>
          )}
          <span>{config.time.playing ? `${fps} fps` : 'paused'}</span>
          <span>seed {config.seed}</span>
        </footer>

        {toast && (
          <div className="toast" onAnimationEnd={() => setToast('')}>
            {toast}
          </div>
        )}
      </section>
    </main>
  );
}
