const path = require('path');
const { chromium } = require('playwright-core');

async function main() {
  const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const profile = path.resolve(__dirname, '..', '..', 'tooltaoanh', 'chatgpt_profile');

  const context = await chromium.launchPersistentContext(profile, {
    executablePath,
    headless: false,
    viewport: { width: 1280, height: 900 }
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto('https://chatgpt.com', { waitUntil: 'domcontentloaded' });

  try {
    await page.waitForSelector('#prompt-textarea, [contenteditable="true"]', { timeout: 20000 });
    console.log('prompt-ready');
  } catch (error) {
    console.log('url:', page.url());
    console.log('title:', await page.title());
    console.log('body:', (await page.locator('body').innerText()).slice(0, 2000));
  }

  await context.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
