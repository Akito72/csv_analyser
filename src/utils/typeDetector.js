const DATE_RE = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;
const NUM_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const ID_HINTS = /\b(id|uuid|key|code|ref|serial|no\.?)\b/i;

export function detectColumnTypes(rows, fields) {
  return fields.map((name) => {
    const values = rows.map((r) => r[name]).filter((v) => v !== '' && v != null);
    if (!values.length) return { name, type: 'categorical' };

    const numericCount = values.filter((v) => NUM_RE.test(String(v).trim())).length;
    const dateCount = values.filter((v) => DATE_RE.test(String(v).trim())).length;
    const ratio = values.length;

    if (dateCount / ratio > 0.8) return { name, type: 'datetime' };
    if (numericCount / ratio > 0.8) {
      // Check if it looks like an ID column
      const uniq = new Set(values).size;
      if (ID_HINTS.test(name) && uniq === values.length) return { name, type: 'id' };
      return { name, type: 'numeric' };
    }
    const uniq = new Set(values).size;
    if (ID_HINTS.test(name) && uniq / ratio > 0.9) return { name, type: 'id' };
    return { name, type: 'categorical' };
  });
}