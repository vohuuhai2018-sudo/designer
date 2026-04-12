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
  const extensionFromUrl = asset.url.startsWith('data:')
    ? 'png'
    : path.extname(new URL(asset.url).pathname || '').replace('.', '');
  const fallbackExtension = extensionFromUrl || 'png';
  const filePath = path.join(targetDir, `${String(index + 1).padStart(2, '0')}_${sanitizeFileName(asset.label)}.${fallbackExtension}`);

  if (asset.url.startsWith('data:')) {
    return saveDataUrlToFile(asset.url, filePath);
  }

  const response = await fetch(asset.url);
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

async function enableImageMode(page) {
  console.log("-> Thiết lập chế độ Tạo Hình Ảnh qua menu...");
  try {
    await page.evaluate(() => {
      const textarea = document.querySelector('#prompt-textarea');
      if (textarea) {
        const container = textarea.parentElement.parentElement;
        if (container) {
          const btn = container.querySelector('button');
          if (btn) btn.click();
        }
      }
    });
    
    await delay(1000);
    
    const menuLabels = [/Tạo hình ảnh/i, /Create image/i, /Image generation/i];
    for (const label of menuLabels) {
      const option = page.getByText(label);
      if (await option.count()) {
        await option.first().click({ force: true });
        await delay(800);
        return;
      }
    }
    
    // Fallback
    const promptInput = await findPromptInput(page);
    await promptInput.click();
    await delay(400);
    await page.keyboard.insertText('/');
    await delay(1200);

    for (const label of menuLabels) {
      const option = page.getByText(label);
      if (await option.count()) {
        await option.first().click({ force: true });
        await delay(800);
        return;
      }
    }
    await page.keyboard.press('Backspace');
  } catch (error) {
    console.error('Menu fallback:', error);
  }
}

async function uploadFiles(page, filePaths) {
  const fileInputs = [
    page.locator('#upload-photos'),
    page.locator('input[type="file"]')
  ];

  for (const locator of fileInputs) {
    if (await locator.count()) {
      await locator.first().setInputFiles(filePaths);
      await delay(4000);
      return;
    }
  }

  throw new Error('Không tìm thấy vùng upload file trên ChatGPT.');
}

async function fillPrompt(page, prompt) {
  const promptInput = await findPromptInput(page);
  await promptInput.click();
  await delay(300);
  await page.keyboard.insertText(prompt);
  await delay(500);
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
  await page.waitForFunction(prev => {
    const keywords = ['Chỉnh sửa', 'Edit'];
    const count = Array.from(document.querySelectorAll('*')).filter(node => {
      const text = node.textContent?.trim();
      return Boolean(text) && keywords.includes(text) && node.children.length <= 1;
    }).length;
    return count > prev;
  }, previousCount, { timeout: 240000 });

  await delay(8000);
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

async function runChatGptAutomation({ prompt, assets }) {
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

    const page = browser.pages()[0] || await browser.newPage();
    await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => null);
    await page.waitForSelector('#prompt-textarea, [contenteditable="true"]', { timeout: 30000 });

    await enableImageMode(page);
    await uploadFiles(page, inputFiles.map(file => file.filePath));
    await fillPrompt(page, prompt);

    const outputPaths = [];
    let editCountBefore = await countEditButtons(page);
    await (await findPromptInput(page)).press('Enter');

    for (let variant = 1; variant <= 4; variant++) {
      console.log(`Đang chờ ChatGPT hoàn thiện phương án ${variant}/4...`);
      await waitForImageCompletion(page, editCountBefore);
      const outputPath = path.join(tempDir, `chatgpt_result_${Date.now()}_${variant}.png`);

      try {
        await tryFetchImage(page, outputPath);
        outputPaths.push(outputPath);
        console.log(`Đã tải thành công phương án ${variant}`);
      } catch (error) {
        console.error(`Lỗi tải phương án ${variant}:`, error);
      }

      if (variant < 4) {
        console.log(`Yêu cầu ChatGPT tạo tiếp phương án ${variant + 1}...`);
        await delay(1500); // Give ChatGPT UI a moment to settle
        editCountBefore = await countEditButtons(page);
        await fillPrompt(page, `Cảm ơn. Hãy tạo tiếp 1 phương án thiết kế thứ ${variant + 1} nữa nhé. Giữ nguyên cấu trúc bối cảnh, nhưng thay đổi một chút về sắc thái ánh sáng, vật liệu đá hoặc cách bố trí cụm tùng/cây phụ để có thêm góc nhìn tham khảo.`);
        await (await findPromptInput(page)).press('Enter');
      }
    }

    return { outputPaths, chatUrl: page.url() };
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
