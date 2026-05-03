// storageState helpers — file system + base64 env var, so the same code
// works on a laptop (FLOW_STATE_FILE) and on Vercel/Lambda (FLOW_STATE_B64).
//
// Encoded payload accepts either raw JSON-base64 or gzip+base64 (auto-detected
// by GZIP magic 0x1f 0x8b on the decoded bytes). Use gzip mode to fit Vercel's
// 4KB sensitive env-var cap when the storageState is too large.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

function decodePayload(b64) {
  const raw = b64.trim().replace(/\s+/g, '');
  const buf = Buffer.from(raw, 'base64');
  const isGzip = buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
  const json = isGzip ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return JSON.parse(json);
}

function joinChunks() {
  // Concatenate FLOW_STATE_B64_1, _2, … _N (in order) until missing.
  const parts = [];
  for (let i = 1; ; i++) {
    const v = process.env[`FLOW_STATE_B64_${i}`];
    if (!v) break;
    parts.push(v.trim());
  }
  return parts.length ? parts.join('') : null;
}

export async function loadStorageState({ file, b64 } = {}) {
  const fromEnv = b64 || process.env.FLOW_STATE_B64 || joinChunks();
  if (fromEnv) return decodePayload(fromEnv);
  const path = file || process.env.FLOW_STATE_FILE;
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

export async function saveStorageState(state, file) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(state, null, 2), 'utf8');
}

export function encodeStorageStateB64(state, { gzip = false } = {}) {
  const json = JSON.stringify(state);
  const bytes = gzip ? gzipSync(Buffer.from(json, 'utf8'), { level: 9 }) : Buffer.from(json, 'utf8');
  return bytes.toString('base64');
}
