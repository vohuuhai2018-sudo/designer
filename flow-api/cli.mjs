#!/usr/bin/env node
// flow-gen — pure CLI for Google Labs Flow image generation.
//
// Subcommands:
//   login                                 First-time setup. Opens a browser to sign in.
//   gen <prompt> [--count N] [--aspect]   Generate one prompt (count parallel images).
//   batch <prompts.txt>  [--count N]      Generate one image per line in the file.
//   export-state                          Print the saved session as base64 (for FLOW_STATE_B64).
//
// Hosting: set FLOW_STATE_B64 env var on your serverless platform; the CLI / lib will
// restore session from it. No file system writes needed at runtime.

import { generateImages, loginInteractive } from './lib/flow.mjs';
import { loadStorageState, encodeStorageStateB64 } from './lib/storage.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_STATE_FILE = resolve(__dirname, '.flow-state.json');

function parseFlags(argv) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--count') flags.count = Number(argv[++i]);
    else if (a === '--aspect') flags.aspect = argv[++i];
    else if (a === '--project') flags.projectId = argv[++i];
    else if (a === '--out') flags.out = resolve(argv[++i]);
    else if (a === '--state') flags.stateFile = resolve(argv[++i]);
    else if (a === '--no-download') flags.noDownload = true;
    else if (a === '--json') flags.json = true;
    else if (a === '--gzip') flags.gzip = true;
    else if (a === '--chunks') flags.chunks = Number(argv[++i]);
    else if (a === '--port') flags.port = Number(argv[++i]);
    else if (a === '--help' || a === '-h') flags.help = true;
    else rest.push(a);
  }
  return { flags, rest };
}

const HELP = `flow-gen — Google Labs Flow image generator (pure CLI)

Usage:
  flow-gen login                                    Sign in once, save session.
  flow-gen gen "<prompt>" [--count 2] [--aspect L]  Generate a prompt.
  flow-gen batch <prompts.txt> [--count 2]          Generate one prompt per line.
  flow-gen export-state [outFile]                   Print or write FLOW_STATE_B64 (auto-gzip if >3.8KB).
  flow-gen serve [--port 3000]                      Local HTTP server (uses your home IP — bypasses datacenter blocks).
  flow-gen doctor                                   Verify chromium launch + saved session.

Options:
  --count N        Number of parallel images per prompt (default 1).
  --aspect X       LANDSCAPE | PORTRAIT | SQUARE (default LANDSCAPE).
  --project ID     Reuse an existing Flow project ID.
  --out DIR        Download images here (default ./out). --no-download to skip.
  --state FILE     Override session file (default .flow-state.json).
  --json           Emit machine-readable JSON only.

Env:
  FLOW_STATE_B64   Base64-encoded session JSON. Used in serverless deploys.
  FLOW_STATE_FILE  Path to a session JSON file.
  FLOW_SERVERLESS  Force @sparticuz/chromium even when not on Vercel/Lambda.
`;

async function downloadImage(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('download ' + dest + ': ' + res.status);
  await mkdir(dirname(dest), { recursive: true });
  await pipeline(res.body, createWriteStream(dest));
}

function tagFromPrompt(prompt, idx) {
  const slug = prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'img';
  return `${idx.toString().padStart(2, '0')}-${slug}`;
}

async function cmdLogin({ flags }) {
  const stateFile = flags.stateFile || DEFAULT_STATE_FILE;
  await loginInteractive({ storageStateFile: stateFile });
  console.error(`Saved session → ${stateFile}`);
  console.error(`Run 'flow-gen export-state' to get FLOW_STATE_B64 for hosting.`);
}

async function cmdGen({ flags, rest }) {
  const prompt = rest.join(' ').trim();
  if (!prompt) { console.error(HELP); process.exit(1); }
  const stateFile = flags.stateFile || DEFAULT_STATE_FILE;
  const out = flags.out || resolve(process.cwd(), 'out');
  const result = await generateImages({
    prompt,
    count: flags.count || 1,
    aspectRatio: flags.aspect || 'LANDSCAPE',
    projectId: flags.projectId,
    storageStateFile: process.env.FLOW_STATE_B64 ? undefined : stateFile,
  });
  if (!flags.noDownload && result.images.length) {
    for (let i = 0; i < result.images.length; i++) {
      const dest = resolve(out, `${tagFromPrompt(prompt, i + 1)}.jpg`);
      await downloadImage(result.images[i].fifeUrl, dest);
      result.images[i].localPath = dest;
    }
  }
  if (flags.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.error(`Got ${result.received}/${result.requested} images in ${result.elapsedMs}ms`);
    for (const img of result.images) {
      console.log(img.localPath || img.fifeUrl);
    }
  }
}

async function cmdBatch({ flags, rest }) {
  const file = rest[0];
  if (!file) { console.error(HELP); process.exit(1); }
  const lines = (await readFile(file, 'utf8')).split('\n').map(s => s.trim()).filter(Boolean);
  const stateFile = flags.stateFile || DEFAULT_STATE_FILE;
  const out = flags.out || resolve(process.cwd(), 'out');
  const all = [];
  for (let i = 0; i < lines.length; i++) {
    const prompt = lines[i];
    console.error(`[${i + 1}/${lines.length}] ${prompt.slice(0, 80)}`);
    try {
      const r = await generateImages({
        prompt,
        count: flags.count || 1,
        aspectRatio: flags.aspect || 'LANDSCAPE',
        projectId: flags.projectId,
        storageStateFile: process.env.FLOW_STATE_B64 ? undefined : stateFile,
      });
      if (!flags.noDownload) {
        for (let j = 0; j < r.images.length; j++) {
          const dest = resolve(out, `${tagFromPrompt(prompt, i + 1)}-${j + 1}.jpg`);
          await downloadImage(r.images[j].fifeUrl, dest);
          r.images[j].localPath = dest;
        }
      }
      all.push({ prompt, ...r });
    } catch (e) {
      all.push({ prompt, error: String(e), status: e.status });
    }
  }
  if (flags.json) console.log(JSON.stringify(all, null, 2));
}

async function cmdExportState({ flags, rest }) {
  const stateFile = flags.stateFile || DEFAULT_STATE_FILE;
  const state = await loadStorageState({ file: stateFile });
  if (!state) { console.error(`No saved state at ${stateFile}. Run 'flow-gen login' first.`); process.exit(1); }
  // Auto-decide gzip when raw base64 would exceed Vercel's 4KB sensitive cap.
  const raw = encodeStorageStateB64(state);
  const gz = encodeStorageStateB64(state, { gzip: true });
  const useGzip = flags.gzip ?? raw.length > 3800;
  const out = useGzip ? gz : raw;
  const outFile = rest[0];
  const chunks = Number(flags.chunks) > 0 ? Number(flags.chunks) : 0;

  if (chunks > 0) {
    // Split into N pieces written as state.b64.1, state.b64.2, …
    const baseFile = outFile || resolve(__dirname, 'state.b64');
    const partLen = Math.ceil(out.length / chunks);
    await mkdirP(dirname(resolve(baseFile)));
    for (let i = 0; i < chunks; i++) {
      const piece = out.slice(i * partLen, (i + 1) * partLen);
      const file = `${baseFile}.${i + 1}`;
      await writeFile(file, piece, 'utf8');
      console.error(`Wrote ${piece.length} chars → ${file} (set as FLOW_STATE_B64_${i + 1})`);
    }
  } else if (outFile) {
    await mkdirP(dirname(resolve(outFile)));
    await writeFile(resolve(outFile), out, 'utf8');
    console.error(`Wrote ${out.length} chars → ${outFile} (${useGzip ? 'gzip+base64' : 'base64'})`);
  } else {
    process.stdout.write(out);
    process.stdout.write('\n');
  }
  console.error(`Sizes: raw=${raw.length}b · gzip=${gz.length}b · cookies=${state.cookies?.length || 0} · origins=${state.origins?.length || 0}`);
  if (!chunks && out.length > 4096) {
    console.error(`⚠️  Output > 4096 bytes — Vercel "Sensitive" env vars cap at 4KB.`);
    console.error(`   Try one of:`);
    console.error(`   • Add as a non-Sensitive env var (uncheck "Sensitive" toggle in Vercel UI).`);
    console.error(`   • Or split: rerun with --chunks 2  → produces state.b64.1 / state.b64.2`);
    console.error(`     and set them on Vercel as FLOW_STATE_B64_1, FLOW_STATE_B64_2 (auto-joined at runtime).`);
  }
}

async function mkdirP(d) { const m = await import('node:fs/promises'); await m.mkdir(d, { recursive: true }); }

async function cmdServe({ flags }) {
  // Local HTTP server: same handler as api/generate.mjs but standalone.
  // Pair with `cloudflared tunnel --url http://localhost:3000` for a free public URL on your home IP.
  const { createServer } = await import('node:http');
  const port = Number(flags.port) || Number(process.env.PORT) || 3000;
  const stateFile = flags.stateFile || DEFAULT_STATE_FILE;
  const server = createServer(async (req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'OPTIONS') return send(204, {});
    if (req.url !== '/api/generate' && req.url !== '/generate') return send(404, { error: 'use POST /api/generate' });
    if (req.method === 'GET') return send(200, { ok: true, service: 'flow-gen-local', port });
    if (req.method !== 'POST') return send(405, { error: 'POST only' });
    try {
      let raw = '';
      for await (const c of req) raw += c;
      const { prompt, count = 1, aspect = 'LANDSCAPE', projectId } = JSON.parse(raw || '{}');
      if (!prompt) return send(400, { error: 'prompt required' });
      const result = await generateImages({
        prompt, count, aspectRatio: aspect, projectId,
        storageStateFile: process.env.FLOW_STATE_B64 ? undefined : stateFile,
      });
      send(200, {
        elapsedMs: result.elapsedMs,
        received: result.received,
        images: result.images.map(i => ({ url: i.fifeUrl, w: i.width, h: i.height, seed: i.seed })),
        errors: result.errors,
      });
    } catch (e) {
      send(500, { error: String(e.message || e), status: e.status });
    }
  });
  server.listen(port, () => {
    console.error(`flow-gen serving on http://localhost:${port}/api/generate`);
    console.error(`Tunnel publicly with:  cloudflared tunnel --url http://localhost:${port}`);
  });
}

async function cmdDoctor() {
  const { launchChromium } = await import('./lib/launcher.mjs');
  const t0 = Date.now();
  let browser;
  try {
    browser = await launchChromium({ headless: true });
    const v = await browser.version();
    await browser.close();
    console.error(`Chromium OK: ${v} (launched in ${Date.now() - t0}ms)`);
    const state = await loadStorageState({ file: DEFAULT_STATE_FILE });
    console.error(state ? 'Saved session: present' : "Saved session: MISSING — run 'flow-gen login'");
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    console.error(`Chromium launch FAILED: ${e.message}`);
    console.error("If running locally and chromium is missing, run: npx playwright install chromium");
    process.exit(1);
  }
}

async function main() {
  const [, , rawCmd, ...rest] = process.argv;
  const cmd = (!rawCmd || rawCmd === '--help' || rawCmd === '-h') ? null : rawCmd;
  const parsed = parseFlags(rest);
  if (!cmd || parsed.flags.help) { console.error(HELP); return; }
  const dispatch = { login: cmdLogin, gen: cmdGen, batch: cmdBatch, 'export-state': cmdExportState, doctor: cmdDoctor, serve: cmdServe };
  const handler = dispatch[cmd];
  if (!handler) { console.error(`Unknown command: ${cmd}\n\n${HELP}`); process.exit(1); }
  await handler(parsed);
}

main().catch(err => { console.error(err.stack || err.message || err); process.exit(1); });
