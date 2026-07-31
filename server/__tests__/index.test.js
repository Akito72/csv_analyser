import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Mock the groq-sdk module before importing the app so every `new Groq()`
// call returns a controllable fake client instead of hitting the network.
const mockCreate = vi.fn();
vi.mock('groq-sdk', () => ({
  default: class Groq {
    chat = { completions: { create: mockCreate } };
  },
}));

const basePayload = {
  columns: [
    { name: 'date', type: 'datetime' },
    { name: 'temperature', type: 'numeric' },
  ],
  stats: [
    { column: 'temperature', mean: 20, std: 2, min: 15, max: 25, median: 20, nullCount: 0, anomalies: [] },
  ],
  compactCsv: 'date,temperature\n2024-01-01,20\n2024-01-02,21\n',
};

describe('POST /api/analyze', () => {
  let app;

  beforeEach(async () => {
    vi.resetModules();
    mockCreate.mockReset();
    process.env.GROQ_API_KEY = 'test-key';
    ({ default: app } = await import('../index.js'));
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/analyze').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('falls back to local heuristic charts when no API key is configured', async () => {
    delete process.env.GROQ_API_KEY;
    vi.resetModules();
    const { default: freshApp } = await import('../index.js');
    const res = await request(freshApp).post('/api/analyze').send(basePayload);
    expect(res.status).toBe(200);
    expect(res.body.charts.length).toBeGreaterThan(0);
  });

  it('parses charts from a tool-call response and validates them against real columns', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: 'select_charts',
              arguments: JSON.stringify({
                charts: [
                  { type: 'line', x: 'date', y: 'temperature', title: 'Temp over time' },
                  // invalid: references a column that doesn't exist — should be filtered out
                  { type: 'bar', x: 'nonexistent', y: 'temperature', title: 'Bad chart' },
                ],
              }),
            },
          }],
        },
      }],
    });

    const res = await request(app).post('/api/analyze').send(basePayload);
    expect(res.status).toBe(200);
    expect(res.body.charts).toEqual([
      { type: 'line', x: 'date', y: 'temperature', title: 'Temp over time' },
    ]);
  });

  it('falls back to heuristic charts if the model does not return a tool call', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [{ message: {} }] });
    const res = await request(app).post('/api/analyze').send(basePayload);
    expect(res.status).toBe(200);
    expect(res.body.charts.length).toBeGreaterThan(0);
  });

  it('serves a cached result on a second identical request without calling Groq again', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          tool_calls: [{
            function: {
              name: 'select_charts',
              arguments: JSON.stringify({
                charts: [{ type: 'line', x: 'date', y: 'temperature', title: 'Temp over time' }],
              }),
            },
          }],
        },
      }],
    });

    const first = await request(app).post('/api/analyze').send(basePayload);
    expect(first.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(1);

    const second = await request(app).post('/api/analyze').send(basePayload);
    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1); // not called again
  });
});

describe('POST /api/insight', () => {
  let app;

  beforeEach(async () => {
    vi.resetModules();
    mockCreate.mockReset();
    process.env.GROQ_API_KEY = 'test-key';
    ({ default: app } = await import('../index.js'));
  });

  afterEach(() => {
    delete process.env.GROQ_API_KEY;
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/insight').send({});
    expect(res.status).toBe(400);
  });

  it('returns the report text from the model', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'This dataset shows a mild upward trend.' } }],
    });
    const res = await request(app).post('/api/insight').send(basePayload);
    expect(res.status).toBe(200);
    expect(res.body.report).toBe('This dataset shows a mild upward trend.');
  });
});

describe('rate limiting', () => {
  let app;

  beforeEach(async () => {
    vi.resetModules();
    mockCreate.mockReset();
    delete process.env.GROQ_API_KEY; // use the no-API-key fast path, no need to mock Groq responses
    ({ default: app } = await import('../index.js'));
  });

  it('returns 429 after exceeding the per-window request budget', async () => {
    let lastStatus;
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/api/analyze').send(basePayload);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
