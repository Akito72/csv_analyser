// Skewness threshold above which the z-score (mean/std) method is considered
// unreliable and we fall back to a robust, distribution-agnostic method.
// |skewness| > 1 is a common rule-of-thumb cutoff for "substantially skewed".
const SKEWNESS_THRESHOLD = 1;

function computeSkewness(values, mean, std) {
  if (!values.length || std === 0) return 0;
  const n = values.length;
  const m3 = values.reduce((s, v) => s + (v - mean) ** 3, 0) / n;
  return m3 / std ** 3;
}

function median(sortedValues) {
  const n = sortedValues.length;
  if (!n) return null;
  return n % 2 === 0
    ? (sortedValues[n / 2 - 1] + sortedValues[n / 2]) / 2
    : sortedValues[Math.floor(n / 2)];
}

function quantile(sortedValues, q) {
  const pos = (sortedValues.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedValues[base + 1] !== undefined) {
    return sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base]);
  }
  return sortedValues[base];
}

// z-score method: flags values more than 3 standard deviations from the
// mean. Assumes roughly normal data; sensitive to the very outliers it's
// trying to detect (they inflate mean/std themselves).
function zScoreAnomalies(rows, col, mean, std) {
  const anomalies = [];
  if (std === 0) return anomalies;
  rows.forEach((row, idx) => {
    const v = parseFloat(row[col]);
    if (!isNaN(v) && Math.abs(v - mean) > 3 * std) {
      anomalies.push({ rowIndex: idx, value: v, zScore: ((v - mean) / std).toFixed(2) });
    }
  });
  return anomalies;
}

// IQR method: flags values outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]. Robust to
// skew and doesn't assume normality — the standard boxplot-outlier rule.
function iqrAnomalies(rows, col, sortedValues) {
  const q1 = quantile(sortedValues, 0.25);
  const q3 = quantile(sortedValues, 0.75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  const anomalies = [];
  if (iqr === 0) return anomalies;
  rows.forEach((row, idx) => {
    const v = parseFloat(row[col]);
    if (!isNaN(v) && (v < lower || v > upper)) {
      anomalies.push({ rowIndex: idx, value: v, iqrBound: v < lower ? 'below' : 'above' });
    }
  });
  return anomalies;
}

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
      return {
        column: col, mean: null, std: null, min: null, max: null, median: null,
        skewness: null, nullCount, anomalies: [], anomalyMethod: null,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const med = median(sorted);
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    const skewness = computeSkewness(values, mean, std);

    // Auto-select anomaly detection method based on distribution shape.
    // z-score assumes near-normal data; on meaningfully skewed columns
    // (common in real-world data — latency, income, sensor spikes) it both
    // misses genuine outliers and can flag normal tail values. IQR makes no
    // distributional assumption, at the cost of being slightly more
    // conservative on truly normal data.
    const useRobustMethod = Math.abs(skewness) > SKEWNESS_THRESHOLD;
    const anomalies = useRobustMethod
      ? iqrAnomalies(rows, col, sorted)
      : zScoreAnomalies(rows, col, mean, std);

    return {
      column: col,
      mean,
      std,
      min,
      max,
      median: med,
      skewness,
      nullCount,
      anomalies,
      anomalyMethod: useRobustMethod ? 'iqr' : 'z>3',
    };
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
