// Parallel smoke test: 4 simultaneous calls on the shared API page.
// Mimics Pass 1 split-mode where 4 task song song mỗi task variantCount=1.
const path = require('path');
const { runFlowAutomation } = require('./flowAutomation');

const PROMPTS = [
  'A serene Japanese garden with stone lanterns at dawn',
  'A modern Vietnamese tea house with bamboo and lotus pond',
  'A coastal cliff at sunset with Mediterranean vegetation',
  'A forest clearing with morning mist and autumn maple trees',
];

(async () => {
  const t0 = Date.now();
  const results = await Promise.allSettled(
    PROMPTS.map((prompt, i) => runFlowAutomation({
      prompt,
      assets: [],
      onImageReady: (p) => console.log(`  [task ${i + 1}] → ${path.basename(p)}`),
      flowConfig: { variantCount: 1, aspectRatio: '16:9' },
    }))
  );
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n=== ${elapsed}s ===`);
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`task ${i + 1}: ✅ ${r.value.outputPaths.length} ảnh`);
    } else {
      console.log(`task ${i + 1}: ❌ ${r.reason?.message}`);
    }
  });
  setTimeout(() => process.exit(0), 35000);
})();
