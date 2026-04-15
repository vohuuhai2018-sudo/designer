const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
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

async function buildClipboardPayload(files) {
  const payload = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const imageBuffer = await fs.readFile(file.filePath);
    payload.push({
      base64: imageBuffer.toString('base64'),
      mimeType: file.mimeType || 'image/png',
      name: path.basename(file.filePath) || `image_${index + 1}.png`
    });
  }
  return payload;
}

async function resolveVisiblePromptSelector(page) {
  return page.evaluate(() => {
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      'div[role="textbox"]'
    ];

    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 20
        && rect.height > 20;
    };

    const candidates = selectors.flatMap((selector) =>
      Array.from(document.querySelectorAll(selector)).map((element) => ({ selector, element }))
    ).filter(({ element }) => isVisible(element) && !element.closest('[aria-hidden="true"]'));

    candidates.sort((a, b) => {
      const aRect = a.element.getBoundingClientRect();
      const bRect = b.element.getBoundingClientRect();
      return bRect.top - aRect.top;
    });

    if (candidates[0]) {
      return candidates[0].selector;
    }

    return null;
  });
}

async function getPromptLocator(page) {
  const selector = await resolveVisiblePromptSelector(page);
  if (!selector) {
    throw new Error('Khong tim thay o nhap prompt dang hien thi tren Flow.');
  }
  return page.locator(selector).filter({ hasNot: page.locator('[aria-hidden="true"]') }).last();
}

async function waitForPromptInputReady(page) {
  await page.waitForFunction(() => {
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], div[role="textbox"]'));
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 20
        && rect.height > 20;
    };

    return candidates.some((element) => {
      if (!isVisible(element)) return false;
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
        return !element.disabled && !element.readOnly;
      }
      return element.getAttribute('contenteditable') === 'true' || element.getAttribute('role') === 'textbox';
    });
  }, { timeout: 30000 });
}

async function readPromptText(page) {
  return page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], div[role="textbox"]'));
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 20
        && rect.height > 20;
    };

    const target = candidates
      .filter((element) => isVisible(element) && !element.closest('[aria-hidden="true"]'))
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
    if (!target) return '';

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      return target.value || '';
    }

    return target.textContent || '';
  });
}

async function setPromptTextViaDom(page, prompt) {
  return page.evaluate((text) => {
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], div[role="textbox"]'));
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 20
        && rect.height > 20;
    };

    const target = candidates
      .filter((element) => isVisible(element) && !element.closest('[aria-hidden="true"]'))
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
    if (!target) {
      return { ok: false, reason: 'prompt-not-found' };
    }

    target.focus();

    if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
      target.value = text;
      target.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        data: text,
        inputType: 'insertText'
      }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: (target.value || '').includes(text.slice(0, 20)) };
    }

    target.textContent = text;
    target.dispatchEvent(new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    }));
    target.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: text,
      inputType: 'insertText'
    }));
    return { ok: (target.textContent || '').includes(text.slice(0, 20)) };
  }, prompt);
}

async function pasteAssetsIntoPrompt(page, clipboardFiles) {
  await waitForPromptInputReady(page);
  const promptBox = await getPromptLocator(page);
  await promptBox.waitFor({ state: 'visible', timeout: 30000 });
  await promptBox.click();

  await page.evaluate(async ({ files }) => {
    const candidates = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], div[role="textbox"]'));
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && rect.width > 20
        && rect.height > 20
        && !element.closest('[aria-hidden="true"]');
    };

    const target = candidates
      .filter((element) => isVisible(element))
      .sort((a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top)[0];
    if (!target) {
      throw new Error('Khong tim thay o nhap prompt de dan anh.');
    }

    const dataTransfer = new DataTransfer();
    for (const fileInfo of files) {
      const response = await fetch(`data:${fileInfo.mimeType};base64,${fileInfo.base64}`);
      const blob = await response.blob();
      dataTransfer.items.add(new File([blob], fileInfo.name, { type: fileInfo.mimeType }));
    }

    target.dispatchEvent(new ClipboardEvent('paste', {
      clipboardData: dataTransfer,
      bubbles: true,
      cancelable: true
    }));
  }, { files: clipboardFiles });

  return promptBox;
}

async function waitForPromptAssetsReady(page, expectedCount) {
  console.log(`[Flow] Dang cho Flow upload xong ${expectedCount} anh input...`);

  await page.waitForFunction((count) => {
    var allImgs = Array.from(document.querySelectorAll('img'));
    var assets = allImgs.filter(function(img) {
      if (!(img instanceof HTMLImageElement)) return false;
      var s = window.getComputedStyle(img);
      var r = img.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      if (r.width < 30 || r.height < 30) return false;
      if (!img.complete && img.naturalWidth === 0) return false;
      var src = img.currentSrc || img.src || '';
      if (!src) return false;
      if (/avatar|profile|googleusercontent|placeholder|logo|icon|discord|instagram|x-logo|favicon/i.test(src)) return false;
      if (src.endsWith('.svg')) return false;
      return true;
    });
    if (assets.length < count) return false;
    var hasPending = !!document.querySelector('[role="progressbar"], progress, [aria-busy="true"]');
    return !hasPending;
  }, expectedCount, { timeout: 120000 });

  const attachmentDebug = await page.evaluate(() => {
    var allImgs = Array.from(document.querySelectorAll('img'));
    var readyCount = allImgs.filter(function(img) {
      if (!(img instanceof HTMLImageElement)) return false;
      var s = window.getComputedStyle(img);
      var r = img.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      if (r.width < 30 || r.height < 30) return false;
      if (!img.complete && img.naturalWidth === 0) return false;
      var src = img.currentSrc || img.src || '';
      if (!src) return false;
      if (/avatar|profile|googleusercontent|placeholder|logo|icon|discord|instagram|x-logo|favicon/i.test(src)) return false;
      if (src.endsWith('.svg')) return false;
      return true;
    }).length;
    var sendButton = Array.from(document.querySelectorAll('button')).find(function(btn) {
      var text = (btn.textContent || '').trim();
      return /arrow_forward/i.test(text);
    });
    return {
      readyCount: readyCount,
      sendEnabled: !!sendButton && !sendButton.hasAttribute('disabled') && sendButton.getAttribute('aria-disabled') !== 'true'
    };
  });

  console.log(`[Flow] Upload input hoan tat: ${attachmentDebug.readyCount} attachment san sang, sendEnabled=${attachmentDebug.sendEnabled}.`);
  await delay(2000);
}

async function waitForComposerReadyToSubmit(page, expectedCount, prompt) {
  const promptNeedle = String(prompt || '').trim().slice(0, 20);

  await page.waitForFunction(({ count, promptSnippet }) => {
    // Đếm ảnh asset
    var assetCount = Array.from(document.querySelectorAll('img')).filter(function(img) {
      if (!(img instanceof HTMLImageElement)) return false;
      var s = window.getComputedStyle(img);
      var r = img.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      if (r.width < 30 || r.height < 30) return false;
      if (!img.complete && img.naturalWidth === 0) return false;
      var src = img.currentSrc || img.src || '';
      if (!src) return false;
      if (/avatar|profile|googleusercontent|placeholder|logo|icon|discord|instagram|x-logo|favicon/i.test(src)) return false;
      if (src.endsWith('.svg')) return false;
      return true;
    }).length;

    // Tìm textbox để kiểm tra prompt
    var candidates = Array.from(document.querySelectorAll('[contenteditable="true"], div[role="textbox"], textarea'));
    var textbox = candidates.filter(function(el) {
      if (!(el instanceof HTMLElement)) return false;
      var s = window.getComputedStyle(el);
      var r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 20 && r.height > 20 && !el.closest('[aria-hidden="true"]');
    }).sort(function(a, b) { return b.getBoundingClientRect().top - a.getBoundingClientRect().top; })[0];
    if (!textbox) return false;

    var promptValue = textbox instanceof HTMLTextAreaElement || textbox instanceof HTMLInputElement
      ? (textbox.value || '')
      : (textbox.textContent || '');

    var sendButton = Array.from(document.querySelectorAll('button')).find(function(btn) {
      return /arrow_forward/i.test(btn.textContent || '');
    });
    var sendEnabled = !!sendButton && !sendButton.hasAttribute('disabled') && sendButton.getAttribute('aria-disabled') !== 'true';

    var promptOk = promptSnippet ? promptValue.includes(promptSnippet) : promptValue.trim().length > 0;
    return assetCount >= count && promptOk && sendEnabled;
  }, { count: expectedCount, promptSnippet: promptNeedle }, { timeout: 60000 });

  const composerState = await page.evaluate(() => {
    var assetCount = Array.from(document.querySelectorAll('img')).filter(function(img) {
      if (!(img instanceof HTMLImageElement)) return false;
      var s = window.getComputedStyle(img);
      var r = img.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      if (r.width < 30 || r.height < 30) return false;
      if (!img.complete && img.naturalWidth === 0) return false;
      var src = img.currentSrc || img.src || '';
      if (!src) return false;
      if (/avatar|profile|googleusercontent|placeholder|logo|icon|discord|instagram|x-logo|favicon/i.test(src)) return false;
      if (src.endsWith('.svg')) return false;
      return true;
    }).length;

    var candidates = Array.from(document.querySelectorAll('[contenteditable="true"], div[role="textbox"], textarea'));
    var textbox = candidates.filter(function(el) {
      if (!(el instanceof HTMLElement)) return false;
      var s = window.getComputedStyle(el);
      var r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && r.width > 20 && r.height > 20 && !el.closest('[aria-hidden="true"]');
    }).sort(function(a, b) { return b.getBoundingClientRect().top - a.getBoundingClientRect().top; })[0];
    var promptValue = textbox instanceof HTMLTextAreaElement || textbox instanceof HTMLInputElement
      ? (textbox.value || '')
      : (textbox?.textContent || '');

    var sendButton = Array.from(document.querySelectorAll('button')).find(function(btn) {
      return /arrow_forward/i.test(btn.textContent || '');
    });

    return {
      readyCount: assetCount,
      promptLength: promptValue.trim().length,
      sendEnabled: !!sendButton && !sendButton.hasAttribute('disabled') && sendButton.getAttribute('aria-disabled') !== 'true'
    };
  });

  console.log(`[FlowV2] Composer ready: attachments=${composerState.readyCount}, promptLength=${composerState.promptLength}, sendEnabled=${composerState.sendEnabled}`);
}

async function preparePersistentContextPage(browserContext) {
  const existingPages = browserContext.pages().filter(page => !page.isClosed());
  const primaryPage = existingPages[0] || await browserContext.newPage();
  const extraPages = existingPages.slice(1);

  await Promise.all(extraPages.map(page => page.close().catch(() => null)));

  return primaryPage;
}

async function runFlowVariant(page, prompt, inputFiles, tempDir, onImageReady) {
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

async function fillPromptBox(promptBox, prompt) {
  await waitForPromptInputReady(promptBox.page());

  const currentPromptBox = await getPromptLocator(promptBox.page());
  await currentPromptBox.click();

  try {
    await currentPromptBox.fill(prompt);
  } catch (error) {
    console.log(`[FlowV2] fill() khong thanh cong, chuyen sang fallback: ${error.message}`);
  }

  let currentValue = await readPromptText(promptBox.page());
  if (currentValue.includes(prompt.slice(0, 20))) {
    return;
  }

  const domWriteResult = await setPromptTextViaDom(promptBox.page(), prompt);
  if (domWriteResult?.ok) {
    currentValue = await readPromptText(promptBox.page());
    if (currentValue.includes(prompt.slice(0, 20))) {
      return;
    }
  }

  await currentPromptBox.click();
  await promptBox.page().keyboard.down('Control');
  await promptBox.page().keyboard.press('a');
  await promptBox.page().keyboard.up('Control');
  await promptBox.page().keyboard.press('Backspace');
  await promptBox.page().keyboard.insertText(prompt);

  currentValue = await readPromptText(promptBox.page());
  if (!currentValue.includes(prompt.slice(0, 20))) {
    throw new Error('Da dan anh xong nhung khong the chen prompt vao o chat cua Flow.');
  }

  console.log(`[FlowV2] Prompt da vao o chat (${currentValue.trim().length} ky tu).`);
}

async function runFlowVariantV2(page, prompt, inputFiles, tempDir, onImageReady) {
  const outputPaths = [];
  let chatUrl = 'https://labs.google/fx/vi/tools/flow';

  try {
    console.log('[FlowV2] Truy cap trang chu Flow...');
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
    await delay(3000);

    try {
      const errorBackBtn = page.locator('button:has-text("Quay lại dự án"), button:has-text("Quay lai du an")');
      if (await errorBackBtn.count() > 0) {
        await errorBackBtn.first().click();
        await delay(2000);
      }

      const newProjBtn = page.locator('button, div').filter({ hasText: /Dự án mới|Du an moi|Nouveau projet/i }).last();
      if (await newProjBtn.count() > 0 && await newProjBtn.isVisible()) {
        await newProjBtn.click();
        await delay(3000);
      }
    } catch (error) {
      console.log(`[FlowV2] Bo qua buoc tao du an moi: ${error.message}`);
    }

    chatUrl = page.url();

    console.log(`[FlowV2] Dan cung luc ${inputFiles.length} anh vao Flow...`);
    const clipboardFiles = await buildClipboardPayload(inputFiles);
    const promptBox = await pasteAssetsIntoPrompt(page, clipboardFiles);
    await waitForPromptAssetsReady(page, inputFiles.length);

    console.log('[FlowV2] Nhap prompt sau khi attachment da san sang...');
    await fillPromptBox(promptBox, prompt);
    await delay(1000);

    try {
      const configBtn = page.locator('button').filter({ hasText: /Nano Banana|x/ }).first();
      if (await configBtn.count() > 0) {
        await configBtn.click();
        await delay(1000);

        const x4Btn = page.locator('button').filter({ hasText: /^x4$/ }).first();
        if (await x4Btn.count() > 0) {
          await x4Btn.click();
          await delay(500);
        }

        await promptBox.click();
      }
    } catch (error) {
      console.log(`[FlowV2] Bo qua loi chon x4: ${error.message}`);
    }

    await waitForComposerReadyToSubmit(page, inputFiles.length, prompt);

    const existingImgSources = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(img => img.width > 100 && !img.src.includes('avatar'))
        .map(img => img.src);
    });
    console.log(`[FlowV2] Da ghi nho ${existingImgSources.length} anh cu tren trang.`);

    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Gui"], button[aria-label*="Send"], button[aria-label*="Tạo"], button[aria-label*="Tao"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    console.log('[FlowV2] Dang cho Google Flow sinh ket qua anh...');
    try {
      await page.waitForFunction((oldSources) => {
        const currentImages = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        const newImages = currentImages.filter(img => !oldSources.includes(img.src));
        return newImages.length >= 4;
      }, existingImgSources, { timeout: 240000 });
    } catch (error) {
      console.log(`[FlowV2] Het thoi gian cho 4 anh moi, se xu ly nhung anh da co: ${error.message}`);
    }

    await delay(15000);

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

    console.log(`[FlowV2] Tim thay ${newResultsInDom.length} anh ket qua moi.`);

    let processedCount = 0;
    for (let index = 0; index < Math.min(newResultsInDom.length, 4); index += 1) {
      const item = newResultsInDom[index];
      const outputPath = path.join(tempDir, `flow_result_${Date.now()}_${index}.png`);

      try {
        if (!item.src) {
          continue;
        }

        if (item.src.startsWith('data:image')) {
          const content = item.src.split('base64,')[1];
          await fs.writeFile(outputPath, Buffer.from(content, 'base64'));
        } else if (item.src.startsWith('blob:')) {
          const base64Data = await page.evaluate(async (blobUrl) => {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }, item.src);
          const content = String(base64Data).split('base64,')[1];
          await fs.writeFile(outputPath, Buffer.from(content, 'base64'));
        } else {
          const arrayBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            return Array.from(new Uint8Array(buffer));
          }, item.src);
          await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        }

        outputPaths.push(outputPath);
        processedCount += 1;
        console.log(`[FlowV2] Da tai xong anh ket qua ${index + 1}`);

        if (typeof onImageReady === 'function') {
          await onImageReady(outputPath);
        }
      } catch (error) {
        console.log(`[FlowV2] Bo qua anh loi: ${error.message}`);
      }
    }

    console.log(`[FlowV2] Hoan tat: ${processedCount}/4 anh da tai va upload thanh cong.`);
    await page.close().catch(() => null);
    return { outputPaths, chatUrl };
  } catch (error) {
    console.error('[FlowV2] Loi nghiem trong:', error);
    await page.close().catch(() => null);
    return { outputPaths, chatUrl };
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

    const defaultPage = await preparePersistentContextPage(browser);

    console.log(`[AUTO-FLOW] Đang khởi động Google Labs Flow...`);
    
    const { outputPaths, chatUrl } = await runFlowVariantV2(defaultPage, prompt, inputFiles, tempDir, onImageReady);

    console.log(`[AUTO-FLOW] Hoàn tất. Lấy được ${outputPaths.length}/4 ảnh.`);
    return { outputPaths, chatUrl };
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
