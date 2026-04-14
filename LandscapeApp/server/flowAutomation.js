const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function resolveBrowserExecutable() {
  const executablePath = CHROME_CANDIDATES.find(candidate => require('fs').existsSync(candidate));
  if (!executablePath) {
    throw new Error('Không tìm thấy Chrome hoặc Edge để chạy tự động Flow.');
  }
  return executablePath;
}

function sanitizeFileName(value) {
  return value.replace(/[^a-z0-9-_]+/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'asset';
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function saveDataUrlToFile(dataUrl, filePath) {
  const [, mimePart = 'image/png', content = ''] = dataUrl.match(/^data:(.*?);base64,(.*)$/) || [];
  if (!content) throw new Error('Data URL không hợp lệ.');
  await fs.writeFile(filePath, Buffer.from(content, 'base64'));
  return { filePath, mimeType: mimePart };
}

async function downloadAssetToFile(asset, targetDir, index) {
  const url = (asset.url || '').trim();
  if (!url) throw new Error(`Asset "${asset.label}" có URL rỗng, không thể tải.`);

  if (url.startsWith('data:')) {
    const filePath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(asset.label)}.png`);
    return saveDataUrlToFile(url, filePath);
  }

  let extensionFromUrl = 'png';
  try {
    const ext = path.extname(new URL(url).pathname || '').replace('.', '');
    if (ext) extensionFromUrl = ext;
  } catch (_) { }

  const filePath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(asset.label)}.${extensionFromUrl}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Không tải được tài nguyên: ${asset.label}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return { filePath, mimeType: response.headers.get('content-type') || 'image/png' };
}

async function runFlowVariant(page, prompt, filePaths, tempDir, variantNumber, onImageReady) {
  try {
    // 1. Phải truy cập trang New Project của Flow
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
    
    // Bấm nút "Dự án mới" (hoặc + icon)
    console.log(`[Flow - Tab ${variantNumber}] Bắt đầu Dự án mới...`);
    const newProjectBtn = page.locator('button:has-text("Dự án mới"), button[aria-label="Tạo dự án mới"]').first();
    if (await newProjectBtn.count() > 0 && await newProjectBtn.isVisible()) {
        await newProjectBtn.click();
    }
    
    await delay(3000);

    // 2. Upload hình ảnh vào Flow
    console.log(`[Flow - Tab ${variantNumber}] Chuẩn bị up hình...`);
    
    // Tìm nút [+] upload bên trái ô nhập
    const addBtn = page.locator('button').filter({ hasText: 'add' }).last(); 
    if (await addBtn.count() > 0) {
        // Đôi khi có thể phải dùng page.locator('[aria-label="Thêm thành phần"]') ...
        try {
            await addBtn.click();
            await delay(1000);
            
            // Flow dùng input type=file ẩn
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
            await page.locator('button:has-text("Tải hình ảnh lên")').first().click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePaths);
            await delay(3000); // Chờ ảnh load
        } catch (e) {
            console.log(`[Flow - Tab ${variantNumber}] Gặp lỗi khi dùng UI bấm tải lên, thử dùng hidden input...`);
            const fileInput = page.locator('input[type="file"]').first();
            if (await fileInput.count() > 0) {
                await fileInput.setInputFiles(filePaths);
                await delay(3000);
            }
        }
    } else {
        // Dự phòng
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
            await fileInput.setInputFiles(filePaths);
            await delay(3000);
        }
    }

    // 3. Nhập Prompt
    console.log(`[Flow - Tab ${variantNumber}] Đang gửi Prompt...`);
    const promptBox = page.locator('textarea, [contenteditable="true"], div[role="textbox"]').first();
    await promptBox.click();
    await promptBox.fill(prompt);
    
    // 4. Bấm Gửi (Nút mũi tên phải / enter)
    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Send"], button[aria-label*="Tạo"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    console.log(`[Flow - Tab ${variantNumber}] Đang chờ Google Flow sinh ảnh...`);

    // 5. Chờ kết quả
    // Flow tải ảnh vào canvas hoặc img card. Ta chờ thẻ ảnh xuất hiện, trừ ảnh thumbnail mình up.
    await page.waitForFunction((numUploads) => {
        const images = Array.from(document.querySelectorAll('img, canvas'));
        return images.length > numUploads + 1; // Nhiều hơn số lượng ảnh đã up + logo
    }, filePaths.length, { timeout: 180000 }); // Chờ tối đa 3 phút

    await delay(5000);

    // 6. Lấy kết quả lưu xuống
    console.log(`[Flow - Tab ${variantNumber}] Lấy hình ảnh từ Flow...`);
    const outputPath = path.join(tempDir, `flow_result_${Date.now()}_tab${variantNumber}.png`);

    // Lấy link ảnh từ src (thường là blob) hoặc chụp màn hình canvas tuỳ cơ chế của Flow
    await page.evaluate(async () => {
        // Tìm img được tạo ra (bỏ qua các thẻ avatar)
        const images = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        if (images.length === 0) throw new Error('Không tìm thấy thẻ ảnh trả về của Flow.');
        
        const targetImg = images[images.length - 1]; // Lấy ảnh cuối cùng (mới nhất)
        const src = targetImg.src;
        
        const a = document.createElement('a');
        if (src.startsWith('blob:')) {
            a.href = src;
        } else {
            const res = await fetch(src);
            const blob = await res.blob();
            a.href = window.URL.createObjectURL(blob);
        }
        a.download = 'flow_result.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    const [downloadHandle] = await Promise.all([
        page.waitForEvent('download', { timeout: 15000 }),
    ]);
    await downloadHandle.saveAs(outputPath);

    console.log(`[Flow - Tab ${variantNumber}] Đã tiếp nhận và tải ảnh thành công!`);
    
    if (typeof onImageReady === 'function') {
      await onImageReady(outputPath);
    }
    
    await page.close().catch(() => null);
    return outputPath;
  } catch (error) {
    console.error(`[Flow - Tab ${variantNumber}] Lỗi:`, error);
    await page.close().catch(() => null);
    return null;
  }
}

async function runFlowAutomation({ prompt, assets, onImageReady }) {
  const tempDir = path.join(os.tmpdir(), `landscape-flow-${Date.now()}`);
  await ensureDirectory(tempDir);

  const inputFiles = [];
  let browser;

  try {
    for (let index = 0; index < assets.length; index += 1) {
      inputFiles.push(await downloadAssetToFile(assets[index], tempDir, index));
    }

    browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
      executablePath: resolveBrowserExecutable(),
      headless: false,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    let outputPaths = [];
    const filePaths = inputFiles.map(file => file.filePath);
    const defaultPage = browser.pages()[0];

    // Chạy 2 biến thể song song cho Flow
    const promises = [1, 2].map(async (variantNumber) => {
      console.log(`[AUTO-FLOW] Đang khởi động tiến trình #${variantNumber}...`);
      const targetPage = variantNumber === 1 && defaultPage ? defaultPage : await browser.newPage();
      
      const result = await runFlowVariant(targetPage, prompt, filePaths, tempDir, variantNumber, onImageReady);
      if (result) outputPaths.push(result);
    });

    await Promise.allSettled(promises);

    console.log(`[AUTO-FLOW] Hoàn tất. Lấy được ${outputPaths.length}/2 ảnh.`);
    return { outputPaths, chatUrl: 'https://labs.google/fx/vi/tools/flow' };
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
    await Promise.all(inputFiles.map(file => fs.unlink(file.filePath).catch(() => null)));
  }
}

module.exports = {
  runFlowAutomation
};
