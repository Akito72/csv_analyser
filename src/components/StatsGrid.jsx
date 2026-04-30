import React from 'react';
import { formatNumber } from '../utils/statsEngine.js';

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: 12
  },
  card: {
    border: '1px solid #2b3834',
    background: '#121817',
    borderRadius: 8,
    padding: 14,
    minHeight: 138
  },
  alert: {
    borderColor: '#91433b',
    background: '#211514'
  },
  name: {
    margin: 0,
    color: '#edf4ef',
    fontSize: 15,
    fontWeight: 900,
    overflowWrap: 'anywhere'
  },
  mean: {
    margin: '12px 0 6px',
    color: '#d49b33',
    fontSize: 24,
    fontWeight: 900
  },
  small: {
    margin: '6px 0',
    color: '#9fb0aa',
    fontSize: 13
  },
  empty: {
    border: '1px solid #2b3834',
    background: '#121817',
    borderRadius: 8,
    padding: 18,
    color: '#9fb0aa'
  }
};

export default function StatsGrid({ stats, totalRows }) {
  if (!stats.length) {
    return <div style={styles.empty}>No numeric columns were detected. Preview and LLM context still support categorical, datetime, and ID fields.</div>;
  }

  return (
    <div style={styles.grid}>
      {stats.map((item) => {
        const isAlert = totalRows > 0 && item.nullCount / totalRows > 0.1;
        return (
          <article key={item.column} style={{ ...styles.card, ...(isAlert ? styles.alert : {}) }}>
            <h3 style={styles.name}>{item.column}</h3>
            <div style={styles.mean}>
              {formatNumber(item.mean)} ± {formatNumber(item.stdDev)}
            </div>
            <p style={styles.small}>
              Range {formatNumber(item.min)} → {formatNumber(item.max)}
            </p>
            <p style={styles.small}>Median {formatNumber(item.median)}</p>
            <p style={{ ...styles.small, color: isAlert ? '#ff9d90' : '#9fb0aa' }}>
              Null count {item.nullCount.toLocaleString()} / {totalRows.toLocaleString()}
            </p>
          </article>
        );
      })}
    </div>
  );
}
