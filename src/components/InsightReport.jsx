import React from 'react';

const styles = {
  box: {
    border: '1px solid #50401f',
    background: '#11100b',
    color: '#f0b34d',
    borderRadius: 8,
    minHeight: 210,
    padding: 18,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: 14,
    lineHeight: 1.65,
    whiteSpace: 'pre-wrap'
  },
  muted: {
    color: '#a98f54'
  },
  skeletonLine: {
    height: 14,
    borderRadius: 4,
    marginBottom: 12,
    background: 'linear-gradient(90deg, #211b10 0%, #3a2d14 50%, #211b10 100%)',
    backgroundSize: '200% 100%'
  }
};

export default function InsightReport({ report, loading }) {
  if (loading) {
    return (
      <div style={styles.box}>
        {[82, 96, 88, 74, 91, 67, 79].map((width, index) => (
          <div key={index} style={{ ...styles.skeletonLine, width: `${width}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div style={styles.box}>
      {report ? report : <span style={styles.muted}>Waiting for insight report.</span>}
    </div>
  );
}
