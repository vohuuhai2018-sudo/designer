// Debug: check auth/session + createProject response in the persistent profile
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
  console.log('Chrome:', exec);
  console.log('Profile:', FLOW_PROFILE_DIR);

  const browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
    executablePath: exec,
    headless: false,
    viewport: { width: 1280, height: 800 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = await browser.newPage();
  console.log('--- Navigating ---');
  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'networkidle', timeout: 60000 });
  console.log('Loaded. URL:', page.url());

  // 1. Auth session
  const session = await page.evaluate(async () => {
    try {
      const r = await fetch('/fx/api/auth/session', { credentials: 'include' });
      return { status: r.status, ok: r.ok, body: await r.json().catch(() => null) };
    } catch (e) { return { error: e.message }; }
  });
  console.log('Session:', JSON.stringify(session).slice(0, 400));

  // 2. grecaptcha state
  const captchaState = await page.evaluate(() => ({
    hasGrecaptcha: typeof window.grecaptcha !== 'undefined',
    hasEnterprise: !!(window.grecaptcha && window.grecaptcha.enterprise),
    hasExecute: !!(window.grecaptcha && window.grecaptcha.enterprise && typeof window.grecaptcha.enterprise.execute === 'function'),
  }));
  console.log('grecaptcha:', JSON.stringify(captchaState));

  // 3. createProject probe
  const createProject = await page.evaluate(async () => {
    try {
      const r = await fetch('/fx/api/trpc/project.createProject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ json: { projectTitle: 'debug-' + Date.now(), toolName: 'PINHOLE' } }),
      });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return { status: r.status, ok: r.ok, raw: text.slice(0, 500), json: json && JSON.stringify(json).slice(0, 500) };
    } catch (e) { return { error: e.message }; }
  });
  console.log('createProject:', JSON.stringify(createProject).slice(0, 800));

  await browser.close();
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
