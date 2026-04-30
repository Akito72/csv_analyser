import React from 'react';

const TYPE_BADGE = {
  numeric:     { label: 'NUM',  bg: '#0d2a1f', color: '#4caf7d' },
  categorical: { label: 'CAT',  bg: '#1a1a2e', color: '#7c93e8' },
  datetime:    { label: 'DATE', bg: '#1e1a0e', color: '#d49b33' },
  id:          { label: 'ID',   bg: '#1e1218', color: '#a07cc5' },
};

const S = {
  wrapper: { overflowX: 'auto', borderRadius: 8, border: '1px solid #1e2e28' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    background: '#0d1a16', color: '#88a09a', fontWeight: 700,
    padding: '10px 14px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: '1px solid #1e2e28', position: 'sticky', top: 0,
  },
  badge: (type) => ({
    display: 'inline-block', marginLeft: 6, fontSize: 9, fontWeight: 900,
    padding: '1px 5px', borderRadius: 3,
    background: TYPE_BADGE[type]?.bg || '#1a1a1a',
    color: TYPE_BADGE[type]?.color || '#888',
    letterSpacing: 0.5,
  }),
  td: (anomaly, i) => ({
    padding: '8px 14px', borderBottom: '1px solid #131e1b',
    background: anomaly ? 'rgba(239,68,68,0.07)' : i % 2 === 0 ? '#0b0f12' : '#0d1310',
    color: anomaly ? '#fca5a5' : '#c8d6d2',
    whiteSpace: 'nowrap',
  }),
  anomalyMarker: {
    display: 'inline-block', marginLeft: 4, fontSize: 10,
    color: '#f87171', verticalAlign: 'middle',
  },
};

export default function DataPreview({ rows, columns, anomalyRowSet = new Set() }) {
  if (!rows.length) return <div style={{ color: '#4a5e58', padding: 16 }}>No data to preview.</div>;

  return (
    <div style={S.wrapper}>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, color: '#4a5e58', width: 40 }}>#</th>
            {columns.map((col) => (
              <th key={col.name} style={S.th}>
                {col.name}
                <span style={S.badge(col.type)}>{TYPE_BADGE[col.type]?.label || col.type}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isAnomaly = anomalyRowSet.has(i);
            return (
              <tr key={i}>
                <td style={{ ...S.td(isAnomaly, i), color: '#3a5048', fontSize: 11 }}>{i + 1}</td>
                {columns.map((col) => (
                  <td key={col.name} style={S.td(isAnomaly, i)}>
                    {row[col.name] ?? <span style={{ color: '#4a5e58' }}>—</span>}
                    {isAnomaly && col.type === 'numeric' && (
                      <span style={S.anomalyMarker} title="Anomaly detected">⚠</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}