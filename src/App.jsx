import React, { useEffect, useMemo, useRef, useState } from 'react';
import UploadZone from './components/UploadZone.jsx';
import DataPreview from './components/DataPreview.jsx';
import StatsGrid from './components/StatsGrid.jsx';
import ChartPanel from './components/ChartPanel.jsx';
import InsightReport from './components/InsightReport.jsx';
import { parseCsvFile, rowsToCompactCsv } from './utils/csvParser.js';
import { computeNumericStats } from './utils/statsEngine.js';
import { detectColumnTypes } from './utils/typeDetector.js';

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0b0f12',
    color: '#d8e0df',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  shell: {
    maxWidth: 1480,
    margin: '0 auto',
    padding: '28px clamp(16px, 3vw, 42px) 48px'
  },
  header: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 20,
    alignItems: 'end',
    marginBottom: 22
  },
  eyebrow: {
    color: '#88a09a',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: 800
  },
  h1: {
    margin: '6px 0 8px',
    fontSize: 'clamp(30px, 4vw, 52px)',
    lineHeight: 1,
    letterSpacing: 0,
    color: '#f0f5f1'
  },
  sub: {
    maxWidth: 760,
    margin: 0,
    color: '#a8b6b1',
    lineHeight: 1.55,
    fontSize: 15
  },
  section: {
    marginTop: 18
  },
  sectionTitle: {
    color: '#dce6e1',
    fontSize: 16,
    margin: '0 0 10px',
    fontWeight: 900
  },
  error: {
    marginTop: 14,
    border: '1px solid #813a34',
    background: '#261311',
    color: '#ffb4a8',
    borderRadius: 6,
    padding: 12,
    fontSize: 14
  }
};

export default function App() {
  const [dataset, setDataset] = useState(null);
  const [chartConfig, setChartConfig] = useState([]);
  const [insightReport, setInsightReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState('');
  const analyzedDatasetRef = useRef(null);

  const numericStats = useMemo(() => {
    if (!dataset) return [];
    return computeNumericStats(dataset.rows, dataset.columns);
  }, [dataset]);

  const handleFile = async (file) => {
    setError('');
    setChartConfig([]);
    setInsightReport('');
    try {
      const parsed = await parseCsvFile(file);
      const columns = detectColumnTypes(parsed.rows, parsed.fields);
      setDataset({
        ...parsed,
        columns,
        fileName: file.name,
        analysisKey: `${file.name}-${file.size}-${file.lastModified}`
      });
    } catch (err) {
      setDataset(null);
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!dataset || analyzedDatasetRef.current === dataset.analysisKey) return;
    analyzedDatasetRef.current = dataset.analysisKey;

    const compactCsv = rowsToCompactCsv(dataset.rows.slice(0, 50), dataset.fields);
    const analysisPayload = { columns: dataset.columns, stats: numericStats, compactCsv };

    const generateCharts = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisPayload)
        });
        const payload = await response.json();
        
        if (!response.ok) throw new Error(payload.error || 'Analysis request failed.');
        setChartConfig(payload.charts || []);
      } catch (err) {
        const fallbackCharts = buildLocalCharts(dataset.columns, numericStats);
        setChartConfig(fallbackCharts);
        setError(`${err.message} Add GROQ_API_KEY to your backend .env file and restart the server.`);
      } finally {
        setLoading(false);
      }
    };

    const generateInsight = async () => {
      setInsightLoading(true);
      setInsightReport('');
      try {
        const response = await fetch('/api/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analysisPayload)
        });
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Insight request failed.');
        setInsightReport(data.report || 'No report returned from server.');
      } catch (err) {
        setInsightReport(`Insight unavailable: ${err.message}`);
      } finally {
        setInsightLoading(false);
      }
    };

    // Run both independently
    Promise.allSettled([generateCharts(), generateInsight()]);
  }, [dataset, numericStats]);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <div style={styles.eyebrow}>Operations CSV Data Analyst</div>
            <h1 style={styles.h1}>Sensor and asset data workbench</h1>
            <p style={styles.sub}>
              Upload a CSV, inspect the parsed data, review numeric health signals,
              and generate Groq-powered charts and analyst notes for maintenance decisions.
            </p>
          </div>
        </header>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 1 - Upload</h2>
          <UploadZone onFile={handleFile} dataset={dataset} />
        </section>

        {error ? <div style={styles.error}>{error}</div> : null}

        {dataset ? (
          <>
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 2 - Data Preview</h2>
              <DataPreview rows={dataset.rows.slice(0, 10)} columns={dataset.columns} />
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 3 - Stats Panel</h2>
              <StatsGrid stats={numericStats} totalRows={dataset.rows.length} />
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 4 - Charts</h2>
              <ChartPanel
                charts={chartConfig}
                rows={dataset.rows}
                loading={loading}
                stats={numericStats}
              />
            </section>

            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Step 5 - Insight Report</h2>
              <InsightReport report={insightReport} loading={insightLoading} />
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function buildLocalCharts(columns, stats) {
  const numeric = stats.map((item) => item.column);
  if (!numeric.length) return [];
  const x = numeric[0];
  const y = numeric[1] || numeric[0];
  return [
    { type: 'bar', x, y, title: `${y} by ${x}` },
    { type: 'line', x, y, title: `${y} trend by ${x}` }
  ];
}