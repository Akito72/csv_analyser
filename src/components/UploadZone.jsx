import React, { useRef, useState } from 'react';

const styles = {
  zone: {
    width: '100%',
    border: '1px dashed #4f625c',
    background: 'linear-gradient(135deg, #12191b 0%, #0f1516 55%, #171912 100%)',
    borderRadius: 8,
    padding: '28px',
    minHeight: 150,
    display: 'grid',
    placeItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 160ms ease, background 160ms ease'
  },
  active: {
    borderColor: '#d49b33',
    background: '#171a12'
  },
  title: {
    margin: 0,
    color: '#edf4ef',
    fontWeight: 900,
    fontSize: 22
  },
  hint: {
    margin: '8px 0 0',
    color: '#91a19b',
    fontSize: 14
  },
  meta: {
    marginTop: 16,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10
  },
  pill: {
    border: '1px solid #33433e',
    background: '#0c1112',
    color: '#c8d5cf',
    borderRadius: 999,
    padding: '7px 10px',
    fontSize: 13,
    fontWeight: 800
  },
  input: {
    display: 'none'
  }
};

export default function UploadZone({ onFile, dataset }) {
  const inputRef = useRef(null);
  const [active, setActive] = useState(false);

  const pickFile = (files) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      style={{ ...styles.zone, ...(active ? styles.active : {}) }}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        pickFile(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={styles.input}
        onChange={(event) => pickFile(event.target.files)}
      />
      <div>
        <p style={styles.title}>Drop a CSV file here</p>
        <p style={styles.hint}>or select one from disk</p>
        {dataset ? (
          <div style={styles.meta}>
            <span style={styles.pill}>{dataset.fileName}</span>
            <span style={styles.pill}>{dataset.rowCount.toLocaleString()} rows</span>
            <span style={styles.pill}>{dataset.columnCount.toLocaleString()} columns</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
