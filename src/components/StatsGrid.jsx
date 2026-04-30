import React, { useState } from 'react';

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 },
  card: (highNull, hasAnomalies) => ({
    background: highNull ? '#1a0d0b' : hasAnomalies ? '#130f0a' : '#0f1614',
    border: `1px solid ${highNull ? '#5a2020' : hasAnomalies ? '#4a3010' : '#1e2e28'}`,
    borderRadius: 8, padding: '14px 16px',
  }),
  colName: { fontWeight: 800, fontSize: 14, color: '#e0ece6', marginBottom: 10, wordBreak: 'break-all' },
  row: { display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5, color: '#6a8880' },
  val: { color: '#c8d6d2', fontWeight: 600 },
  badge: (color, bg) => ({
    display: 'inline-block', fontSize: 10, fontWeight: 800,
    padding: '2px 7px', borderRadius: 12, background: bg, color, marginTop: 8,
  }),
  thresholdSection: {
    marginTop: 12, paddingTop: 10, borderTop: '1px solid #1e2e28',
  },
  thresholdLabel: { fontSize: 10, color: '#4a5e58', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 },
  thresholdInputRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputLabel: { fontSize: 10, color: '#4a5e58', fontWeight: 600 },
  input: {
    background: '#080c0a', border: '1px solid #2a3a35', borderRadius: 5,
    color: '#d49b33', fontSize: 12, padding: '6px 10px', width: '100%',
    outline: 'none', boxSizing: 'border-box', fontFamily: '"JetBrains Mono", monospace',
  },
  anomalyList: { marginTop: 8, fontSize: 11, color: '#f87171' },
};

export default function StatsGrid({ stats, totalRows, thresholds, onThresholdChange }) {
  if (!stats.length) return (
    <div style={{ color: '#4a5e58', padding: 16 }}>No numeric columns found.</div>
  );

  return (
    <div style={S.grid}>
      {stats.map((s) => {
        const nullPct = totalRows > 0 ? s.nullCount / totalRows : 0;
        const highNull = nullPct > 0.1;
        const hasAnomalies = s.anomalies.length > 0;
        const thresh = thresholds?.[s.column] || { warn: '', critical: '' };

        return (
          <div key={s.column} style={S.card(highNull, hasAnomalies)}>
            <div style={S.colName}>{s.column}</div>

            <div style={S.row}><span>Mean ± Std</span>
              <span style={S.val}>{fmt(s.mean)} ± {fmt(s.std)}</span>
            </div>
            <div style={S.row}><span>Median</span>
              <span style={S.val}>{fmt(s.median)}</span>
            </div>
            <div style={S.row}><span>Range</span>
              <span style={S.val}>{fmt(s.min)} → {fmt(s.max)}</span>
            </div>
            <div style={S.row}><span>Nulls</span>
              <span style={{ color: highNull ? '#f87171' : '#c8d6d2', fontWeight: 600 }}>
                {s.nullCount} ({(nullPct * 100).toFixed(1)}%)
              </span>
            </div>

            {highNull && (
              <span style={S.badge('#f87171', '#3a1010')}>⚠ High nulls</span>
            )}
            {hasAnomalies && (
              <span style={S.badge('#fb923c', '#2a1a08')}>
                ⚡ {s.anomalies.length} anomaly{s.anomalies.length > 1 ? 'ies' : ''}
              </span>
            )}

            {/* Threshold controls */}
            {onThresholdChange && (
              <div style={S.thresholdSection}>
                <div style={S.thresholdLabel}>Alert thresholds</div>
                <div style={S.thresholdInputRow}>
                  <div style={S.inputGroup}>
                    <span style={S.inputLabel}>⚠ WARN ≥</span>
                    <input
                      style={S.input} type="number" placeholder="off"
                      value={thresh.warn}
                      onChange={(e) => onThresholdChange(s.column, 'warn', e.target.value)}
                    />
                  </div>
                  <div style={S.inputGroup}>
                    <span style={{ ...S.inputLabel, color: '#f87171' }}>🚨 CRIT ≥</span>
                    <input
                      style={{ ...S.input, color: thresh.critical ? '#f87171' : '#d49b33' }}
                      type="number" placeholder="off"
                      value={thresh.critical}
                      onChange={(e) => onThresholdChange(s.column, 'critical', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top anomalies */}
            {hasAnomalies && (
              <div style={S.anomalyList}>
                {s.anomalies.slice(0, 3).map((a, i) => (
                  <div key={i}>Row {a.rowIndex + 1}: {fmt(a.value)} (z={a.zScore})</div>
                ))}
                {s.anomalies.length > 3 && <div>+{s.anomalies.length - 3} more…</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}