import { describe, expect, it } from 'vitest';
import { computeNumericStats, computeThresholdBreaches, detectAnomalyRows } from '../statsEngine.js';

const numericColumn = [{ name: 'value', type: 'numeric' }];

function rowsOf(values) {
  return values.map((v) => ({ value: v }));
}

describe('computeNumericStats', () => {
  it('computes mean, std, min, max, median for a simple column', () => {
    const rows = rowsOf([1, 2, 3, 4, 5]);
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(stat.mean).toBe(3);
    expect(stat.median).toBe(3);
    expect(stat.min).toBe(1);
    expect(stat.max).toBe(5);
    expect(stat.std).toBeCloseTo(Math.sqrt(2), 5);
  });

  it('counts nulls and blanks without throwing', () => {
    const rows = [{ value: '' }, { value: null }, { value: 5 }, { value: 7 }];
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(stat.nullCount).toBe(2);
    expect(stat.mean).toBe(6);
  });

  it('returns nulls for an entirely empty column instead of throwing', () => {
    const rows = [{ value: '' }, { value: null }];
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(stat.mean).toBeNull();
    expect(stat.anomalies).toEqual([]);
  });

  it('does not produce Infinity/NaN anomalies when std is 0 (constant column)', () => {
    const rows = rowsOf([5, 5, 5, 5, 5]);
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(stat.std).toBe(0);
    expect(stat.anomalies).toEqual([]);
    expect(stat.anomalies.some((a) => !Number.isFinite(a.value))).toBe(false);
  });

  it('flags clear outliers on roughly-symmetric data via z-score', () => {
    // A large flat cluster with symmetric high/low outliers cancels out
    // skewness, so z-score (not IQR) should be selected, and it should
    // still catch the outliers.
    const cluster = Array(96).fill(10);
    const rows = rowsOf([...cluster, -3, 23, 24, -4]);
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(stat.skewness).toBeCloseTo(0, 5);
    expect(stat.anomalyMethod).toBe('z>3');
    expect(stat.anomalies.map((a) => a.value).sort((a, b) => a - b)).toEqual([-4, -3, 23, 24]);
  });

  it('switches to IQR on heavily skewed data and still flags the tail outlier', () => {
    // Right-skewed distribution (e.g. latency-like): mostly small values,
    // long tail. Skewness should exceed the threshold and select IQR.
    const rows = rowsOf([1, 1, 2, 2, 2, 3, 2, 1, 2, 3, 500]);
    const [stat] = computeNumericStats(rows, numericColumn);
    expect(Math.abs(stat.skewness)).toBeGreaterThan(1);
    expect(stat.anomalyMethod).toBe('iqr');
    expect(stat.anomalies.some((a) => a.value === 500)).toBe(true);
  });
});

describe('detectAnomalyRows', () => {
  it('collects unique row indices across multiple flagged columns', () => {
    const stats = [
      { anomalies: [{ rowIndex: 0 }, { rowIndex: 2 }] },
      { anomalies: [{ rowIndex: 2 }, { rowIndex: 5 }] },
    ];
    const rowSet = detectAnomalyRows([], stats);
    expect([...rowSet].sort()).toEqual([0, 2, 5]);
  });
});

describe('computeThresholdBreaches', () => {
  it('flags critical over warn when both thresholds are exceeded', () => {
    const rows = rowsOf([50, 80, 95]);
    const breaches = computeThresholdBreaches(rows, { value: { warn: 70, critical: 90 } }, []);
    expect(breaches).toEqual([
      { rowIndex: 1, column: 'value', value: 80, level: 'warn' },
      { rowIndex: 2, column: 'value', value: 95, level: 'critical' },
    ]);
  });

  it('ignores non-numeric values without throwing', () => {
    const rows = [{ value: 'n/a' }, { value: 100 }];
    const breaches = computeThresholdBreaches(rows, { value: { warn: 50, critical: null } }, []);
    expect(breaches).toEqual([{ rowIndex: 1, column: 'value', value: 100, level: 'warn' }]);
  });
});
