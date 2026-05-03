// Vercel serverless route: POST /api/generate { prompt, count?, aspect? }
//
// Deploy: drop this file into a Next.js app (or any Vercel project) at
// app/api/generate/route.ts (rename + tweak imports) or pages/api/generate.js.
//
// Required env on Vercel:
//   FLOW_STATE_B64   — base64 of the session JSON (run `flow-gen login` locally
//                      then `flow-gen export-state` and paste here).
//
// Function settings (vercel.json or per-route export):
//   runtime: nodejs (Fluid Compute), maxDuration: 120s+, memory: 1024MB+.

import { generateImages } from '../lib/flow.mjs';
import { loadStorageState } from '../lib/storage.mjs';

function detectChunkedSize() {
  let total = 0, n = 0;
  for (let i = 1; ; i++) {
    const v = process.env[`FLOW_STATE_B64_${i}`];
    if (!v) break;
    total += v.length; n++;
  }
  return { total, n };
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const b64 = process.env.FLOW_STATE_B64 || '';
    const chunked = detectChunkedSize();
    const debug = { singleLength: b64.length, chunked };
    let state = null;
    try {
      state = await loadStorageState();
      if (state) {
        debug.parsed = true;
        debug.cookieCount = Array.isArray(state.cookies) ? state.cookies.length : null;
        debug.origins = Array.isArray(state.origins) ? state.origins.length : null;
      } else {
        debug.parsed = false;
        debug.parseError = 'no state';
      }
    } catch (e) {
      debug.parsed = false;
      debug.parseError = String(e.message).slice(0, 120);
    }
    let outboundIp = null;
    try {
      const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
      outboundIp = (await r.json()).ip;
    } catch {}
    res.status(200).json({
      ok: true,
      service: 'flow-gen',
      hasState: Boolean(state),
      stateDebug: debug,
      proxy: {
        configured: Boolean(process.env.FLOW_PROXY_URL),
        outboundIp,
      },
      usage: {
        method: 'POST',
        path: '/api/generate',
        body: { prompt: 'string (required)', count: 'number (1-4)', aspect: 'LANDSCAPE|PORTRAIT|SQUARE', projectId: 'optional' },
        example: { prompt: 'a serene Vietnamese countryside at golden hour', count: 2 },
      },
    });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { prompt, count = 1, aspect = 'LANDSCAPE', projectId } = body || {};
    if (!prompt) { res.status(400).json({ error: 'prompt required' }); return; }
    if (!process.env.FLOW_STATE_B64) {
      res.status(500).json({ error: 'FLOW_STATE_B64 env var not set on this deployment. Run `flow-gen login && flow-gen export-state` locally and add to Vercel env vars.' });
      return;
    }
    const result = await generateImages({
      prompt, count, aspectRatio: aspect, projectId,
      storageStateB64: process.env.FLOW_STATE_B64,
    });
    res.status(200).json({
      elapsedMs: result.elapsedMs,
      received: result.received,
      images: result.images.map(i => ({ url: i.fifeUrl, w: i.width, h: i.height, seed: i.seed })),
      errors: result.errors,
    });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err), status: err.status });
  }
}
