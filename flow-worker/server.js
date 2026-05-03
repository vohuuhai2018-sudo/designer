// Flow Worker Service
// =============================================================================
// Express wrapper around LandscapeApp's flowAutomation. This service holds the
// browser (Chrome + Xvfb), so the LandscapeApp main app can be pure HTTP and
// deploy to Vercel/Lambda.
//
// Deployment: 1 instance on a small Linux VPS with Xvfb. Main app POSTs gen
// requests here, gets back URLs/local-paths.
//
// Endpoints:
//   GET  /health         — liveness check
//   POST /gen-image      — { prompt, assets, flowConfig }       → { outputs[], chatUrl }
//   POST /gen-video      — { prompt, imageUrl, flowConfig }    → { videoBase64, chatUrl }
//
// Auth: WORKER_SECRET env var; main app must send `X-Worker-Auth: <secret>`.
// =============================================================================

const path = require('path');
const fs = require('fs/promises');
const express = require('express');
const cors = require('cors');
const pLimit = require('p-limit');

// Pull in the existing flowAutomation from LandscapeApp/server.
// In production deploy, we'll either symlink or copy the file in.
const FLOW_PATH = process.env.FLOW_AUTOMATION_PATH ||
  path.resolve(__dirname, '..', 'LandscapeApp', 'server', 'flowAutomation.js');
const { runFlowAutomation, runFlowVideoAutomation, prewarmBrowser } = require(FLOW_PATH);

const PORT = parseInt(process.env.PORT || '3001', 10);
const WORKER_SECRET = process.env.WORKER_SECRET || '';
const FLOW_CONCURRENCY = parseInt(process.env.FLOW_CONCURRENCY || '4', 10);

const limit = pLimit(FLOW_CONCURRENCY);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (!WORKER_SECRET) return next(); // dev mode: no secret required
  const got = req.headers['x-worker-auth'];
  if (got !== WORKER_SECRET) {
    return res.status(401).json({ error: 'invalid X-Worker-Auth' });
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'flow-worker',
    flowAutomation: FLOW_PATH,
    concurrency: FLOW_CONCURRENCY,
    uptime: process.uptime(),
  });
});

// POST /gen-image  body: { prompt, assets, flowConfig }
// Returns: { outputs: [{base64, mimeType, width, height}], chatUrl }
app.post('/gen-image', async (req, res) => {
  const t0 = Date.now();
  try {
    const { prompt, assets, flowConfig } = req.body || {};
    if (!prompt && (!assets || !assets.length)) {
      return res.status(400).json({ error: 'prompt or assets required' });
    }
    const outputs = [];
    const result = await limit(() => runFlowAutomation({
      prompt,
      assets: assets || [],
      flowConfig: flowConfig || {},
      onImageReady: async (localPath) => {
        try {
          const buf = await fs.readFile(localPath);
          outputs.push({
            base64: buf.toString('base64'),
            mimeType: 'image/png',
            sizeBytes: buf.length,
          });
        } catch (e) {
          console.error('[gen-image] read err:', e.message);
        }
      },
    }));
    res.json({
      ok: true,
      elapsedMs: Date.now() - t0,
      outputCount: outputs.length,
      outputs,
      chatUrl: result?.chatUrl,
    });
  } catch (e) {
    console.error('[gen-image] error:', e);
    res.status(500).json({
      error: e.message || String(e),
      body: e.body,
      elapsedMs: Date.now() - t0,
    });
  }
});

// POST /gen-video  body: { prompt, imageUrl, flowConfig }
// Returns: { videoBase64, mimeType, sizeBytes, chatUrl }
app.post('/gen-video', async (req, res) => {
  const t0 = Date.now();
  try {
    const { prompt, imageUrl, flowConfig } = req.body || {};
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });
    let videoLocalPath = null;
    const result = await limit(() => runFlowVideoAutomation({
      prompt,
      imageUrl,
      flowConfig: flowConfig || {},
      onVideoReady: async (localPath) => { videoLocalPath = localPath; },
    }));
    if (!videoLocalPath) {
      return res.status(500).json({ error: 'no video produced', body: result });
    }
    const buf = await fs.readFile(videoLocalPath);
    res.json({
      ok: true,
      elapsedMs: Date.now() - t0,
      videoBase64: buf.toString('base64'),
      mimeType: 'video/mp4',
      sizeBytes: buf.length,
      chatUrl: result?.chatUrl,
    });
  } catch (e) {
    console.error('[gen-video] error:', e);
    res.status(500).json({
      error: e.message || String(e),
      body: e.body,
      elapsedMs: Date.now() - t0,
    });
  }
});

app.listen(PORT, () => {
  console.log(`[flow-worker] listening on :${PORT} (concurrency=${FLOW_CONCURRENCY})`);
  console.log(`[flow-worker] flowAutomation path: ${FLOW_PATH}`);
  console.log(`[flow-worker] auth: ${WORKER_SECRET ? 'enabled' : 'DISABLED (dev mode)'}`);
  // Pre-warm Chrome (mất ~10-15s) trên Render Free để request đầu tiên không
  // tốn cold boot — fit trong Vercel 60s timeout.
  if (typeof prewarmBrowser === 'function') {
    prewarmBrowser();
  }
});
