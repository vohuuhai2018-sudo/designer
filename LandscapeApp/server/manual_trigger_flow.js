const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs/promises');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { runFlowAutomation } = require('./flowAutomation');

async function run() {
  try {
    console.log('Connecting to DB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    // Schema - simplified for test
    const ProjectSchema = new mongoose.Schema({}, { strict: false });
    const Project = mongoose.model('Project', ProjectSchema);
    
    const project = await Project.findOne({ id: 'mnulab7ro3gn0bd58gb' });
    if (!project) throw new Error('Project not found');
    
    console.log('Project found:', project.customerName);
    
    // Replicate buildProjectAiAssets logic if possible, or just mock it
    // From index.js:
    const aiAssets = [
      {
        label: 'Ảnh hiện trạng gốc (Image 1)',
        url: project.rawImage,
        role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.'
      }
    ];
    if (project.annotatedImage) {
        aiAssets.push({
            label: 'Ảnh khoanh vùng thiết kế',
            url: project.annotatedImage,
            role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.'
        });
    }

    const testPrompt = "Thiết kế sân vườn phong cách hiện đại, sử dụng đá cổ thạch và cây tùng la hán. Giữ nguyên kiến trúc nhà cũ.";

    console.log('Starting Flow Automation...');
    await runFlowAutomation({
      prompt: testPrompt,
      assets: aiAssets,
      onImageReady: async (filePath) => {
        console.log('IMAGE READY:', filePath);
      }
    });

    console.log('Flow Automation completed.');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  }
}

run();
