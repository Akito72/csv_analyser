import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import Groq from 'groq-sdk';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const port = Number(process.env.PORT || 8787);

function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim();
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const chartTypes = new Set(['line', 'bar', 'scatter']);

function extractJsonArray(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (trimmed.startsWith('[')) return JSON.parse(trimmed);
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in model response.');
  return JSON.parse(match[0].replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim());
}

function fallbackCharts(columns, stats) {
  const numeric = stats.map((s) => s.column);
  const first = numeric[0], second = numeric[1] || first;
  if (!first) return [];
  return [
    { type: 'bar', x: first, y: second, title: `${second} by ${first}` },
    { type: 'line', x: first, y: second, title: `${second} trend by ${first}` },
  ];
}

function sanitizeCharts(rawCharts, columns, stats) {
  const columnNames = new Set(columns.map((c) => c.name));
  const numericNames = new Set(stats.map((s) => s.column));
  const typeByName = new Map(columns.map((c) => [c.name, c.type]));
  return rawCharts
    .filter((chart) => {
      if (!chart || !chartTypes.has(chart.type) || !columnNames.has(chart.x) || !numericNames.has(chart.y)) return false;
      return chart.type !== 'scatter' || typeByName.get(chart.x) === 'numeric';
    })
    .slice(0, 3)
    .map((chart) => ({
      type: chart.type, x: chart.x, y: chart.y,
      title: String(chart.title || `${chart.y} by ${chart.x}`).slice(0, 90),
    }));
}

function buildContext({ columns, stats, compactCsv }) {
  // Include anomaly summaries for richer LLM context
  const anomalySummary = stats
    .filter((s) => s.anomalies && s.anomalies.length > 0)
    .map((s) => `  - ${s.column}: ${s.anomalies.length} anomalies (z > 3), e.g. value=${s.anomalies[0]?.value} at row ${s.anomalies[0]?.rowIndex + 1}`)
    .join('\n');

  return [
    `Column names and detected types:\n${JSON.stringify(columns, null, 2)}`,
    `Summary stats for numeric columns:\n${JSON.stringify(stats.map(({ anomalies, ...rest }) => rest), null, 2)}`,
    anomalySummary ? `Statistical anomalies detected (>3σ):\n${anomalySummary}` : '',
    `First 50 rows as compact CSV:\n${compactCsv}`,
  ].filter(Boolean).join('\n\n');
}

async function askGroq(system, user) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    const err = new Error('GROQ_API_KEY is not configured.');
    err.status = 503;
    throw err;
  }
  const client = new Groq({ apiKey });
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.25,
    max_tokens: 650,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });
  return completion.choices?.[0]?.message?.content || '';
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { columns = [], stats = [], compactCsv = '' } = req.body || {};
    if (!Array.isArray(columns) || !Array.isArray(stats) || !compactCsv) {
      return res.status(400).json({ error: 'columns, stats, and compactCsv are required.' });
    }

    if (!getGroqApiKey()) {
      console.warn('Groq chart selection skipped: GROQ_API_KEY is not configured.');
      return res.json({ charts: fallbackCharts(columns, stats) });
    }

    const context = buildContext({ columns, stats, compactCsv });
    const prompt = `${context}

Pick the 3 most insightful chart combinations for operations and maintenance sensor/asset analysis.
Prioritize: time-series trends if a datetime column exists, anomalous columns, and key numeric correlations.
Return only valid JSON in this exact shape:
[
  { "type": "line"|"bar"|"scatter", "x": "col_name", "y": "col_name", "title": "..." }
]
Rules: y must be numeric; x must exist; prefer datetime x for line charts, categorical x for bar, numeric x for scatter.`;

    const [result] = await Promise.allSettled([
      askGroq('You return compact, valid JSON only. No markdown. No explanation.', prompt)
    ]);

    const chartText = result.status === 'fulfilled' ? result.value : '';
    console.log('Raw Groq chart response:', chartText || result.reason?.message);

    let charts = [];
    try {
      charts = sanitizeCharts(extractJsonArray(chartText), columns, stats);
    } catch (e) {
      console.log('Chart parse failed:', e.message);
    }
    if (!charts.length) charts = fallbackCharts(columns, stats);

    res.json({ charts });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || 'Analysis failed.',
      charts: fallbackCharts(req.body?.columns || [], req.body?.stats || []),
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
    const prompt = `${context}

You are a senior data analyst for an operations and maintenance team.
Write a 200-300 word plain English insight report covering:
1. What this dataset represents (asset type, sensor context, time period if visible)
2. Most notable patterns or trends
3. Anomalous readings or columns with high null rates — call out specific values if visible
4. 2-3 actionable questions worth investigating further for a maintenance engineer

Be specific and data-driven. Reference actual column names and values where relevant.`;

    const report = await askGroq(
      'You write concise, data-driven operational analytics reports for maintenance engineers. Be specific, not generic.',
      prompt
    );
    console.log('Raw Groq insight response:', report);
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