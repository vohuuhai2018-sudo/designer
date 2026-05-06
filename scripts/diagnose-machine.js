#!/usr/bin/env node
/**
 * Cross-platform diagnostic — chạy được cả Mac, Linux, Windows (PowerShell/cmd).
 * Usage: node scripts/diagnose-machine.js
 *
 * Báo ❌ cho thiếu sót, ✓ cho đã có. KHÔNG tự fix; in command anh cần chạy.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'LandscapeApp');

const ok = (m) => console.log('  ✓ ' + m);
const bad = (m) => console.log('  ❌ ' + m);
const warn = (m) => console.log('  ⚠ ' + m);

function head(n, title) {
  console.log(`\n[${n}/8] ${title}`);
}

console.log('==========================================');
console.log(`DIAGNOSTIC: ${os.hostname()} (${os.platform()}-${os.arch()})  ${new Date().toLocaleString()}`);
console.log(`Root: ${ROOT}`);
console.log('==========================================');

// 1. Git state
head(1, 'Git state');
try {
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT }).toString().trim();
  ok(`commit ${sha} on branch ${branch}`);
} catch (e) {
  bad(`không phải git repo: ${e.message}`);
}

// 2. .env files
head(2, '.env files');
for (const p of [path.join(APP, '.env'), path.join(APP, 'server', '.env')]) {
  if (fs.existsSync(p)) {
    ok(`Có ${p}`);
    try {
      const txt = fs.readFileSync(p, 'utf8');
      const keys = [...txt.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(m => m[1]);
      console.log(`     Keys: ${keys.join(' ')}`);
    } catch (_) {}
  } else {
    warn(`KHÔNG có ${p}`);
  }
}

// 3. node_modules
head(3, 'node_modules');
const feMods = fs.existsSync(path.join(APP, 'node_modules'));
const beMods = fs.existsSync(path.join(APP, 'server', 'node_modules'));
feMods ? ok(`FE: ${path.join(APP, 'node_modules')}`) : bad(`FE thiếu — chạy: cd LandscapeApp && npm install`);
beMods ? ok(`BE: ${path.join(APP, 'server', 'node_modules')}`) : bad(`BE thiếu — chạy: cd LandscapeApp/server && npm install`);

// 4. Playwright + Chrome
head(4, 'Playwright + Chrome');
const pwPaths = [
  path.join(APP, 'server', 'node_modules', 'playwright-core'),
  path.join(APP, 'node_modules', 'playwright-core'),
];
const pwFound = pwPaths.find(p => fs.existsSync(p));
pwFound ? ok(`playwright-core: ${pwFound}`) : bad(`playwright-core không có — npm install`);

const chromePaths = [
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  // Linux
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  // Windows
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const chromeFound = chromePaths.find(p => { try { return fs.existsSync(p); } catch { return false; } });
chromeFound ? ok(`Chrome: ${chromeFound}`) : bad(`Không thấy Chrome — install hoặc set CHROME_EXECUTABLE_PATH env`);

// 5. Flow profile
head(5, 'Flow profile (login Google)');
const profileDir = path.join(ROOT, 'tooltaoanh', 'flow_profile');
// Chrome version mới đặt cookies ở Default/Network/Cookies (Win/Linux)
// thay vì Default/Cookies (Mac cũ). Check cả 2 + fallback.
const cookieCandidates = [
  path.join(profileDir, 'Default', 'Network', 'Cookies'),
  path.join(profileDir, 'Default', 'Cookies'),
];
const foundCookie = cookieCandidates.find(p => fs.existsSync(p));
if (foundCookie) {
  const sz = fs.statSync(foundCookie).size;
  ok(`Profile có Cookies (${sz} bytes) tại ${path.relative(ROOT, foundCookie)}`);
} else if (fs.existsSync(path.join(profileDir, 'Default'))) {
  // Profile có Default folder nhưng chưa có Cookies — chắc chưa login xong
  warn(`Có ${profileDir}/Default nhưng chưa có Cookies file. Login lại: node LandscapeApp/server/test_login.js`);
} else {
  bad(`THIẾU profile login — chạy: node LandscapeApp/server/test_login.js`);
  console.log(`     (Chrome popup mở → đăng nhập Google → script tự đóng)`);
}

// 6. MongoDB URI
head(6, 'MongoDB URI');
let mongoFound = false;
for (const p of [path.join(APP, 'server', '.env'), path.join(APP, '.env')]) {
  if (!fs.existsSync(p)) continue;
  const txt = fs.readFileSync(p, 'utf8');
  const m = txt.match(/^(MONGODB_URI|MONGO_URI|DATABASE_URL)=(.+)$/m);
  if (m) {
    const masked = m[2].replace(/(mongodb(\+srv)?:\/\/[^:]+:)[^@]+(@.*)/, '$1***$3');
    ok(`Tìm thấy ${m[1]} trong ${p}: ${masked.slice(0, 80)}...`);
    mongoFound = true;
    break;
  }
}
if (!mongoFound) bad(`Chưa có MONGODB_URI/MONGO_URI trong .env nào`);

// 7. Ports
head(7, 'Ports 5000 / 5173');
async function checkPort(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const s = net.createServer();
    s.once('error', (err) => {
      resolve(err.code === 'EADDRINUSE' ? 'busy' : 'error');
    });
    s.once('listening', () => {
      s.close(() => resolve('free'));
    });
    s.listen(port);
  });
}
(async () => {
  for (const port of [5000, 5173]) {
    const status = await checkPort(port);
    if (status === 'free') ok(`Port ${port} free`);
    else if (status === 'busy') warn(`Port ${port} đang bận (kill app dùng port này trước khi npm run dev)`);
    else bad(`Port ${port} test fail`);
  }

  // 8. Hint
  head(8, 'Quick Flow auth test');
  console.log('  → Verify login: node LandscapeApp/server/test_login.js');
  console.log("    Nếu in '[LOGIN] ✅ access_token OK — user: xxx' = login OK");
  console.log('    Nếu Chrome popup yêu cầu login = profile chưa có session');

  console.log('\n==========================================');
  console.log('DONE. ❌ = phải fix trước khi npm run dev.');
  console.log('==========================================');
})();
