// Test: Chạy 2 Flow Automation song song để kiểm tra multi-tab
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { runFlowAutomation } = require('./flowAutomation');

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI);

    const ProjectSchema = new mongoose.Schema({}, { strict: false });
    const Project = mongoose.model('Project', ProjectSchema);

    // Lấy 2 project gần nhất có ảnh
    const projects = await Project.find({ rawImage: { $exists: true, $ne: null } })
      .sort({ timestamp: -1 })
      .limit(2)
      .lean();

    if (projects.length < 2) {
      console.log('Cần ít nhất 2 project có ảnh. Tìm thấy:', projects.length);
      process.exit(1);
    }

    console.log(`\n=== TEST SONG SONG: 2 project ===`);
    console.log(`Project 1: "${projects[0].customerName}" (${projects[0].id})`);
    console.log(`Project 2: "${projects[1].customerName}" (${projects[1].id})`);

    const testPrompt = "Thiết kế sân vườn phong cách hiện đại, sử dụng đá cổ thạch và cây tùng la hán.";

    const buildAssets = (p) => {
      const assets = [{ label: 'Ảnh hiện trạng gốc', url: p.rawImage, role: 'Ảnh nền chính.' }];
      if (p.annotatedImage) assets.push({ label: 'Ảnh khoanh vùng', url: p.annotatedImage, role: 'Ảnh quy hoạch.' });
      return assets;
    };

    const startTime = Date.now();

    // Chạy 2 flow SONG SONG
    const results = await Promise.allSettled([
      runFlowAutomation({
        prompt: testPrompt,
        assets: buildAssets(projects[0]),
        onImageReady: async (filePath) => {
          console.log(`[P1] ✅ IMAGE READY: ${path.basename(filePath)}`);
        }
      }),
      runFlowAutomation({
        prompt: testPrompt,
        assets: buildAssets(projects[1]),
        onImageReady: async (filePath) => {
          console.log(`[P2] ✅ IMAGE READY: ${path.basename(filePath)}`);
        }
      })
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== KẾT QUẢ (${elapsed}s) ===`);
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`Project ${i + 1}: ✅ Thành công - ${r.value.outputPaths?.length || 0} ảnh`);
      } else {
        console.log(`Project ${i + 1}: ❌ Lỗi - ${r.reason?.message}`);
      }
    });

    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

run();
