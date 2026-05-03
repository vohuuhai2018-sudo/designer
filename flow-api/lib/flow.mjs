// Core Node-side library: launch chromium → restore session → run FlowClient → tear down.
// Used by both the CLI (cli.mjs) and serverless handlers (api/generate.mjs).

import { launchChromium } from './launcher.mjs';
import { loadStorageState, saveStorageState } from './storage.mjs';
import { FLOW_CLIENT_SRC } from './flow-client-src.js';

const FLOW_URL = 'https://labs.google/fx/vi/tools/flow';

export async function generateImages({
  prompt,
  count = 1,
  aspectRatio = 'LANDSCAPE',
  projectId,
  projectTitle,
  storageStateFile,
  storageStateB64,
  headless = true,
} = {}) {
  if (!prompt) throw new Error('prompt is required');
  const storageState = await loadStorageState({ file: storageStateFile, b64: storageStateB64 });
  if (!storageState) throw new Error('No saved session — run `flow-gen login` first or set FLOW_STATE_B64.');
  const browser = await launchChromium({ headless });
  try {
    const ctx = await browser.newContext({
      storageState,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
      viewport: { width: 1280, height: 800 },
    });
    // Hide common headless tells before any page script runs.
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    const page = await ctx.newPage();
    await page.goto(FLOW_URL, { waitUntil: 'networkidle' });
    await page.evaluate(FLOW_CLIENT_SRC);
    return await page.evaluate(
      ({ prompt, count, aspectRatio, projectId, projectTitle }) =>
        window.FlowClient.generateImages({ prompt, count, aspectRatio, projectId, projectTitle }),
      { prompt, count, aspectRatio, projectId, projectTitle }
    );
  } finally {
    await browser.close();
  }
}

export async function loginInteractive({ storageStateFile }) {
  const browser = await launchChromium({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(FLOW_URL);
  // Heuristic: when user lands on a /project URL or "Tạo" button is visible, they're logged in.
  console.error('Sign in with your Google account in the opened window. The CLI will save the session and exit automatically.');
  await page.waitForFunction(
    () => /\/tools\/flow\/?$/.test(location.pathname) ? !!document.querySelector('button[aria-label*="Dự án mới" i]') : true,
    null,
    { timeout: 0 }
  );
  // Wait for the user to actually create or enter a project, OR just for redirect to flow root after login.
  await page.waitForURL(/labs\.google\/fx\/.*\/tools\/flow/, { timeout: 0 });
  // Give a small grace so cookies finish setting.
  await page.waitForTimeout(2000);
  const state = await ctx.storageState();
  await saveStorageState(state, storageStateFile);
  await browser.close();
  return state;
}
