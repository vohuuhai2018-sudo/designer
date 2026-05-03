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
const cloudinary = require('cloudinary').v2;

// Cloudinary creds (worker tự upload kết quả → giảm payload về Vercel webhook
// xuống chỉ còn URL, tránh giới hạn body size 4.5MB của Hobby).
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

async function uploadFileToCloudinary(filePath) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, { resource_type: 'auto' }, (err, res) => {
      if (err) return reject(err);
      resolve(res.secure_url);
    });
  });
}

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
    env: {
      FLOW_MAX_VARIANTS: process.env.FLOW_MAX_VARIANTS || '(unset)',
      NODE_OPTIONS: process.env.NODE_OPTIONS || '(unset)',
      CHROMIUM_FLAGS: process.env.CHROMIUM_FLAGS || '(unset)',
      WEBHOOK_SECRET_set: !!process.env.WEBHOOK_SECRET,
      CLOUDINARY_set: !!process.env.CLOUDINARY_API_KEY,
    },
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

// =============================================================================
// ASYNC GEN — webhook pattern (cho Vercel Hobby 60s timeout không đủ chờ gen
// thật mất 60-130s). Worker nhận request → ack 202 ngay → gen async → upload
// Cloudinary → POST URLs về callbackUrl với header X-Webhook-Auth.
//
// Body: { prompt, assets, flowConfig, projectId, callbackUrl, callbackAuth }
// Returns 202: { jobId, status: 'processing' }
// Webhook payload: { jobId, projectId, status: 'done'|'failed', urls?: [], error?: '...' }
// =============================================================================
app.post('/gen-image-async', async (req, res) => {
  const { prompt, assets, flowConfig, projectId, callbackUrl, callbackAuth } = req.body || {};
  if (!callbackUrl) return res.status(400).json({ error: 'callbackUrl required' });
  if (!projectId) return res.status(400).json({ error: 'projectId required' });
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  res.status(202).json({ jobId, projectId, status: 'processing' });

  // Run gen in background — Express has already responded.
  (async () => {
    const t0 = Date.now();
    const urls = [];
    try {
      console.log(`[async ${jobId}] start gen for project ${projectId}`);
      await limit(() => runFlowAutomation({
        prompt,
        assets: assets || [],
        flowConfig: flowConfig || {},
        onImageReady: async (localPath) => {
          try {
            const url = await uploadFileToCloudinary(localPath);
            urls.push(url);
            await fs.unlink(localPath).catch(() => null);
            console.log(`[async ${jobId}] uploaded ${urls.length}: ${url}`);
          } catch (e) {
            console.error(`[async ${jobId}] upload err:`, e.message);
          }
        },
      }));
      console.log(`[async ${jobId}] gen done in ${Date.now() - t0}ms, ${urls.length} urls`);
      await postWebhook(callbackUrl, callbackAuth, { jobId, projectId, status: urls.length ? 'done' : 'failed', urls, error: urls.length ? null : 'no images uploaded' });
    } catch (e) {
      console.error(`[async ${jobId}] error:`, e.message);
      await postWebhook(callbackUrl, callbackAuth, { jobId, projectId, status: 'failed', urls, error: e.message });
    }
  })();
});

async function postWebhook(url, auth, body) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Auth': auth || '' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      if (r.ok) return;
      console.warn(`[webhook] ${url} returned ${r.status}, retry ${i + 1}/3`);
    } catch (e) {
      console.warn(`[webhook] err ${e.message}, retry ${i + 1}/3`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  console.error(`[webhook] failed after 3 retries: ${url}`);
}

// Bắt EADDRINUSE — không có handler thì process im lặng tiếp tục mà không
// listen, request đi vào instance cũ → log "biến mất" (không vào terminal mới).
const server = app.listen(PORT, () => {
  console.log(`[flow-worker] listening on :${PORT} (concurrency=${FLOW_CONCURRENCY})`);
  console.log(`[flow-worker] flowAutomation path: ${FLOW_PATH}`);
  console.log(`[flow-worker] auth: ${WORKER_SECRET ? 'enabled' : 'DISABLED (dev mode)'}`);
  // Pre-warm Chrome (mất ~10-15s) trên Render Free để request đầu tiên không
  // tốn cold boot — fit trong Vercel 60s timeout.
  if (typeof prewarmBrowser === 'function') {
    prewarmBrowser();
  }
});
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n*** [flow-worker] PORT ${PORT} BI CHIEM — co instance khac dang chay. ***`);
    console.error(`*** Kill instance cu (taskkill /F /IM node.exe) hoac doi PORT roi chay lai. ***\n`);
  } else {
    console.error('[flow-worker] listen error:', err);
  }
  process.exit(1);
});
