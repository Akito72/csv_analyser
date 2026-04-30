import React, { useCallback, useState } from 'react';

const S = {
  zone: (drag) => ({
    border: `2px dashed ${drag ? '#d49b33' : '#2a3a35'}`,
    borderRadius: 10,
    background: drag ? 'rgba(212,155,51,0.04)' : '#0f1614',
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    position: 'relative',
  }),
  icon: { fontSize: 36, marginBottom: 10, opacity: 0.5 },
  label: { color: '#a8b6b1', fontSize: 15, marginBottom: 6 },
  hint: { color: '#4a5e58', fontSize: 12 },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    marginTop: 16, background: '#1a2820', border: '1px solid #2a3a35',
    borderRadius: 6, padding: '6px 14px', fontSize: 13, color: '#88c9a4',
  },
  dot: { width: 7, height: 7, borderRadius: '50%', background: '#4caf7d' },
};

export default function UploadZone({ onFile, dataset }) {
  const [drag, setDrag] = useState(false);

  const handle = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) return;
    onFile(file);
  }, [onFile]);

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false);
    handle(e.dataTransfer.files[0]);
  };

  return (
    <div
      style={S.zone(drag)}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      onClick={() => document.getElementById('csv-input').click()}
    >
      <input
        id="csv-input" type="file" accept=".csv"
        style={{ display: 'none' }}
        onChange={(e) => handle(e.target.files[0])}
      />
      <div style={S.icon}>📂</div>
      <div style={S.label}>
        {drag ? 'Drop it' : 'Drag & drop a CSV, or click to browse'}
      </div>
      <div style={S.hint}>.csv files only</div>

      {dataset && (
        <div style={S.chip}>
          <span style={S.dot} />
          {dataset.fileName} — {dataset.rows.length.toLocaleString()} rows × {dataset.columns.length} cols
        </div>
      )}
    </div>
  );
}