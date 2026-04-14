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
    const pendingDownloads = []; // giữ lại để tương thích nhưng không dùng tập trung nữa

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
 
    // 2. Nạp ảnh bằng phương thức Paste (Dán) để hiển thị như Hình 2
    console.log(`[Flow] Bắt đầu nạp ${filePaths.length} ảnh bằng phương thức Paste...`);
    const promptBox = page.locator('textarea, [contenteditable="true"], div[role="textbox"]').first();
    await promptBox.click();

    for (let i = 0; i < filePaths.length; i++) {
        console.log(`[Flow] Đang dán ảnh ${i + 1}/${filePaths.length}...`);
        const imageBuffer = await require('fs/promises').readFile(filePaths[i]);
        const base64Image = imageBuffer.toString('base64');
        
        await page.evaluate(async ({ base64, index }) => {
            const resp = await fetch(`data:image/png;base64,${base64}`);
            const blob = await resp.blob();
            const file = new File([blob], `image_${index}.png`, { type: 'image/png' });
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            const target = document.querySelector('textarea, [contenteditable="true"], div[role="textbox"]');
            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            });
            target.dispatchEvent(pasteEvent);
        }, { base64: base64Image, index: i });
        
        await delay(3000); // Đợi Google nhận diện từng ảnh sau khi dán
    }

    console.log(`[Flow] Chờ Google xử lý đồng bộ ảnh (10 giây)...`);
    await delay(10000);

    // --- BƯỚC 1: Click dấu + và chọn hình tham khảo nếu cần (Double Check) ---
    // Ghi chú: Kỹ thuật Paste thường đã tự gắn ảnh vào Prompt rồi, 
    // nhưng nếu cần mở Asset Panel để kiểm tra thì vẫn giữ lại logic này.
    console.log(`[Flow] Dán ảnh xong, chuyển sang nhập Prompt...`);

    // 4. Nhập Prompt
    console.log(`[Flow] Đang gửi Prompt...`);
    await promptBox.click();
    await promptBox.fill(prompt);
    await delay(1000);
    
    // 5. Mở cài đặt (chọn x4 ảnh)
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

    // 5. Lưu lại danh sách ảnh hiện tại (để loại bỏ ảnh gốc/ảnh cũ)
    const existingImgSources = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
            .filter(img => img.width > 100 && !img.src.includes('avatar'))
            .map(img => img.src);
    });
    console.log(`[Flow] Đã ghi nhớ ${existingImgSources.length} ảnh gốc/ảnh cũ.`);

    // 6. Bấm Gửi
    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Send"], button[aria-label*="Tạo"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    console.log(`[Flow] Đang chờ Google Flow sinh kết quả ảnh... (tối đa 4 phút)`);

    // 7. Chờ kết quả: Đợi ít nhất 4 ảnh MỚI xuất hiện
    try {
        await page.waitForFunction((oldSources) => {
            const currentImages = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
            const newImages = currentImages.filter(img => !oldSources.includes(img.src));
            return newImages.length >= 4; 
        }, existingImgSources, { timeout: 240000 });
    } catch (e) {
        console.log(`[Flow] Cảnh báo: Hết thời gian chờ ảnh mới. Xử lý những gì tìm thấy...`);
    }

    // Đợi thêm cho ảnh render hoàn toàn
    console.log(`[Flow] Đợi ảnh render hoàn toàn...`);
    await delay(15000);

    // 8. Tải xuống và Upload (Chỉ lấy ảnh MỚI)
    console.log(`[Flow] Bắt đầu tải xuống kết quả (đã lọc bỏ ảnh gốc)...`);
    let processedCount = 0;
    
    // Lấy lại danh sách ảnh mới nhất
    const newResultsInDom = await page.evaluate((oldSources) => {
        const currentImages = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        return currentImages.filter(img => !oldSources.includes(img.src)).map(img => ({
            src: img.src,
            rect: {
                x: img.getBoundingClientRect().x + img.getBoundingClientRect().width / 2,
                y: img.getBoundingClientRect().y + img.getBoundingClientRect().height / 2,
                w: img.getBoundingClientRect().width,
                h: img.getBoundingClientRect().height
            }
        }));
    }, existingImgSources);

    console.log(`[Flow] Tìm thấy ${newResultsInDom.length} ảnh kết quả mới.`);

    for (let i = 0; i < Math.min(newResultsInDom.length, 4); i++) {
        const item = newResultsInDom[i];
        console.log(`[Flow] --- Đang xử lý ảnh Kết quả ${i+1}/${newResultsInDom.length} ---`);
        try {
            const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);
            
            // Tải trực tiếp từ src (Source Extraction) - Ưu tiên vì nhanh và chuẩn nhất
            if (item.src) {
                try {
                    if (item.src.startsWith('data:image')) {
                        const content = item.src.split('base64,')[1];
                        await fs.writeFile(outputPath, Buffer.from(content, 'base64'));
                    } else if (item.src.startsWith('blob:')) {
                        const base64Data = await page.evaluate(async (blobUrl) => {
                            const resp = await fetch(blobUrl);
                            const blob = await resp.blob();
                            return new Promise((r) => {
                                const reader = new FileReader();
                                reader.onloadend = () => r(reader.result);
                                reader.readAsDataURL(blob);
                            });
                        }, item.src);
                        const content = base64Data.split('base64,')[1];
                        await fs.writeFile(outputPath, Buffer.from(content, 'base64'));
                    } else {
                        const arrayBuffer = await page.evaluate(async (url) => {
                            const res = await fetch(url);
                            const buffer = await res.arrayBuffer();
                            return Array.from(new Uint8Array(buffer));
                        }, item.src);
                        await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
                    }
                    
                    console.log(`[Flow] ✅ Đã tải xong ảnh kết quả ${i+1}`);

                    if (typeof onImageReady === 'function') {
                        await onImageReady(outputPath);
                        processedCount++;
                    }
                    continue;
                } catch (sourceErr) {
                    console.log(`[Flow] Lỗi tải trực tiếp (${sourceErr.message}), lùi về click UI...`);
                }
            }

            // Fallback UI Click nếu Source Extraction lỗi (Dùng cho 2K/4K sau này nếu cần)
            await page.mouse.move(item.rect.x, item.rect.y);
            await delay(1000);
            await page.keyboard.press('Escape'); // Đảm bảo menu cũ đã đóng
        } catch (err) {
            console.log(`[Flow] Bỏ qua ảnh lỗi: ${err.message}`);
        }
    }

    console.log(`[Flow] ========================================`);
    console.log(`[Flow] HOÀN TẤT: ${processedCount}/4 ảnh đã tải và upload thành công!`);
    console.log(`[Flow] ========================================`);

    await page.close().catch(() => null);
    return [];
  } catch (error) {
    console.error(`[Flow] Lỗi nghiêm trọng:`, error);
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
      permissions: ['clipboard-read', 'clipboard-write'],
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
