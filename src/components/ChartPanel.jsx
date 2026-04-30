import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { toNumber } from '../utils/statsEngine.js';

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: 14
  },
  panel: {
    border: '1px solid #2a3834',
    background: '#111716',
    borderRadius: 8,
    padding: 14,
    minHeight: 330
  },
  title: {
    margin: '0 0 12px',
    fontSize: 15,
    color: '#edf4ef',
    fontWeight: 900,
    overflowWrap: 'anywhere'
  },
  empty: {
    border: '1px solid #2a3834',
    background: '#111716',
    borderRadius: 8,
    padding: 18,
    color: '#9fb0aa'
  },
  skeleton: {
    minHeight: 330,
    borderRadius: 8,
    background: 'linear-gradient(90deg, #111716 0%, #1b2521 50%, #111716 100%)',
    backgroundSize: '200% 100%',
    border: '1px solid #2a3834'
  }
};

const axisStyle = { fill: '#8fa29b', fontSize: 11 };

export default function ChartPanel({ charts, rows, loading, stats }) {
  if (loading) {
    return (
      <div style={styles.grid}>
        {[0, 1, 2].map((item) => (
          <div key={item} style={styles.skeleton} />
        ))}
      </div>
    );
  }

  if (!stats.length) {
    return <div style={styles.empty}>Charts require at least one numeric column for the y-axis.</div>;
  }

  if (!charts.length) {
    return <div style={styles.empty}>Click Analyze to generate the three automatic chart selections.</div>;
  }

  return (
    <div style={styles.grid}>
      {charts.map((chart, index) => (
        <article key={`${chart.title}-${index}`} style={styles.panel}>
          <h3 style={styles.title}>{chart.title}</h3>
          <ResponsiveContainer width="100%" height={270}>
            {renderChart(chart, buildChartRows(rows, chart))}
          </ResponsiveContainer>
        </article>
      ))}
    </div>
  );
}

function buildChartRows(rows, chart) {
  return rows
    .map((row) => ({
      x: row[chart.x],
      y: toNumber(row[chart.y]),
      rawX: row[chart.x]
    }))
    .filter((row) => Number.isFinite(row.y) && row.x !== undefined && row.x !== '')
    .slice(0, 300);
}

function renderChart(chart, data) {
  if (chart.type === 'scatter') {
    const scatterData = data
      .map((row) => ({ x: toNumber(row.rawX), y: row.y }))
      .filter((row) => Number.isFinite(row.x) && Number.isFinite(row.y));
    return (
      <ScatterChart data={scatterData}>
        <CartesianGrid stroke="#26332f" />
        <XAxis type="number" dataKey="x" name={chart.x} tick={axisStyle} stroke="#4b5f58" />
        <YAxis type="number" dataKey="y" name={chart.y} tick={axisStyle} stroke="#4b5f58" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
        <Scatter dataKey="y" fill="#d49b33" isAnimationActive />
      </ScatterChart>
    );
  }

  if (chart.type === 'bar') {
    const grouped = aggregateByX(data);
    return (
      <BarChart data={grouped}>
        <CartesianGrid stroke="#26332f" />
        <XAxis dataKey="x" tick={axisStyle} stroke="#4b5f58" minTickGap={18} />
        <YAxis tick={axisStyle} stroke="#4b5f58" />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="y" fill="#6cc9f0" radius={[4, 4, 0, 0]} isAnimationActive />
      </BarChart>
    );
  }

  return (
    <LineChart data={data}>
      <CartesianGrid stroke="#26332f" />
      <XAxis dataKey="x" tick={axisStyle} stroke="#4b5f58" minTickGap={18} />
      <YAxis tick={axisStyle} stroke="#4b5f58" />
      <Tooltip contentStyle={tooltipStyle} />
      <Line type="monotone" dataKey="y" stroke="#55d68c" strokeWidth={2} dot={false} isAnimationActive />
    </LineChart>
  );
}

function aggregateByX(data) {
  const buckets = new Map();
  data.forEach((row) => {
    const key = String(row.x);
    const current = buckets.get(key) || { x: key, total: 0, count: 0 };
    current.total += row.y;
    current.count += 1;
    buckets.set(key, current);
  });
  return [...buckets.values()]
    .map((bucket) => ({ x: bucket.x, y: bucket.total / bucket.count }))
    .slice(0, 40);
}

const tooltipStyle = {
  background: '#0c1112',
  border: '1px solid #33433e',
  color: '#edf4ef',
  borderRadius: 6
};
