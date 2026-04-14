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

async function runFlowVariant(page, prompt, filePaths, tempDir, onImageReady) {
  try {
    const pendingDownloads = [];
    page.on('download', download => {
        pendingDownloads.push(download);
    });

    // 1. Phải truy cập trang chủ Flow và tạo Dự án mới do link trực tiếp trả về "Đã xảy ra lỗi"
    console.log(`[Flow] Truy cập trang chủ Flow...`);
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
    await delay(3000);

    // Kích vào tạo dự án mới (hoặc quay lại nếu gặp lỗi)
    try {
        const errorBackBtn = page.locator('button:has-text("Quay lại dự án")');
        if (await errorBackBtn.count() > 0) {
            await errorBackBtn.click();
            await delay(2000);
        }
        const newProjBtn = page.locator('button, div').filter({ hasText: /Dự án mới|Nouveau projet/i }).last();
        if (await newProjBtn.count() > 0 && await newProjBtn.isVisible()) {
            await newProjBtn.click();
            await delay(3000);
        }
    } catch (e) {
        console.log(`[Flow] Không tìm thấy nút tạo dự án, thử tiếp tục...`);
    }

    // 2. Upload hình ảnh vào Flow
    console.log(`[Flow] Chuẩn bị up hình...`);
    // Thường upload nút nằm dưới cùng, Flow layout thay đổi
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(filePaths);
        await delay(3000);
    } else {
        const addBtn = page.locator('button').filter({ hasText: 'add' }).last(); 
        if (await addBtn.count() > 0) {
            await addBtn.click();
            await delay(1000);
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
            await page.locator('button:has-text("Tải hình ảnh lên")').first().click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePaths);
            await delay(3000); 
        }
    }

    // 3. Nhập Prompt
    console.log(`[Flow] Đang gửi Prompt...`);
    const promptBox = page.locator('textarea, [contenteditable="true"], div[role="textbox"]').first();
    await promptBox.click();
    await promptBox.fill(prompt);
    await delay(1000);
    
    // 4. Mở cài đặt (chọn x4 ảnh)
    console.log(`[Flow] Cấu hình tạo 4 ảnh...`);
    try {
        const configBtn = page.locator('button').filter({ hasText: /Nano Banana|x/ }).first();
        if (await configBtn.count() > 0) {
            await configBtn.click();
            await delay(1000);
            // Bấm chọn x4
            const x4Btn = page.locator('button').filter({ hasText: /^x4$/ }).first();
            if (await x4Btn.count() > 0) {
                await x4Btn.click();
                await delay(500);
            }
            await promptBox.click(); // close popup
        }
    } catch (e) {
        console.log(`[Flow] Bỏ qua lỗi chọn ảnh x4.`);
    }

    // 5. Bấm Gửi
    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Send"], button[aria-label*="Tạo"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    console.log(`[Flow] Đang chờ Google Flow sinh 4 kết quả ảnh... (Thời gian đợi có thể lên tới 2-3 phút)`);

    // 6. Chờ kết quả (Chờ tới khi có thêm ít nhất 4 ảnh so với lúc đầu)
    await page.waitForFunction((numUploads) => {
        const images = Array.from(document.querySelectorAll('img, canvas')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        return images.length >= numUploads + 4; 
    }, filePaths.length, { timeout: 240000 }); 

    await delay(8000);

    // 7. Click Download 4 ảnh
    console.log(`[Flow] Xác định được các ảnh mới, tiến hành lấy ảnh về...`);
    
    await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        if (images.length === 0) return;
        const targets = images.slice(-4);
        for (let i = 0; i < targets.length; i++) {
            const targetImg = targets[i];
            const src = targetImg.src;
            const a = document.createElement('a');
            a.download = `flow_result_${i+1}.png`; 
            if (src.startsWith('blob:')) {
                a.href = src;
            } else {
                try {
                    const res = await fetch(src);
                    const blob = await res.blob();
                    a.href = window.URL.createObjectURL(blob);
                } catch(e) { continue; }
            }
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            await new Promise(r => setTimeout(r, 1000));
        }
    });

    console.log(`[Flow] Đã đẩy lệnh lưu ảnh, đang chờ trình duyệt tải xuống...`);
    await delay(10000); // Wait for downloads to buffer

    const finalOutputPaths = [];
    for (let i = 0; i < pendingDownloads.length; i++) {
        // Chỉ lưu 4 download cuối cùng nếu có nhiều hơn
        if (pendingDownloads.length > 4 && i < pendingDownloads.length - 4) continue;

        const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);
        await pendingDownloads[i].saveAs(outputPath);
        finalOutputPaths.push(outputPath);

        if (typeof onImageReady === 'function') {
            await onImageReady(outputPath);
        }
    }

    console.log(`[Flow] Đã tiếp nhận và tải ${finalOutputPaths.length} ảnh thành công!`);
    await page.close().catch(() => null);
    return finalOutputPaths;
  } catch (error) {
    console.error(`[Flow] Lỗi:`, error);
    await page.close().catch(() => null);
    return [];
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

    const filePaths = inputFiles.map(file => file.filePath);
    const defaultPage = browser.pages()[0] || await browser.newPage();

    console.log(`[AUTO-FLOW] Đang khởi động Google Labs Flow...`);
    
    const outputPaths = await runFlowVariant(defaultPage, prompt, filePaths, tempDir, onImageReady);

    console.log(`[AUTO-FLOW] Hoàn tất. Lấy được ${outputPaths.length}/4 ảnh.`);
    return { outputPaths, chatUrl: 'https://labs.google/fx/vi/tools/flow/project/04886b36-e1dc-4244-bd0e-21e750bab491' };
  } finally {
    if (browser) {
      // Giữ khoảng thời gian nhỏ trước khi tắt để đảm bảo onImageReady xử lý xong (nước cuối)
      await delay(3000);
      await browser.close().catch(() => null);
    }
    await Promise.all(inputFiles.map(file => fs.unlink(file.filePath).catch(() => null)));
  }
}

module.exports = {
  runFlowAutomation
};
