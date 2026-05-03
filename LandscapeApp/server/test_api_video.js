// Smoke test: API-direct video gen.
// Calls runFlowVideoAutomation with a startFrame URL + simple prompt.
// Expected ~3-5 min latency. If API path fails, falls back to UI path automatically.

const path = require('path');
const { runFlowVideoAutomation } = require('./flowAutomation');

const TEST_START_FRAME = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1280&q=80';

(async () => {
  console.log('[TEST-VIDEO] Bắt đầu...');
  const t0 = Date.now();
  try {
    const result = await runFlowVideoAutomation({
      prompt: 'Camera slowly pans left across the mountain valley',
      imageUrl: TEST_START_FRAME,
      onVideoReady: (p) => console.log(`[TEST-VIDEO] onVideoReady: ${path.basename(p)}`),
      flowConfig: { aspectRatio: '16:9' }, // use default veo_3_1_r2v_fast_landscape_ultra
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[TEST-VIDEO] ✅ ${elapsed}s — videoPath: ${result.videoPath}, chatUrl: ${result.chatUrl}`);
  } catch (e) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[TEST-VIDEO] ❌ ${elapsed}s — ${e.message}`);
    if (e.body) console.error('  body:', JSON.stringify(e.body).slice(0, 500));
  }
  setTimeout(() => process.exit(0), 35000);
})();
