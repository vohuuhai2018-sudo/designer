const path = require('path');
const { chromium } = require('playwright-core');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

function resolveBrowserExecutable() {
  const executablePath = CHROME_CANDIDATES.find(candidate => require('fs').existsSync(candidate));
  if (!executablePath) {
    throw new Error('Không tìm thấy Chrome hoặc Edge trên máy.');
  }
  return executablePath;
}

async function main() {
  console.log("==================================================");
  console.log("   KHỞI ĐỘNG CỔNG ĐĂNG NHẬP GOOGLE LABS FLOW...");
  console.log("==================================================");
  console.log("-> Nơi lưu phiên đăng nhập: ", FLOW_PROFILE_DIR);
  
  let browser;
  try {
    browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
      executablePath: resolveBrowserExecutable(),
      headless: false,
      viewport: { width: 1440, height: 900 },
      args: ['--disable-blink-features=AutomationControlled']
    });

    const page = browser.pages().length > 0 ? browser.pages()[0] : await browser.newPage();
    
    console.log("-> Đang mở trang Google Labs Flow...");
    await page.goto('https://labs.google/fx/vi/tools/flow');

    console.log("\n✅ ĐÃ MỞ TRÌNH DUYỆT THÀNH CÔNG!");
    console.log("-> Anh hãy tiến hành đăng nhập bằng tài khoản Google.");
    console.log("-> Nhấn 'Tiếp tục' / Chấp nhận điều khoản nếu có.");
    console.log("-> Cửa sổ này sẽ không tự tắt trong vòng 1 tiếng để anh thoải mái thao tác.");
    console.log("-> Sau khi anh thấy VÀO ĐƯỢC GIAO DIỆN FLOW thành công, HÃY NHẮN BÁO CHO EM NHÉ!");
    
    // Giữ mở 1 giờ (3600000 ms)
    await new Promise(r => setTimeout(r, 3600000));
    
  } catch (err) {
    console.error("LỖI:", err);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

main();
