import { type ReactNode, useEffect, useState } from 'react';

export function Section({
  title,
  children,
  open,
  toggle,
  onReset,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  toggle: () => void;
  onReset?: () => void;
}) {
  const reset = onReset ?? (() => window.dispatchEvent(new CustomEvent('gg-reset-section', { detail: title })));
  return (
    <section className="section">
      <div className="section-heading">
        <button className="section-title" onClick={toggle} type="button">
          <span>{open ? '−' : '+'}</span>
          {title}
        </button>
        <button className="section-reset" onClick={reset} title={`Reset ${title}`} type="button">
          Reset
        </button>
      </div>
      {open && <div className="section-body">{children}</div>}
    </section>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : min;
  const handleChange = (raw: string) => {
    const num = parseFloat(raw);
    if (Number.isFinite(num)) {
      onChange(Math.max(min, Math.min(max, num)));
    }
  };

  return (
    <label className="control">
      <span>
        {label}
        <output>{Number(safeValue.toFixed(3))}</output>
      </span>
      <div>
        <input
          aria-label={label}
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => handleChange(e.target.value)}
        />
        <input
          aria-label={`${label} value`}
          className="number"
          type="number"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      </div>
    </label>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="select">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Color({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const handleText = (text: string) => {
    setDraft(text);
    if (/^#[0-9A-Fa-f]{6}$/.test(text)) {
      onChange(text);
    }
  };

  return (
    <label className="color">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <input
        aria-label={`${label} hex code`}
        value={draft}
        onChange={(e) => handleText(e.target.value)}
        onBlur={() => setDraft(value)}
      />
    </label>
  );
}
