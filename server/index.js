import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import Groq from 'groq-sdk';
import path from 'path';

dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

const app = express();
const port = Number(process.env.PORT || 8787);

function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim();
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const chartTypes = new Set(['line', 'bar', 'scatter']);

function extractJsonArray(text) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in model response.');
  return JSON.parse(match[0].replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
}

function fallbackCharts(columns, stats) {
  const numeric = stats.map((item) => item.column);
  const first = numeric[0];
  const second = numeric[1] || first;

  if (!first) return [];

  return [
    { type: 'bar', x: first, y: second, title: `${second} by ${first}` },
    { type: 'line', x: first, y: second, title: `${second} trend by ${first}` }
  ];
}

function sanitizeCharts(rawCharts, columns, stats) {
  const columnNames = new Set(columns.map((column) => column.name));
  const numericNames = new Set(stats.map((item) => item.column));
  const typeByName = new Map(columns.map((column) => [column.name, column.type]));
  return rawCharts
    .filter((chart) => {
      if (!chart || !chartTypes.has(chart.type) || !columnNames.has(chart.x) || !numericNames.has(chart.y)) return false;
      return chart.type !== 'scatter' || typeByName.get(chart.x) === 'numeric';
    })
    .slice(0, 3)
    .map((chart) => ({
      type: chart.type,
      x: chart.x,
      y: chart.y,
      title: String(chart.title || `${chart.y} by ${chart.x}`).slice(0, 90)
    }));
}

function buildContext({ columns, stats, compactCsv }) {
  return [
    `Column names and detected types:\n${JSON.stringify(columns, null, 2)}`,
    `Summary stats for numeric columns:\n${JSON.stringify(stats, null, 2)}`,
    `First 50 rows as compact CSV:\n${compactCsv}`
  ].join('\n\n');
}

async function askGroq(system, user) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    const error = new Error('GROQ_API_KEY is not configured.');
    error.status = 503;
    throw error;
  }

  const client = new Groq({ apiKey });
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.25,
    max_tokens: 650,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]
  });

  return completion.choices?.[0]?.message?.content || '';
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { columns = [], stats = [], compactCsv = '' } = req.body || {};
    if (!Array.isArray(columns) || !Array.isArray(stats) || !compactCsv) {
      return res.status(400).json({ error: 'columns, stats, and compactCsv are required.' });
    }

    const context = buildContext({ columns, stats, compactCsv });

    const chartPrompt = `${context}

Pick the 3 most insightful chart combinations for operations and maintenance sensor or asset analysis.
Return only valid JSON in this exact shape:
[
  { "type": "line"|"bar"|"scatter", "x": "col_name", "y": "col_name", "title": "..." }
]
Rules: y must be numeric; x must exist; prefer datetime x for trends, categorical x for comparisons, and numeric/numeric for scatter.`;

    if (!getGroqApiKey()) {
      console.warn('Groq chart selection skipped: GROQ_API_KEY is not configured.');
      return res.json({ charts: fallbackCharts(columns, stats), report: '' });
    }

    const [chartResult] = await Promise.allSettled([
      askGroq('You return compact, valid JSON only. No markdown.', chartPrompt)
    ]);

    const chartText = chartResult.status === 'fulfilled' ? chartResult.value : '';
    console.log('Raw Groq chart response:', chartText || chartResult.reason?.message || chartResult.reason);

    let charts = [];
    try {
      charts = sanitizeCharts(extractJsonArray(chartText), columns, stats);
    } catch (parseError) {
      console.log('Groq chart JSON parse failed:', parseError.message);
      charts = [];
    }
    if (!charts.length) {
      charts = fallbackCharts(columns, stats);
    }

    res.json({ charts, report: '' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      error: error.message || 'Analysis failed.',
      charts: fallbackCharts(req.body?.columns || [], req.body?.stats || []),
      report: ''
    });
  }
});

app.post('/api/insight', async (req, res) => {
  try {
    const { columns = [], stats = [], compactCsv = '' } = req.body || {};
    if (!Array.isArray(columns) || !Array.isArray(stats) || !compactCsv) {
      return res.status(400).json({ error: 'columns, stats, and compactCsv are required.' });
    }

    const context = buildContext({ columns, stats, compactCsv });
    const reportPrompt = `${context}

You are a data analyst. Given this dataset summary, return a 200-300 word plain English insight report covering:
- What the dataset seems to represent
- Most notable patterns or outliers
- Any columns that look anomalous
- 2-3 questions worth investigating further`;

    const report = await askGroq(
      'You write concise operational analytics reports for maintenance teams.',
      reportPrompt
    );
    console.log('Raw Groq insight-only response:', report);

    res.json({ report: report.trim() });
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Insight generation failed.', report: '' });
  }
});

app.listen(port, () => {
  console.log(`CSV analyst server listening on http://localhost:${port}`);
  console.log(`Groq API key configured: ${Boolean(getGroqApiKey())}`);
});

console.log('Loaded GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'YES ✓' : 'MISSING ✗');