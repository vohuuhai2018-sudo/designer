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

// Tự động bấm "Tôi đồng ý" nếu gặp dialog thông báo của Google Flow
async function dismissConsentDialog(page) {
  try {
    const agreeBtn = page.locator('button').filter({ hasText: /Tôi đồng ý|I agree|Đồng ý|Accept/ }).first();
    if (await agreeBtn.count() > 0 && await agreeBtn.isVisible()) {
      await agreeBtn.click();
      await delay(1000);
      console.log('[Flow] Đã bấm "Tôi đồng ý" trên dialog thông báo.');
      return true;
    }
  } catch (_) {}
  return false;
}

// Background watcher: check dialog consent mỗi 3s trong suốt thời gian tab hoạt động
function startDialogWatcher(page, label = 'tab') {
  let stopped = false;
  (async () => {
    while (!stopped) {
      try {
        if (page.isClosed && page.isClosed()) break;
        const clicked = await dismissConsentDialog(page);
        if (clicked) console.log(`[DialogWatcher][${label}] Tự tắt dialog giữa chừng.`);
      } catch (_) {}
      await delay(3000);
    }
  })();
  return () => { stopped = true; };
}

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
        && rect.width > 100
        && rect.height >= 16;
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
        && rect.width > 100
        && rect.height >= 16;
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
        && rect.width > 100
        && rect.height >= 16;
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
        && rect.width > 100
        && rect.height >= 16;
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

// Đếm số attachment thumbnail đang có trong composer area (vùng quanh textbox prompt + nút send)
async function countComposerAttachments(page) {
  return await page.evaluate(() => {
    const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (!target) return 0;
    let composer = target;
    for (let i = 0; i < 10; i++) {
      if (!composer.parentElement) break;
      composer = composer.parentElement;
      if ((composer.textContent || '').includes('arrow_forward')) break;
    }
    const imgs = Array.from(composer.querySelectorAll('img')).filter((img) => {
      const src = img.currentSrc || img.src || '';
      // Thumbnail upload có pattern này, không phải avatar/icon
      if (!/media\.getMediaUrlRedirect|labs\.google\/fx\/api\/trpc\/media/i.test(src)) return false;
      if (!img.complete || img.naturalWidth === 0) return false;
      const r = img.getBoundingClientRect();
      return r.width >= 20 && r.height >= 20;
    });
    return imgs.length;
  });
}

// Paste 1 ảnh bằng phương thức THẬT: navigator.clipboard.write() + Meta+V / Ctrl+V
// Lý do: Flow của Google bỏ qua synthetic ClipboardEvent dispatch; phải dùng paste real từ keyboard.
// LƯU Ý: navigator.clipboard.write() yêu cầu page có FOCUS (Document is focused) — nếu Playwright
// chạy trong cửa sổ background, nó sẽ throw "Document is not focused".
async function pasteSingleImageReal(page, fileInfo) {
  // 1. Bring page to front để có focus thật
  let bringOk = true;
  try { await page.bringToFront(); } catch (e) { bringOk = false; /* ignore */ }

  // 2. Click vào textbox composer trước để document có user activation + element focus
  const promptBox = await getPromptLocator(page);
  await promptBox.click();
  await delay(150);

  // 3. Set clipboard với image; nếu Playwright window không focus, thử bringToFront + retry
  const writeResult = await page.evaluate(async ({ b64, mimeType }) => {
    const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (!target) return { ok: false, error: 'no_textbox' };
    target.focus();

    let blob;
    try {
      const resp = await fetch(`data:${mimeType};base64,${b64}`);
      blob = await resp.blob();
    } catch (fetchErr) {
      return { ok: false, error: 'fetch_failed:' + fetchErr.message };
    }

    // navigator.clipboard.write chỉ chấp nhận image/png — convert JPEG/WebP/etc về PNG qua canvas
    if (mimeType !== 'image/png') {
      try {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('image_load_failed'));
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
        URL.revokeObjectURL(url);
        mimeType = 'image/png';
      } catch (convErr) {
        return { ok: false, error: 'png_convert_failed:' + convErr.message };
      }
    }

    if (!document.hasFocus()) {
      return { ok: false, error: 'document_not_focused', blobSize: blob.size };
    }

    try {
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
      return { ok: true, blobSize: blob.size, finalMime: mimeType };
    } catch (writeErr) {
      return { ok: false, error: 'clipboard_write_failed:' + writeErr.message, blobSize: blob.size };
    }
  }, { b64: fileInfo.base64, mimeType: fileInfo.mimeType });

  if (!writeResult.ok) {
    // Fallback: dùng CDP để set clipboard ở OS level (không cần document focus)
    console.log(`[Flow] navigator.clipboard.write that bai (${writeResult.error}); thu CDP Input.dispatchKeyEvent + clipboard fallback...`);
    const cdp = await page.context().newCDPSession(page);
    try {
      // CDP có Browser.grantPermissions để force-grant clipboard
      await cdp.send('Browser.grantPermissions', {
        origin: new URL(page.url()).origin,
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
      }).catch(() => {});

      // Bring page to front lại lần nữa
      await page.bringToFront().catch(() => {});
      await delay(300);

      // Click textbox lần nữa để có user activation tươi
      await promptBox.click();
      await delay(150);

      // Retry clipboard.write 1 lần (cũng convert JPEG/WebP -> PNG nếu cần)
      const retry = await page.evaluate(async ({ b64, mimeType }) => {
        try {
          const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
          target?.focus();
          const resp = await fetch(`data:${mimeType};base64,${b64}`);
          let blob = await resp.blob();
          if (mimeType !== 'image/png') {
            const url = URL.createObjectURL(blob);
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = () => reject(new Error('image_load_failed'));
              img.src = url;
            });
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext('2d').drawImage(img, 0, 0);
            blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
            URL.revokeObjectURL(url);
            mimeType = 'image/png';
          }
          if (!document.hasFocus()) return { ok: false, error: 'still_not_focused' };
          await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: 'retry_failed:' + e.message };
        }
      }, { b64: fileInfo.base64, mimeType: fileInfo.mimeType });

      if (!retry.ok) {
        throw new Error(`Khong set duoc clipboard: ${retry.error || writeResult.error}`);
      }
    } finally {
      await cdp.detach().catch(() => {});
    }
  }

  // 4. Click textbox lần cuối để đảm bảo focus, rồi nhấn Cmd+V / Ctrl+V
  await promptBox.click();
  await delay(150);
  const isMac = process.platform === 'darwin';
  const keyCombo = isMac ? 'Meta+V' : 'Control+V';
  const focusBeforePress = await page.evaluate(() => document.hasFocus()).catch(() => null);
  await page.keyboard.press(keyCombo);
  await delay(500);
  const immediateCount = await countComposerAttachments(page).catch(() => -1);
}

async function pasteAssetsIntoPrompt(page, clipboardFiles) {
  await waitForPromptInputReady(page);
  const promptBox = await getPromptLocator(page);
  await promptBox.waitFor({ state: 'visible', timeout: 30000 });
  await promptBox.click();

  for (let i = 0; i < clipboardFiles.length; i++) {
    const fileInfo = clipboardFiles[i];
    const expectedAfter = i + 1;

    let pastedOk = false;
    for (let attempt = 1; attempt <= 3 && !pastedOk; attempt++) {
      const before = await countComposerAttachments(page);
      console.log(`[Flow] Paste anh ${i + 1}/${clipboardFiles.length} (lan ${attempt}): hien co ${before} attachment, can len ${expectedAfter}.`);

      try {
        await pasteSingleImageReal(page, fileInfo);
      } catch (e) {
        console.warn(`[Flow] Paste lan ${attempt} loi: ${e.message}`);
        await delay(1500);
        continue;
      }

      // Đợi thumbnail mới xuất hiện trong composer (tối đa 20s/ảnh)
      try {
        await page.waitForFunction(
          (n) => {
            const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
            if (!target) return false;
            let composer = target;
            for (let k = 0; k < 10; k++) {
              if (!composer.parentElement) break;
              composer = composer.parentElement;
              if ((composer.textContent || '').includes('arrow_forward')) break;
            }
            const imgs = Array.from(composer.querySelectorAll('img')).filter((img) => {
              const src = img.currentSrc || img.src || '';
              if (!/media\.getMediaUrlRedirect|labs\.google\/fx\/api\/trpc\/media/i.test(src)) return false;
              if (!img.complete || img.naturalWidth === 0) return false;
              const r = img.getBoundingClientRect();
              return r.width >= 20 && r.height >= 20;
            });
            return imgs.length >= n;
          },
          expectedAfter,
          { timeout: 20000 }
        );
        pastedOk = true;
        console.log(`[Flow] ✓ Anh ${i + 1}/${clipboardFiles.length} da xuat hien thumbnail trong composer.`);
      } catch (waitErr) {
        const after = await countComposerAttachments(page).catch(() => -1);
        console.warn(`[Flow] Anh ${i + 1} chua thay thumbnail sau khi paste (sau=${after}, can=${expectedAfter}). Thu lai...`);
        await delay(1500);
      }
    }

    if (!pastedOk) {
      throw new Error(`Khong upload duoc anh ${i + 1}/${clipboardFiles.length} sau 3 lan thu (composer khong nhan thumbnail).`);
    }

    await delay(800); // Cho UI ổn định trước khi paste ảnh tiếp theo
  }

  return promptBox;
}

async function waitForPromptAssetsReady(page, expectedCount) {
  console.log(`[Flow] Dang cho ${expectedCount} thumbnail attachment san sang trong composer...`);

  // Đếm img upload thumbnail BÊN TRONG composer area (vùng quanh textbox + nút send)
  // chứ không scan toàn page (tránh đếm nhầm ảnh ở grid/sidebar).
  await page.waitForFunction((count) => {
    const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
    if (!target) return false;
    let composer = target;
    for (let k = 0; k < 10; k++) {
      if (!composer.parentElement) break;
      composer = composer.parentElement;
      if ((composer.textContent || '').includes('arrow_forward')) break;
    }
    const ready = Array.from(composer.querySelectorAll('img')).filter((img) => {
      const src = img.currentSrc || img.src || '';
      if (!/media\.getMediaUrlRedirect|labs\.google\/fx\/api\/trpc\/media/i.test(src)) return false;
      if (!img.complete || img.naturalWidth === 0) return false;
      const r = img.getBoundingClientRect();
      return r.width >= 20 && r.height >= 20;
    }).length;
    if (ready < count) return false;
    // Đợi không còn progress bar bên trong composer
    const pending = composer.querySelector('[role="progressbar"], progress, [aria-busy="true"]');
    return !pending;
  }, expectedCount, { timeout: 120000 });

  const attachmentDebug = await page.evaluate(() => {
    const target = document.querySelector('div[role="textbox"][contenteditable="true"]');
    let composer = target;
    if (composer) {
      for (let k = 0; k < 10; k++) {
        if (!composer.parentElement) break;
        composer = composer.parentElement;
        if ((composer.textContent || '').includes('arrow_forward')) break;
      }
    }
    const readyCount = composer ? Array.from(composer.querySelectorAll('img')).filter((img) => {
      const src = img.currentSrc || img.src || '';
      return /media\.getMediaUrlRedirect|labs\.google\/fx\/api\/trpc\/media/i.test(src) && img.complete && img.naturalWidth > 0;
    }).length : 0;
    const sendButton = Array.from(document.querySelectorAll('button')).find((btn) => /arrow_forward/i.test(btn.textContent || ''));
    return {
      readyCount,
      sendEnabled: !!sendButton && !sendButton.hasAttribute('disabled') && sendButton.getAttribute('aria-disabled') !== 'true'
    };
  });

  console.log(`[Flow] ✓ Composer co ${attachmentDebug.readyCount} thumbnail san sang, sendEnabled=${attachmentDebug.sendEnabled}.`);
  await delay(1500);
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
 
    // 2. Nạp ảnh bằng phương thức Paste THẬT (navigator.clipboard.write + Cmd/Ctrl+V)
    //    Lưu ý: dispatchEvent(ClipboardEvent) bị Flow của Google bỏ qua — phải dùng paste thật.
    console.log(`[Flow] Bắt đầu nạp ${filePaths.length} ảnh bằng phương thức Paste thật...`);
    const clipboardFiles = [];
    for (let i = 0; i < filePaths.length; i++) {
      const buf = await require('fs/promises').readFile(filePaths[i]);
      clipboardFiles.push({
        name: `image_${i}.png`,
        mimeType: 'image/png',
        base64: buf.toString('base64')
      });
    }
    const promptBox = await pasteAssetsIntoPrompt(page, clipboardFiles);
    console.log(`[Flow] ✓ Đã paste & xác nhận ${clipboardFiles.length} thumbnail trong composer.`);

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

async function runFlowVariantV2(page, prompt, inputFiles, tempDir, onImageReady, flowConfig = {}) {
  const outputPaths = [];
  let chatUrl = 'https://labs.google/fx/vi/tools/flow';
  // Backwards-compat: support old caller passing `variantCount` (number) instead of flowConfig object
  const config = (typeof flowConfig === 'number') ? { variantCount: flowConfig } : (flowConfig || {});
  const mode = config.mode === 'video' ? 'video' : 'image';
  const variantCount = [1, 2, 3, 4].includes(config.variantCount) ? config.variantCount : 4;
  const aspectRatio = ['16:9', '4:3', '1:1', '3:4', '9:16'].includes(config.aspectRatio) ? config.aspectRatio : '16:9';
  const targetCount = variantCount;
  const variantLabel = `x${targetCount}`;
  const modeTabRegex = mode === 'video' ? /videocamVideo/ : /imageHình ảnh/;
  // Aspect ratio button text trong Flow menu format kiểu: "crop_16_916:9", "crop_landscape4:3", "crop_square1:1", "crop_portrait3:4", "crop_9_169:16"
  const aspectRegex = new RegExp(aspectRatio.replace(':', ':').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(':', ':') + '$');

  try {
    console.log('[FlowV2] Truy cap trang chu Flow...');
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
    await delay(3000);
    await dismissConsentDialog(page);

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
        await dismissConsentDialog(page);
      }
    } catch (error) {
      console.log(`[FlowV2] Bo qua buoc tao du an moi: ${error.message}`);
    }

    chatUrl = page.url();

    // === CẤU HÌNH MODE + ASPECT RATIO + VARIANT COUNT ===
    try {
      console.log(`[FlowV2] Cau hinh mode=${mode} aspect=${aspectRatio} variants=${variantLabel}...`);
      const configBtn = page.locator('button').filter({ hasText: /Video.*x|Hình ảnh.*x|Nano.*x|crop/ }).first();
      if (await configBtn.count() > 0) {
        await configBtn.click();
        await delay(1500);

        // 1. Tab mode (Hình ảnh / Video)
        const modeTabBtn = page.locator('button.flow_tab_slider_trigger').filter({ hasText: modeTabRegex }).first();
        if (await modeTabBtn.count() > 0) {
          const isSelected = await modeTabBtn.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await modeTabBtn.click();
            await delay(1000);
            console.log(`[FlowV2] Da chuyen sang tab ${mode}.`);
          } else {
            console.log(`[FlowV2] Da dang o tab ${mode}.`);
          }
        }

        // 2. Aspect ratio (16:9 / 4:3 / 1:1 / 3:4 / 9:16) — match suffix of button text
        const aspectBtn = page.locator('button.flow_tab_slider_trigger').filter({ hasText: aspectRegex }).first();
        if (await aspectBtn.count() > 0) {
          const isSelected = await aspectBtn.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await aspectBtn.click();
            await delay(500);
            console.log(`[FlowV2] Da chon aspect ${aspectRatio}.`);
          }
        }

        // 3. Variant count (x1 / x2 / x3 / x4)
        const variantBtn = page.locator('button.flow_tab_slider_trigger').filter({ hasText: new RegExp(`^${variantLabel}$`) }).first();
        if (await variantBtn.count() > 0) {
          const isSelected = await variantBtn.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await variantBtn.click();
            await delay(500);
            console.log(`[FlowV2] Da chon ${variantLabel}.`);
          }
        }

        // 4. Đóng config panel bằng click lại config button (toggle)
        await configBtn.click();
        await delay(800);
        console.log('[FlowV2] Da dong config panel.');
      }
    } catch (error) {
      console.log(`[FlowV2] Bo qua loi cau hinh: ${error.message}`);
    }

    console.log(`[FlowV2] Dan cung luc ${inputFiles.length} anh vao Flow...`);
    const clipboardFiles = await buildClipboardPayload(inputFiles);
    const promptBox = await pasteAssetsIntoPrompt(page, clipboardFiles);
    await waitForPromptAssetsReady(page, inputFiles.length);

    console.log('[FlowV2] Nhap prompt sau khi attachment da san sang...');
    await fillPromptBox(promptBox, prompt);
    await delay(1000);

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

    console.log(`[FlowV2] Dang cho Google Flow sinh ket qua ${targetCount} anh (timeout 6 phut)...`);
    try {
      await page.waitForFunction(({ oldSources, need }) => {
        const currentImages = Array.from(document.querySelectorAll('img')).filter(img => img.width > 200 && !img.src.includes('avatar'));
        const newImages = currentImages.filter(img => !oldSources.includes(img.src));
        return newImages.length >= need;
      }, { oldSources: existingImgSources, need: targetCount }, { timeout: 360000 });
    } catch (error) {
      console.log(`[FlowV2] Het thoi gian cho ${targetCount} anh moi, se xu ly nhung anh da co: ${error.message}`);
    }

    await delay(20000);

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
    for (let index = 0; index < Math.min(newResultsInDom.length, targetCount); index += 1) {
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

    console.log(`[FlowV2] Hoan tat: ${processedCount}/${targetCount} anh da tai va upload thanh cong.`);
    await page.close().catch(() => null);
    return { outputPaths, chatUrl };
  } catch (error) {
    console.error('[FlowV2] Loi nghiem trong:', error);
    await page.close().catch(() => null);
    return { outputPaths, chatUrl };
  }
}

// ===== SHARED BROWSER: 1 browser duy nhất, mỗi project mở 1 tab mới =====
// Cho phép xử lý nhiều project song song mà không conflict persistent context.
let _sharedBrowser = null;
let _sharedBrowserPromise = null;
let _activeTabCount = 0;
const IDLE_CLOSE_MS = 30000; // Đóng browser sau 30s không có tab nào hoạt động
let _idleTimer = null;

async function getSharedBrowser() {
  // Nếu đang có browser mở và chưa bị đóng, dùng lại
  if (_sharedBrowser && _sharedBrowser.pages) {
    try {
      _sharedBrowser.pages(); // test nếu browser còn sống
      return _sharedBrowser;
    } catch (_) {
      _sharedBrowser = null;
      _sharedBrowserPromise = null;
    }
  }

  // Nếu đang trong quá trình mở, chờ
  if (_sharedBrowserPromise) return _sharedBrowserPromise;

  _sharedBrowserPromise = (async () => {
    console.log('[BROWSER] Khởi tạo shared browser (persistent context)...');
    _sharedBrowser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
      executablePath: resolveBrowserExecutable(),
      headless: false,
      viewport: { width: 1440, height: 900 },
      acceptDownloads: true,
      permissions: ['clipboard-read', 'clipboard-write'],
      args: ['--disable-blink-features=AutomationControlled']
    });
    console.log('[BROWSER] Shared browser đã sẵn sàng.');
    return _sharedBrowser;
  })();

  return _sharedBrowserPromise;
}

function scheduleIdleClose() {
  if (_idleTimer) clearTimeout(_idleTimer);
  _idleTimer = setTimeout(async () => {
    if (_activeTabCount <= 0 && _sharedBrowser) {
      console.log('[BROWSER] Không còn tab nào hoạt động, đóng browser để tiết kiệm tài nguyên.');
      await _sharedBrowser.close().catch(() => null);
      _sharedBrowser = null;
      _sharedBrowserPromise = null;
      _activeTabCount = 0;
    }
  }, IDLE_CLOSE_MS);
}

async function runFlowAutomation({ prompt, assets, onImageReady, variantCount, flowConfig }) {
  const tempDir = path.join(os.tmpdir(), `landscape-flow-${Date.now()}`);
  await ensureDirectory(tempDir);

  // Nếu caller truyền flowConfig (mới) — dùng object đó. Nếu truyền variantCount (cũ) — wrap thành object.
  const config = flowConfig && typeof flowConfig === 'object'
    ? flowConfig
    : { variantCount: typeof variantCount === 'number' ? variantCount : 4 };
  const expectCount = [1, 2, 3, 4].includes(config.variantCount) ? config.variantCount : 4;

  const inputFiles = [];

  try {
    for (let index = 0; index < assets.length; index += 1) {
      inputFiles.push(await downloadAssetToFile(assets[index], tempDir, index));
    }

    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    _activeTabCount++;

    if (_idleTimer) clearTimeout(_idleTimer);

    console.log(`[AUTO-FLOW] Mở tab mới cho Flow (đang có ${_activeTabCount} tab hoạt động)...`);

    const stopWatcher = startDialogWatcher(page, 'image');
    try {
      const { outputPaths, chatUrl } = await runFlowVariantV2(page, prompt, inputFiles, tempDir, onImageReady, config);
      console.log(`[AUTO-FLOW] Hoàn tất. Lấy được ${outputPaths.length}/${expectCount} ảnh.`);
      return { outputPaths, chatUrl };
    } finally {
      stopWatcher();
      _activeTabCount = Math.max(0, _activeTabCount - 1);
      console.log(`[AUTO-FLOW] Tab đã xong, còn ${_activeTabCount} tab hoạt động.`);
      // page.close() đã được gọi trong runFlowVariantV2
      scheduleIdleClose();
    }
  } finally {
    await Promise.all(inputFiles.map(file => fs.unlink(file.filePath).catch(() => null)));
  }
}

// ===== VIDEO AUTOMATION =====
async function runFlowVideoAutomation({ prompt, imageUrl, onVideoReady, flowConfig }) {
  const tempDir = path.join(os.tmpdir(), `landscape-flow-video-${Date.now()}`);
  await ensureDirectory(tempDir);

  const config = flowConfig && typeof flowConfig === 'object' ? flowConfig : {};

  const inputFiles = [];

  try {
    // Download reference image
    if (imageUrl) {
      inputFiles.push(await downloadAssetToFile({ url: imageUrl, label: 'reference' }, tempDir, 0));
    }

    const browser = await getSharedBrowser();
    const page = await browser.newPage();
    _activeTabCount++;

    if (_idleTimer) clearTimeout(_idleTimer);

    console.log(`[AUTO-VIDEO] Mở tab mới cho Flow Video (đang có ${_activeTabCount} tab hoạt động)...`);

    const stopWatcher = startDialogWatcher(page, 'video');
    try {
      const result = await runFlowVideoGeneration(page, prompt, inputFiles, tempDir, onVideoReady, config);
      console.log(`[AUTO-VIDEO] Hoàn tất. Video: ${result.videoPath ? 'OK' : 'KHÔNG CÓ'}`);
      return result;
    } finally {
      stopWatcher();
      _activeTabCount = Math.max(0, _activeTabCount - 1);
      console.log(`[AUTO-VIDEO] Tab đã xong, còn ${_activeTabCount} tab hoạt động.`);
      scheduleIdleClose();
    }
  } finally {
    await Promise.all(inputFiles.map(file => fs.unlink(file.filePath).catch(() => null)));
  }
}

async function runFlowVideoGeneration(page, prompt, inputFiles, tempDir, onVideoReady, flowConfig = {}) {
  let videoPath = null;
  let chatUrl = 'https://labs.google/fx/vi/tools/flow';
  const variantCount = [1, 2, 3, 4].includes(flowConfig.variantCount) ? flowConfig.variantCount : 1;
  const aspectRatio = ['16:9', '4:3', '1:1', '3:4', '9:16'].includes(flowConfig.aspectRatio) ? flowConfig.aspectRatio : '16:9';
  const variantLabel = `x${variantCount}`;
  const aspectRegex = new RegExp(aspectRatio.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');

  try {
    console.log('[FlowVideo] Truy cập trang chủ Flow...');
    await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
    await delay(3000);
    await dismissConsentDialog(page);

    // Bỏ qua lỗi & tạo dự án mới
    try {
      const errorBackBtn = page.locator('button:has-text("Quay lại dự án"), button:has-text("Quay lai du an")');
      if (await errorBackBtn.count() > 0) {
        await errorBackBtn.first().click();
        await delay(2000);
      }
      const newProjBtn = page.locator('button, div').filter({ hasText: /Dự án mới|Du an moi/i }).last();
      if (await newProjBtn.count() > 0 && await newProjBtn.isVisible()) {
        await newProjBtn.click();
        await delay(3000);
        await dismissConsentDialog(page);
      }
    } catch (e) {
      console.log(`[FlowVideo] Bỏ qua bước tạo dự án mới: ${e.message}`);
    }

    chatUrl = page.url();

    // === CẤU HÌNH: Video + aspectRatio + variantLabel ===
    console.log(`[FlowVideo] Cấu hình chế độ Video + ${aspectRatio} + ${variantLabel}...`);
    try {
      const configBtn = page.locator('button').filter({ hasText: /Video.*x|Hình ảnh.*x|Nano.*x|crop/ }).first();
      if (await configBtn.count() > 0) {
        await configBtn.click();
        await delay(1500);

        // Click tab Video
        const videoTab = page.locator('button.flow_tab_slider_trigger').filter({ hasText: /videocamVideo/ }).first();
        if (await videoTab.count() > 0) {
          const isSelected = await videoTab.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await videoTab.click();
            await delay(1000);
            console.log('[FlowVideo] Đã chuyển sang tab Video.');
          } else {
            console.log('[FlowVideo] Đã đang ở tab Video.');
          }
        }

        // Chọn tab "Thành phần" (không phải Khung hình)
        const thanhPhanTab = page.locator('button.flow_tab_slider_trigger').filter({ hasText: /chrome_extensionThành phần/ }).first();
        if (await thanhPhanTab.count() > 0) {
          const isSelected = await thanhPhanTab.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await thanhPhanTab.click();
            await delay(800);
            console.log('[FlowVideo] Đã chọn chế độ Thành phần.');
          } else {
            console.log('[FlowVideo] Đã đang ở chế độ Thành phần.');
          }
        }

        // Chọn aspect ratio (16:9 / 4:3 / 1:1 / 3:4 / 9:16)
        const aspectBtn = page.locator('button.flow_tab_slider_trigger').filter({ hasText: aspectRegex }).first();
        if (await aspectBtn.count() > 0) {
          const isSelected = await aspectBtn.getAttribute('aria-selected');
          if (isSelected !== 'true') {
            await aspectBtn.click();
            await delay(500);
            console.log(`[FlowVideo] Đã chọn ${aspectRatio}.`);
          }
        }

        // Chọn variant count (x1/x2/x3/x4)
        const x1Btn = page.locator('button.flow_tab_slider_trigger').filter({ hasText: new RegExp(`^${variantLabel}$`) }).first();
        if (await x1Btn.count() > 0) {
          await x1Btn.click();
          await delay(500);
          console.log(`[FlowVideo] Đã chọn ${variantLabel}.`);
        }

        // Đóng config panel bằng click lại config button (toggle)
        await configBtn.click();
        await delay(800);
        console.log('[FlowVideo] Đã đóng config panel.');
      }
    } catch (e) {
      console.log(`[FlowVideo] Lỗi cấu hình: ${e.message}`);
    }

    const promptBox = page.locator('div[role="textbox"][contenteditable="true"]').first();

    // === BƯỚC 4: Upload ảnh reference (nếu có) ===
    if (inputFiles.length > 0) {
      console.log('[FlowVideo] Dán ảnh reference vào Flow...');
      const clipboardFiles = await buildClipboardPayload(inputFiles);
      await pasteAssetsIntoPrompt(page, clipboardFiles);
      await waitForPromptAssetsReady(page, inputFiles.length);
      await delay(1000);
    }

    // === BƯỚC 5: Nhập prompt ===
    console.log('[FlowVideo] Nhập prompt video...');
    await fillPromptBox(promptBox, prompt);
    await delay(1000);

    // Đảm bảo sẵn sàng gửi
    await waitForComposerReadyToSubmit(page, inputFiles.length, prompt);

    // Ghi nhớ các video/element cũ
    const existingVideos = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('video')).map(v => v.src || v.currentSrc || '');
    });
    console.log(`[FlowVideo] Đã ghi nhớ ${existingVideos.length} video cũ trên trang.`);

    // === BƯỚC 6: Bấm Tạo ===
    console.log('[FlowVideo] Bấm nút Tạo...');
    const sendBtn = page.locator('button:has-text("arrow_forward"), button[aria-label*="Gửi"], button[aria-label*="Tạo"]').first();
    if (await sendBtn.count() > 0 && await sendBtn.isVisible()) {
      await sendBtn.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // === BƯỚC 7: Chờ video sinh ra HOÀN TẤT (timeout 10 phút) ===
    console.log('[FlowVideo] Đang chờ Google Flow sinh video... (có thể mất 3-10 phút)');
    try {
      // Chờ video xuất hiện với src chứa 'media.getMediaUrlRedirect' (dấu hiệu video đã render xong)
      await page.waitForFunction((oldVideos) => {
        const videos = Array.from(document.querySelectorAll('video'));
        const ready = videos.filter(v => {
          const src = v.src || v.currentSrc || '';
          // Video mới, có URL API Flow, và đã load metadata (readyState >= 1)
          return src
            && !oldVideos.includes(src)
            && src.includes('media.getMediaUrlRedirect');
        });
        return ready.length >= 1;
      }, existingVideos, { timeout: 600000 });
      console.log('[FlowVideo] ✅ Video URL đã xuất hiện!');
    } catch (e) {
      console.log(`[FlowVideo] Hết thời gian chờ video: ${e.message}`);
    }

    await delay(5000); // Chờ thêm để URL ổn định

    // === BƯỚC 8: Tải video ===
    console.log('[FlowVideo] Tìm và tải video kết quả...');
    const newVideosInDom = await page.evaluate((oldVideos) => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.filter(v => {
        const src = v.src || v.currentSrc || '';
        return src && !oldVideos.includes(src) && src.includes('media.getMediaUrlRedirect');
      }).map(v => ({
        src: v.src || v.currentSrc || '',
        poster: v.poster || '',
        width: v.offsetWidth,
        height: v.offsetHeight
      }));
    }, existingVideos);

    console.log(`[FlowVideo] Tìm thấy ${newVideosInDom.length} video mới.`);

    if (newVideosInDom.length > 0) {
      const video = newVideosInDom[0];
      const outputPath = path.join(tempDir, `flow_video_${Date.now()}.mp4`);

      try {
        if (video.src.startsWith('blob:')) {
          // Tải blob video
          const base64Data = await page.evaluate(async (blobUrl) => {
            const response = await fetch(blobUrl);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
          }, video.src);
          const content = String(base64Data).split('base64,')[1];
          await fs.writeFile(outputPath, Buffer.from(content, 'base64'));
        } else {
          // Tải URL trực tiếp
          const arrayBuffer = await page.evaluate(async (url) => {
            const response = await fetch(url);
            const buffer = await response.arrayBuffer();
            return Array.from(new Uint8Array(buffer));
          }, video.src);
          await fs.writeFile(outputPath, Buffer.from(arrayBuffer));
        }

        videoPath = outputPath;
        console.log(`[FlowVideo] Đã tải xong video: ${outputPath}`);

        if (typeof onVideoReady === 'function') {
          await onVideoReady(outputPath);
        }
      } catch (e) {
        console.log(`[FlowVideo] Lỗi tải video: ${e.message}`);
      }
    }

    await page.close().catch(() => null);
    return { videoPath, chatUrl };
  } catch (error) {
    console.error('[FlowVideo] Lỗi nghiêm trọng:', error);
    await page.close().catch(() => null);
    return { videoPath, chatUrl };
  }
}

module.exports = {
  runFlowAutomation,
  runFlowVideoAutomation
};
