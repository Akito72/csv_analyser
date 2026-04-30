import Papa from 'papaparse';

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          return reject(new Error('CSV is empty or has no data rows.'));
        }
        const fields = results.meta.fields || [];
        if (fields.length === 0) {
          return reject(new Error('CSV has no columns.'));
        }
        resolve({ rows: results.data, fields });
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`))
    });
  });
}

export function rowsToCompactCsv(rows, fields) {
  if (!rows.length || !fields.length) return '';
  const header = fields.join(',');
  const body = rows.map((row) =>
    fields.map((f) => {
      const v = row[f] ?? '';
      return String(v).includes(',') ? `"${v}"` : v;
    }).join(',')
  );
  return [header, ...body].join('\n');
}