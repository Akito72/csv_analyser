export function computeNumericStats(rows, columns) {
  const numericColumns = columns.filter((column) => column.type === 'numeric');
  return numericColumns.map((column) => {
    const rawValues = rows.map((row) => row[column.name]);
    const values = rawValues.map(toNumber).filter((value) => Number.isFinite(value));
    const nullCount = rawValues.length - values.length;
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    const variance =
      values.length > 1
        ? values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (values.length - 1)
        : 0;

    return {
      column: column.name,
      count: values.length,
      nullCount,
      min: values.length ? sorted[0] : null,
      max: values.length ? sorted[sorted.length - 1] : null,
      mean,
      median: median(sorted),
      stdDev: values.length ? Math.sqrt(variance) : null
    };
  });
}

export function toNumber(value) {
  const text = String(value ?? '').trim().replace(/,/g, '');
  if (text === '') return NaN;
  const number = Number(text);
  return Number.isFinite(number) ? number : NaN;
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 'n/a';
  const absolute = Math.abs(value);
  const digits = absolute >= 1000 || absolute === 0 ? 0 : absolute < 1 ? 3 : 2;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
}

function median(sorted) {
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}
