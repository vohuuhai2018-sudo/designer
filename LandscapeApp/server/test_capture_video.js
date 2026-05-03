// Capture the EXACT video gen API request by intercepting fetch on a logged-in
// Flow page. User then manually triggers 1 video gen via UI; we log URL + body
// + response to flow_video_capture.json for use in coding the API client.
//
// Why: video API has multiple endpoints (Extend / StartAndEndImage / CameraControl /
// ObjectInsertion + polling endpoint batchCheckAsyncVideoGenerationStatus). We've
// reverse-engineered the URL pattern (aisandbox-pa.googleapis.com/v1/video:<name>)
// and partial body schema from the bundle, but exact field names + nesting need
// confirmation from a real captured request.

const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
const OUTPUT = path.join(__dirname, 'flow_video_capture.json');

(async () => {
  const exec = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  console.log('[CAP] Mở browser persistent profile...');

  const browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
    executablePath: exec,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();

  // Install fetch wrapper BEFORE page loads so it catches everything.
  await page.addInitScript(() => {
    const orig = window.fetch.bind(window);
    window.__capturedFlowCalls = [];
    window.__capturedRecaptcha = [];
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : (input?.url || '');
      const isFlowApi = url.includes('aisandbox-pa.googleapis.com') &&
        (url.includes('/v1/video:') || url.includes('/v1/flow/uploadImage') || url.includes('/v1/projects/'));
      const isTrpcMedia = url.includes('/fx/api/trpc/media.');
      const isTarget = isFlowApi || isTrpcMedia;
      if (!isTarget) return orig(input, init);
      const ts = Date.now();
      let bodyText = null;
      try {
        if (init && init.body) {
          if (typeof init.body === 'string') bodyText = init.body;
          else bodyText = '<' + Object.prototype.toString.call(init.body) + '>';
        }
      } catch {}
      const res = await orig(input, init);
      const clone = res.clone();
      let respText = null;
      try { respText = await clone.text(); } catch {}
      const entry = {
        ts, url, method: (init && init.method) || 'GET',
        headers: init?.headers || null,
        bodyPreview: bodyText ? bodyText.slice(0, 4000) : null,
        bodyTruncated: !!(bodyText && bodyText.length > 4000),
        bodyLen: bodyText?.length || 0,
        status: res.status,
        respPreview: respText ? respText.slice(0, 4000) : null,
        respLen: respText?.length || 0,
      };
      window.__capturedFlowCalls.push(entry);
      console.log('[CAP] ', entry.method, url, '→', res.status, '(body=' + entry.bodyLen + 'B, resp=' + entry.respLen + 'B)');
      return res;
    };
    // Also patch grecaptcha.enterprise.execute when it becomes available
    const wrapGrecaptcha = () => {
      if (!window.grecaptcha?.enterprise?.execute || window.__greWrapped) return false;
      const origExec = window.grecaptcha.enterprise.execute.bind(window.grecaptcha.enterprise);
      window.grecaptcha.enterprise.execute = async function(siteKey, opts) {
        const action = opts?.action;
        const tStart = Date.now();
        const tok = await origExec(siteKey, opts);
        window.__capturedRecaptcha.push({ ts: tStart, siteKey, action, tokenLen: (tok || '').length });
        console.log('[CAP-RC] grecaptcha action=' + action + ' siteKey=' + siteKey.slice(0, 20) + '... tokenLen=' + (tok || '').length);
        return tok;
      };
      window.__greWrapped = true;
      return true;
    };
    const intv = setInterval(() => { if (wrapGrecaptcha()) clearInterval(intv); }, 500);
  });

  // Playwright-side request listener — catches ALL requests including <video src> loads,
  // which the in-page fetch() interceptor misses. We're especially after media.getMediaUrlRedirect.
  const playwrightCalls = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/fx/api/trpc/media.') || (u.includes('aisandbox-pa.googleapis.com') && (u.includes('/v1/video:') || u.includes('/v1/media') || u.includes('/v1/flow/uploadImage') || u.includes('/v1/projects/')))) {
      const entry = { ts: Date.now(), url: u, method: req.method(), headers: req.headers(), postData: req.postData() ? req.postData().slice(0, 4000) : null };
      playwrightCalls.push(entry);
      console.log('[CAP-PW]', entry.method, u.length > 200 ? u.slice(0, 200) + '...' : u);
    }
  });
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('/fx/api/trpc/media.')) {
      try {
        const text = await res.text();
        const idx = playwrightCalls.findIndex(c => c.url === u && !c.respText);
        if (idx >= 0) {
          playwrightCalls[idx].status = res.status();
          playwrightCalls[idx].respText = text.slice(0, 4000);
          playwrightCalls[idx].respHeaders = res.headers();
        }
        console.log('[CAP-PW-RESP]', res.status(), u.slice(0, 200), '→', text.slice(0, 100));
      } catch {}
    }
  });

  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle', timeout: 60000 });
  console.log(`[CAP] ✅ Đã mở Flow. URL: ${page.url()}`);
  console.log('');
  console.log('[CAP] 👉 BÂY GIỜ ANH HÃY:');
  console.log('[CAP]   1. Tạo dự án mới (hoặc chọn dự án có sẵn)');
  console.log('[CAP]   2. Click config button → tab Video → tab Thành phần → 16:9 → x1');
  console.log('[CAP]   3. Paste 1 ảnh tham khảo + nhập prompt ngắn');
  console.log('[CAP]   4. Click "Tạo"');
  console.log('[CAP]   5. Đợi ~3-5 phút cho video xong, sẽ thấy [CAP] log mỗi request');
  console.log('[CAP]   6. Khi video xuất hiện trong UI thì gõ Ctrl+C ở terminal này để dừng + lưu capture.');
  console.log('');

  // Periodically dump captured calls to disk so we don't lose data on Ctrl+C
  const dump = async () => {
    try {
      const inPage = await page.evaluate(() => ({
        calls: window.__capturedFlowCalls || [],
        recaptcha: window.__capturedRecaptcha || [],
      }));
      const data = { ...inPage, playwrightCalls };
      fs.writeFileSync(OUTPUT, JSON.stringify(data, null, 2));
    } catch {}
  };

  const interval = setInterval(dump, 5000);

  process.on('SIGINT', async () => {
    clearInterval(interval);
    await dump();
    console.log(`\n[CAP] 💾 Đã lưu capture vào ${OUTPUT}`);
    await browser.close();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
