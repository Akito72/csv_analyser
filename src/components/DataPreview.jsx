import React from 'react';

const badgeColors = {
  numeric: ['#193327', '#55d68c'],
  categorical: ['#302719', '#f0b34d'],
  datetime: ['#1b2d35', '#6cc9f0'],
  ID: ['#2b2633', '#cda8ff']
};

const styles = {
  wrap: {
    border: '1px solid #26322f',
    borderRadius: 8,
    overflow: 'auto',
    background: '#101516',
    maxHeight: 410
  },
  table: {
    width: '100%',
    minWidth: 760,
    borderCollapse: 'collapse',
    fontSize: 13
  },
  th: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    textAlign: 'left',
    padding: '11px 12px',
    background: '#18211f',
    color: '#e7f0eb',
    borderBottom: '1px solid #2f3f39',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '10px 12px',
    color: '#c2ceca',
    borderBottom: '1px solid #1d2724',
    maxWidth: 260,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  badge: {
    display: 'inline-block',
    marginLeft: 8,
    borderRadius: 4,
    padding: '2px 5px',
    fontSize: 10,
    fontWeight: 900
  }
};

export default function DataPreview({ rows, columns }) {
  return (
    <div style={styles.wrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const [bg, color] = badgeColors[column.type] || badgeColors.categorical;
              return (
                <th key={column.name} style={styles.th}>
                  {column.name}
                  <span style={{ ...styles.badge, background: bg, color }}>{label(column.type)}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.name} style={styles.td} title={String(row[column.name] ?? '')}>
                  {String(row[column.name] ?? '') || '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function label(type) {
  if (type === 'numeric') return 'NUM';
  if (type === 'categorical') return 'CAT';
  if (type === 'datetime') return 'DATE';
  return 'ID';
}
