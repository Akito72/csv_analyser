const idNamePattern = /(^id$|_id$|id_|asset|serial|tag|uuid|guid|code|number$)/i;

export function detectColumnTypes(rows, fields) {
  const totalRows = rows.length || 1;

  return fields.map((name) => {
    const values = rows
      .map((row) => normalize(row[name]))
      .filter((value) => value !== '');
    const uniqueCount = new Set(values).size;
    const filledRatio = values.length / totalRows;
    const numericRatio = ratio(values, isNumeric);
    const dateRatio = ratio(values, isDateLike);
    const uniqueRatio = values.length ? uniqueCount / values.length : 0;

    let type = 'categorical';
    if (values.length && dateRatio >= 0.85) {
      type = 'datetime';
    } else if (values.length && numericRatio >= 0.9) {
      type = uniqueRatio > 0.96 && idNamePattern.test(name) ? 'ID' : 'numeric';
    } else if (values.length && (idNamePattern.test(name) || (uniqueRatio > 0.88 && values.length > 8))) {
      type = 'ID';
    }

    return { name, type, uniqueCount, nullCount: totalRows - values.length, filledRatio };
  });
}

function normalize(value) {
  return String(value ?? '').trim();
}

function ratio(values, predicate) {
  if (!values.length) return 0;
  return values.filter(predicate).length / values.length;
}

function isNumeric(value) {
  if (value === '') return false;
  const cleaned = value.replace(/,/g, '');
  return cleaned !== '' && Number.isFinite(Number(cleaned));
}

function isDateLike(value) {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed.replace(/,/g, ''))) return false;
  const hasDateShape =
    /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(trimmed) ||
    /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(trimmed) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(trimmed);
  if (!hasDateShape) return false;
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp);
}
