const express = require('express');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { runChatGptAutomation, runChatGptAutomationBatch } = require('./chatgptAutomation');
const { runFlowAutomation, runFlowVideoAutomation } = require('./flowAutomation');
const { generateLandscapePrompt } = require('./geminiPromptService');
const { runPass2Tasks, runSinglePass2Task, initPass2State, PASS2_TASKS } = require('./pass2Automation');

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
function extractSelectedModelUrl(note = '') {
  const modelMatch = note.match(/\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:\s*(https?:\/\/[^\n]+)/i)
    ?? note.match(/https?:\/\/[^\s\n]+/);
  return modelMatch ? (modelMatch[1] ?? modelMatch[0])?.trim() : null;
}

function normalizePublicAssetUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed.startsWith('/')) return trimmed;
  return 'https://designer-jet.vercel.app' + encodeURI(trimmed);
}

function isBasicService(service = '') {
  const normalized = String(service || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return normalized.includes('goi co ban') || normalized.includes('basic');
}

function getProjectReferenceModelUrl(project = {}) {
  return project.referenceModelUrl || extractSelectedModelUrl(project.note || '');
}

function buildProjectAiAssets(project) {
  const isBasic = isBasicService(project.service);
  const assets = [
    {
      label: 'Ảnh hiện trạng gốc (Image 1)',
      url: project.rawImage,
      role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.'
    }
  ];

  if (isBasic) {
    const modelUrl = getProjectReferenceModelUrl(project);
    if (modelUrl) {
      assets.push({
        label: 'Ảnh mẫu khách đã chọn (Image 2)',
        url: modelUrl,
        role: 'Mẫu phong cách tham khảo. Dùng làm nguồn cảm hứng về đá, cây, hồ — KHÔNG sao chép layout.'
      });
    }
    return assets;
  }

  assets.push({
    label: 'Ảnh khoanh vùng thiết kế',
    url: project.annotatedImage,
    role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.'
  });

  let thacUrl = resolveThacUrl(project.selections);
  if (thacUrl) {
    if (thacUrl.startsWith('/')) {
      thacUrl = 'https://designer-jet.vercel.app' + encodeURI(thacUrl);
    }
    assets.push({
      label: 'Mẫu khách chọn',
      url: thacUrl,
      role: 'Mẫu thác / vân đá chọn từ thư viện, dùng cho phối cảnh và vật liệu.'
    });
  }

  return assets;
}

function buildBasicProjectFlowPrompt(project) {
  const modelUrl = getProjectReferenceModelUrl(project);
  const customNote = project.note?.replace(/\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:[^\n]*\n?/i, '').trim();
  const noteContent = (project.note || '').toLowerCase();
  const hasWaterKeywords = /hồ|thác|nước|pond|waterfall|stream|lake|flow|suối/i.test(noteContent);
  const hasWaterSelection = !!(project.selections?.thac || project.selections?.ho);
  const includeWater = hasWaterKeywords || hasWaterSelection;
  const assetLines = buildProjectAiAssets(project).map((asset, i) => `- File ${i + 1}: ${asset.label}. ${asset.role}`);

  return [
    'ROLE: Landscape visualization expert (STRICT image-to-image transformation)',
    '',
    '====================================================',
    'OBJECTIVE',
    '====================================================',
    '',
    'Transform the real site (Image 1) into a built landscape design',
    'inspired by the reference model (Image 2).',
    '',
    'IMPORTANT:',
    '- Image 1 = ONLY base image (camera angle, walls, space must remain EXACT)',
    '- Image 2 = DESIGN REFERENCE ONLY (style, material, composition language)',
    '- DO NOT copy layout or scale from Image 2',
    '',
    '====================================================',
    `PROJECT DATA — ${project.customerName} | ${project.service}`,
    '====================================================',
    '',
    ...(customNote ? ['CUSTOMER REQUEST:', `"${customNote}"`, ''] : []),
    ...(modelUrl ? [`REFERENCE MODEL (Image 2): ${modelUrl}`, ''] : []),
    '====================================================',
    'CORE DESIGN TRANSLATION (CRITICAL)',
    '====================================================',
    '',
    'From Image 2, extract ONLY:',
    '',
    '- Natural stone composition',
    includeWater ? '- Waterfall flowing naturally across rocks' : '- Hill and stone arrangement',
    '- Integration between stone + plants',
    '- High-end garden feeling',
    '',
    'DO NOT copy:',
    '- Full size or full layout',
    '- Large mountain scale',
    '',
    '====================================================',
    'SITE ADAPTATION (VERY IMPORTANT)',
    '====================================================',
    '',
    'Adapt the design from Image 2 to fit the REAL residential yard in Image 1.',
    '',
    '- Scale DOWN all elements to match the real space',
    '- Keep proportions realistic to this yard size',
    '- Ensure the design feels buildable and not oversized',
    '',
    '====================================================',
    includeWater ? 'MAIN FEATURE — WATERFALL' : 'MAIN FEATURE — LANDSCAPE HILLS',
    '====================================================',
    '',
    ...(includeWater
      ? [
          '- Place waterfall at wall corner (like Image 1 geometry)',
          '- Inspired by stone from Image 2',
          '',
          'REQUIRED:',
          '- Compact stone waterfall',
          '- Built into wall (not freestanding mountain)',
          '- Flow naturally down into pond',
          '',
          'FORBIDDEN:',
          '- DO NOT create large rock mountain',
          '- DO NOT copy full waterfall from Image 2',
          '- DO NOT let waterfall occupy entire width'
        ]
      : [
          '- Create natural hills and stone arrangements (inspired by Image 2)',
          '- Place primarily against walls or in designated yard corners',
          '',
          'REQUIRED:',
          '- Detailed dry garden composition',
          '- Pine trees (Tùng La Hán) as focal points',
          '- Lush moss or velvet grass (Cỏ nhung)',
          '',
          'FORBIDDEN:',
          '- DO NOT add any water features (no ponds, no waterfalls)',
          '- DO NOT add fish'
        ]),
    '',
    ...(includeWater
      ? [
          '====================================================',
          'POND',
          '====================================================',
          '',
          '- Natural curved koi pond in front of waterfall',
          '- Proportional to yard size',
          '- Clean edge, elegant',
          ''
        ]
      : []),
    '====================================================',
    'LANDSCAPE',
    '====================================================',
    '',
    '- Use planting style from Image 2:',
    '  - bonsai trees',
    '  - shrubs',
    '  - natural greenery',
    '',
    'BUT:',
    '- Reduce density',
    '- Keep clean, breathable layout',
    '',
    '====================================================',
    'STONE LANGUAGE',
    '====================================================',
    '',
    '- Use stone type from Image 2:',
    '  - natural, slightly warm tone',
    `- Apply consistently to ${includeWater ? 'waterfall' : 'hills'} and accents`,
    '',
    '====================================================',
    'PATHWAY',
    '====================================================',
    '',
    '- Add stepping stones (inspired by Image 2)',
    '- Natural spacing',
    '- Soft garden path, not hard paving',
    '',
    '====================================================',
    'OVERALL HARMONY',
    '====================================================',
    '',
    '- High-end residential garden',
    '- Balanced composition',
    '- Not crowded',
    includeWater ? '- Clear focal point at waterfall' : '- Clear focal point at pine trees and hills',
    '',
    '====================================================',
    'REALISM',
    '====================================================',
    '',
    '- Photorealistic, built project look',
    '- Correct scale, believable materials',
    '- NO CGI look',
    '- NO oversized elements',
    '- NO copy-paste composition',
    '',
    '====================================================',
    'FINAL INTENT',
    '====================================================',
    '',
    'A realistic garden built on this exact site,',
    'inspired by the style of Image 2,',
    'but fully adapted to the real scale and layout of Image 1.',
    '',
    '====================================================',
    'ATTACHED FILES',
    '====================================================',
    '',
    ...assetLines
  ].join('\n');
}

function buildProjectFlowPrompt(project) {
  return isBasicService(project.service)
    ? buildBasicProjectFlowPrompt(project)
    : buildServerPrompt(project, buildProjectAiAssets(project));
}

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
    // setTimeout(resumePendingProjects, 5000); // ⛔ Tạm dừng khôi phục ChatGPT cũ theo yêu cầu khách hàng
    setTimeout(sweepStuckPass2, 3000);
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

          console.log(`[AUTO] Đang bắt đầu xử lý ảnh qua Google Labs Flow cho "${project.customerName}"...`);
          await runFlowAutomation({ prompt: resolvedPrompt, assets, onImageReady }).catch(err => {
              console.error('[AUTO] Lỗi Google Flow:', err.message);
          });

          console.log(`[AUTO] Đang chuyển sang xử lý ảnh qua ChatGPT cho "${project.customerName}"...`);
          await runChatGptAutomation({ prompt: resolvedPrompt, assets, onImageReady }).catch(err => {
              console.error('[AUTO] Lỗi ChatGPT:', err.message);
          });

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
  mainBranch: { type: String, default: 'landscape' },
  customerName: String,
  customerPhone: String,
  rawImage: String,
  annotatedImage: String,
  referenceModelUrl: String,
  selections: {
    thac: String,
    thacUrl: String,
    thacName: String,
    ke: [String],
    canh: [String]
  },
  service: String,
  status: { type: String, default: 'pending' },
  deviceId: String,
  note: String,
  extraAssets: [String],
  workflowBranch: String,
  finalImage: String,
  aiResults: [String],
  pass2Results: {
    type: new mongoose.Schema({
      referenceImageUrl: String,
      dimensions: {
        width: Number,
        length: Number
      },
      status: { type: String, default: 'pending' },
      startedAt: Date,
      completedAt: Date,
      tasks: [{
        taskId: String,
        type: { type: String },
        label: String,
        status: { type: String, default: 'pending' },
        url: String,
        chatUrl: String,
        error: String
      }]
    }, { _id: false }),
    default: null
  },
  payment: {
    type: new mongoose.Schema({
      packageId: String,
      packageLabel: String,
      area: Number,
      amount: Number,
      status: { type: String, default: 'pending' },
      orderId: String,
      requestId: String,
      transId: String,
      payUrl: String,
      qrCodeUrl: String,
      deeplink: String,
      message: String,
      resultCode: Number,
      createdAt: Date,
      paidAt: Date,
      manual: { type: Boolean, default: false },
      note: String,
      cancelledAt: Date
    }, { _id: false }),
    default: null
  }
});
const Project = mongoose.model('Project', ProjectSchema);

const SystemContentSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  uiText: { type: mongoose.Schema.Types.Mixed, default: {} },
  uiIcons: { type: mongoose.Schema.Types.Mixed, default: {} },
  tips: { type: mongoose.Schema.Types.Mixed, default: null },
  plans: { type: mongoose.Schema.Types.Mixed, default: null },
  library: { type: mongoose.Schema.Types.Mixed, default: null }
}, { timestamps: true });
const SystemContent = mongoose.model('SystemContent', SystemContentSchema);

global._projectModelReady = true; // Cho phép resumePendingProjects chạy

// Startup sweep: mark task pass2 bị stuck 'running' (do server restart giữa chừng) → failed
// để user có thể bấm Thử lại
async function sweepStuckPass2() {
  try {
    const r = await Project.updateMany(
      { 'pass2Results.status': 'running' },
      {
        $set: {
          'pass2Results.status': 'failed',
          'pass2Results.completedAt': new Date(),
          'pass2Results.tasks.$[t].status': 'failed',
          'pass2Results.tasks.$[t].error': 'Server restart giữa chừng. Bấm Thử lại.'
        }
      },
      { arrayFilters: [{ 't.status': { $in: ['running', 'pending'] }, 't.url': null }] }
    );
    if (r.matchedCount > 0) {
      console.log(`🧹 [STARTUP] Pass2 sweep: mark ${r.matchedCount} project có task stuck → failed.`);
    }
  } catch (err) {
    console.error('Startup pass2 sweep lỗi:', err.message);
  }
}

// Helper: Upload to Cloudinary
const uploadToCloudinary = async (fileStr) => {
  if (!fileStr || fileStr.startsWith('http')) return fileStr;

  const opts = {
    folder: 'landscape_app',
    resource_type: 'auto',  // Cloudinary tự detect image/video
    timeout: 600000          // 10 min — video có thể lâu do upload + encoding
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await cloudinary.uploader.upload(fileStr, opts);
      if (res?.secure_url) return res.secure_url;
      console.error(`Cloudinary upload attempt ${attempt}: response missing secure_url`, res);
    } catch (err) {
      const isTimeout = err?.http_code === 499 || err?.name === 'TimeoutError';
      console.error(`Cloudinary upload attempt ${attempt} failed${isTimeout ? ' (timeout)' : ''}:`, err?.message || err);
    }
    if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
  }
  console.error(`Cloudinary: bỏ cuộc sau 3 lần với file ${fileStr}`);
  return fileStr;
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

app.get('/api/projects/by-device/:deviceId', async (req, res) => {
  try {
    const projects = await Project.find({ deviceId: req.params.deviceId })
      .sort({ timestamp: -1 })
      .select('id timestamp customerName service status aiResults finalImage rawImage referenceModelUrl')
      .limit(20)
      .lean();
    res.json(projects);
  } catch (err) {
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

app.delete('/api/projects', async (req, res) => {
  try {
    const result = await Project.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('Delete all projects error:', err);
    res.status(500).json({ error: err.message || 'Không thể xóa danh sách dự án.' });
  }
});

app.post('/api/projects/delete-all', async (req, res) => {
  try {
    const result = await Project.deleteMany({});
    res.json({ success: true, deletedCount: result.deletedCount || 0 });
  } catch (err) {
    console.error('Delete all projects error:', err);
    res.status(500).json({ error: err.message || 'Không thể xóa danh sách dự án.' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await Project.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: err.message || 'Không thể xóa dự án.' });
  }
});

app.post('/api/projects/:id/delete', async (req, res) => {
  try {
    const deleted = await Project.findOneAndDelete({ id: req.params.id });
    if (!deleted) return res.status(404).json({ error: 'Project not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: err.message || 'Không thể xóa dự án.' });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const data = req.body;
    console.log('[DEBUG] Full Request Body Selections:', JSON.stringify(data.selections, null, 2));
    console.log('Uploading images to Cloudinary...');

    // 1. Upload Raw Image
    if (data.rawImage) {
      data.rawImage = await uploadToCloudinary(data.rawImage);
    }
    
    // 2. Upload Annotated Image
    if (data.annotatedImage) {
      data.annotatedImage = await uploadToCloudinary(data.annotatedImage);
    }

    if (data.referenceModelUrl) {
      data.referenceModelUrl = await uploadToCloudinary(normalizePublicAssetUrl(data.referenceModelUrl));
    }
    
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

    if (data.interiorPairs && data.interiorPairs.length > 0) {
      console.log(`[DEBUG] Uploading ${data.interiorPairs.length} interior pairs to Cloudinary...`);
      for (let i = 0; i < data.interiorPairs.length; i++) {
        data.interiorPairs[i].siteImage = await uploadToCloudinary(data.interiorPairs[i].siteImage);
      }
    }
    
    const shouldAutoRunFlow = isBasicService(data.service);

    // Create project
    const newProject = new Project({
      ...data,
      mainBranch: data.mainBranch || 'landscape',
      status: shouldAutoRunFlow ? 'processing' : (data.status || 'pending'),
      workflowBranch: shouldAutoRunFlow ? 'chatgpt_image' : data.workflowBranch
    });
    await newProject.save();

    console.log('Project saved to DB:', newProject.id);
    res.status(201).json(newProject);

    // Auto-trigger ChatGPT generation in background for Gói Cơ Bản
    if (shouldAutoRunFlow) {
      console.log(`[AUTO] Tự động kích hoạt ChatGPT cho dự án "${data.customerName}" (${newProject.id})...`);
      setImmediate(async () => {
        try {
          const projectForAi = newProject.toObject();
          const assets = buildProjectAiAssets(projectForAi);
          const resolvedPrompt = buildProjectFlowPrompt(projectForAi);

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

          console.log(`[AUTO] Đang bắt đầu xử lý ảnh qua Google Labs Flow cho "${data.customerName}" với pipeline giống nút admin...`);
          
          if (projectForAi.interiorPairs && projectForAi.interiorPairs.length > 0) {
            console.log(`[AUTO] Phát hiện ${projectForAi.interiorPairs.length} cặp Nội thất. Sẽ tạo song song.`);
            // Tạo danh sách jobs để chạy song song 1 lúc
            const jobs = projectForAi.interiorPairs.map((pair, idx) => {
              const pairAssets = [
                { label: `Ảnh hiện trạng góc ${idx + 1}`, url: pair.siteImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
                { label: `Mẫu phong cách tham khảo ${idx + 1}`, url: pair.referenceImage, role: 'Mẫu phong cách tham khảo. Dùng làm nguồn cảm hứng.' }
              ];
              const pairPrompt = buildProjectFlowPrompt({ ...projectForAi, rawImage: pair.siteImage, referenceModelUrl: pair.referenceImage, selections: {} });
              return { prompt: pairPrompt, assets: pairAssets };
            });

            await runChatGptAutomationBatch(jobs, onImageReady).catch(err => {
                console.error('[AUTO] Lỗi ChatGPT song song:', err.message);
            });
          } else {
            await runFlowAutomation({ prompt: resolvedPrompt, assets, onImageReady }).catch(err => {
                console.error('[AUTO] Lỗi Google Flow:', err.message);
            });
          }

          if (autoCount > 0) {
            await Project.findOneAndUpdate({ id: newProject.id }, { $set: { status: 'done' } });
            console.log(`[AUTO] ✅ Hoàn thành tự động tạo ${autoCount} ảnh cho "${data.customerName}"`);
          } else {
            await Project.findOneAndUpdate({ id: newProject.id }, { $set: { status: 'pending' } });
            console.log(`[AUTO] ⚠️ Google Flow chưa trả về ảnh nào cho "${data.customerName}".`);
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

    if (typeof req.body.mainBranch === 'string') {
      updates.mainBranch = req.body.mainBranch;
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

app.get('/api/system-content', async (req, res) => {
  try {
    let content = await SystemContent.findOne({ key: 'main' });
    if (!content) {
      return res.json({ uiText: {}, uiIcons: {} });
    }
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/system-content', async (req, res) => {
  try {
    const { uiText, uiIcons, tips, plans, library } = req.body;
    const update = {};
    if (uiText) update.uiText = uiText;
    if (uiIcons) update.uiIcons = uiIcons;
    if (tips) update.tips = tips;
    if (plans) update.plans = plans;
    if (library) update.library = library;

    const content = await SystemContent.findOneAndUpdate(
      { key: 'main' },
      { $set: update },
      { upsert: true, new: true }
    );
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const automationResult = await runFlowAutomation({ prompt: resolvedPrompt, assets, onImageReady });

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


// VIDEO GENERATION API
app.post('/api/projects/:id/generate-video', async (req, res) => {
  try {
    const { prompt, imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Thiếu URL ảnh tham chiếu để tạo video.' });
    }

    const project = await Project.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    let videoUrl = null;

    const onVideoReady = async (outputPath) => {
      try {
        const url = await uploadToCloudinary(outputPath);
        if (!url || !url.startsWith('http')) return;
        videoUrl = url;
        console.log(`[Video] Đã upload video: ${url}`);
        await Project.findOneAndUpdate(
          { id: req.params.id },
          { $push: { aiResults: url } }
        );
      } catch (e) {
        console.error('Lỗi upload video:', e.message);
      }
    };

    const automationResult = await runFlowVideoAutomation({
      prompt: prompt || 'Smooth cinematic camera movement through this landscape garden design. Gentle water flowing, leaves swaying in breeze. Photorealistic, golden hour lighting.',
      imageUrl,
      onVideoReady
    });

    res.json({
      project: await Project.findOne({ id: req.params.id }),
      videoUrl,
      chatUrl: automationResult?.chatUrl
    });
  } catch (err) {
    console.error('Video generation error:', err);
    res.status(500).json({ error: err.message || 'Không thể tạo video.' });
  }
});

// PASS 2 — gen 3 camera angles + 2 drawings + 2 videos from 1 chosen PA
app.post('/api/projects/:id/pass2', async (req, res) => {
  try {
    const { referenceImageUrl, dimensions } = req.body || {};
    if (!referenceImageUrl || !referenceImageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Thiếu referenceImageUrl hợp lệ (ảnh PA đã chọn).' });
    }

    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (project.pass2Results?.status === 'running') {
      return res.status(409).json({ error: 'Pass 2 đang chạy cho dự án này, vui lòng chờ.' });
    }

    const initial = initPass2State(referenceImageUrl, dimensions);
    await Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: { pass2Results: initial } },
      { new: true }
    );

    res.json({ ok: true, message: 'Pass 2 đã bắt đầu', pass2Results: initial });

    (async () => {
      const handleImageUpload = async (task, localPath) => {
        const url = await uploadToCloudinary(localPath);
        if (!url || !url.startsWith('http')) return;
        console.log(`[Pass2][${task.id}] +image ${url}`);
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': task.id },
          { $set: { 'pass2Results.tasks.$.url': url } }
        );
      };

      const handleVideoUpload = async (task, localPath) => {
        const url = await uploadToCloudinary(localPath);
        if (!url || !url.startsWith('http')) return;
        console.log(`[Pass2][${task.id}] video ${url}`);
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': task.id },
          { $set: { 'pass2Results.tasks.$.url': url } }
        );
      };

      const handleTaskEvent = async (evt) => {
        const setOps = { 'pass2Results.tasks.$.status': evt.status };
        if (evt.chatUrl) setOps['pass2Results.tasks.$.chatUrl'] = evt.chatUrl;
        if (evt.error) setOps['pass2Results.tasks.$.error'] = evt.error;
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': evt.taskId },
          { $set: setOps }
        );
      };

      try {
        await runPass2Tasks({
          referenceImageUrl,
          dimensions,
          onImageReady: handleImageUpload,
          onVideoReady: handleVideoUpload,
          onTaskEvent: handleTaskEvent
        });
        // Sweep: task nào status='done' mà url=null coi như thất bại (thường do Cloudinary upload lỗi)
        const after = await Project.findOne({ id: req.params.id });
        const tasks = after?.pass2Results?.tasks || [];
        for (const t of tasks) {
          if (t.status === 'done' && !t.url) {
            await Project.findOneAndUpdate(
              { id: req.params.id, 'pass2Results.tasks.taskId': t.taskId },
              { $set: {
                'pass2Results.tasks.$.status': 'failed',
                'pass2Results.tasks.$.error': 'Upload Cloudinary thất bại (timeout). Bấm Thử lại.'
              }}
            );
            console.warn(`[Pass2] task ${t.taskId} done nhưng thiếu url → đánh dấu failed.`);
          }
        }
        const fresh = await Project.findOne({ id: req.params.id });
        const allOk = (fresh?.pass2Results?.tasks || []).every(t => t.status === 'done' && t.url);
        await Project.findOneAndUpdate(
          { id: req.params.id },
          { $set: { 'pass2Results.status': allOk ? 'done' : 'failed', 'pass2Results.completedAt': new Date() } }
        );
        console.log(`[Pass2] project ${req.params.id} HOÀN TẤT (tổng: ${allOk ? 'done' : 'failed'}).`);
      } catch (err) {
        console.error(`[Pass2] project ${req.params.id} lỗi tổng:`, err);
        await Project.findOneAndUpdate(
          { id: req.params.id },
          { $set: { 'pass2Results.status': 'failed', 'pass2Results.completedAt': new Date() } }
        );
      }
    })();
  } catch (err) {
    console.error('Pass 2 start error:', err);
    res.status(500).json({ error: err.message || 'Không thể khởi động Pass 2.' });
  }
});

// PASS 2 — retry 1 task bị fail
app.post('/api/projects/:id/pass2/retry', async (req, res) => {
  try {
    const { taskId } = req.body || {};
    if (!taskId) return res.status(400).json({ error: 'Thiếu taskId.' });

    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.pass2Results) return res.status(400).json({ error: 'Project chưa có pass2Results.' });

    const taskDef = PASS2_TASKS.find(t => t.id === taskId);
    if (!taskDef) return res.status(400).json({ error: `Không tìm thấy task ${taskId}.` });

    const existing = project.pass2Results.tasks.find(t => t.taskId === taskId);
    if (existing?.status === 'running') {
      return res.status(409).json({ error: 'Task đang chạy, vui lòng chờ.' });
    }

    // Reset task về pending + url=null, set overall status = running
    await Project.findOneAndUpdate(
      { id: req.params.id, 'pass2Results.tasks.taskId': taskId },
      { $set: {
        'pass2Results.status': 'running',
        'pass2Results.completedAt': null,
        'pass2Results.tasks.$.status': 'pending',
        'pass2Results.tasks.$.url': null,
        'pass2Results.tasks.$.error': null
      }}
    );

    res.json({ ok: true, message: `Đang thử lại task ${taskId}` });

    (async () => {
      const { referenceImageUrl, dimensions } = project.pass2Results;

      const handleImageUpload = async (task, localPath) => {
        const url = await uploadToCloudinary(localPath);
        if (!url || !url.startsWith('http')) return;
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': task.id },
          { $set: { 'pass2Results.tasks.$.url': url } }
        );
      };
      const handleVideoUpload = async (task, localPath) => {
        const url = await uploadToCloudinary(localPath);
        if (!url || !url.startsWith('http')) return;
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': task.id },
          { $set: { 'pass2Results.tasks.$.url': url } }
        );
      };
      const handleTaskEvent = async (evt) => {
        const setOps = { 'pass2Results.tasks.$.status': evt.status };
        if (evt.chatUrl) setOps['pass2Results.tasks.$.chatUrl'] = evt.chatUrl;
        setOps['pass2Results.tasks.$.error'] = evt.error || null;
        await Project.findOneAndUpdate(
          { id: req.params.id, 'pass2Results.tasks.taskId': evt.taskId },
          { $set: setOps }
        );
      };

      try {
        await runSinglePass2Task({
          task: taskDef,
          referenceImageUrl,
          dimensions,
          onImageReady: handleImageUpload,
          onVideoReady: handleVideoUpload,
          onTaskEvent: handleTaskEvent
        });
        // Post-check: nếu done nhưng url null → failed
        const after = await Project.findOne({ id: req.params.id });
        const t = after?.pass2Results?.tasks?.find(x => x.taskId === taskId);
        if (t?.status === 'done' && !t.url) {
          await Project.findOneAndUpdate(
            { id: req.params.id, 'pass2Results.tasks.taskId': taskId },
            { $set: {
              'pass2Results.tasks.$.status': 'failed',
              'pass2Results.tasks.$.error': 'Upload Cloudinary thất bại (timeout). Bấm Thử lại.'
            }}
          );
        }
        // Cập nhật overall status
        const fresh = await Project.findOne({ id: req.params.id });
        const allOk = (fresh?.pass2Results?.tasks || []).every(tk => tk.status === 'done' && tk.url);
        await Project.findOneAndUpdate(
          { id: req.params.id },
          { $set: { 'pass2Results.status': allOk ? 'done' : 'failed', 'pass2Results.completedAt': new Date() } }
        );
        console.log(`[Pass2][retry ${taskId}] xong (tổng: ${allOk ? 'done' : 'failed'}).`);
      } catch (err) {
        console.error(`[Pass2][retry ${taskId}] lỗi:`, err);
      }
    })();
  } catch (err) {
    console.error('Pass 2 retry error:', err);
    res.status(500).json({ error: err.message || 'Không thể thử lại.' });
  }
});

// SYSTEM CONTENT API
app.post('/api/upload', async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ error: 'No file provided' });
    const url = await uploadToCloudinary(file);
    res.json({ url });
  } catch (err) {
    console.error('Upload API error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Removed duplicate system-content routes

app.post('/api/upload', async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) return res.status(400).json({ error: 'No file provided' });
    const url = await uploadToCloudinary(file);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === MoMo Payment Routes ===
const momo = require('./momoService');

app.get('/api/payment/packages', (_req, res) => {
  res.json({
    packages: Object.values(momo.PACKAGES),
    momoEnv: momo.MOMO_ENV
  });
});

app.post('/api/projects/:id/payment/create', async (req, res) => {
  try {
    const { id } = req.params;
    const { packageId, area } = req.body || {};
    if (!packageId) return res.status(400).json({ error: 'packageId is required' });

    const project = await Project.findOne({ id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (project.payment?.status === 'paid') {
      return res.json({ alreadyPaid: true, payment: project.payment });
    }

    const priceInfo = momo.resolvePrice(packageId, area);
    const orderId = `${id}-${Date.now()}`;
    const requestId = orderId;
    const orderInfo = `Thanh toan ${priceInfo.label} - Du an ${id}`;

    const result = await momo.createPayment({
      orderId,
      requestId,
      amount: priceInfo.price,
      orderInfo,
      extraData: Buffer.from(JSON.stringify({ projectId: id, packageId })).toString('base64')
    });

    project.payment = {
      packageId,
      packageLabel: priceInfo.label,
      area: priceInfo.area || null,
      amount: priceInfo.price,
      status: 'pending',
      orderId,
      requestId,
      payUrl: result.payUrl,
      qrCodeUrl: result.qrCodeUrl,
      deeplink: result.deeplink,
      createdAt: new Date()
    };
    await project.save();

    res.json({
      orderId,
      amount: priceInfo.price,
      payUrl: result.payUrl,
      qrCodeUrl: result.qrCodeUrl,
      deeplink: result.deeplink,
      packageLabel: priceInfo.label
    });
  } catch (err) {
    console.error('[Payment][create] error:', err.message, err.momoResponse || '');
    res.status(500).json({ error: err.message || 'Không thể tạo thanh toán.' });
  }
});

app.post('/api/payment/momo/ipn', async (req, res) => {
  try {
    const payload = req.body || {};
    const ok = momo.verifyIpnSignature(payload);
    if (!ok) {
      console.warn('[Payment][IPN] signature mismatch', payload.orderId);
      return res.status(400).json({ resultCode: 99, message: 'Signature mismatch' });
    }

    const { orderId, resultCode, transId, message, amount } = payload;
    const project = await Project.findOne({ 'payment.orderId': orderId });
    if (!project) {
      return res.status(404).json({ resultCode: 99, message: 'Order not found' });
    }

    if (Number(resultCode) === 0) {
      project.payment.status = 'paid';
      project.payment.transId = String(transId || '');
      project.payment.paidAt = new Date();
    } else {
      project.payment.status = 'failed';
    }
    project.payment.resultCode = Number(resultCode);
    project.payment.message = message;
    if (amount) project.payment.amount = Number(amount);
    await project.save();

    res.json({ resultCode: 0, message: 'OK' });
  } catch (err) {
    console.error('[Payment][IPN] error:', err);
    res.status(500).json({ resultCode: 99, message: err.message });
  }
});

app.get('/api/projects/:id/payment/status', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.payment) return res.json({ status: 'none' });

    if (project.payment.status === 'pending' && project.payment.orderId) {
      try {
        const q = await momo.queryPayment({ orderId: project.payment.orderId, requestId: project.payment.requestId });
        if (q && Number(q.resultCode) === 0) {
          project.payment.status = 'paid';
          project.payment.transId = String(q.transId || '');
          project.payment.paidAt = new Date();
          project.payment.resultCode = 0;
          await project.save();
        } else if (q && Number(q.resultCode) > 0 && Number(q.resultCode) !== 1000 && Number(q.resultCode) !== 9000) {
          project.payment.status = 'failed';
          project.payment.resultCode = Number(q.resultCode);
          project.payment.message = q.message;
          await project.save();
        }
      } catch (qErr) {
        console.warn('[Payment][status] query failed:', qErr.message);
      }
    }

    res.json({
      status: project.payment.status,
      amount: project.payment.amount,
      packageId: project.payment.packageId,
      packageLabel: project.payment.packageLabel,
      paidAt: project.payment.paidAt,
      message: project.payment.message
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === Admin Payment Endpoints ===

// A. List payments by status
app.get('/api/admin/payments', async (req, res) => {
  try {
    const allowed = ['paid', 'pending', 'failed', 'cancelled', 'none', 'all'];
    const status = String(req.query.status || 'all').toLowerCase();
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    let filter = {};
    if (status === 'none') {
      filter = { $or: [{ payment: null }, { payment: { $exists: false } }] };
    } else if (status !== 'all') {
      filter = { 'payment.status': status };
    }

    const projects = await Project.find(filter)
      .select('id customerName customerPhone service mainBranch timestamp status payment')
      .lean();

    projects.sort((a, b) => {
      const aT = a.payment?.createdAt ? new Date(a.payment.createdAt).getTime() : 0;
      const bT = b.payment?.createdAt ? new Date(b.payment.createdAt).getTime() : 0;
      if (bT !== aT) return bT - aT;
      const aTs = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTs = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTs - aTs;
    });

    const result = projects.map(p => ({
      id: p.id,
      customerName: p.customerName || '',
      customerPhone: p.customerPhone || '',
      service: p.service || '',
      mainBranch: p.mainBranch || '',
      timestamp: p.timestamp,
      status: p.status || '',
      payment: p.payment || null
    }));

    res.json(result);
  } catch (err) {
    console.error('[Admin][payments] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// B. Recheck payment via MoMo query
app.post('/api/projects/:id/payment/recheck', async (req, res) => {
  try {
    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.payment || !project.payment.orderId || !project.payment.requestId) {
      return res.status(400).json({ error: 'Payment orderId/requestId not found' });
    }

    const q = await momo.queryPayment({
      orderId: project.payment.orderId,
      requestId: project.payment.requestId
    });

    const code = Number(q?.resultCode);
    if (code === 0) {
      project.payment.status = 'paid';
      project.payment.transId = String(q.transId || '');
      project.payment.paidAt = new Date();
      project.payment.resultCode = 0;
      project.payment.message = q.message;
      await project.save();
    } else if (Number.isFinite(code) && code > 0 && code !== 1000 && code !== 9000) {
      project.payment.status = 'failed';
      project.payment.resultCode = code;
      project.payment.message = q.message;
      await project.save();
    }

    res.json({ payment: project.payment, momoQuery: q });
  } catch (err) {
    console.error('[Admin][recheck] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// C. Mark payment as paid (manual)
app.post('/api/projects/:id/payment/mark-paid', async (req, res) => {
  try {
    const { note, amount, packageId } = req.body || {};
    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const noteStr = typeof note === 'string' ? note : '';
    const now = new Date();

    if (!project.payment) {
      const base = {
        status: 'paid',
        paidAt: now,
        manual: true,
        note: noteStr,
        message: '[Manual] ' + (noteStr || 'admin marked paid'),
        createdAt: now
      };
      if (packageId && momo.PACKAGES[packageId]) {
        base.packageId = packageId;
        base.packageLabel = momo.PACKAGES[packageId].label;
        if (typeof amount === 'number' && Number.isFinite(amount)) {
          base.amount = amount;
        } else if (typeof momo.PACKAGES[packageId].price === 'number') {
          base.amount = momo.PACKAGES[packageId].price;
        }
      } else if (typeof amount === 'number' && Number.isFinite(amount)) {
        base.amount = amount;
      }
      project.payment = base;
    } else {
      project.payment.status = 'paid';
      project.payment.paidAt = now;
      project.payment.manual = true;
      project.payment.note = noteStr;
      project.payment.message = '[Manual] ' + (noteStr || 'admin marked paid');
      if (packageId && momo.PACKAGES[packageId]) {
        project.payment.packageId = packageId;
        project.payment.packageLabel = momo.PACKAGES[packageId].label;
        if (typeof amount === 'number' && Number.isFinite(amount)) {
          project.payment.amount = amount;
        } else if (project.payment.amount == null && typeof momo.PACKAGES[packageId].price === 'number') {
          project.payment.amount = momo.PACKAGES[packageId].price;
        }
      } else if (typeof amount === 'number' && Number.isFinite(amount)) {
        project.payment.amount = amount;
      }
    }

    await project.save();
    res.json({ payment: project.payment });
  } catch (err) {
    console.error('[Admin][mark-paid] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// D. Cancel pending payment
app.post('/api/projects/:id/payment/cancel', async (req, res) => {
  try {
    const { note } = req.body || {};
    const project = await Project.findOne({ id: req.params.id });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!project.payment) return res.status(400).json({ error: 'No payment to cancel' });
    if (project.payment.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel payment with status '${project.payment.status}'` });
    }

    project.payment.status = 'cancelled';
    project.payment.cancelledAt = new Date();
    project.payment.note = typeof note === 'string' ? note : '';
    await project.save();

    res.json({ payment: project.payment });
  } catch (err) {
    console.error('[Admin][cancel] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// E. Revenue report
app.get('/api/admin/revenue', async (req, res) => {
  try {
    // Asia/Ho_Chi_Minh = UTC+7
    const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

    function ymdToUtcStart(ymd) {
      // Parse 'YYYY-MM-DD' as midnight Asia/Ho_Chi_Minh -> UTC date
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
      if (!m) return null;
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      // 00:00 ICT == (00:00 - 7h) UTC == 17:00 prev day UTC
      return new Date(Date.UTC(y, mo, d) - TZ_OFFSET_MS);
    }
    function dateToIctYmd(d) {
      const ict = new Date(d.getTime() + TZ_OFFSET_MS);
      const y = ict.getUTCFullYear();
      const mo = String(ict.getUTCMonth() + 1).padStart(2, '0');
      const da = String(ict.getUTCDate()).padStart(2, '0');
      return `${y}-${mo}-${da}`;
    }
    function addDaysYmd(ymd, days) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
      if (!m) return ymd;
      const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      dt.setUTCDate(dt.getUTCDate() + days);
      return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    }

    const todayYmd = dateToIctYmd(new Date());
    const defaultFromYmd = addDaysYmd(todayYmd, -30);

    const fromYmd = (req.query.from && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)) ? req.query.from : defaultFromYmd;
    const toYmd = (req.query.to && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) ? req.query.to : todayYmd;

    const fromUtc = ymdToUtcStart(fromYmd);
    const toExclusiveUtc = ymdToUtcStart(addDaysYmd(toYmd, 1));
    if (!fromUtc || !toExclusiveUtc) {
      return res.status(400).json({ error: 'Invalid from/to date' });
    }
    if (fromUtc.getTime() >= toExclusiveUtc.getTime()) {
      return res.status(400).json({ error: '`from` must be <= `to`' });
    }

    const projects = await Project.find({
      'payment.status': 'paid',
      'payment.paidAt': { $gte: fromUtc, $lt: toExclusiveUtc }
    }).select('mainBranch payment').lean();

    let totalAmount = 0;
    const totalCount = projects.length;
    const byPackage = {};
    const byBranch = {};
    const byDayMap = {};

    for (const p of projects) {
      const amt = Number(p.payment?.amount) || 0;
      totalAmount += amt;

      const pkgId = p.payment?.packageId || 'unknown';
      const pkgLabel = p.payment?.packageLabel || (momo.PACKAGES[pkgId]?.label || pkgId);
      if (!byPackage[pkgId]) byPackage[pkgId] = { count: 0, amount: 0, label: pkgLabel };
      byPackage[pkgId].count += 1;
      byPackage[pkgId].amount += amt;

      const branch = p.mainBranch || 'unknown';
      if (!byBranch[branch]) byBranch[branch] = { count: 0, amount: 0 };
      byBranch[branch].count += 1;
      byBranch[branch].amount += amt;

      const dayKey = dateToIctYmd(new Date(p.payment.paidAt));
      if (!byDayMap[dayKey]) byDayMap[dayKey] = { date: dayKey, count: 0, amount: 0 };
      byDayMap[dayKey].count += 1;
      byDayMap[dayKey].amount += amt;
    }

    const byDay = [];
    let cursor = fromYmd;
    while (cursor <= toYmd) {
      byDay.push(byDayMap[cursor] || { date: cursor, count: 0, amount: 0 });
      cursor = addDaysYmd(cursor, 1);
    }

    res.json({
      from: fromYmd,
      to: toYmd,
      totalAmount,
      totalCount,
      byPackage,
      byBranch,
      byDay
    });
  } catch (err) {
    console.error('[Admin][revenue] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MoMo gateway: ${momo.MOMO_ENV}`);
});
