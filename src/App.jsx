import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UploadZone from './components/UploadZone.jsx';
import DataPreview from './components/DataPreview.jsx';
import StatsGrid from './components/StatsGrid.jsx';
import ChartPanel from './components/ChartPanel.jsx';
import InsightReport from './components/InsightReport.jsx';
import { parseCsvFile, rowsToCompactCsv } from './utils/csvParser.js';
import { computeNumericStats, detectAnomalyRows, computeThresholdBreaches } from './utils/statsEngine.js';
import { detectColumnTypes } from './utils/typeDetector.js';

const S = {
  page: {
    minHeight: '100vh',
    background: '#0b0f12',
    color: '#d8e0df',
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  shell: { maxWidth: 1480, margin: '0 auto', padding: '28px clamp(16px, 3vw, 42px) 64px' },
  header: { marginBottom: 32 },
  eyebrow: {
    color: '#4caf7d', fontSize: 11, textTransform: 'uppercase',
    letterSpacing: 2, fontWeight: 700, marginBottom: 10,
    display: 'flex', alignItems: 'center', gap: 8,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: '50%', background: '#4caf7d', display: 'inline-block' },
  h1: { margin: '0 0 10px', fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.05, color: '#f0f5f1', fontWeight: 800 },
  sub: { maxWidth: 680, margin: 0, color: '#6a8880', lineHeight: 1.6, fontSize: 14 },
  divider: { height: 1, background: '#1a2820', margin: '28px 0' },
  section: { marginBottom: 36 },
  sectionHeader: {
    display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14,
  },
  stepBadge: {
    fontSize: 10, fontWeight: 800, color: '#4caf7d',
    border: '1px solid #1e3a28', borderRadius: 4,
    padding: '2px 8px', letterSpacing: 1,
  },
  sectionTitle: { color: '#dce6e1', fontSize: 15, fontWeight: 800, margin: 0 },
  sectionSub: { color: '#4a5e58', fontSize: 12, marginLeft: 'auto' },
  error: {
    border: '1px solid #5a2020', background: '#140a0a',
    color: '#f87171', borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 20,
  },
  alertBar: (level) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 6, marginBottom: 12, fontSize: 13,
    background: level === 'critical' ? '#1a0808' : '#1a1008',
    border: `1px solid ${level === 'critical' ? '#5a1a1a' : '#4a3010'}`,
    color: level === 'critical' ? '#f87171' : '#fb923c',
  }),
  exportRow: { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  exportBtn: {
    background: '#0f1614', border: '1px solid #2a3a35',
    color: '#88c9a4', borderRadius: 6, padding: '8px 16px',
    fontSize: 12, cursor: 'pointer', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  },
};

function SectionHead({ step, title, sub }) {
  return (
    <div style={S.sectionHeader}>
      <span style={S.stepBadge}>STEP {step}</span>
      <h2 style={S.sectionTitle}>{title}</h2>
      {sub && <span style={S.sectionSub}>{sub}</span>}
    </div>
  );
}

function buildLocalCharts(columns, stats) {
  const numeric = stats.map((s) => s.column);
  if (!numeric.length) return [];
  const x = numeric[0], y = numeric[1] || numeric[0];
  return [
    { type: 'bar', x, y, title: `${y} by ${x}` },
    { type: 'line', x, y, title: `${y} trend` },
  ];
}

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [chartConfig, setChartConfig] = useState([]);
  const [insightReport, setInsightReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState('');
  const [thresholds, setThresholds] = useState({});
  const analyzedRef = useRef(null);

  const numericStats = useMemo(() => {
    if (!dataset) return [];
    return computeNumericStats(dataset.rows, dataset.columns);
  }, [dataset]);

  const anomalyRowSet = useMemo(() => detectAnomalyRows(dataset?.rows || [], numericStats), [numericStats, dataset]);

  const thresholdBreaches = useMemo(() => {
    if (!dataset) return [];
    return computeThresholdBreaches(dataset.rows, thresholds, numericStats);
  }, [dataset, thresholds, numericStats]);

  const handleThresholdChange = useCallback((col, field, val) => {
    setThresholds((prev) => ({
      ...prev,
      [col]: { ...prev[col], [field]: val },
    }));
  }, []);

  const handleFile = async (file) => {
    setError(''); setChartConfig([]); setInsightReport(''); setThresholds({});
    try {
      const parsed = await parseCsvFile(file);
      const columns = detectColumnTypes(parsed.rows, parsed.fields);
      setDataset({ ...parsed, columns, fileName: file.name, analysisKey: `${file.name}-${file.size}-${file.lastModified}` });
    } catch (err) {
      setDataset(null); setError(err.message);
    }
  };

  useEffect(() => {
    if (!dataset || analyzedRef.current === dataset.analysisKey) return;
    analyzedRef.current = dataset.analysisKey;

    const payload = {
      columns: dataset.columns,
      stats: numericStats,
      compactCsv: rowsToCompactCsv(dataset.rows.slice(0, 50), dataset.fields),
    };

    setError(''); setChartConfig([]); setInsightReport('');

    // Charts
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Analysis failed.');
        setChartConfig(data.charts || []);
      } catch (err) {
        setChartConfig(buildLocalCharts(dataset.columns, numericStats));
        setError(err.message);
      } finally { setLoading(false); }
    })();

    // Insight
    (async () => {
      setInsightLoading(true);
      try {
        const res = await fetch('/api/insight', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Insight failed.');
        setInsightReport(data.report || '');
      } catch (err) {
        setInsightReport(`Insight unavailable: ${err.message}`);
      } finally { setInsightLoading(false); }
    })();
  }, [dataset, numericStats]);

  const exportStats = () => {
    if (!numericStats.length) return;
    const header = 'column,mean,std,min,max,median,nullCount,anomalyCount';
    const rows = numericStats.map((s) =>
      [s.column, s.mean?.toFixed(4), s.std?.toFixed(4), s.min, s.max, s.median?.toFixed(4), s.nullCount, s.anomalies.length].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stats-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const criticalBreaches = thresholdBreaches.filter((b) => b.level === 'critical');
  const warnBreaches = thresholdBreaches.filter((b) => b.level === 'warn');
  const totalAnomalies = numericStats.reduce((s, n) => s + n.anomalies.length, 0);

  return (
    <main style={S.page}>
      <div style={S.shell}>
        {/* Header */}
        <header style={S.header}>
          <div style={S.eyebrow}><span style={S.eyebrowDot} /> Operations Intelligence</div>
          <h1 style={S.h1}>Sensor & Asset Data Workbench</h1>
          <p style={S.sub}>
            Upload a CSV to automatically parse, compute stats, detect anomalies, set thresholds, and generate Groq-powered charts and insight reports for maintenance decisions.
          </p>
        </header>

        {/* Alert bars */}
        {criticalBreaches.length > 0 && (
          <div style={S.alertBar('critical')}>
            🚨 <strong>{criticalBreaches.length} critical threshold breach{criticalBreaches.length > 1 ? 'es'  : ''}</strong> — {criticalBreaches.slice(0, 3).map((b) => `${b.column} row ${b.rowIndex + 1}`).join(', ')}{criticalBreaches.length > 3 ? '…' : ''}
          </div>
        )}
        {warnBreaches.length > 0 && (
          <div style={S.alertBar('warn')}>
            ⚠ <strong>{warnBreaches.length} warning{warnBreaches.length > 1 ? 's' : ''}</strong> — {warnBreaches.slice(0, 3).map((b) => `${b.column} row ${b.rowIndex + 1}`).join(', ')}{warnBreaches.length > 3 ? '…' : ''}
          </div>
        )}

        {error && <div style={S.error}>⚠ {error}</div>}

        {/* Step 1 */}
        <section style={S.section}>
          <SectionHead step={1} title="Upload CSV" />
          <UploadZone onFile={handleFile} dataset={dataset} />
        </section>

        {dataset && (
          <>
            <div style={S.divider} />

            {/* Step 2 */}
            <section style={S.section}>
              <SectionHead
                step={2} title="Data Preview"
                sub={`${anomalyRowSet.size} anomalous row${anomalyRowSet.size !== 1 ? 's' : ''} highlighted`}
              />
              <DataPreview rows={dataset.rows.slice(0, 10)} columns={dataset.columns} anomalyRowSet={anomalyRowSet} />
            </section>

            <div style={S.divider} />

            {/* Step 3 */}
            <section style={S.section}>
              <SectionHead
                step={3} title="Stats & Thresholds"
                sub={totalAnomalies > 0 ? `${totalAnomalies} statistical anomalies detected (>3σ)` : 'No anomalies detected'}
              />
              <StatsGrid
                stats={numericStats}
                totalRows={dataset.rows.length}
                thresholds={thresholds}
                onThresholdChange={handleThresholdChange}
              />
              <div style={S.exportRow}>
                <button style={S.exportBtn} onClick={exportStats}>↓ Export stats CSV</button>
              </div>
            </section>

            <div style={S.divider} />

            {/* Step 4 */}
            <section style={S.section}>
              <SectionHead step={4} title="Auto-Generated Charts" sub="LLM-selected column pairings" />
              <ChartPanel charts={chartConfig} rows={dataset.rows} loading={loading} thresholds={thresholds} />
            </section>

            <div style={S.divider} />

            {/* Step 5 */}
            <section style={S.section}>
              <SectionHead step={5} title="Insight Report" sub="Groq / llama-3.3-70b" />
              <InsightReport report={insightReport} loading={insightLoading} />
            </section>
          </>
        )}
      </div>
    </main>
  );
}