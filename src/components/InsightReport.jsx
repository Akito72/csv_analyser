import React from 'react';

const S = {
  terminal: {
    background: '#080c08',
    border: '1px solid #1e3020',
    borderRadius: 8,
    padding: '20px 24px',
    fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
    fontSize: 13,
    lineHeight: 1.75,
    color: '#d49b33',
    minHeight: 120,
    position: 'relative',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #1a2a18',
  },
  prompt: { color: '#4caf7d', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 },
  dot: (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color }),
  dots: { display: 'flex', gap: 6 },
  body: { whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  skeleton: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  skLine: (w) => ({
    height: 13, borderRadius: 3, width: w,
    background: 'linear-gradient(90deg, #0f1f0f 25%, #1a2e18 50%, #0f1f0f 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  }),
  exportBtn: {
    background: 'transparent', border: '1px solid #2a3a28',
    color: '#4caf7d', borderRadius: 5, padding: '4px 12px',
    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  },
  empty: { color: '#2a4030', fontSize: 13 },
};

export default function InsightReport({ report, loading }) {
  const handleExport = () => {
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'insight-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={S.terminal}>
        <div style={S.header}>
          <div style={S.dots}>
            <div style={S.dot('#3a4a38')} />
            <div style={S.dot('#3a4a38')} />
            <div style={S.dot('#3a4a38')} />
          </div>
          <div style={S.prompt}>
            <span style={{ color: '#4caf7d' }}>analyst@groq</span>
            <span style={{ color: '#2a4030' }}>:</span>
            <span style={{ color: '#7c93e8' }}>~/insight</span>
            <span style={{ color: '#2a4030' }}>$</span>
          </div>
          {report && !loading && (
            <button style={S.exportBtn} onClick={handleExport}>↓ export .txt</button>
          )}
        </div>

        {loading ? (
          <div style={S.skeleton}>
            {[90, 75, 85, 60, 80, 70, 50].map((w, i) => (
              <div key={i} style={S.skLine(`${w}%`)} />
            ))}
          </div>
        ) : report ? (
          <div style={S.body}>{report}</div>
        ) : (
          <div style={S.empty}>// Awaiting dataset upload…</div>
        )}
      </div>
    </>
  );
}