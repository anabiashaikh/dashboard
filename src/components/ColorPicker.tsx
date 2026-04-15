'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string | null) => void;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}

const PRESETS = ['#e74c3c','#e67e22','#f1c40f','#7d4f1e','#2ecc71','#1a5c2a','#9b59b6','#6c5ce7','#3498db','#00cec9','#55efc4','#000000','#636e72','#b2bec3','#ffffff'];

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [hex, setHex] = useState(color.replace('#',''));
  const { r, g, b } = hexToRgb(hex.padStart(6,'0'));

  const applyHex = useCallback((h: string) => {
    setHex(h);
    if (h.length === 6) onChange('#' + h);
  }, [onChange]);

  return (
    <div className="color-picker-area">
      <div className="color-row">
        <span className="toggle-check" id="color-swatch" style={{ background: '#' + hex, border: 'none' }}></span>
        Color
      </div>
      <div className="rgba-inputs">
        <div className="rgba-field">
          <input type="text" id="inp-hex" value={hex} maxLength={6}
            onChange={e => applyHex(e.target.value)} />
          <label>Hex</label>
        </div>
        <div className="rgba-field">
          <input type="number" id="inp-r" value={r} min={0} max={255}
            onChange={e => applyHex(rgbToHex(+e.target.value, g, b))} />
          <label>R</label>
        </div>
        <div className="rgba-field">
          <input type="number" id="inp-g" value={g} min={0} max={255}
            onChange={e => applyHex(rgbToHex(r, +e.target.value, b))} />
          <label>G</label>
        </div>
        <div className="rgba-field">
          <input type="number" id="inp-b" value={b} min={0} max={255}
            onChange={e => applyHex(rgbToHex(r, g, +e.target.value))} />
          <label>B</label>
        </div>
      </div>
      <div className="color-presets">
        {PRESETS.map(p => (
          <span key={p} className="preset"
            style={{ background: p, border: p === '#ffffff' ? '1px solid #ddd' : undefined }}
            onClick={() => applyHex(p.replace('#',''))}
          />
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <button style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd', cursor: 'pointer' }}
          onClick={() => onChange(null)}>
          Reset to Default
        </button>
      </div>
    </div>
  );
}
