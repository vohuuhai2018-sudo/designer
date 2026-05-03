// Smoke test: API-direct image gen.
// Runs runFlowAutomation against a known public asset URL + simple prompt.
// Verifies: (1) text-only path, (2) single-asset path, (3) two-asset (base+ref) path.

const path = require('path');
const { runFlowAutomation } = require('./flowAutomation');

const TEST_IMG_LANDSCAPE = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80';
const TEST_IMG_REFERENCE = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1280&q=80';

async function runCase(name, params) {
  console.log(`\n========== ${name} ==========`);
  const t0 = Date.now();
  try {
    const result = await runFlowAutomation(params);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${name}] ✅ ${result.outputPaths.length} ảnh trong ${elapsed}s`);
    result.outputPaths.forEach((p, i) => console.log(`  [${i + 1}] ${path.basename(p)}`));
    console.log(`  chatUrl: ${result.chatUrl}`);
    return result;
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[${name}] ❌ ${elapsed}s — ${e.message}`);
    if (e.body) console.error(`  body:`, JSON.stringify(e.body).slice(0, 500));
    return null;
  }
}

(async () => {
  const arg = (process.argv[2] || 'all').toLowerCase();

  if (arg === 'all' || arg === 'text') {
    await runCase('text-only x2', {
      prompt: 'A serene mountain valley at golden hour, photorealistic',
      assets: [],
      onImageReady: (p) => console.log(`  → ready: ${path.basename(p)}`),
      flowConfig: { variantCount: 2, aspectRatio: '16:9' },
    });
  }

  if (arg === 'all' || arg === 'single') {
    await runCase('1 asset (base) x1', {
      prompt: 'Apply a Vietnamese countryside landscape style, golden hour, photorealistic',
      assets: [{ label: 'site', url: TEST_IMG_LANDSCAPE, role: 'base' }],
      onImageReady: (p) => console.log(`  → ready: ${path.basename(p)}`),
      flowConfig: { variantCount: 1, aspectRatio: '16:9' },
    });
  }

  if (arg === 'all' || arg === 'pair') {
    await runCase('2 assets (base + ref) x1', {
      prompt: 'Redesign the landscape using the reference style, photorealistic',
      assets: [
        { label: 'site', url: TEST_IMG_LANDSCAPE, role: 'base' },
        { label: 'reference', url: TEST_IMG_REFERENCE, role: 'reference' },
      ],
      onImageReady: (p) => console.log(`  → ready: ${path.basename(p)}`),
      flowConfig: { variantCount: 1, aspectRatio: '16:9' },
    });
  }

  console.log('\n--- Done. Browser sẽ tự đóng sau 30s idle. ---');
  // Let the idle close timer fire so we can also verify cleanup
  setTimeout(() => process.exit(0), 35000);
})();
