const express = require('express');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const { runChatGptAutomation } = require('./chatgptAutomation');
const { generateLandscapePrompt } = require('./geminiPromptService');

// Helper để tìm Link ảnh mẫu nếu FrontEnd chỉ gửi ID (hoặc fix cho các ca cũ)
function resolveThacUrl(selections) {
  if (selections?.thacUrl) return selections.thacUrl;
  
  const thacId = selections?.thac;
  if (!thacId) return null;

  // Bản đồ map ID -> Path (Sử dụng tên thư mục KHÔNG DẤU mà anh vừa đổi)
  if (thacId.startsWith('thac_cothach_v')) {
    const num = thacId.replace('thac_cothach_v', '');
    return `/assets/THAC/Da Co Thach/cothach_v${num}.png`;
  }
  if (thacId.startsWith('thac_vanmay_v')) {
    const num = thacId.replace('thac_vanmay_v', '');
    return `/assets/THAC/Da Van May/vanmay_v${num}.png`;
  }
  return null;
}

// Hàm tạo prompt thuần từ dữ liệu project — không cần Gemini API
function buildServerPrompt(project, assets) {
  const hasNote = !!(project.note && project.note.trim());
  const hasExtra = (project.extraAssets && project.extraAssets.length > 0);

  const selectionLines = [];
  if (project.selections) {
    if (project.selections.thacName)
      selectionLines.push(`- Kiểu mẫu thác nước: ${project.selections.thacName}`);
    if (project.selections.ke && project.selections.ke.length > 0)
      selectionLines.push(`- Kè đá: ${project.selections.ke.join(', ')}`);
    if (project.selections.canh && project.selections.canh.length > 0)
      selectionLines.push(`- Cảnh quan: ${project.selections.canh.join(', ')}`);
  }
  if (selectionLines.length === 0) selectionLines.push('- Chưa có mẫu chọn cụ thể');

  const assetLines = assets.map((a, i) => `- File ${i + 1}: ${a.label}. ${a.role}`);

  const lines = [
    'Bạn là chuyên gia concept cảnh quan. Nhiệm vụ của bạn là tạo ra 1 hình ảnh phối cảnh photorealistic bám sát dữ liệu thực tế tôi cung cấp — không sáng tạo tuỳ tiện.',
    '',
    '═══ DỮ LIỆU DỰ ÁN ═══',
    `Khách hàng: ${project.customerName}`,
    `Gói dịch vụ: ${project.service}`,
    '',
    '═══ CÁCH ĐỌC ẢNH KHOANH VÙNG (File 2) ═══',
    'Hãy nhìn trực tiếp vào hình ảnh khoanh vùng thiết kế (File 2) mà tôi đính kèm.',
    '→ Chỉ xử lý đúng những vùng màu bạn thực sự nhìn thấy trong ảnh đó.',
    '→ Mỗi vùng màu tô là một khu vực công năng cần can thiệp. Đặt đúng hạng mục vào đúng vị trí không gian đó.',
    '→ Nếu một loại công năng không có vùng màu tương ứng trong ảnh → TUYỆT ĐỐI không thêm vào.',
    '→ Khu vực không có màu khoanh vùng = giữ nguyên hiện trạng, không thay đổi.',
    '',
    '═══ GỢI Ý CÁCH HIỂU CÁC MÀU PHỔ BIẾN (chỉ dùng nếu màu đó thực sự xuất hiện) ═══',
    '  Đỏ / cam đậm → vị trí thác nước hoặc điểm nhấn nước rơi',
    '  Xanh dương / xanh da trời → vùng hồ nước, mặt nước',
    '  Tím / hoa cà → viền kè đá bao quanh hồ hoặc bồn',
    '  Xanh lá → cây xanh, tùng, cỏ, thảm thực vật',
    '  Vàng / cam nhạt → hầm lọc, kỹ thuật ẩn',
    '  Trắng / xám sáng → sỏi, vật liệu nền trang trí',
    '  Nâu → lối đi, gỗ, hoặc vật liệu chuyển tiếp',
    '',
    '═══ YÊU CẦU VÀ PHONG CÁCH TỪ KHÁCH HÀNG ═══',
    hasNote ? `"${project.note.trim()}"` : 'Khách không để lại ghi chú cụ thể. Hãy dựa hoàn toàn vào ảnh khoanh vùng và mẫu đã chọn.',
    '',
    '═══ MẪU PHONG CÁCH ĐÃ CHỌN ═══',
    ...selectionLines,
    '',
    ...(hasExtra ? [
      '═══ TÀI NGUYÊN THAM KHẢO BỔ SUNG ═══',
      'Khách có gửi thêm hình tham khảo phong cách/vật liệu. Tinh thần đã tổng hợp trong phần yêu cầu ở trên.',
      '',
    ] : []),
    '═══ QUY TẮC TẠO ẢNH BẮT BUỘC ═══',
    '1. Giữ nguyên 100% góc chụp, phối cảnh, tỷ lệ từ ảnh hiện trạng (File 1).',
    '2. Giữ nguyên toàn bộ kiến trúc nhà, tường, cửa, cột, bậc thang — trừ phần nằm trong vùng khoanh màu.',
    '3. Chỉ thêm / thay đổi đúng vị trí không gian đã được đánh dấu màu trong ảnh khoanh vùng.',
    '4. Áp dụng vật liệu và bố cục từ mẫu đã chọn cho đúng hạng mục tương ứng.',
    '5. Không thêm bất kỳ hạng mục nào không có vùng màu trong ảnh khoanh vùng.',
    '6. Kết quả phải tự nhiên, khả thi thi công thực tế, không méo hình, không sai tỷ lệ.',
    '',
    '═══ FILE ĐÍNH KÈM ═══',
    ...assetLines,
  ];
  return lines.join('\n');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware — CORS cho phép FE Vercel + local dev gọi tới BE
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : null; // null = cho tất cả (dev mode)

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection + Startup Recovery
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000, // Đợi tối đa 15s để kết nối lỗi thì báo ngay
  connectTimeoutMS: 15000
})
  .then(async () => {
    console.log('✅ [DATABASE] Đã kết nối MongoDB Atlas');
    // Khôi phục các project bị bỏ dở sau khi restart server
    setTimeout(resumePendingProjects, 5000);
  })
  .catch(err => console.error('MongoDB connection error:', err));

async function resumePendingProjects() {
  try {
    // Chưa có model lúc này, gọi sau khi schema được define — dùng flag tránh gọi sớm
    if (!global._projectModelReady) return;
    const stuck = await Project.find({
      service: 'Gói Cơ Bản',
      $or: [
        { status: 'pending' },
        { status: 'processing', $expr: { $lt: [{ $size: { $ifNull: ['$aiResults', []] } }, 4] } }
      ]
    }).lean();

    if (stuck.length === 0) {
      console.log('✅ [STARTUP] Không có dự án nào cần xử lý lại.');
      return;
    }

    console.log(`⚠️ [STARTUP] Phát hiện ${stuck.length} dự án chưa hoàn thiện. Chỉ tự động kích hoạt lại dự án mới nhất để tránh treo máy...`);

    // Chỉ tự động xử lý lại 1 dự án gần nhất để tránh mở quá nhiều trình duyệt cùng lúc
    const project = stuck[0]; 
    setImmediate(async () => {
        try {
          const assets = [
            { label: 'Ảnh hiện trạng gốc', url: project.rawImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
            { label: 'Ảnh khoanh vùng thiết kế', url: project.annotatedImage, role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.' }
          ];
          let thacUrl = resolveThacUrl(project.selections);
          if (thacUrl) {
            if (thacUrl.startsWith('/')) {
              thacUrl = 'https://designer-jet.vercel.app' + encodeURI(thacUrl);
            }
            assets.push({ label: 'Mẫu khách chọn', url: thacUrl, role: 'Mẫu thác / vân đá chọn từ thư viện.' });
          }

          const resolvedPrompt = buildServerPrompt(project, assets);
          await Project.findOneAndUpdate({ id: project.id }, { status: 'processing', workflowBranch: 'chatgpt_image' });

          let count = (project.aiResults || []).length;
          const onImageReady = async (outputPath) => {
            try {
              const url = await uploadToCloudinary(outputPath);
              if (!url || !url.startsWith('http')) return;
              count++;
              console.log(`[RESUME] ✅ Ảnh #${count} cho "${project.customerName}"`);
              await Project.findOneAndUpdate(
                { id: project.id },
                { $set: { status: 'processing', workflowBranch: 'chatgpt_image' }, $push: { aiResults: url } }
              );
              await fs.unlink(outputPath).catch(() => null);
            } catch (e) { console.error('[RESUME] Lỗi upload:', e.message); }
          };

          await runChatGptAutomation({ prompt: resolvedPrompt, assets, onImageReady });
          await Project.findOneAndUpdate({ id: project.id }, { $set: { status: 'done' } });
          console.log(`[RESUME] ✅ Hoàn thành "${project.customerName}"`);
        } catch (e) {
          console.error(`[RESUME] ❌ Lỗi "${project.customerName}":`, e.message);
          await Project.findOneAndUpdate({ id: project.id }, { status: 'pending' }).catch(() => null);
        }
      });
  } catch (e) {
    console.error('[STARTUP] Lỗi startup recovery:', e.message);
  }
}

// Schema
const ProjectSchema = new mongoose.Schema({
  id: String,
  timestamp: { type: Date, default: Date.now },
  customerName: String,
  customerPhone: String,
  rawImage: String,
  annotatedImage: String,
  selections: {
    thac: String,
    thacUrl: String,
    thacName: String,
    ke: [String],
    canh: [String]
  },
  service: String,
  status: { type: String, default: 'pending' },
  note: String,
  extraAssets: [String],
  workflowBranch: String,
  finalImage: String,
  aiResults: [String]
});

const Project = mongoose.model('Project', ProjectSchema);
global._projectModelReady = true; // Cho phép resumePendingProjects chạy

// Helper: Upload to Cloudinary
const uploadToCloudinary = async (fileStr) => {
  if (!fileStr || fileStr.startsWith('http')) return fileStr;
  try {
    const uploadResponse = await cloudinary.uploader.upload(fileStr, {
      folder: 'landscape_app',
      resource_type: 'auto' // handles both images and videos
    });
    return uploadResponse.secure_url;
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return fileStr; // Fallback to original
  }
};

// API Routes
app.get('/api/projects', async (req, res) => {
  console.log(`GET /api/projects - Đang truy vấn dữ liệu... Mongoose state: ${mongoose.connection.readyState}`);
  const startTime = Date.now();
  try {
    // Thêm select để loại trừ rawImage/annotatedImage nếu nó là base64 khổng lồ, nhưng FrontEnd cần nó để hiển thị.
    // Tạm thời lấy tất cả nhưng đính kèm timeout.
    const projects = await Project.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .maxTimeMS(8000)
      .lean();
    console.log(`GET /api/projects - Thành công: tìm thấy ${projects.length} dự án (Tốn ${Date.now() - startTime}ms).`);
    res.json(projects);
  } catch (err) {
    console.error(`GET /api/projects - Lỗi truy vấn sau ${Date.now() - startTime}ms:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id }).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const data = req.body;
    console.log('[DEBUG] Full Request Body Selections:', JSON.stringify(data.selections, null, 2));
    console.log('Uploading images to Cloudinary...');

    // 1. Upload Raw Image
    data.rawImage = await uploadToCloudinary(data.rawImage);
    
    // 2. Upload Annotated Image
    data.annotatedImage = await uploadToCloudinary(data.annotatedImage);
    
    // 3. Upload Extra Assets
    if (data.extraAssets && data.extraAssets.length > 0) {
      data.extraAssets = await Promise.all(
        data.extraAssets.map(asset => uploadToCloudinary(asset))
      );
    }


    // 3. Upload Selected Asset (3rd image) to Cloudinary to ensure ChatGPT can access it
    if (data.selections?.thacUrl) {
      // Nếu là đường dẫn tương đối (bắt đầu bằng /), chuyển thành tuyệt đối dựa trên link Vercel để upload lên Cloudinary
      let absoluteThacUrl = data.selections.thacUrl;
      if (absoluteThacUrl.startsWith('/')) {
        // Encode URL to handle spaces and Vietnamese characters
        absoluteThacUrl = 'https://designer-jet.vercel.app' + encodeURI(absoluteThacUrl);
      }
      console.log('Uploading selected Thac model to Cloudinary:', absoluteThacUrl);
      data.selections.thacUrl = await uploadToCloudinary(absoluteThacUrl);
    }
    
    // Create project
    const newProject = new Project(data);
    await newProject.save();

    console.log('Project saved to DB:', newProject.id);
    res.status(201).json(newProject);

    // Auto-trigger ChatGPT generation in background for Gói Cơ Bản
    if (data.service === 'Gói Cơ Bản') {
      console.log(`[AUTO] Tự động kích hoạt ChatGPT cho dự án "${data.customerName}" (${newProject.id})...`);
      setImmediate(async () => {
        try {
          const assets = [
            { label: 'Ảnh hiện trạng gốc', url: newProject.rawImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
            { label: 'Ảnh khoanh vùng thiết kế', url: newProject.annotatedImage, role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.' }
          ];

          let thacUrl = resolveThacUrl(newProject.selections);
          if (thacUrl) {
            // Encode if it's a relative path
            if (thacUrl.startsWith('/')) {
              thacUrl = 'https://designer-jet.vercel.app' + encodeURI(thacUrl);
            }
            assets.push({ label: 'Mẫu khách chọn', url: thacUrl, role: 'Mẫu thác / vân đá chọn từ thư viện.' });
          }

          // Xây dựng prompt trực tiếp từ dữ liệu project, không cần Gemini API
          const resolvedPrompt = buildServerPrompt(newProject.toObject(), assets);

          await Project.findOneAndUpdate({ id: newProject.id }, { status: 'processing', workflowBranch: 'chatgpt_image' });

          let autoCount = 0;
          const onImageReady = async (outputPath) => {
            try {
              const url = await uploadToCloudinary(outputPath);
              if (!url || !url.startsWith('http')) return;
              autoCount++;
              console.log(`[AUTO] ✅ Ảnh #${autoCount} đã upload cho "${data.customerName}"`);
              await Project.findOneAndUpdate(
                { id: newProject.id },
                {
                  $set: { status: 'processing', workflowBranch: 'chatgpt_image', ...(autoCount === 1 ? { finalImage: url } : {}) },
                  $push: { aiResults: url }
                }
              );
              await fs.unlink(outputPath).catch(() => null);
            } catch (e) {
              console.error(`[AUTO] Lỗi upload ảnh:`, e.message);
            }
          };

          await runChatGptAutomation({ prompt: resolvedPrompt, assets, onImageReady });

          if (autoCount > 0) {
            await Project.findOneAndUpdate({ id: newProject.id }, { $set: { status: 'done' } });
            console.log(`[AUTO] ✅ Hoàn thành tự động tạo ${autoCount} ảnh cho "${data.customerName}"`);
          }
        } catch (err) {
          console.error(`[AUTO] ❌ Lỗi tự động tạo ảnh cho "${data.customerName}":`, err.message);
          await Project.findOneAndUpdate({ id: newProject.id }, { status: 'pending' }).catch(() => null);
        }
      });
    }
  } catch (err) {
    console.error('Submission error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const updates = {};

    if (typeof req.body.status === 'string') {
      updates.status = req.body.status;
    }

    if (typeof req.body.workflowBranch === 'string') {
      updates.workflowBranch = req.body.workflowBranch;
    }

    if (req.body.finalImage) {
      updates.finalImage = await uploadToCloudinary(req.body.finalImage);
    }

    if (Array.isArray(req.body.aiResults)) {
      updates.aiResults = req.body.aiResults;
    }

    const updated = await Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/projects/:id/ai-prompt', async (req, res) => {
  try {
    const { assets } = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Thiếu dữ liệu tài nguyên để AI sinh prompt.' });
    }

    const project = await Project.findOne({ id: req.params.id }).lean();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const prompt = await generateLandscapePrompt(project, assets);
    res.json({ prompt });
  } catch (err) {
    console.error('AI prompt generation error:', err);
    res.status(500).json({ error: err.message || 'Không thể sinh prompt bằng AI.' });
  }
});

app.post('/api/projects/:id/chatgpt-generate', async (req, res) => {
  try {
    const { prompt, assets } = req.body;

    if (!Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ error: 'Thiếu danh sách ảnh tài nguyên để upload.' });
    }

    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.status !== 'done') {
      project.status = 'processing';
      await project.save();
    }

    const resolvedPrompt = typeof prompt === 'string' && prompt.trim()
      ? prompt.trim()
      : await generateLandscapePrompt(project.toObject(), assets);

    let firstUrl = null;
    let uploadCount = 0;

    // Callback: mỗi khi một ảnh tải xong thì upload + push vào DB ngay
    const onImageReady = async (outputPath) => {
      try {
        const url = await uploadToCloudinary(outputPath);
        if (!url || !url.startsWith('http')) return;
        uploadCount++;
        if (!firstUrl) firstUrl = url;
        console.log(`[Ảnh #${uploadCount}] Đã upload: ${url}`);
        await Project.findOneAndUpdate(
          { id: req.params.id },
          {
            $set: { workflowBranch: 'chatgpt_image', status: 'processing', finalImage: firstUrl },
            $push: { aiResults: url }
          }
        );
        // Dọn file tạm
      } catch (e) {
        console.error('Lỗi upload ảnh:', e.message);
      }
    };

    const automationResult = await runChatGptAutomation({ prompt: resolvedPrompt, assets, onImageReady });

    const updated = await Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: { status: uploadCount > 0 ? 'done' : 'pending' } },
      { new: true }
    );

    if (uploadCount === 0) {
      throw new Error('Không upload được bất kỳ ảnh kết quả nào lên Cloudinary.');
    }

    res.json({
      project: updated,
      prompt: resolvedPrompt,
      outputUrl: firstUrl,
      chatUrl: automationResult?.chatUrl
    });
  } catch (err) {
    console.error('ChatGPT generation error:', err);
    res.status(500).json({ error: err.message || 'Không thể tự động tạo ảnh với ChatGPT.' });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
