const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  // Env override (Docker/Render set CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome)
  process.env.CHROME_EXECUTABLE_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  // Linux (Render Debian + Google Chrome .deb)
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  // Windows
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
].filter(Boolean);

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Tự động bấm "Tôi đồng ý" nếu gặp dialog thông báo của Google Flow
async function dismissConsentDialog(page) {
  try {
    const agreeBtn = page.locator('button').filter({ hasText: /Tôi đồng ý|I agree|Đồng ý|Accept/ }).first();
    if (await agreeBtn.count() > 0 && await agreeBtn.isVisible()) {
      await agreeBtn.click();
      await delay(1000);
      console.log('[Flow] Đã bấm "Tôi đồng ý" trên dialog thông báo.');
      return true;
    }
  } catch (_) {}
  return false;
}

function resolveBrowserExecutable() {
  const executablePath = CHROME_CANDIDATES.find(candidate => require('fs').existsSync(candidate));
  if (!executablePath) {
    throw new Error('Không tìm thấy Chrome hoặc Edge để chạy tự động Flow.');
  }
  return executablePath;
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}


// ===== SHARED BROWSER: 1 browser duy nhất, mỗi project mở 1 tab mới =====
// Cho phép xử lý nhiều project song song mà không conflict persistent context.
let _sharedBrowser = null;
let _sharedBrowserPromise = null;
let _activeTabCount = 0;
// Đóng browser khi idle. 5 phút giữ Chrome warm giữa các admin clicks (single-
// user worker), tránh cold boot ~10-15s mỗi request. Trên Render Free 512MB,
// Chrome idle dùng ~150-200MB — chấp nhận được.
const IDLE_CLOSE_MS = 5 * 60 * 1000;
let _idleTimer = null;

async function getSharedBrowser() {
  // Nếu đang có browser mở và chưa bị đóng, dùng lại
  if (_sharedBrowser && _sharedBrowser.pages) {
    try {
      _sharedBrowser.pages(); // test nếu browser còn sống
      return _sharedBrowser;
    } catch (_) {
      _sharedBrowser = null;
      _sharedBrowserPromise = null;
    }
  }

  // Nếu đang trong quá trình mở, chờ
  if (_sharedBrowserPromise) return _sharedBrowserPromise;

  _sharedBrowserPromise = (async () => {
    // headless: false by default — Google reCAPTCHA Enterprise flags pure headless
    // Chrome with PUBLIC_ERROR_UNUSUAL_ACTIVITY even on residential IP. Set
    // FLOW_HEADLESS=1 to opt in (works on Vercel/Lambda via @sparticuz/chromium
    // because that binary has additional masking args; not reliable with system
    // Chrome). On a Linux server, run under Xvfb to hide the window:
    //   Xvfb :99 -screen 0 1440x900x24 &
    //   DISPLAY=:99 node server/index.js
    const headless = process.env.FLOW_HEADLESS === '1';
    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ];

    // FLOW_STATE_B64 mode: portable cookies via Playwright storageState (works
    // across OSes — Mac → Linux Render). When set, use launch() + newContext()
    // instead of launchPersistentContext (which encrypts cookies with OS keystore
    // and won't transfer Mac → Linux).
    // Chunked support: if state too large for one env var, use FLOW_STATE_B64_1, _2, ...
    let stateB64 = process.env.FLOW_STATE_B64;
    if (!stateB64) {
      const parts = [];
      for (let i = 1; ; i++) {
        const v = process.env[`FLOW_STATE_B64_${i}`];
        if (!v) break;
        parts.push(v.trim());
      }
      if (parts.length) stateB64 = parts.join('');
    }
    if (stateB64) {
      console.log('[BROWSER] Khởi tạo browser từ FLOW_STATE_B64 storageState...');
      const browser = await chromium.launch({ executablePath: resolveBrowserExecutable(), headless, args: launchArgs });
      const buf = Buffer.from(stateB64, 'base64');
      // Auto-detect gzip
      const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
      const json = isGzip ? require('zlib').gunzipSync(buf).toString('utf8') : buf.toString('utf8');
      const storageState = JSON.parse(json);
      const ctx = await browser.newContext({
        storageState,
        viewport: { width: 1280, height: 800 },
        acceptDownloads: true,
        permissions: ['clipboard-read', 'clipboard-write'],
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      });
      await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      });
      // Wrap context to expose context-like API (close, newPage). Underlying browser closed when context closed.
      ctx._underlyingBrowser = browser;
      const origClose = ctx.close.bind(ctx);
      ctx.close = async () => { await origClose(); await browser.close().catch(() => null); };
      _sharedBrowser = ctx;
      console.log('[BROWSER] Shared browser (storageState mode) đã sẵn sàng.');
      return _sharedBrowser;
    }

    console.log(`[BROWSER] Khởi tạo shared browser (persistent context, headless=${headless})...`);
    _sharedBrowser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
      executablePath: resolveBrowserExecutable(),
      headless,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
      permissions: ['clipboard-read', 'clipboard-write'],
      args: launchArgs,
    });
    // Stealth — mask common headless tells before any page script runs.
    await _sharedBrowser.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    console.log('[BROWSER] Shared browser đã sẵn sàng.');
    return _sharedBrowser;
  })();

  return _sharedBrowserPromise;
}

function scheduleIdleClose() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    if (_activeTabCount <= 0 && _sharedBrowser) {
      console.log('[BROWSER] Không còn tab nào hoạt động, đóng browser để tiết kiệm tài nguyên.');
      await _sharedBrowser.close().catch(() => null);
      _sharedBrowser = null;
      _sharedBrowserPromise = null;
      _apiPage = null;
      _apiPagePromise = null;
      _apiPageReadyAt = 0;
      _activeTabCount = 0;
    }
  }, IDLE_CLOSE_MS);
}

// =============================================================================
// API-DIRECT IMAGE GENERATION
// =============================================================================
// Replaces the UI clicks (paste → prompt → send → wait → scrape DOM) with a
// direct call to Flow's batchGenerateImages API. The browser is still required
// because: (1) auth cookie sits at /fx/api/auth/session for access_token; and
// (2) reCAPTCHA Enterprise tokens must be issued by grecaptcha.enterprise.execute
// running on labs.google. We just open ONE page, inject a tiny client, and call
// it via page.evaluate from Node.
//
// Endpoints (reverse-engineered from Flow's webpack bundle):
//   POST aisandbox-pa.googleapis.com/v1/flow/uploadImage         (asset upload)
//   POST aisandbox-pa.googleapis.com/v1/projects/{id}/flowMedia:batchGenerateImages
//
// imageInputs format (from chunks/9566...js):
//   [{ imageInputType: 'IMAGE_INPUT_TYPE_BASE_IMAGE',  name: <mediaId> },
//    { imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE',   name: <mediaId> }, ...]
// First asset = BASE_IMAGE (singular in the bundle), rest = REFERENCE.
// =============================================================================

const FLOW_URL = 'https://labs.google/fx/vi/tools/flow';

const FLOW_CLIENT_SRC = `(() => {
  const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
  const RECAPTCHA_ACTION = 'IMAGE_GENERATION';
  const GEN_HOST = 'https://aisandbox-pa.googleapis.com';
  const ASPECT_MAP = {
    '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    '4:3': 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
    '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
    '3:4': 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
    '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
    LANDSCAPE: 'IMAGE_ASPECT_RATIO_LANDSCAPE',
    PORTRAIT: 'IMAGE_ASPECT_RATIO_PORTRAIT',
    SQUARE: 'IMAGE_ASPECT_RATIO_SQUARE',
  };
  async function getAccessToken() {
    const r = await fetch('/fx/api/auth/session', { credentials: 'include' });
    const j = await r.json().catch(() => null);
    if (!j || !j.access_token) throw new Error('Flow session chưa đăng nhập (no access_token).');
    return j.access_token;
  }
  async function getRecaptchaToken(action) {
    const ge = window.grecaptcha && window.grecaptcha.enterprise;
    if (!ge || typeof ge.execute !== 'function') throw new Error('grecaptcha.enterprise chưa load — chờ thêm vài giây.');
    return await ge.execute(RECAPTCHA_SITE_KEY, { action: action || RECAPTCHA_ACTION });
  }
  async function ensureProject({ projectId, projectTitle } = {}) {
    if (projectId) return projectId;
    const m = location.pathname.match(/project\\/([a-f0-9-]+)/);
    if (m && m[1]) return m[1];
    const title = projectTitle || ('landscape-' + new Date().toISOString().slice(0, 19));
    const res = await fetch('/fx/api/trpc/project.createProject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ json: { projectTitle: title, toolName: 'PINHOLE' } }),
    });
    const json = await res.json().catch(() => null);
    const id = json && json.result && json.result.data && json.result.data.json && json.result.data.json.result && json.result.data.json.result.projectId;
    if (!id) throw new Error('createProject failed: ' + JSON.stringify(json).slice(0, 300));
    return id;
  }
  async function uploadOne({ accessToken, projectId, base64 }) {
    const body = { clientContext: { projectId, tool: 'PINHOLE' }, imageBytes: base64 };
    const res = await fetch(GEN_HOST + '/v1/flow/uploadImage', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error('upload failed: ' + (json && json.error && json.error.message || res.status)), { status: res.status, body: json });
    const name = json && json.media && json.media.name;
    if (!name) throw new Error('upload response missing media.name: ' + JSON.stringify(json).slice(0, 200));
    return { mediaId: name, workflowId: json.media.workflowId };
  }
  async function generateOne({ accessToken, projectId, prompt, aspectRatio, seed, batchId, sessionId, baseImageId, refImageIds, workflowId }) {
    const recaptchaToken = await getRecaptchaToken();
    const recaptchaContext = { token: recaptchaToken, applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB' };
    const imageInputs = [];
    if (baseImageId) imageInputs.push({ imageInputType: 'IMAGE_INPUT_TYPE_BASE_IMAGE', name: baseImageId });
    for (const id of (refImageIds || [])) imageInputs.push({ imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE', name: id });
    const clientContext = { recaptchaContext, projectId, tool: 'PINHOLE', sessionId };
    if (workflowId) clientContext.workflowId = workflowId;
    const body = {
      clientContext,
      mediaGenerationContext: { batchId },
      useNewMedia: true,
      requests: [{
        clientContext,
        imageModelName: 'NARWHAL',
        imageAspectRatio: ASPECT_MAP[aspectRatio] || ASPECT_MAP.LANDSCAPE,
        structuredPrompt: { parts: [{ text: prompt }] },
        seed,
        imageInputs,
      }],
    };
    const res = await fetch(GEN_HOST + '/v1/projects/' + projectId + '/flowMedia:batchGenerateImages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error('gen failed: ' + (json && json.error && json.error.message || res.status)), { status: res.status, body: json });
    const m = (json && json.media && json.media[0]) || null;
    if (!m) throw Object.assign(new Error('gen returned no media'), { body: json });
    return {
      mediaId: m.name,
      workflowId: m.workflowId,
      fifeUrl: m.image && m.image.generatedImage && m.image.generatedImage.fifeUrl,
      width: m.image && m.image.dimensions && m.image.dimensions.width,
      height: m.image && m.image.dimensions && m.image.dimensions.height,
      seed: m.image && m.image.generatedImage && m.image.generatedImage.seed,
    };
  }
  async function generateImages({ prompt, count = 1, aspectRatio = '16:9', projectId, projectTitle, assets } = {}) {
    if (!prompt) throw new Error('prompt is required');
    const t0 = Date.now();
    const [accessToken, ensuredProjectId] = await Promise.all([
      getAccessToken(),
      ensureProject({ projectId, projectTitle }),
    ]);
    let baseImageId = null;
    let refImageIds = [];
    let workflowId = null;
    if (Array.isArray(assets) && assets.length) {
      const uploads = await Promise.allSettled(assets.map(a => uploadOne({ accessToken, projectId: ensuredProjectId, base64: a.base64 })));
      const ids = [];
      for (const u of uploads) {
        if (u.status === 'fulfilled' && u.value && u.value.mediaId) {
          ids.push(u.value.mediaId);
          if (!workflowId && u.value.workflowId) workflowId = u.value.workflowId;
        }
      }
      if (ids.length === 0) {
        const failed = uploads.find(u => u.status === 'rejected');
        const reason = (failed && failed.reason) || {};
        throw Object.assign(new Error('All asset uploads failed: ' + (reason.message || 'unknown')), { body: reason.body, status: reason.status });
      }
      baseImageId = ids[0];
      refImageIds = ids.slice(1);
    }
    const batchId = (crypto.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now().toString(36));
    const sessionId = ';' + Date.now();
    const tasks = Array.from({ length: count }, () => generateOne({
      accessToken, projectId: ensuredProjectId, prompt, aspectRatio,
      seed: Math.floor(Math.random() * 999999), batchId, sessionId,
      baseImageId, refImageIds, workflowId,
    }));
    const settled = await Promise.allSettled(tasks);
    const images = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
    const errors = settled.filter(s => s.status === 'rejected').map(s => ({
      message: s.reason && s.reason.message,
      status: s.reason && s.reason.status,
      body: s.reason && s.reason.body,
    }));
    return {
      projectId: ensuredProjectId,
      elapsedMs: Date.now() - t0,
      requested: count,
      received: images.length,
      images,
      errors,
      uploaded: { baseImageId, refImageIds },
    };
  }
  // ==========================================================================
  // VIDEO GEN — reference-to-video (R2V) via async API.
  // Endpoints (verified via captured request flow_video_capture.json on 2026-05-03):
  //   POST aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoReferenceImages
  //   POST aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus  (poll)
  //   GET  /fx/api/trpc/media.getMediaUrlRedirect?input={"json":{"name":"<id>","mediaUrlType":"MEDIA_URL_TYPE_FULL_MEDIA"}}
  // The "Component" / "Thành phần" UI mode posts to ReferenceImages, not StartAndEndImage.
  // referenceImages entry shape: { mediaId, imageUsageType: 'IMAGE_USAGE_TYPE_ASSET' }.
  // Body needs: useV2ModelConfig=true, mediaGenerationContext.audioFailurePreference,
  //   clientContext.userPaygateTier, textInput.structuredPrompt.parts[].text.
  const VIDEO_HOST = 'https://aisandbox-pa.googleapis.com';
  const VIDEO_ASPECT_MAP = {
    '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
    '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
    '1:1': 'VIDEO_ASPECT_RATIO_UNSPECIFIED',
    LANDSCAPE: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
    PORTRAIT: 'VIDEO_ASPECT_RATIO_PORTRAIT',
  };
  // Default model — captured from a real Flow UI session 2026-05-03.
  // Models follow pattern veo_3_1_r2v_fast_<aspect>_ultra; aspect token derived below.
  const DEFAULT_VIDEO_MODEL_BY_ASPECT = {
    '16:9': 'veo_3_1_r2v_fast_landscape_ultra',
    '9:16': 'veo_3_1_r2v_fast_portrait_ultra',
    '1:1': 'veo_3_1_r2v_fast_landscape_ultra',
  };
  async function startVideoGen({ accessToken, projectId, prompt, aspectRatio, seed, batchId, sessionId, referenceMediaIds, videoModelKey, recaptchaAction }) {
    const recaptchaToken = await getRecaptchaToken(recaptchaAction || 'VIDEO_GENERATION');
    const recaptchaContext = { token: recaptchaToken, applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB' };
    const clientContext = {
      projectId,
      tool: 'PINHOLE',
      userPaygateTier: 'PAYGATE_TIER_TWO',
      sessionId,
      recaptchaContext,
    };
    const refs = (referenceMediaIds || []).map(id => ({
      mediaId: id,
      imageUsageType: 'IMAGE_USAGE_TYPE_ASSET',
    }));
    const requestEntry = {
      aspectRatio: VIDEO_ASPECT_MAP[aspectRatio] || VIDEO_ASPECT_MAP.LANDSCAPE,
      seed,
      textInput: { structuredPrompt: { parts: [{ text: prompt || '' }] } },
      videoModelKey: videoModelKey || DEFAULT_VIDEO_MODEL_BY_ASPECT[aspectRatio] || DEFAULT_VIDEO_MODEL_BY_ASPECT['16:9'],
      metadata: {},
      referenceImages: refs,
    };
    const body = {
      mediaGenerationContext: { batchId, audioFailurePreference: 'BLOCK_SILENCED_VIDEOS' },
      clientContext,
      requests: [requestEntry],
      useV2ModelConfig: true,
    };
    const res = await fetch(VIDEO_HOST + '/v1/video:batchAsyncGenerateVideoReferenceImages', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error('startVideoGen failed: ' + (json && json.error && json.error.message || res.status)), { status: res.status, body: json });
    return json;
  }
  async function pollVideoStatus({ accessToken, mediaRefs }) {
    // mediaRefs: [{ name: '<mediaId>', projectId }]
    const body = { media: mediaRefs };
    const res = await fetch(VIDEO_HOST + '/v1/video:batchCheckAsyncVideoGenerationStatus', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw Object.assign(new Error('pollVideoStatus failed: ' + (json && json.error && json.error.message || res.status)), { status: res.status, body: json });
    return json;
  }
  async function startAndPollVideo({ prompt, aspectRatio = '16:9', referenceImageBase64s, projectId, projectTitle, videoModelKey, pollIntervalMs = 8000, timeoutMs = 10 * 60 * 1000 } = {}) {
    const refs = Array.isArray(referenceImageBase64s) ? referenceImageBase64s : (referenceImageBase64s ? [referenceImageBase64s] : []);
    if (!refs.length) throw new Error('referenceImageBase64s is required (at least one)');
    const t0 = Date.now();
    const [accessToken, ensuredProjectId] = await Promise.all([
      getAccessToken(),
      ensureProject({ projectId, projectTitle }),
    ]);
    const uploads = await Promise.all(refs.map(b64 => uploadOne({ accessToken, projectId: ensuredProjectId, base64: b64 })));
    const referenceMediaIds = uploads.map(u => u.mediaId);
    const batchId = (crypto.randomUUID && crypto.randomUUID()) || (Math.random().toString(36).slice(2) + Date.now().toString(36));
    const sessionId = ';' + Date.now();
    const seed = Math.floor(Math.random() * 999999);
    let startResp;
    try {
      startResp = await startVideoGen({
        accessToken, projectId: ensuredProjectId, prompt, aspectRatio, seed, batchId, sessionId,
        referenceMediaIds, videoModelKey,
      });
    } catch (e) {
      // Single retry on transient reCAPTCHA failure (token may have expired between fetch and use).
      if (/reCAPTCHA evaluation failed|UNUSUAL_ACTIVITY/i.test(e && e.message || '')) {
        await new Promise(r => setTimeout(r, 3000));
        startResp = await startVideoGen({
          accessToken, projectId: ensuredProjectId, prompt, aspectRatio, seed: Math.floor(Math.random() * 999999), batchId, sessionId: ';' + Date.now(),
          referenceMediaIds, videoModelKey,
        });
      } else { throw e; }
    }
    const mediaRefs = (Array.isArray(startResp && startResp.media) ? startResp.media : []).map(m => ({
      name: m.name, projectId: m.projectId || ensuredProjectId,
    }));
    if (!mediaRefs.length) throw Object.assign(new Error('startVideoGen returned no media to poll'), { body: startResp });
    const deadline = Date.now() + timeoutMs;
    let lastPoll = null;
    let doneMedia = null;
    while (Date.now() < deadline && !doneMedia) {
      await new Promise(r => setTimeout(r, pollIntervalMs));
      lastPoll = await pollVideoStatus({ accessToken, mediaRefs });
      const items = Array.isArray(lastPoll && lastPoll.media) ? lastPoll.media : [];
      const ok = items.find(m => m && m.mediaMetadata && m.mediaMetadata.mediaStatus && m.mediaMetadata.mediaStatus.mediaGenerationStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL');
      const failed = items.find(m => m && m.mediaMetadata && m.mediaMetadata.mediaStatus && /FAILED|ERROR/.test(m.mediaMetadata.mediaStatus.mediaGenerationStatus || ''));
      if (failed) throw Object.assign(new Error('Video gen FAILED: ' + (failed.mediaMetadata.mediaStatus.mediaGenerationStatus)), { body: failed });
      if (ok) { doneMedia = ok; break; }
    }
    if (!doneMedia) throw Object.assign(new Error('Video gen timed out — last poll: ' + JSON.stringify(lastPoll).slice(0, 600)), { body: lastPoll });
    return {
      projectId: ensuredProjectId,
      elapsedMs: Date.now() - t0,
      mediaId: doneMedia.name,
      uploaded: { referenceMediaIds },
    };
  }
  window.FlowClient = { generateImages, startAndPollVideo, getAccessToken, getRecaptchaToken, ensureProject, uploadOne, startVideoGen, pollVideoStatus };
})();`;

// Logged-in API page (singleton; reused across parallel calls).
// Recycled if older than API_PAGE_MAX_AGE_MS — recaptcha session state goes stale
// over long idle periods on a persistent server (not just on idle close), causing
// 403 PUBLIC_ERROR_UNUSUAL_ACTIVITY or recaptcha-token-expired on later calls.
const API_PAGE_MAX_AGE_MS = 4 * 60 * 1000;
let _apiPage = null;
let _apiPageReadyAt = 0;
let _apiPagePromise = null;

async function getApiPage() {
  if (_apiPage) {
    const stale = Date.now() - _apiPageReadyAt > API_PAGE_MAX_AGE_MS;
    try {
      if (!_apiPage.isClosed() && !stale) {
        const ready = await _apiPage.evaluate(() => typeof window.FlowClient !== 'undefined').catch(() => false);
        if (ready) return _apiPage;
      } else if (stale && !_apiPage.isClosed()) {
        console.log('[FLOW-API] Page stale (>4 phút), tạo page mới để refresh recaptcha session.');
        await _apiPage.close().catch(() => null);
      }
    } catch (_) { /* fall through to recreate */ }
    _apiPage = null;
  }
  if (_apiPagePromise) return _apiPagePromise;
  _apiPagePromise = (async () => {
    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.startsWith('[FlowVideoAPI]') || text.startsWith('[FlowClient]')) {
        console.log('[BROWSER-LOG] ' + text);
      }
    });
    console.log('[FLOW-API] Mở page Flow để host FlowClient...');
    await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2500);
    await dismissConsentDialog(page);
    await page.waitForFunction(
      () => window.grecaptcha && window.grecaptcha.enterprise && typeof window.grecaptcha.enterprise.execute === 'function',
      null,
      { timeout: 30000 }
    ).catch((err) => {
      console.warn(`[FLOW-API] grecaptcha không sẵn sàng trong 30s: ${err.message}`);
    });
    await page.evaluate(FLOW_CLIENT_SRC);
    console.log('[FLOW-API] FlowClient đã inject — sẵn sàng nhận request.');
    _apiPage = page;
    _apiPageReadyAt = Date.now();
    _apiPagePromise = null;
    return page;
  })();
  return _apiPagePromise;
}

async function fetchAssetToBase64(asset) {
  const url = (asset && asset.url || '').trim();
  if (!url) throw new Error(`Asset "${asset && asset.label || 'unknown'}" có URL rỗng.`);
  if (url.startsWith('data:')) {
    const m = url.match(/^data:(.*?);base64,(.*)$/);
    if (!m) throw new Error(`Data URL không hợp lệ: ${asset.label}`);
    return { base64: m[2], mimeType: m[1] || 'image/png', label: asset.label };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải asset "${asset.label}" thất bại: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString('base64'), mimeType: res.headers.get('content-type') || 'image/png', label: asset.label };
}

async function downloadFifeUrl(fifeUrl, outputPath) {
  // Node's native fetch can fail on TLS handshake quirks with lh3.googleusercontent.com.
  // Retry up to 3 times with exponential backoff before giving up.
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(fifeUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(outputPath, buf);
      return outputPath;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 500));
    }
  }
  throw new Error(`Tải fifeUrl thất bại sau 3 lần: ${lastErr?.message || lastErr}`);
}

// =============================================================================
// HTTP CLIENT MODE (worker proxy)
// =============================================================================
// When FLOW_WORKER_URL env is set, runFlowAutomation/runFlowVideoAutomation
// proxy to the flow-worker microservice via HTTP instead of launching a local
// browser. This lets the main app (e.g. LandscapeApp on Vercel) be pure HTTP
// — no Chrome, no Xvfb, no browser process.
//
// Worker contract:
//   POST /gen-image  → { ok, outputs: [{base64, mimeType, sizeBytes}], chatUrl }
//   POST /gen-video  → { ok, videoBase64, mimeType, sizeBytes, chatUrl }
//
// Main app side just gets local temp files via onImageReady/onVideoReady, same
// as the browser path — so callers (pass2Automation.js, index.js) don't change.
// =============================================================================

async function _viaWorker(endpoint, body) {
  const baseUrl = process.env.FLOW_WORKER_URL.replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.FLOW_WORKER_SECRET) headers['X-Worker-Auth'] = process.env.FLOW_WORKER_SECRET;
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15 * 60 * 1000), // 15 min — accommodate slow video gen
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    throw Object.assign(new Error(`flow-worker ${endpoint} failed: ${json?.error || res.status}`), {
      status: res.status, body: json,
    });
  }
  return json;
}

async function _runFlowAutomationViaWorker({ prompt, assets, onImageReady, flowConfig }) {
  const tempDir = path.join(os.tmpdir(), `landscape-flow-worker-${Date.now()}`);
  await ensureDirectory(tempDir);
  const t0 = Date.now();
  console.log(`[FLOW-WORKER] gen-image qua worker ${process.env.FLOW_WORKER_URL}...`);
  const json = await _viaWorker('/gen-image', { prompt, assets, flowConfig });
  console.log(`[FLOW-WORKER] worker trả ${json.outputCount} ảnh sau ${json.elapsedMs}ms.`);
  const outputPaths = [];
  for (let i = 0; i < (json.outputs || []).length; i++) {
    const o = json.outputs[i];
    if (!o?.base64) continue;
    const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);
    await fs.writeFile(outputPath, Buffer.from(o.base64, 'base64'));
    outputPaths.push(outputPath);
    if (typeof onImageReady === 'function') await onImageReady(outputPath);
  }
  console.log(`[FLOW-WORKER] hoàn tất ${outputPaths.length} ảnh sau ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  return { outputPaths, chatUrl: json.chatUrl };
}

async function _runFlowVideoAutomationViaWorker({ prompt, imageUrl, onVideoReady, flowConfig }) {
  const tempDir = path.join(os.tmpdir(), `landscape-flow-worker-video-${Date.now()}`);
  await ensureDirectory(tempDir);
  const t0 = Date.now();
  console.log(`[FLOW-WORKER] gen-video qua worker ${process.env.FLOW_WORKER_URL}...`);
  const json = await _viaWorker('/gen-video', { prompt, imageUrl, flowConfig });
  if (!json.videoBase64) throw new Error('worker không trả videoBase64');
  const outputPath = path.join(tempDir, `flow_video_${Date.now()}.mp4`);
  await fs.writeFile(outputPath, Buffer.from(json.videoBase64, 'base64'));
  console.log(`[FLOW-WORKER] video ${(json.sizeBytes / 1024 / 1024).toFixed(2)} MB sau ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
  if (typeof onVideoReady === 'function') await onVideoReady(outputPath);
  return { videoPath: outputPath, chatUrl: json.chatUrl };
}

async function runFlowAutomation({ prompt, assets, onImageReady, variantCount, flowConfig }) {
  if (process.env.FLOW_WORKER_URL) {
    return _runFlowAutomationViaWorker({
      prompt, assets, onImageReady,
      flowConfig: flowConfig || (typeof variantCount === 'number' ? { variantCount } : undefined),
    });
  }
  return _runFlowAutomationLocal({ prompt, assets, onImageReady, variantCount, flowConfig });
}

async function _runFlowAutomationLocal({ prompt, assets, onImageReady, variantCount, flowConfig }) {
  const config = flowConfig && typeof flowConfig === 'object'
    ? flowConfig
    : { variantCount: typeof variantCount === 'number' ? variantCount : 4 };
  const expectCount = [1, 2, 3, 4].includes(config.variantCount) ? config.variantCount : 4;
  const aspect = config.aspectRatio || '16:9';

  const tempDir = path.join(os.tmpdir(), `landscape-flow-${Date.now()}`);
  await ensureDirectory(tempDir);

  _activeTabCount++;
  if (_idleTimer) clearTimeout(_idleTimer);

  const t0 = Date.now();
  console.log(`[FLOW-API] Bắt đầu sinh ${expectCount} ảnh (aspect=${aspect}, assets=${(assets || []).length})...`);

  try {
    // 1. Pull assets server-side (parallel) — avoids piping huge base64 strings via page.evaluate.
    const assetPayloads = await Promise.all(
      (assets || []).map((asset) => fetchAssetToBase64(asset).catch((err) => {
        console.warn(`[FLOW-API] Bỏ qua asset "${asset && asset.label}": ${err.message}`);
        return null;
      }))
    );
    const validAssets = assetPayloads.filter(Boolean);
    if ((assets || []).length > 0 && validAssets.length === 0) {
      throw new Error('Không tải được asset nào — abort.');
    }

    // 2. Open the shared API page (logged-in, FlowClient injected).
    const page = await getApiPage();

    // 3. Run gen via the in-page FlowClient.
    const result = await page.evaluate(
      ({ prompt, count, aspectRatio, assets }) => window.FlowClient.generateImages({ prompt, count, aspectRatio, assets }),
      { prompt, count: expectCount, aspectRatio: aspect, assets: validAssets.map(a => ({ base64: a.base64, label: a.label })) }
    );

    const chatUrl = result && result.projectId ? `${FLOW_URL}/project/${result.projectId}` : FLOW_URL;
    console.log(`[FLOW-API] API trả về ${result.received}/${result.requested} ảnh trong ${result.elapsedMs}ms (uploaded base=${!!result.uploaded?.baseImageId} refs=${result.uploaded?.refImageIds?.length || 0}).`);
    if (result.errors && result.errors.length) {
      console.warn(`[FLOW-API] ${result.errors.length} request lỗi:`, JSON.stringify(result.errors).slice(0, 800));
    }

    // 4. Download fifeUrls → temp files (sequential to feed onImageReady in order).
    const outputPaths = [];
    for (let i = 0; i < (result.images || []).length; i++) {
      const img = result.images[i];
      if (!img || !img.fifeUrl) continue;
      const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);
      try {
        await downloadFifeUrl(img.fifeUrl, outputPath);
        outputPaths.push(outputPath);
        console.log(`[FLOW-API] Đã tải ảnh ${i + 1}/${result.received} → ${path.basename(outputPath)} (${img.width}x${img.height})`);
        if (typeof onImageReady === 'function') {
          await onImageReady(outputPath);
        }
      } catch (e) {
        console.warn(`[FLOW-API] Lỗi tải ảnh ${i}: ${e.message}`);
      }
    }

    console.log(`[FLOW-API] Hoàn tất ${outputPaths.length}/${expectCount} ảnh sau ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
    return { outputPaths, chatUrl };
  } finally {
    _activeTabCount = Math.max(0, _activeTabCount - 1);
    scheduleIdleClose();
  }
}

// ===== VIDEO AUTOMATION (API-direct) =====
// API-direct: start + poll via aisandbox-pa, then download via media.getMediaUrlRedirect.
// See FLOW_CLIENT_SRC for the in-page client (startVideoGen / pollVideoStatus).
async function runFlowVideoAutomation({ prompt, imageUrl, onVideoReady, flowConfig }) {
  if (process.env.FLOW_WORKER_URL) {
    return _runFlowVideoAutomationViaWorker({ prompt, imageUrl, onVideoReady, flowConfig });
  }
  const tempDir = path.join(os.tmpdir(), `landscape-flow-video-${Date.now()}`);
  await ensureDirectory(tempDir);
  const config = flowConfig && typeof flowConfig === 'object' ? flowConfig : {};
  return runFlowVideoApiPath({ prompt, imageUrl, onVideoReady, flowConfig: config, tempDir });
}

async function runFlowVideoApiPath({ prompt, imageUrl, onVideoReady, flowConfig, tempDir }) {
  if (!imageUrl) throw new Error('imageUrl is required for video gen');
  _activeTabCount++;
  if (_idleTimer) clearTimeout(_idleTimer);
  const t0 = Date.now();
  const aspect = flowConfig.aspectRatio || '16:9';
  const videoModelKey = flowConfig.videoModelKey || null;
  console.log(`[AUTO-VIDEO-API] Bắt đầu sinh video (aspect=${aspect}, model=${videoModelKey || '<default>'})...`);
  try {
    const refAsset = await fetchAssetToBase64({ url: imageUrl, label: 'reference' });
    const page = await getApiPage();

    // Phase 1 — start gen + poll until success (pure API, no UI).
    const startResult = await page.evaluate(
      ({ prompt, aspectRatio, referenceImageBase64s, videoModelKey }) =>
        window.FlowClient.startAndPollVideo({ prompt, aspectRatio, referenceImageBase64s, videoModelKey }),
      { prompt, aspectRatio: aspect, referenceImageBase64s: [refAsset.base64], videoModelKey }
    );
    if (!startResult || !startResult.mediaId) throw new Error('startAndPollVideo không trả về mediaId');
    console.log(`[AUTO-VIDEO-API] Polling xong sau ${((Date.now() - t0) / 1000).toFixed(1)}s. Tải video...`);

    // Phase 2 — construct the video URL directly. The endpoint is a plain REST handler
    // (NOT tRPC despite the path), accepting `?name=<mediaId>` as a query param and
    // returning a 302 redirect to the actual video bytes.
    const projectUrl = `${FLOW_URL}/project/${startResult.projectId}`;
    const videoUrl = `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${encodeURIComponent(startResult.mediaId)}`;

    // Phase 3 — download via context.request so session cookies are inherited.
    const outputPath = path.join(tempDir, `flow_video_${Date.now()}.mp4`);
    const ctx = page.context();
    const dl = await ctx.request.get(videoUrl, { timeout: 60000 });
    if (!dl.ok()) throw new Error(`Download video thất bại: ${dl.status()} ${dl.statusText()}`);
    const buf = await dl.body();
    await fs.writeFile(outputPath, buf);
    console.log(`[AUTO-VIDEO-API] ✅ Video xuất ra ${path.basename(outputPath)} (${(buf.length / 1024 / 1024).toFixed(2)} MB) sau ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
    if (typeof onVideoReady === 'function') await onVideoReady(outputPath);
    return { videoPath: outputPath, chatUrl: projectUrl };
  } finally {
    _activeTabCount = Math.max(0, _activeTabCount - 1);
    scheduleIdleClose();
  }
}


// Pre-warm Chrome trước khi nhận request thật — giảm latency lần đầu trên
// Render. Worker entrypoint gọi hàm này sau khi Express listen.
async function prewarmBrowser() {
  try {
    await getSharedBrowser();
    console.log('[BROWSER] Pre-warmed.');
  } catch (e) {
    console.warn('[BROWSER] Pre-warm failed:', e.message);
  }
}

module.exports = {
  runFlowAutomation,
  runFlowVideoAutomation,
  prewarmBrowser
};
