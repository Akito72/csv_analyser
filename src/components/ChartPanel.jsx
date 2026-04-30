import React from 'react';
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';

const COLORS = ['#4caf7d', '#d49b33', '#7c93e8'];

const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16 },
  card: { background: '#0f1614', border: '1px solid #1e2e28', borderRadius: 8, padding: '16px 18px' },
  title: { fontWeight: 800, fontSize: 13, color: '#88c9a4', marginBottom: 14, letterSpacing: 0.3 },
  skeleton: {
    background: 'linear-gradient(90deg, #0f1614 25%, #162018 50%, #0f1614 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 6, height: 220,
  },
  empty: { color: '#4a5e58', fontSize: 14, padding: 24 },
  tooltip: {
    background: '#0d1a16', border: '1px solid #2a3a35',
    borderRadius: 6, fontSize: 12, color: '#c8d6d2',
  },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={S.tooltip}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e2e28', color: '#88a09a', fontSize: 11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ padding: '4px 12px', color: p.color }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function prepareData(rows, xCol, yCol) {
  return rows
    .map((r) => ({ x: r[xCol], y: parseFloat(r[yCol]) }))
    .filter((d) => !isNaN(d.y) && d.x != null && d.x !== '');
}

function ChartCard({ chart, rows, color, thresholds }) {
  const data = prepareData(rows, chart.x, chart.y);
  if (!data.length) return null;

  const thresh = thresholds?.[chart.y];
  const axisStyle = { fill: '#4a5e58', fontSize: 11 };
  const gridProps = { stroke: '#1a2820', strokeDasharray: '3 3' };

  const commonProps = {
    data,
    margin: { top: 4, right: 12, left: 0, bottom: 4 },
  };

  let inner;
  if (chart.type === 'line') {
    inner = (
      <LineChart {...commonProps}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="x" tick={axisStyle} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={55} />
        <Tooltip content={<CustomTooltip />} />
        {thresh?.warn && <ReferenceLine y={parseFloat(thresh.warn)} stroke="#fb923c" strokeDasharray="4 2" label={{ value: 'WARN', fill: '#fb923c', fontSize: 10 }} />}
        {thresh?.critical && <ReferenceLine y={parseFloat(thresh.critical)} stroke="#f87171" strokeDasharray="4 2" label={{ value: 'CRIT', fill: '#f87171', fontSize: 10 }} />}
        <Line type="monotone" dataKey="y" name={chart.y} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: color }} />
      </LineChart>
    );
  } else if (chart.type === 'bar') {
    inner = (
      <BarChart {...commonProps}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="x" tick={axisStyle} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={55} />
        <Tooltip content={<CustomTooltip />} />
        {thresh?.warn && <ReferenceLine y={parseFloat(thresh.warn)} stroke="#fb923c" strokeDasharray="4 2" />}
        {thresh?.critical && <ReferenceLine y={parseFloat(thresh.critical)} stroke="#f87171" strokeDasharray="4 2" />}
        <Bar dataKey="y" name={chart.y} fill={color} radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    );
  } else {
    inner = (
      <ScatterChart {...commonProps}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="x" name={chart.x} tick={axisStyle} tickLine={false} type="number" />
        <YAxis dataKey="y" name={chart.y} tick={axisStyle} tickLine={false} axisLine={false} width={55} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
        <Scatter name={chart.y} fill={color} opacity={0.7} />
      </ScatterChart>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.title}>{chart.title}</div>
      <ResponsiveContainer width="100%" height={220}>{inner}</ResponsiveContainer>
    </div>
  );
}

export default function ChartPanel({ charts, rows, loading, thresholds }) {
  if (loading) {
    return (
      <>
        <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <div style={S.grid}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={S.card}>
              <div style={{ ...S.skeleton, height: 14, width: '40%', marginBottom: 14 }} />
              <div style={S.skeleton} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!charts.length) return <div style={S.empty}>No charts generated yet.</div>;

  return (
    <div style={S.grid}>
      {charts.map((chart, i) => (
        <ChartCard key={i} chart={chart} rows={rows} color={COLORS[i % COLORS.length]} thresholds={thresholds} />
      ))}
    </div>
  );
}