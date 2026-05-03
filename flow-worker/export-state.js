// export-state.js
// Trên Mac, mở persistent profile của LandscapeApp, extract Playwright storageState
// (cookies + localStorage), output ra base64 (gzipped) để paste vào Render env.
//
// Cách dùng:
//   node export-state.js                  # in ra stdout
//   node export-state.js > state.b64.txt  # save vào file
//
// Output có 3 phần:
//   1. Single line FLOW_STATE_B64 (nếu < 32KB)
//   2. Hoặc chunked FLOW_STATE_B64_1, _2, ... (nếu lớn hơn)
//   3. Hướng dẫn paste vào Render

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const { chromium } = require('playwright-core');

const PROFILE_DIR = path.resolve(__dirname, '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
const FLOW_URL = 'https://labs.google/fx/vi/tools/flow';

(async () => {
  if (!fs.existsSync(PROFILE_DIR)) {
    console.error(`❌ Không tìm thấy profile dir: ${PROFILE_DIR}`);
    console.error(`   Anh phải login Flow trên Mac trước. Chạy: cd LandscapeApp/server && node test_login.js`);
    process.exit(1);
  }
  const exec = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  if (!exec) {
    console.error('❌ Không tìm thấy Chrome trên Mac.');
    process.exit(1);
  }

  console.error('[export-state] Mở browser từ persistent profile (headless)...');
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: exec,
    headless: true, // chỉ extract cookies, không cần GUI
  });

  // Verify session đang sống bằng cách check /fx/api/auth/session
  const page = ctx.pages()[0] || await ctx.newPage();
  console.error(`[export-state] Verify session bằng cách gọi /fx/api/auth/session...`);
  await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const session = await page.evaluate(async () => {
    const r = await fetch('/fx/api/auth/session', { credentials: 'include' });
    const j = await r.json().catch(() => null);
    return { hasToken: !!j?.access_token, email: j?.user?.email, expires: j?.expires };
  });
  if (!session.hasToken) {
    console.error('❌ Session KHÔNG có access_token. Profile chưa login Flow hoặc cookie hết hạn.');
    console.error('   Re-login: cd LandscapeApp/server && node test_login.js');
    await ctx.close();
    process.exit(1);
  }
  console.error(`[export-state] ✓ Session OK (${session.email}, expires ${session.expires})`);

  // Extract storageState
  const state = await ctx.storageState();
  await ctx.close();

  // Filter cookies — chỉ giữ Google domains (giảm size)
  const RELEVANT_DOMAINS = /labs\.google|googleapis\.com|google\.com|gstatic\.com/;
  state.cookies = state.cookies.filter(c => RELEVANT_DOMAINS.test(c.domain || ''));
  console.error(`[export-state] Filtered cookies: ${state.cookies.length} (Google domains only)`);

  // Filter origins — chỉ giữ labs.google
  state.origins = (state.origins || []).filter(o => /labs\.google/.test(o.origin || ''));

  const json = JSON.stringify(state);
  const rawSize = Buffer.byteLength(json, 'utf8');
  const gzipped = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
  const b64 = gzipped.toString('base64');
  const b64Size = b64.length;
  console.error(`[export-state] Raw JSON: ${(rawSize / 1024).toFixed(1)}KB → gzip+base64: ${(b64Size / 1024).toFixed(1)}KB`);

  // Output
  const RENDER_ENV_LIMIT = 32000; // Render đôi khi ~32KB; an toàn cap ở 30KB/chunk
  const CHUNK_SIZE = 30000;

  console.log('');
  console.log('# ═══════════════════════════════════════════════════════════════');
  console.log('# Render env vars — copy vào dashboard');
  console.log('# ═══════════════════════════════════════════════════════════════');
  console.log('');

  if (b64Size <= RENDER_ENV_LIMIT) {
    console.log('FLOW_STATE_B64=' + b64);
    console.log('');
  } else {
    const chunks = Math.ceil(b64Size / CHUNK_SIZE);
    console.error(`[export-state] Profile quá lớn (${b64Size}B) — chia thành ${chunks} chunks`);
    for (let i = 0; i < chunks; i++) {
      const part = b64.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      console.log(`FLOW_STATE_B64_${i + 1}=${part}`);
    }
    console.log('');
    console.log(`# (Code tự ghép FLOW_STATE_B64_1, _2, ... khi load)`);
  }

  console.log('# Sau khi paste env trên Render, click Manual Deploy.');
  console.log('# Test sau deploy: curl https://flow-worker.onrender.com/health');
})().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
