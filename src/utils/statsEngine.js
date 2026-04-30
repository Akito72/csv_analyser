export function computeNumericStats(rows, columns) {
  const numericCols = columns.filter((c) => c.type === 'numeric').map((c) => c.name);
  return numericCols.map((col) => {
    const raw = rows.map((r) => r[col]);
    const nullCount = raw.filter((v) => v === '' || v == null).length;
    const values = raw
      .filter((v) => v !== '' && v != null)
      .map((v) => parseFloat(v))
      .filter((v) => !isNaN(v));

    if (!values.length) {
      return { column: col, mean: null, std: null, min: null, max: null, median: null, nullCount, anomalies: [] };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);

    // Anomaly detection: flag row indices where value is > 3 std from mean
    const anomalies = [];
    rows.forEach((row, idx) => {
      const v = parseFloat(row[col]);
      if (!isNaN(v) && Math.abs(v - mean) > 3 * std) {
        anomalies.push({ rowIndex: idx, value: v, zScore: ((v - mean) / std).toFixed(2) });
      }
    });

    return { column: col, mean, std, min, max, median, nullCount, anomalies };
  });
}

export function detectAnomalyRows(rows, numericStats) {
  const anomalyRowSet = new Set();
  numericStats.forEach((stat) => {
    stat.anomalies.forEach(({ rowIndex }) => anomalyRowSet.add(rowIndex));
  });
  return anomalyRowSet;
}

export function computeThresholdBreaches(rows, thresholds, numericStats) {
  // thresholds: { colName: { warn: number|null, critical: number|null } }
  const breaches = [];
  Object.entries(thresholds).forEach(([col, limits]) => {
    rows.forEach((row, idx) => {
      const v = parseFloat(row[col]);
      if (isNaN(v)) return;
      if (limits.critical != null && v >= limits.critical) {
        breaches.push({ rowIndex: idx, column: col, value: v, level: 'critical' });
      } else if (limits.warn != null && v >= limits.warn) {
        breaches.push({ rowIndex: idx, column: col, value: v, level: 'warn' });
      }
    });
  });
  return breaches;
}