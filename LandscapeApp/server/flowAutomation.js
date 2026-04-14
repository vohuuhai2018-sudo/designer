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

    // 2. Upload hình ảnh vào Flow
    console.log(`[Flow] Chuẩn bị up hình...`);
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(filePaths);
    } else {
        const addBtn = page.locator('button').filter({ hasText: 'add' }).last(); 
        if (await addBtn.count() > 0) {
            await addBtn.click();
            await delay(1000);
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 });
            await page.locator('button:has-text("Tải hình ảnh lên")').first().click();
            const fileChooser = await fileChooserPromise;
            await fileChooser.setFiles(filePaths);
        }
    }
    console.log(`[Flow] Bắt đầu nhận diện chờ ${filePaths.length} ảnh tải lên hoàn tất...`);
    // Chờ màn hình xuất hiện đủ 2 cái ảnh thumbnail nhỏ xinh trong ô Prompt
    try {
        await page.waitForFunction((expected) => {
            // Tìm tất cả các thẻ img (trừ thẻ avatar của tài khoản Google)
            // Thumbnail thường nhỏ, không phải ảnh to đùng ở giữa màn hình
            const imgs = Array.from(document.querySelectorAll('img')).filter(img => !img.src.includes('avatar'));
            const thumbnails = imgs.filter(img => img.width > 10 && img.width < 250);
            return thumbnails.length >= expected;
        }, filePaths.length, { timeout: 60000 });
        console.log(`[Flow] Tuyệt vời! Đã thấy đủ ${filePaths.length} ảnh thumbnail nhỏ hiển thị.`);
        await delay(2000); // Đợi UI lắng đọng thêm 1 chút cho chắc ăn
    } catch (e) {
        console.log(`[Flow] Cảnh báo: Quá thời gian chờ diện diện thumbnail, tiếp tục thực thi...`);
    }

    // --- BƯỚC 1: Click dấu + và chọn hình hiện trạng (Image 1) ---
    console.log(`[Flow] Bước 1: Mở bảng và chọn Ảnh Hiện Trạng...`);
    try {
        const addBtn = page.locator('button').filter({ hasText: 'add' }).last();
        if (await addBtn.count() > 0) {
            await addBtn.click();
            await delay(1500); // Đợi panel mở hẳn
            
            // Tìm mục "image.png" đầu tiên trong danh sách bên trái (như hình 4 anh gửi)
            const firstAssetItem = page.locator('div[role="dialog"] div, div[role="menu"] div, .asset-panel div')
                .filter({ hasText: 'image.png' })
                .first();
                
            if (await firstAssetItem.count() > 0) {
                await firstAssetItem.click();
                console.log(`[Flow] Đã hoàn thành Bước 1: Chọn Ảnh hiện trạng vào Prompt.`);
                await delay(1000);
            } else {
                // Sơ cua nếu không thấy chữ image.png thì click cái img đầu tiên
                await page.locator('div[role="dialog"] img, .asset-panel img').first().click();
            }
        }
    } catch (e) {
        console.log(`[Flow] Lỗi Bước 1: ${e.message}`);
    }

    // 4. Nhập Prompt
    console.log(`[Flow] Đang gửi Prompt...`);
    const promptBox = page.locator('textarea, [contenteditable="true"], div[role="textbox"]').first();
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

    // 5. Bấm Gửi
    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Send"], button[aria-label*="Tạo"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
        await sendBtn.click();
    } else {
        await page.keyboard.press('Enter');
    }

    console.log(`[Flow] Đang chờ Google Flow sinh kết quả ảnh... (tối đa 4 phút)`);

    // 6. Chờ kết quả: Đợi ít nhất 4 ảnh lớn mới xuất hiện
    try {
        await page.waitForFunction((numUploads) => {
            const images = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
            return images.length >= numUploads + 4; 
        }, filePaths.length, { timeout: 240000 });
    } catch (e) {
        console.log(`[Flow] Cảnh báo: Hết thời gian chờ ảnh xuất hiện. Thử xử lý những gì có...`);
    }

    // Đợi thêm cho ảnh render hoàn toàn (hết hiện %, loading)
    console.log(`[Flow] Đợi ảnh render hoàn toàn...`);
    await delay(15000);

    // 7. Tải xuống từng ảnh ngay lập tức (1K) - dùng Playwright hover thật
    console.log(`[Flow] Bắt đầu tải xuống ảnh...`);
    let processedCount = 0;
    
    for (let i = 0; i < 4; i++) {
        console.log(`[Flow] --- Ảnh ${i+1}/4 ---`);
        try {
            // Tìm tất cả ảnh lớn (kết quả) trên trang, lấy 4 cái cuối
            const allBigImages = page.locator('img').filter({ has: page.locator(':scope') });
            const bigImgCount = await allBigImages.count();
            
            // Lọc ảnh lớn bằng evaluate
            const imgIndex = await page.evaluate((idx) => {
                const imgs = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
                const targets = imgs.slice(-4);
                if (targets[idx]) {
                    targets[idx].scrollIntoView({ block: 'center' });
                    // Trả về boundingRect để Playwright hover đúng vị trí
                    const rect = targets[idx].getBoundingClientRect();
                    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, w: rect.width, h: rect.height };
                }
                return null;
            }, i);

            if (!imgIndex) {
                console.log(`[Flow] Không tìm thấy ảnh ${i+1}, bỏ qua.`);
                continue;
            }

            // Hover thật vào vị trí ảnh để hiện nút chức năng
            await page.mouse.move(imgIndex.x, imgIndex.y);
            await delay(1500);

            // Tìm nút 3 chấm (tooltip "Khác" hoặc icon more_vert)
            // Nút này xuất hiện ở góc phải trên của ảnh khi hover
            const moreBtn = page.locator('button[aria-label="Khác"], button:has-text("more_vert")').first();
            if (await moreBtn.count() > 0 && await moreBtn.isVisible()) {
                await moreBtn.click();
                console.log(`[Flow] Đã mở menu 3 chấm cho ảnh ${i+1}`);
            } else {
                // Fallback: click vào góc phải trên của ảnh
                await page.mouse.click(imgIndex.x + imgIndex.w / 2 - 10, imgIndex.y - imgIndex.h / 2 + 20);
                console.log(`[Flow] Click fallback cho ảnh ${i+1}`);
            }
            await delay(1000);

            // Tìm mục "Tải xuống" trong menu
            const dlItem = page.locator('[role="menuitem"]').filter({ hasText: /Tải xuống|Download/i });
            if (await dlItem.count() > 0) {
                // Hover vào "Tải xuống" để mở submenu
                await dlItem.first().hover();
                await delay(1200);

                // Setup download listener trước khi click
                const downloadPromise = page.waitForEvent('download', { timeout: 60000 });

                // Click mục "1K" (Kích thước gốc) 
                const item1K = page.locator('[role="menuitem"]').filter({ hasText: '1K' }).first();
                if (await item1K.count() > 0 && await item1K.isVisible()) {
                    await item1K.click();
                    console.log(`[Flow] Đã click 1K, đang chờ tải xuống...`);
                    
                    const download = await downloadPromise;
                    const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${i}.png`);
                    await download.saveAs(outputPath);
                    console.log(`[Flow] ✅ Đã tải xong ảnh ${i+1} vào: ${outputPath}`);
                    
                    // Upload lên hệ thống NGAY LẬP TỨC
                    if (typeof onImageReady === 'function') {
                        await onImageReady(outputPath);
                        console.log(`[Flow] ✅ Đã upload ảnh ${i+1} lên hệ thống!`);
                    }
                    processedCount++;
                } else {
                    console.log(`[Flow] Không thấy mục 1K, bỏ qua ảnh ${i+1}`);
                }
            } else {
                console.log(`[Flow] Không thấy menu Tải xuống, bỏ qua ảnh ${i+1}`);
            }

            // Đóng menu
            await page.keyboard.press('Escape');
            await delay(800);

        } catch (err) {
            console.log(`[Flow] Bỏ qua ảnh ${i+1} do lỗi: ${err.message}`);
            await page.keyboard.press('Escape').catch(() => {});
            await delay(500);
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
