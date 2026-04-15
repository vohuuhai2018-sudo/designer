// Script debug: Quét DOM thực tế trên trang Flow đang mở để hiểu cấu trúc phần tử
const path = require('path');
const { chromium } = require('playwright-core');

const FLOW_PROFILE_DIR = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'flow_profile');

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];

function resolveBrowserExecutable() {
  return CHROME_CANDIDATES.find(c => require('fs').existsSync(c));
}

async function main() {
  const executablePath = resolveBrowserExecutable();
  if (!executablePath) {
    console.error('Không tìm thấy Chrome/Edge');
    return;
  }

  console.log('Mở browser với profile Flow...');
  const browser = await chromium.launchPersistentContext(FLOW_PROFILE_DIR, {
    executablePath,
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--disable-blink-features=AutomationControlled']
  });

  const page = browser.pages()[0] || await browser.newPage();

  // Mở trang chủ Flow và tạo dự án mới
  console.log('Đang mở trang chủ Flow...');
  await page.goto('https://labs.google/fx/vi/tools/flow', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 5000));

  // Click vào "Dự án mới"
  console.log('Tìm và click nút Dự án mới...');
  try {
    const newProjBtn = page.locator('button, div, a').filter({ hasText: /Dự án mới|Du an moi|New project/i }).last();
    if (await newProjBtn.count() > 0 && await newProjBtn.isVisible()) {
      await newProjBtn.click();
      console.log('Đã click Dự án mới, chờ load...');
      await new Promise(r => setTimeout(r, 5000));
    } else {
      console.log('Không tìm thấy nút Dự án mới, có thể đã ở trong project');
    }
  } catch (e) {
    console.log('Lỗi click Dự án mới:', e.message);
  }

  console.log('\n=== QUÉT DOM: Tất cả <img> trên trang ===');
  const imgInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img')).map((img, i) => {
      const r = img.getBoundingClientRect();
      const s = window.getComputedStyle(img);
      return {
        index: i,
        src: (img.src || '').substring(0, 100),
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        complete: img.complete,
        display: s.display,
        visibility: s.visibility,
        opacity: s.opacity,
        parentTag: img.parentElement?.tagName,
        parentClass: (img.parentElement?.className || '').substring(0, 80),
        grandparentClass: (img.parentElement?.parentElement?.className || '').substring(0, 80),
        alt: img.alt || '',
        ariaHidden: img.closest('[aria-hidden="true"]') ? 'YES' : 'no'
      };
    });
  });

  imgInfo.forEach(info => {
    console.log(`\n[img #${info.index}] ${info.width}x${info.height} @ top:${info.top} left:${info.left}`);
    console.log(`  src: ${info.src}`);
    console.log(`  natural: ${info.naturalW}x${info.naturalH}, complete: ${info.complete}`);
    console.log(`  css: display=${info.display} visibility=${info.visibility} opacity=${info.opacity}`);
    console.log(`  parent: <${info.parentTag}> class="${info.parentClass}"`);
    console.log(`  grandparent class="${info.grandparentClass}"`);
    console.log(`  alt="${info.alt}" ariaHidden=${info.ariaHidden}`);
  });

  console.log('\n=== QUÉT DOM: Tất cả textarea / contenteditable / textbox ===');
  const textboxInfo = await page.evaluate(() => {
    const selectors = ['textarea', '[contenteditable="true"]', 'div[role="textbox"]'];
    return selectors.flatMap(sel =>
      Array.from(document.querySelectorAll(sel)).map(el => {
        const r = el.getBoundingClientRect();
        const s = window.getComputedStyle(el);
        return {
          selector: sel,
          tag: el.tagName,
          width: Math.round(r.width),
          height: Math.round(r.height),
          top: Math.round(r.top),
          display: s.display,
          visibility: s.visibility,
          opacity: s.opacity,
          text: (el.textContent || el.value || '').substring(0, 50),
          class: (el.className || '').substring(0, 80),
          ariaHidden: el.closest('[aria-hidden="true"]') ? 'YES' : 'no'
        };
      })
    );
  });

  textboxInfo.forEach(info => {
    console.log(`\n[${info.selector}] <${info.tag}> ${info.width}x${info.height} @ top:${info.top}`);
    console.log(`  css: display=${info.display} visibility=${info.visibility} opacity=${info.opacity}`);
    console.log(`  text: "${info.text}"`);
    console.log(`  class: "${info.class}"`);
    console.log(`  ariaHidden: ${info.ariaHidden}`);
  });

  console.log('\n=== QUÉT DOM: Tất cả button (send/gửi/tạo) ===');
  const buttonInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).filter(btn => {
      const text = (btn.textContent || '').trim();
      const label = btn.getAttribute('aria-label') || '';
      return /send|gui|gửi|tao|tạo|arrow_forward|submit/i.test(`${text} ${label}`);
    }).map(btn => {
      const r = btn.getBoundingClientRect();
      return {
        text: (btn.textContent || '').trim().substring(0, 50),
        label: btn.getAttribute('aria-label') || '',
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        disabled: btn.hasAttribute('disabled'),
        ariaDisabled: btn.getAttribute('aria-disabled'),
        class: (btn.className || '').substring(0, 80)
      };
    });
  });

  buttonInfo.forEach(info => {
    console.log(`\n[button] "${info.text}" label="${info.label}" ${info.width}x${info.height} @ top:${info.top}`);
    console.log(`  disabled=${info.disabled} ariaDisabled=${info.ariaDisabled}`);
    console.log(`  class="${info.class}"`);
  });

  console.log('\n=== WINDOW INFO ===');
  const winInfo = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    url: window.location.href
  }));
  console.log(`  URL: ${winInfo.url}`);
  console.log(`  Viewport: ${winInfo.innerWidth}x${winInfo.innerHeight}`);

  console.log('\n=== QUÉT DOM: Tất cả phần tử có placeholder/aria-label liên quan prompt ===');
  const inputInfo = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('input, textarea, [contenteditable], [role="textbox"], [data-placeholder]'));
    return all.map(el => {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        type: el.type || '',
        placeholder: el.placeholder || el.getAttribute('data-placeholder') || '',
        role: el.getAttribute('role') || '',
        contenteditable: el.getAttribute('contenteditable') || '',
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        display: s.display,
        visibility: s.visibility,
        class: (el.className || '').substring(0, 100),
        ariaHidden: el.closest('[aria-hidden="true"]') ? 'YES' : 'no'
      };
    });
  });
  inputInfo.forEach(info => {
    console.log(`\n[${info.tag}] ${info.width}x${info.height} @ top:${info.top} | role="${info.role}" ce="${info.contenteditable}"`);
    console.log(`  placeholder="${info.placeholder}" type="${info.type}"`);
    console.log(`  display=${info.display} visibility=${info.visibility} ariaHidden=${info.ariaHidden}`);
    console.log(`  class="${info.class}"`);
  });

  console.log('\n=== QUÉT DOM: Nút + (thêm ảnh) ===');
  const plusBtnInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => {
      const r = btn.getBoundingClientRect();
      const text = (btn.textContent || '').trim();
      const label = btn.getAttribute('aria-label') || '';
      return { text: text.substring(0, 50), label, width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), class: (btn.className || '').substring(0, 80) };
    }).filter(b => b.top > 350); // chỉ lấy button ở nửa dưới
  });
  plusBtnInfo.forEach(info => {
    console.log(`\n[button] "${info.text}" label="${info.label}" ${info.width}x${info.height} @ top:${info.top}`);
    console.log(`  class="${info.class}"`);
  });

  console.log('\n✅ Debug xong! Giữ browser mở 60 giây để kiểm tra...');
  await new Promise(r => setTimeout(r, 60000));
  await browser.close();
}

main().catch(console.error);
