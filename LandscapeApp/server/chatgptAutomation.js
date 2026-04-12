const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright-core');

const CHATGPT_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'chatgpt_profile');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const IMAGE_MODE_PLACEHOLDER_KEYWORDS = ['hình ảnh', 'image'];
const IMAGE_MODE_MENU_PATTERNS = [/^Tạo hình ảnh$/i, /^Tạo ảnh$/i, /^Create image$/i, /^Image$/i];

function resolveBrowserExecutable() {
  const executablePath = CHROME_CANDIDATES.find(candidate => require('fs').existsSync(candidate));
  if (!executablePath) {
    throw new Error('Không tìm thấy Chrome hoặc Edge để chạy tự động ChatGPT.');
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
  if (!content) {
    throw new Error('Data URL không hợp lệ.');
  }

  await fs.writeFile(filePath, Buffer.from(content, 'base64'));
  return { filePath, mimeType: mimePart };
}

async function downloadAssetToFile(asset, targetDir, index) {
  const url = (asset.url || '').trim();

  if (!url) {
    throw new Error(`Asset "${asset.label}" có URL rỗng, không thể tải.`);
  }

  if (url.startsWith('data:')) {
    const filePath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(asset.label)}.png`);
    return saveDataUrlToFile(url, filePath);
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    throw new Error(`Asset "${asset.label}" có URL không hợp lệ: ${url.slice(0, 60)}`);
  }

  let extensionFromUrl = 'png';
  try {
    const ext = path.extname(new URL(url).pathname || '').replace('.', '');
    if (ext) extensionFromUrl = ext;
  } catch (_) { /* giữ mặc định png */ }

  const filePath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(asset.label)}.${extensionFromUrl}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Không tải được tài nguyên: ${asset.label}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return { filePath, mimeType: response.headers.get('content-type') || 'image/png' };
}

async function findPromptInput(page) {
  const selectors = ['#prompt-textarea', '[contenteditable="true"]'];
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count()) {
      return locator;
    }
  }
  throw new Error('Không tìm thấy ô nhập prompt của ChatGPT. Hãy kiểm tra trạng thái đăng nhập.');
}

async function isImageModeActive(page) {
  try {
    return await page.evaluate(keywords => {
      const input = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
      const placeholder = (input?.getAttribute('placeholder') || '').toLowerCase();
      if (keywords.some(keyword => placeholder.includes(keyword))) {
        return true;
      }

      const composer = input?.closest('form') || input?.parentElement;
      if (!composer) {
        return false;
      }

      const labels = Array.from(composer.querySelectorAll('button, [role="button"], span, a'))
        .map(node => (node.textContent || '').trim().toLowerCase())
        .filter(Boolean);

      return labels.includes('ảnh') || labels.includes('image');
    }, IMAGE_MODE_PLACEHOLDER_KEYWORDS);
  } catch (_) {
    return false;
  }
}

async function waitForImageMode(page, timeout = 8000) {
  await page.waitForFunction(keywords => {
    const input = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
    const placeholder = (input?.getAttribute('placeholder') || '').toLowerCase();
    if (keywords.some(keyword => placeholder.includes(keyword))) {
      return true;
    }

    const composer = input?.closest('form') || input?.parentElement;
    if (!composer) {
      return false;
    }

    return Array.from(composer.querySelectorAll('button, [role="button"], span, a'))
      .some(node => ['ảnh', 'image'].includes((node.textContent || '').trim().toLowerCase()));
  }, IMAGE_MODE_PLACEHOLDER_KEYWORDS, { timeout });
}

async function clickImageModeMenuItem(page) {
  const menuSelector = 'div[role="menuitem"], button[role="menuitem"], [data-testid*="item"]';

  for (const pattern of IMAGE_MODE_MENU_PATTERNS) {
    const item = page.locator(menuSelector).filter({ hasText: pattern }).first();
    if (!await item.count()) {
      continue;
    }

    try {
      await item.waitFor({ state: 'visible', timeout: 1500 });
      await item.click();
      return true;
    } catch (_) {
      // Thử matcher tiếp theo nếu item vừa biến mất hoặc chưa click được.
    }
  }

  return false;
}

async function enableImageMode(page) {
  console.log("-> Đang kích hoạt chế độ Tạo Hình Ảnh...");
  if (await isImageModeActive(page)) {
    console.log('✅ Đã ở chế độ Tạo Hình Ảnh từ trước.');
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const input = await findPromptInput(page);
      await input.click();
      await delay(150);
      await clearTextarea(page);

      await page.keyboard.insertText('/');
      await delay(900);

      const clicked = await clickImageModeMenuItem(page);
      if (!clicked) {
        await page.keyboard.press('Enter');
      }

      await waitForImageMode(page);
      console.log('✅ XÁC NHẬN: Hệ thống đã chuyển sang chế độ Tạo Hình Ảnh thành công.');
      return;
    } catch (error) {
      console.warn(`⚠️ Lần ${attempt}/3 chưa kích hoạt được chế độ hình ảnh: ${error.message}`);
      await clearTextarea(page);
      await delay(1000);
    }
  }

  throw new Error('Không thể chuyển ChatGPT sang chế độ Tạo Hình Ảnh.');
}

async function clearTextarea(page) {
  try {
    const input = await findPromptInput(page);
    await input.focus();
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await delay(200);
  } catch (e) {}
}


async function waitForUploadPreviews(page, expectedCount) {
  try {
    await page.waitForFunction(expected => {
      const input = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
      const composer = input?.closest('form') || input?.parentElement;
      if (!composer) {
        return false;
      }

      const selectors = [
        '[data-testid*="attachment"] img',
        '[data-testid*="preview"] img',
        'img[src^="blob:"]',
        'img[src^="data:"]',
        'button[aria-label*="Remove"]',
        'button[aria-label*="Xóa"]'
      ];

      const maxCount = selectors.reduce((count, selector) => {
        return Math.max(count, composer.querySelectorAll(selector).length);
      }, 0);

      return maxCount >= expected;
    }, expectedCount, { timeout: 15000 });
  } catch (_) {
    await delay(1500);
  }
}


async function uploadFiles(page, filePaths, attempt = 0) {
  const targetFiles = filePaths.slice(0, 3);
  const fileInputs = [
    page.locator('#upload-photos'),
    page.locator('input[type="file"]')
  ];

  for (const locator of fileInputs) {
    if (await locator.count()) {
      await locator.first().setInputFiles(targetFiles);
      await waitForUploadPreviews(page, targetFiles.length);
      await delay(1000); // Đợi để ChatGPT phản hồi

      // Kiểm tra xem có hiện lỗi Đỏ (VD: Tối đa 0 lần tải lên) không
      const errorVisible = await page.evaluate(() => {
        const errors = Array.from(document.querySelectorAll('div, span')).filter(n => 
           n.textContent.includes('Không thể tải lên') || n.textContent.includes('Tối đa 0')
        );
        return errors.length > 0;
      });

      if (errorVisible) {
        if (attempt >= 1) {
          throw new Error('ChatGPT từ chối upload file sau khi đã thử lại.');
        }
        console.warn('⚠️ Phát hiện lỗi Upload của ChatGPT (0 lần tải lên). Đang thử Refresh trang...');
        await page.reload();
        await page.waitForSelector('#prompt-textarea, [contenteditable="true"]', { timeout: 30000 });
        await delay(3000);
        await enableImageMode(page);
        return uploadFiles(page, targetFiles, attempt + 1);
      }
      return;
    }
  }

  throw new Error('Không tìm thấy vùng upload file trên ChatGPT.');
}

async function fillPrompt(page, prompt) {
  await clearTextarea(page);
  const promptInput = await findPromptInput(page);
  await promptInput.click();
  await delay(100);
  await page.keyboard.insertText(prompt);
  await delay(200);
}

async function countEditButtons(page) {
  return page.evaluate(() => {
    const keywords = ['Chỉnh sửa', 'Edit'];
    return Array.from(document.querySelectorAll('*')).filter(node => {
      const text = node.textContent?.trim();
      return Boolean(text) && keywords.includes(text) && node.children.length <= 1;
    }).length;
  });
}

async function waitForImageCompletion(page, previousCount) {
  // Chạy đồng thời: vừa chờ ảnh xong, vừa định kỳ quét và đóng popup chặn
  let dialogPollInterval;

  const dialogPoller = new Promise(resolve => {
    dialogPollInterval = setInterval(async () => {
      try {
        const dismissed = await page.evaluate(() => {
          const keywords = ['Đã hiểu', 'OK', 'Got it', 'Understood', 'Đồng ý', 'Tiếp tục', 'Continue'];
          const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
          const target = buttons.find(btn => {
            const text = btn.textContent?.trim() || '';
            return keywords.some(kw => text === kw || text.includes(kw));
          });
          if (target) { target.click(); return true; }
          return false;
        });
        if (dismissed) {
          console.log('[Dialog Poller] Đã tự động đóng popup chặn trong lúc chờ ảnh...');
        }
      } catch (_) { /* Bỏ qua lỗi khi page đang loading */ }
    }, 3000);
    // resolve không bao giờ gọi - interval chạy cho đến khi cleared
    void resolve;
  });

  try {
    await page.waitForFunction(prev => {
      const keywords = ['Chỉnh sửa', 'Edit'];
      const count = Array.from(document.querySelectorAll('*')).filter(node => {
        const text = node.textContent?.trim();
        return Boolean(text) && keywords.includes(text) && node.children.length <= 1;
      }).length;
      return count > prev;
    }, previousCount, { timeout: 240000 });
  } finally {
    clearInterval(dialogPollInterval);
  }

  await delay(8000);
}

async function handleVariantSelection(page) {
  // Phát hiện nếu ChatGPT đưa ra câu hỏi chọn phương án (2 nút lựa chọn)
  const hasVariantPicker = await page.evaluate(() => {
    const variantKeywords = [
      'Phương án 1', 'Phương án 2',
      'Tùy chọn 1', 'Tùy chọn 2',
      'Option 1', 'Option 2',
      'Option A', 'Option B',
      'Lựa chọn 1', 'Lựa chọn 2',
      'Variant 1', 'Variant 2'
    ];
    const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
    const matched = buttons.filter(btn => {
      const text = btn.textContent?.trim() || '';
      return variantKeywords.some(kw => text.includes(kw));
    });
    return matched.length >= 2;
  });

  if (hasVariantPicker) {
    console.log('[Variant Picker] Phát hiện ChatGPT đưa ra 2 phương án, chọn ngẫu nhiên...');
    await page.evaluate(() => {
      const variantKeywords = [
        'Phương án 1', 'Phương án 2',
        'Tùy chọn 1', 'Tùy chọn 2',
        'Option 1', 'Option 2',
        'Option A', 'Option B',
        'Lựa chọn 1', 'Lựa chọn 2',
        'Variant 1', 'Variant 2'
      ];
      const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
      const matched = buttons.filter(btn => {
        const text = btn.textContent?.trim() || '';
        return variantKeywords.some(kw => text.includes(kw));
      });
      if (matched.length >= 2) {
        // Chọn ngẫu nhiên
        const pick = matched[Math.floor(Math.random() * matched.length)];
        pick.click();
      }
    });
    console.log('[Variant Picker] Đã bấm lựa chọn, chờ ảnh render...');
    await delay(3000);
    // Chờ thêm ảnh hoàn thiện sau khi select
    await page.waitForFunction(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.some(img => img.src && !img.src.includes('avatar') && !img.src.includes('logo') && img.width > 200);
    }, { timeout: 120000 });
    await delay(5000);
  }
}

async function tryNativeDownload(page, outputPath) {
  console.log("Cố gắng tải ảnh bằng cách click giao diện...");
  const [downloadHandle] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.evaluate(() => {
      const keywords = ['Chỉnh sửa', 'Edit'];
      const nodes = Array.from(document.querySelectorAll('*'));
      let editNode = null;

      for (let index = nodes.length - 1; index >= 0; index -= 1) {
        const text = nodes[index].textContent?.trim();
        if (text && keywords.includes(text) && nodes[index].children.length <= 1) {
          editNode = nodes[index];
          break;
        }
      }

      if (!editNode) return false;

      let container = editNode.parentElement;
      while (container && container !== document.body) {
        const buttons = Array.from(container.querySelectorAll('button, a, [role="button"]'));
        if (buttons.length >= 2) {
          const downloadButton = buttons.find(button => button !== editNode && !editNode.contains(button) && !button.contains(editNode));
          if (downloadButton) {
            downloadButton.click();
            return true;
          }
        }
        container = container.parentElement;
      }
      return false;
    }).then(clicked => {
      if (!clicked) throw new Error('Không bấm được nút tải ảnh qua giao diện.');
    })
  ]);

  await downloadHandle.saveAs(outputPath);
  return outputPath;
}

async function tryFetchImage(page, outputPath) {
  console.log("Kích hoạt tải ảnh qua Blob fetch nội bộ...");
  const [downloadHandle] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll('img'));
      const validImages = images.filter(image => image.src && !image.src.includes('avatar') && !image.src.includes('logo') && image.width > 200);
      const imageUrl = validImages.length ? validImages[validImages.length - 1].src : null;
      if (!imageUrl) throw new Error('Không tìm thấy ảnh.');
      
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const tempUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = tempUrl;
      a.download = 'chatgpt_result.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(tempUrl);
    })
  ]);
  
  await downloadHandle.saveAs(outputPath);
  return outputPath;
}

async function waitUntilClear(page, label) {
  const DIALOG_KEYWORDS = ['Đã hiểu', 'OK', 'Got it', 'Understood', 'Đồng ý', 'Tiếp tục', 'Continue'];
  const BLOCK_PHRASES  = ['Quá nhiều yêu cầu', 'Too many requests', 'Rate limit', 'temporarily limited'];
  const maxWait = 120000; // 2 phút tối đa
  const pollInterval = 2000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    try {
      const result = await page.evaluate((dkw, bph) => {
        // Tìm và bấm nút dismiss
        const buttons = Array.from(document.querySelectorAll('button, [role="button"]'));
        const btn = buttons.find(b => dkw.some(k => (b.textContent?.trim() || '').includes(k)));
        if (btn) { btn.click(); return 'dismissed'; }
        // Kiểm tra còn dialog chặn không
        const blocked = bph.some(ph => document.body?.innerText?.includes(ph));
        return blocked ? 'blocked' : 'clear';
      }, DIALOG_KEYWORDS, BLOCK_PHRASES);

      if (result === 'dismissed') {
        console.log(`[${label}] Đã bấm "Đã hiểu", chờ dialog đóng...`);
        await delay(3000);
        continue; // Kiểm tra lại lần nữa
      }
      if (result === 'clear') return; // Sạch - tiếp tục
      // result === 'blocked' - dialog còn đó chờ thêm
      console.log(`[${label}] Đang chờ ChatGPT bỏ giới hạn... (${Math.round((Date.now()-start)/1000)}s)`);
    } catch (_) { return; }
    await delay(pollInterval);
  }
  console.log(`[${label}] Vượt quá thời gian chờ dialog, tiếp tục...`);
}

async function dismissRateLimitDialog(page) {
  await waitUntilClear(page, 'Dialog');
}

async function runSingleVariant(page, prompt, filePaths, tempDir, variantNumber, onImageReady) {
  try {
    // 1. Truy cập trang chủ
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    await delay(2500); // Chờ để ChatGPT quyết định có redirect về Chat cũ hay không

    // 2. Kiểm tra nếu bị văng vào chat cũ (URL có /c/)
    if (page.url().includes('/c/')) {
        console.log(`[Tab ${variantNumber}] Bị chuyển vào Chat cũ, đang ép tạo Chat mới...`);
        // Thử click nút "Đoạn chat mới" ở Sidebar hoặc dùng phím tắt
        const newChatBtn = page.locator('[data-testid="sidebar-new-chat-button"], a[href="/"], button:has-text("Đoạn chat mới"), button:has-text("New chat")').first();
        if (await newChatBtn.isVisible()) {
            await newChatBtn.click();
            await delay(1500);
        } else {
            // Nếu không thấy nút, ta dùng URL sạch bậc cao nhất
            await page.goto('https://chatgpt.com/?oai-dm=1');
            await delay(2000);
        }
    }
    
    await page.waitForSelector('#prompt-textarea, [contenteditable="true"]', { timeout: 30000 });

    // 3. Xóa sạch rác (nếu có) trước khi bắt đầu
    await clearTextarea(page);

    // 4. Kích hoạt chế độ hình ảnh và bắt đầu tiến trình
    await enableImageMode(page);

    await uploadFiles(page, filePaths);

    await fillPrompt(page, prompt);

    // Đóng dialog "Quá nhiều yêu cầu" hoặc bất kỳ popup chặn nào nếu có
    await dismissRateLimitDialog(page);

    const editCountBefore = await countEditButtons(page);
    const input = await findPromptInput(page);

    // Chờ cho đến khi nút gửi sáng lên (nghĩa là ảnh đã được upload xong)
    console.log(`[Tab ${variantNumber}] Đang chờ ảnh tải lên hoàn tất để bấm Gửi...`);
    let sendBtn = null;
    for (let attempt = 0; attempt < 15; attempt++) {
      sendBtn = await page.locator('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="Gửi"]').first();
      if (await sendBtn.isVisible() && !(await sendBtn.isDisabled())) {
        break;
      }
      await delay(1000);
    }

    if (sendBtn && await sendBtn.isVisible() && !(await sendBtn.isDisabled())) {
      await sendBtn.click();
    } else {
      console.log(`[Tab ${variantNumber}] Nút gửi chưa sẵn sàng, thử nhấn Enter...`);
      await input.press('Enter');
    }
    console.log(`[Tab ${variantNumber}] Đã gửi prompt, đang chờ ChatGPT xử lý...`);

    // Sau khi gửi, vẫn kiểm tra lần nữa nếu dialog xuất hiện
    await delay(2000);
    await dismissRateLimitDialog(page);

    console.log(`[Tab ${variantNumber}] Đang chờ ChatGPT hoàn thiện hình ảnh...`);
    await waitForImageCompletion(page, editCountBefore);

    // Xử lý nếu ChatGPT đưa ra 2 lựa chọn phương án để người dùng chọn
    await handleVariantSelection(page);

    const outputPath = path.join(tempDir, `chatgpt_result_${Date.now()}_tab${variantNumber}.png`);
    await tryFetchImage(page, outputPath);
    
    console.log(`[Tab ${variantNumber}] Đã tiếp nhận và tải ảnh thành công!`);
    // Gọi callback ngay lập tức để upload không chờ tab khác
    if (typeof onImageReady === 'function') {
      await onImageReady(outputPath);
    }
    await page.close().catch(() => null);
    return outputPath;
  } catch (error) {
    console.error(`[Tab ${variantNumber}] Lỗi:`, error);
    await page.close().catch(() => null);
    return null;
  }
}

async function runChatGptAutomation({ prompt, assets, onImageReady }) {
  const tempDir = path.join(os.tmpdir(), `landscape-chatgpt-${Date.now()}`);
  await ensureDirectory(tempDir);

  const inputFiles = [];
  let browser;

  try {
    for (let index = 0; index < assets.length; index += 1) {
      inputFiles.push(await downloadAssetToFile(assets[index], tempDir, index));
    }

    browser = await chromium.launchPersistentContext(CHATGPT_PROFILE_DIR, {
      executablePath: resolveBrowserExecutable(),
      headless: false,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    let outputPaths = [];
    const filePaths = inputFiles.map(file => file.filePath);
    const defaultPage = browser.pages()[0];

    // CHẠY TUẦN TỰ (SEQUENTIAL) THEO YÊU CẦU: Xong tab 1 mới mở tab 2
    for (let variant = 1; variant <= 2; variant++) {
      console.log(`[AUTO] Bắt đầu xử lý phương án #${variant}...`);
      const targetPage = variant === 1 && defaultPage ? defaultPage : await browser.newPage();
      
      // Đợi hoàn thành các bước up hình và gửi prompt của tab này xong xuôi
      const result = await runSingleVariant(targetPage, prompt, filePaths, tempDir, variant, onImageReady);
      
      if (result) {
        outputPaths.push(result);
      }
      
      // Nghỉ một chút giữa 2 tab để ChatGPT không bị quá tải
      await delay(3000);
    }

    // Kết quả cuối cùng
    console.log(`[AUTO] Tổng cộng thu được ${outputPaths.length}/2 ảnh.`);

    // Retry: nếu thiếu ảnh, tạo thêm tab mới cho đến khi đủ 2
    let retryAttempt = 0;
    while (outputPaths.length < 2 && retryAttempt < 2) {
      const missing = 2 - outputPaths.length;
      console.log(`[RETRY] Cần tạo thêm ${missing} ảnh (lần ${retryAttempt + 1})...`);
      await delay(5000); // Chờ để tránh rate limit
      for (let i = 0; i < missing; i++) {
        await delay(2000);
        const retryPage = await browser.newPage();
        const retryResult = await runSingleVariant(
          retryPage,
          prompt,
          filePaths,
          tempDir,
          outputPaths.length + 1,
          onImageReady
        );
        if (retryResult) {
          outputPaths.push(retryResult);
        }
      }
      retryAttempt++;
    }

    console.log(`[AUTO] Tổng cộng thu được ${outputPaths.length}/2 ảnh.`);
    return { outputPaths, chatUrl: 'https://chatgpt.com' };
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
    await Promise.all(inputFiles.map(file => fs.unlink(file.filePath).catch(() => null)));
  }
}

module.exports = {
  runChatGptAutomation
};
