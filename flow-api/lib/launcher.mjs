// Chromium launcher — local dev uses bundled Playwright Chromium,
// serverless (Vercel/AWS Lambda/Cloud Run) uses @sparticuz/chromium.
//
// Detection: VERCEL, AWS_LAMBDA_FUNCTION_NAME, K_SERVICE (Cloud Run), or FLOW_SERVERLESS=1.
//
// Proxy: set FLOW_PROXY_URL=http://user:pass@host:port (or socks5://...) to route
// traffic through a residential proxy — required to bypass Google reCAPTCHA
// Enterprise's datacenter-IP flag when running on Vercel/Lambda.

import { chromium } from 'playwright-core';

const isServerless = () =>
  Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.K_SERVICE || process.env.FLOW_SERVERLESS);

function parseProxy() {
  const url = process.env.FLOW_PROXY_URL;
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return {
      server: `${u.protocol}//${u.host}`,
      username: u.username ? decodeURIComponent(u.username) : undefined,
      password: u.password ? decodeURIComponent(u.password) : undefined,
    };
  } catch { return { server: url }; }
}

export async function launchChromium({ headless = true } = {}) {
  const proxy = parseProxy();
  if (isServerless()) {
    const sparticuz = (await import('@sparticuz/chromium')).default;
    return chromium.launch({
      headless: true,
      args: sparticuz.args,
      executablePath: await sparticuz.executablePath(),
      proxy,
    });
  }
  // Local: prefer playwright bundled chromium, fallback to env override.
  const exec = process.env.FLOW_CHROMIUM_PATH || undefined;
  return chromium.launch({ headless, executablePath: exec, proxy });
}
