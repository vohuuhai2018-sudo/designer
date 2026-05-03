// Mở browser persistent context, đợi user đăng nhập Google → Flow.
// Khi /fx/api/auth/session trả về access_token thì xác nhận login OK và đóng.
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

(async () => {
  const exec = CHROME_CANDIDATES.find(p => fs.existsSync(p));
  console.log('[LOGIN] Mở browser persistent profile, đăng nhập Google trong cửa sổ vừa hiện ra.');
  console.log('[LOGIN] Sau khi vào được trang Flow (https://labs.google/fx/vi/tools/flow), script sẽ tự xác nhận và đóng.');

  const browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
    executablePath: exec,
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });

  console.log('[LOGIN] Đang chờ access_token... (bấm Sign in trong cửa sổ Chrome)');

  const startedAt = Date.now();
  const TIMEOUT_MS = 10 * 60 * 1000;

  while (Date.now() - startedAt < TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, 3000));
    if (page.isClosed()) break;
    try {
      const url = page.url();
      const onFlow = /labs\.google\/fx\/[a-z]+\/tools\/flow/.test(url);
      if (!onFlow) {
        process.stdout.write(`. (current: ${url.split('?')[0].slice(0, 80)})\n`);
        continue;
      }
      const session = await page.evaluate(async () => {
        try {
          const r = await fetch('/fx/api/auth/session', { credentials: 'include' });
          if (!r.ok) return { status: r.status, hasToken: false };
          const j = await r.json();
          return { status: r.status, hasToken: !!(j && j.access_token), email: j && j.user && j.user.email };
        } catch (e) { return { error: e.message }; }
      });
      if (session.hasToken) {
        console.log(`[LOGIN] ✅ access_token OK — user: ${session.email || '(unknown)'}`);
        // Wait a tick for cookies to flush, then close.
        await new Promise(r => setTimeout(r, 1500));
        await browser.close();
        process.exit(0);
      }
      process.stdout.write(`. (session=${JSON.stringify(session).slice(0, 100)})\n`);
    } catch (e) {
      process.stdout.write(`. (err: ${e.message.slice(0, 80)})\n`);
    }
  }

  console.log('[LOGIN] ❌ Timeout — chưa đăng nhập xong sau 10 phút.');
  await browser.close();
  process.exit(1);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
