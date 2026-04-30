import Papa from 'papaparse';

export function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Upload a .csv file.'));
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        if (result.errors?.length) {
          reject(new Error(result.errors[0].message || 'CSV parsing failed.'));
          return;
        }

        const fields = (result.meta.fields || []).filter(Boolean);
        const rows = (result.data || []).filter((row) =>
          fields.some((field) => String(row[field] ?? '').trim() !== '')
        );

        if (!fields.length || !rows.length) {
          reject(new Error('The CSV is empty or does not contain a header row with data.'));
          return;
        }

        resolve({ fields, rows, rowCount: rows.length, columnCount: fields.length });
      },
      error: (error) => reject(new Error(error.message || 'CSV parsing failed.'))
    });
  });
}

export function rowsToCompactCsv(rows, fields) {
  return Papa.unparse(rows, {
    columns: fields,
    quotes: false,
    newline: '\n'
  });
}
