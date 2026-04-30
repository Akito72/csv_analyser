# CSV Data Analyst

A full-stack web app for operations and maintenance teams to drop in a CSV and instantly get parsed data, summary statistics, auto-generated charts, and a plain-English insight report — all powered by Groq's LLM.

---

## What It Does

Upload any CSV and the app automatically:

- **Parses and previews** the first 10 rows in a styled table with column type badges
- **Computes summary stats** for every numeric column: min, max, mean, median, std dev, null count
- **Detects column types**: numeric, categorical, datetime, ID
- **Renders 3 charts** automatically — the most interesting column combos are chosen by the LLM
- **Generates a natural language insight report**: key findings, anomalies, correlations, and recommended next steps

All CSV parsing and stats run in the browser. Only the LLM calls go to the server.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Charts | Recharts |
| CSV parsing | PapaParse (browser-side) |
| Backend | Node.js + Express |
| LLM | Groq API — `llama-3.3-70b-versatile` |
| Styling | CSS-in-JS, dark industrial theme |

---

## File Structure

```
/
├── server/
│   └── index.js           # Express server — /api/analyze and /api/insight
├── src/
│   ├── components/
│   │   ├── UploadZone.jsx     # Drag-and-drop CSV upload
│   │   ├── DataPreview.jsx    # First 10 rows table with type badges
│   │   ├── StatsGrid.jsx      # Numeric stats cards
│   │   ├── ChartPanel.jsx     # 3 auto-generated Recharts charts
│   │   └── InsightReport.jsx  # LLM prose report, terminal style
│   ├── utils/
│   │   ├── csvParser.js       # PapaParse wrapper
│   │   ├── statsEngine.js     # min/max/mean/median/std/nulls
│   │   └── typeDetector.js    # Column type sniffing
│   ├── App.jsx
│   └── main.jsx
├── .env                   # Your secrets (never commit this)
├── .env.example           # Template
├── index.html
├── vite.config.js
└── package.json
```

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/csv-data-analyst.git
cd csv-data-analyst
npm install
```

### 2. Set up your environment

```bash
cp .env.example .env
```

Open `.env` and add your Groq API key:

```env
GROQ_API_KEY=gsk_your_key_here
```

Get a free key at [console.groq.com](https://console.groq.com).

### 3. Run the app

```bash
npm run dev
```

This starts both the Vite dev server and the Express backend concurrently:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API server: [http://localhost:8787](http://localhost:8787)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | Your Groq API key |
| `PORT` | No | Express server port (default: `8787`) |

> **Note:** The `.env` file must be in the project root (same level as `package.json`), not inside `server/`.

---

## API Endpoints

### `POST /api/analyze`

Asks the LLM to pick the 3 most insightful chart combinations for the dataset.

**Request body:**
```json
{
  "columns": [{ "name": "temperature", "type": "numeric" }],
  "stats": [{ "column": "temperature", "mean": 72.4, "std": 5.1 }],
  "compactCsv": "timestamp,temperature\n2024-01-01,71.2\n..."
}
```

**Response:**
```json
{
  "charts": [
    { "type": "line", "x": "timestamp", "y": "temperature", "title": "Temperature over time" }
  ]
}
```

### `POST /api/insight`

Generates a 200–300 word plain English insight report.

**Request body:** Same shape as `/api/analyze`.

**Response:**
```json
{
  "report": "This dataset appears to represent sensor readings from..."
}
```

---

## UI Walkthrough

### Step 1 — Upload
Full-width drag-and-drop zone. Accepts `.csv` files only. Shows file name, row count, and column count after parsing.

### Step 2 — Data Preview
Scrollable table of the first 10 rows. Column headers show a type badge: `NUM`, `CAT`, `DATE`, or `ID`.

### Step 3 — Stats Panel
One card per numeric column showing mean ± std dev, min→max range, and null count. Cards turn red if null count exceeds 10% of total rows.

### Step 4 — Charts
Three charts rendered with Recharts — line, bar, or scatter — chosen by the LLM based on the most analytically interesting column pairings. Charts animate on mount and show a loading skeleton while the LLM responds.

### Step 5 — Insight Report
A 200–300 word report rendered in monospace amber text on a dark background, like a terminal readout. Covers what the dataset represents, notable patterns, anomalous columns, and questions worth investigating.

---

## Edge Cases Handled

- Empty CSV with no data rows
- CSV with no numeric columns (all strings or categoricals)
- Single-column files
- LLM unavailable or API key missing — falls back to locally computed chart suggestions
- Groq JSON parse failures — sanitizer catches malformed responses and falls back gracefully

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both frontend and backend in parallel |
| `npm run client` | Vite dev server only |
| `npm run server` | Express API server only |
| `npm run build` | Production build |

---

## LLM Context

The following is sent to Groq on each analysis:

- Column names and detected types
- Summary statistics for all numeric columns
- First 50 rows as a compact CSV string

The chart endpoint returns JSON. The insight endpoint returns plain text prose.

---

## Common Issues

**"Groq chart selection skipped: GROQ_API_KEY is not configured"**  
Your `.env` file is missing or the key isn't being picked up. Make sure:
- The file is named exactly `.env` (not `.env.local` or `.env.txt`)
- It lives in the project root, not in `server/`
- The value has no spaces around `=` and no quotes: `GROQ_API_KEY=gsk_abc123`

**Charts show fallback instead of LLM-generated ones**  
This happens when the API key is missing or the Groq response couldn't be parsed. Check the terminal for `Raw Groq chart response:` to see what was returned.

**CORS errors in the browser**  
Make sure the Express server is running on port 8787 and that Vite's proxy in `vite.config.js` is forwarding `/api` requests correctly.

---

## License

MIT