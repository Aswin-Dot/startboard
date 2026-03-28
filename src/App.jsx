// src/App.jsx
import React, { useState, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Area, AreaChart,
} from 'recharts';
import { useLocalStorage } from './hooks/useLocalStorage';
import { DEFAULT_PANELS, METRIC_TEMPLATES, generateDays } from './data/defaults';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#08080e',
  surface: '#10101a',
  card: '#161622',
  border: '#1e1e30',
  borderHover: '#2e2e48',
  accent: '#6c63ff',
  green: '#43e97b',
  yellow: '#f7971e',
  red: '#ff6584',
  text: '#e4e4f0',
  muted: '#5a5a7a',
  mutedLight: '#8888aa',
};

const css = {
  app: {
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
    fontFamily: "'Syne', sans-serif",
    position: 'relative',
  },
  glow: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
    background: `
      radial-gradient(ellipse at 15% 15%, rgba(108,99,255,0.06) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 85%, rgba(255,101,132,0.04) 0%, transparent 55%)
    `,
  },
  wrap: { maxWidth: 1280, margin: '0 auto', padding: '0 24px 80px', position: 'relative', zIndex: 1 },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 24,
    transition: 'border-color 0.2s',
  },
  btn: (bg = C.accent, color = '#fff') => ({
    background: bg, color, border: 'none', borderRadius: 8,
    padding: '9px 18px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
    gap: 6, transition: 'opacity 0.15s, transform 0.1s', fontFamily: "'Syne', sans-serif",
  }),
  btnGhost: {
    background: 'transparent', color: C.mutedLight,
    border: `1px solid ${C.border}`, borderRadius: 8,
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', fontFamily: "'Syne', sans-serif",
    transition: 'border-color 0.2s, color 0.2s',
  },
  input: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, padding: '8px 12px', color: C.text,
    fontSize: 13, fontFamily: "'DM Mono', monospace",
    outline: 'none', width: '100%', boxSizing: 'border-box',
  },
  label: { fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
  tag: (color) => ({
    display: 'inline-block', fontSize: 10, fontWeight: 700,
    padding: '2px 8px', borderRadius: 4, letterSpacing: '0.08em',
    textTransform: 'uppercase', fontFamily: "'DM Mono', monospace",
    background: color + '22', color,
  }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clr(value, target, higherIsBetter) {
  if (target == null) return C.accent;
  const good = higherIsBetter ? value >= target : value <= target;
  const mid = higherIsBetter ? value >= target * 0.7 : value <= target * 1.4;
  return good ? C.green : mid ? C.yellow : C.red;
}

function delta(data) {
  if (!data || data.length < 2) return null;
  const first = data[0].value, last = data[data.length - 1].value;
  if (first === 0) return null;
  return ((last - first) / first * 100).toFixed(1);
}

function fmt(val, prefix, unit) {
  return `${prefix}${typeof val === 'number' ? val.toLocaleString('en-IN', { maximumFractionDigits: 1 }) : val}${unit ? ' ' + unit : ''}`;
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', color: C.muted, fontSize: 13, marginLeft: 6 }}
      >ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '10px 14px', fontSize: 12, color: C.mutedLight,
          maxWidth: 280, whiteSpace: 'normal', lineHeight: 1.5, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>{text}</span>
      )}
    </span>
  );
}

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
function ChartTip({ active, payload, label, prefix, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'DM Mono', monospace" }}>
        {fmt(payload[0].value, prefix, unit)}
      </div>
    </div>
  );
}

// ─── Trend Panel ──────────────────────────────────────────────────────────────
function TrendPanel({ panel, onEdit, onRemove, isCore }) {
  const latest = panel.data?.[panel.data.length - 1]?.value ?? 0;
  const d = delta(panel.data);
  const colour = clr(latest, panel.target, panel.higherIsBetter);
  const dGood = panel.higherIsBetter ? d > 0 : d < 0;

  return (
    <div style={{ ...css.card, position: 'relative' }}>
      {/* Top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: panel.color, borderRadius: '16px 16px 0 0', opacity: 0.8 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{panel.title}</span>
            {panel.subtitle && <span style={css.tag(panel.color)}>{panel.subtitle}</span>}
            {panel.tooltip && <InfoTooltip text={panel.tooltip} />}
          </div>
          {panel.target != null && (
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              {panel.targetLabel}: {fmt(panel.target, panel.prefix, panel.unit)}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={css.btnGhost} onClick={() => onEdit(panel)}>Edit</button>
          {!isCore && <button style={{ ...css.btnGhost, color: C.red, borderColor: C.red + '44' }} onClick={() => onRemove(panel.id)}>×</button>}
        </div>
      </div>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: colour, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
          {fmt(latest, panel.prefix, panel.unit)}
        </span>
        {d !== null && (
          <span style={{ fontSize: 13, color: dGood ? C.green : C.red, fontFamily: "'DM Mono', monospace" }}>
            {d > 0 ? '↑' : '↓'} {Math.abs(d)}%
          </span>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={panel.data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${panel.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={panel.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={panel.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip content={<ChartTip prefix={panel.prefix} unit={panel.unit} />} />
          {panel.target != null && (
            <ReferenceLine y={panel.target} stroke={C.border} strokeDasharray="4 4" />
          )}
          <Area type="monotone" dataKey="value" stroke={panel.color} strokeWidth={2} fill={`url(#grad-${panel.id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* X axis labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{panel.data?.[0]?.date}</span>
        <span style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace" }}>{panel.data?.[panel.data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// ─── Ratio Panel (DAU/MAU) ────────────────────────────────────────────────────
function RatioPanel({ panel, onEdit, onRemove, isCore }) {
  const latest = panel.data?.[panel.data.length - 1] ?? {};
  const colour = clr(latest.value, panel.target, panel.higherIsBetter);
  const d = delta(panel.data);
  const dGood = panel.higherIsBetter ? d > 0 : d < 0;

  return (
    <div style={{ ...css.card, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: panel.color, borderRadius: '16px 16px 0 0', opacity: 0.8 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{panel.title}</span>
            {panel.subtitle && <span style={css.tag(panel.color)}>{panel.subtitle}</span>}
            {panel.tooltip && <InfoTooltip text={panel.tooltip} />}
          </div>
          {panel.target != null && (
            <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
              Healthy: above {panel.target}%
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={css.btnGhost} onClick={() => onEdit(panel)}>Edit</button>
          {!isCore && <button style={{ ...css.btnGhost, color: C.red, borderColor: C.red + '44' }} onClick={() => onRemove(panel.id)}>×</button>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 42, fontWeight: 800, color: colour, fontFamily: "'DM Mono', monospace", lineHeight: 1 }}>
          {latest.value}%
        </span>
        {d !== null && (
          <span style={{ fontSize: 13, color: dGood ? C.green : C.red, fontFamily: "'DM Mono', monospace" }}>
            {d > 0 ? '↑' : '↓'} {Math.abs(d)}%
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>DAU</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'DM Mono', monospace" }}>{latest.dau?.toLocaleString()}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.08em' }}>MAU</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'DM Mono', monospace" }}>{latest.mau?.toLocaleString()}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={80}>
        <AreaChart data={panel.data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${panel.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={panel.color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={panel.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip content={<ChartTip prefix="" unit="%" />} />
          {panel.target != null && <ReferenceLine y={panel.target} stroke={C.border} strokeDasharray="4 4" />}
          <Area type="monotone" dataKey="value" stroke={panel.color} strokeWidth={2} fill={`url(#grad-${panel.id})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Ranked Panel (Drop-off) ──────────────────────────────────────────────────
function RankedPanel({ panel, onEdit, onRemove, isCore }) {
  const sorted = [...(panel.items || [])].sort((a, b) => b.value - a.value);
  const max = sorted[0]?.value || 100;

  const barColor = (v) => v > 50 ? C.red : v > 20 ? C.yellow : C.green;

  return (
    <div style={{ ...css.card, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: panel.color, borderRadius: '16px 16px 0 0', opacity: 0.8 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{panel.title}</span>
            {panel.subtitle && <span style={css.tag(panel.color)}>{panel.subtitle}</span>}
            {panel.tooltip && <InfoTooltip text={panel.tooltip} />}
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace" }}>Worst first · fix top 2 first</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={css.btnGhost} onClick={() => onEdit(panel)}>Edit</button>
          {!isCore && <button style={{ ...css.btnGhost, color: C.red, borderColor: C.red + '44' }} onClick={() => onRemove(panel.id)}>×</button>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sorted.map((item, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: i === 0 ? C.text : C.mutedLight }}>{item.screen}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: barColor(item.value), fontFamily: "'DM Mono', monospace" }}>{item.value}%</span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${(item.value / max) * 100}%`,
                background: barColor(item.value), borderRadius: 2,
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ panel, onSave, onClose }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(panel)));
  const [rawData, setRawData] = useState(() =>
    panel.type !== 'ranked'
      ? (panel.data || []).map(d => `${d.date},${d.value}`).join('\n')
      : (panel.items || []).map(i => `${i.screen},${i.value}`).join('\n')
  );

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    const lines = rawData.trim().split('\n').filter(Boolean);
    if (panel.type === 'ranked') {
      draft.items = lines.map(l => {
        const parts = l.split(',');
        return { screen: parts.slice(0, -1).join(',').trim(), value: parseFloat(parts[parts.length - 1]) || 0 };
      });
    } else if (panel.type === 'ratio') {
      draft.data = lines.map(l => {
        const [date, value, dau, mau] = l.split(',');
        const v = parseFloat(value) || 0;
        const m = parseFloat(mau) || 500;
        return { date: date?.trim(), value: v, dau: parseFloat(dau) || Math.round(m * v / 100), mau: m };
      });
    } else {
      draft.data = lines.map(l => {
        const [date, value] = l.split(',');
        return { date: date?.trim(), value: parseFloat(value) || 0 };
      });
    }
    onSave(draft);
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const modal = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Edit — {panel.title}</span>
          <button style={{ ...css.btnGhost, padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
          <div>
            <label style={css.label}>Title</label>
            <input style={css.input} value={draft.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div>
            <label style={css.label}>Subtitle / Badge</label>
            <input style={css.input} value={draft.subtitle || ''} onChange={e => set('subtitle', e.target.value)} />
          </div>
          {panel.type !== 'ranked' && (
            <>
              <div>
                <label style={css.label}>Prefix (e.g. ₹)</label>
                <input style={css.input} value={draft.prefix || ''} onChange={e => set('prefix', e.target.value)} />
              </div>
              <div>
                <label style={css.label}>Unit (e.g. days, %)</label>
                <input style={css.input} value={draft.unit || ''} onChange={e => set('unit', e.target.value)} />
              </div>
              <div>
                <label style={css.label}>Target value</label>
                <input style={css.input} type="number" value={draft.target ?? ''} onChange={e => set('target', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div>
                <label style={css.label}>Target label</label>
                <input style={css.input} value={draft.targetLabel || ''} onChange={e => set('targetLabel', e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label style={css.label}>Accent colour</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="color" value={draft.color} onChange={e => set('color', e.target.value)}
                style={{ width: 36, height: 34, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', background: 'none' }} />
              <input style={{ ...css.input }} value={draft.color} onChange={e => set('color', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ ...css.label, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 0 }}>
              <input type="checkbox" checked={draft.higherIsBetter} onChange={e => set('higherIsBetter', e.target.checked)} />
              <span style={{ fontSize: 13 }}>Higher is better</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={css.label}>Tooltip / insight text</label>
          <textarea
            style={{ ...css.input, resize: 'vertical', minHeight: 60 }}
            value={draft.tooltip || ''}
            onChange={e => set('tooltip', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={css.label}>
            {panel.type === 'ranked' ? 'Data — screen name, drop% (one per line)' : panel.type === 'ratio' ? 'Data — date, ratio%, DAU, MAU (one per line)' : 'Data — date, value (one per line)'}
          </label>
          <textarea
            style={{ ...css.input, resize: 'vertical', minHeight: 140, lineHeight: 1.8 }}
            value={rawData}
            onChange={e => setRawData(e.target.value)}
            spellCheck={false}
          />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, fontFamily: "'DM Mono', monospace" }}>
            {panel.type === 'ranked' ? 'e.g.  Checkout → Payment, 68' : 'e.g.  Mar 1, 3.8'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={css.btn(C.accent)} onClick={handleSave}>Save changes</button>
          <button style={css.btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Metric Modal ─────────────────────────────────────────────────────────
function AddMetricModal({ onAdd, onClose, existingIds }) {
  const [selected, setSelected] = useState(null);
  const available = METRIC_TEMPLATES.filter(t => t.id === 'custom' || !existingIds.includes(t.id));

  const handleAdd = () => {
    if (!selected) return;
    const template = METRIC_TEMPLATES.find(t => t.id === selected);
    const DAYS = generateDays(30);
    const newPanel = {
      ...template,
      id: selected === 'custom' ? `custom-${Date.now()}` : template.id,
      data: template.defaultData ? template.defaultData() : DAYS.map(date => ({ date, value: 0 })),
    };
    delete newPanel.defaultData;
    onAdd(newPanel);
  };

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 };
  const modal = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: '100%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto' };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700 }}>Add a Metric</span>
          <button style={{ ...css.btnGhost, padding: '6px 12px' }} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
          Pick from common consumer startup metrics or add a blank custom panel.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {available.map(t => (
            <div
              key={t.id}
              onClick={() => setSelected(t.id)}
              style={{
                background: selected === t.id ? t.color + '18' : C.surface,
                border: `1px solid ${selected === t.id ? t.color : C.border}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.title}</span>
              </div>
              {t.tooltip && (
                <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, margin: 0 }}>
                  {t.tooltip.split('.')[0]}.
                </p>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            style={{ ...css.btn(C.accent), opacity: selected ? 1 : 0.4 }}
            disabled={!selected}
            onClick={handleAdd}
          >
            + Add Panel
          </button>
          <button style={css.btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [panels, setPanels] = useLocalStorage('startboard-panels', DEFAULT_PANELS);
  const [editPanel, setEditPanel] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const CORE_IDS = ['time-to-order', 'aov', 'dau-mau', 'dropoff'];

  const handleSave = useCallback((updated) => {
    setPanels(prev => prev.map(p => p.id === updated.id ? updated : p));
    setEditPanel(null);
  }, [setPanels]);

  const handleRemove = useCallback((id) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  }, [setPanels]);

  const handleAdd = useCallback((newPanel) => {
    setPanels(prev => [...prev, newPanel]);
    setShowAdd(false);
  }, [setPanels]);

  const handleReset = () => {
    setPanels(DEFAULT_PANELS);
    setShowReset(false);
  };

  const renderPanel = (panel) => {
    const isCore = CORE_IDS.includes(panel.id);
    const props = { panel, onEdit: setEditPanel, onRemove: handleRemove, isCore };
    if (panel.type === 'ratio') return <RatioPanel key={panel.id} {...props} />;
    if (panel.type === 'ranked') return <RankedPanel key={panel.id} {...props} />;
    return <TrendPanel key={panel.id} {...props} />;
  };

  return (
    <div style={css.app}>
      <div style={css.glow} />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: css.app.background + 'ee', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ ...css.wrap, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>startboard</span>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace", marginLeft: 10 }}>the 4 metrics that matter</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={css.btn(C.accent + '22', C.accent)} onClick={() => setShowAdd(true)}>+ Add Metric</button>
            <button style={css.btnGhost} onClick={() => setShowReset(true)}>Reset</button>
          </div>
        </div>
      </div>

      {/* Dashboard grid */}
      <div style={{ ...css.wrap, paddingTop: 32 }}>
        {/* Core 4 always first */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Core metrics</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
          {panels.filter(p => CORE_IDS.includes(p.id)).map(renderPanel)}
        </div>

        {/* Custom panels */}
        {panels.some(p => !CORE_IDS.includes(p.id)) && (
          <>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' }}>Custom metrics</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, marginBottom: 32 }}>
              {panels.filter(p => !CORE_IDS.includes(p.id)).map(renderPanel)}
            </div>
          </>
        )}

        {/* Add metric CTA */}
        <div
          onClick={() => setShowAdd(true)}
          style={{
            border: `1px dashed ${C.border}`, borderRadius: 16, padding: '28px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s',
            color: C.muted, fontSize: 14,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
        >
          <span style={{ fontSize: 20 }}>+</span>
          <span>Add another metric — Churn, CAC, LTV, NPS, and more</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 60, padding: '20px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Mono', monospace" }}>
          Built by{' '}
          <a href="https://github.com/Aswin-Dot" target="_blank" rel="noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>Aswin Raj</a>
          {' '}· github.com/Aswin-Dot/startboard
        </span>
      </div>

      {/* Modals */}
      {editPanel && <EditModal panel={editPanel} onSave={handleSave} onClose={() => setEditPanel(null)} />}
      {showAdd && <AddMetricModal onAdd={handleAdd} onClose={() => setShowAdd(false)} existingIds={panels.map(p => p.id)} />}

      {/* Reset confirm */}
      {showReset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...css.card, maxWidth: 360, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Reset to demo data?</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>This will remove your custom metrics and restore the original 4 panels.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={css.btn(C.red)} onClick={handleReset}>Reset</button>
              <button style={css.btnGhost} onClick={() => setShowReset(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
