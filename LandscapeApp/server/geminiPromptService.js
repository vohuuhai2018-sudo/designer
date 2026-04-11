const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const COLOR_RULES = [
  { color: 'Đỏ', hex: '#ef4444', meaning: 'Vị trí thác nước hoặc cụm đá thác chính', instruction: 'Bố trí đúng vào vùng đỏ, ưu tiên làm điểm nhấn đứng hoặc cụm thác chính.' },
  { color: 'Xanh dương', hex: '#3b82f6', meaning: 'Hồ cá hoặc mặt nước chính', instruction: 'Tạo hồ hoặc mặt nước ở đúng vùng xanh dương, kết nối hợp lý với thác nếu vùng đỏ nằm kề cận.' },
  { color: 'Tím', hex: '#a855f7', meaning: 'Kè đá, bo hồ hoặc viền kết cấu đá', instruction: 'Dùng làm mép bo, viền kè hoặc tường đá bám theo đúng đường nét vùng tím.' },
  { color: 'Xanh lá', hex: '#22c55e', meaning: 'Cảnh quan cây xanh, cỏ, bụi, bonsai', instruction: 'Bố trí mảng xanh đúng vùng xanh lá, cân đối với tổng thể và không che chắn cửa, bậc thềm.' },
  { color: 'Vàng', hex: '#eab308', meaning: 'Hầm lọc hoặc nắp kỹ thuật', instruction: 'Ẩn hầm lọc gọn gàng trong vùng vàng, kín đáo nhưng vẫn khả thi để bảo trì.' },
  { color: 'Trắng', hex: '#ffffff', meaning: 'Vùng sỏi hoặc nền trang trí phụ', instruction: 'Xử lý nền sỏi, vật liệu sáng hoặc khoảng chuyển tiếp ở vùng trắng.' },
  { color: 'Nâu', hex: '#78350f', meaning: 'Đá bước dạo hoặc lối đi nhấn', instruction: 'Bố trí đá bước, lối dạo hoặc điểm chuyển bước theo đúng vùng nâu.' }
];

const THAC_NAME_MAP = {
  thac_cothach: 'Đá Cổ Thạch',
  thac_vanmay: 'Đá Vân Mây',
  thac_dalua: 'Đá Lũa',
  thac_tuyetson: 'Đá Tuyết Sơn',
  thac_sanho: 'Đá San Hô',
  thac_modern: 'Thác hiện đại'
};

const KE_NAME_MAP = {
  ke_vanmay: 'Kè đá vân mây',
  ke_cothach: 'Kè đá cổ thạch',
  ke_lua: 'Kè đá lũa',
  ke_hoacuong: 'Thành đá hoa cương'
};

const CANH_NAME_MAP = {
  canh_bush_stone: 'Cỏ nhung và đá điểm cây bụi',
  canh_hill: 'Thêm đồi',
  canh_stone_lamp: 'Thêm đèn đá',
  canh_pine: 'Thêm tùng la hán',
  canh_shade_tree: 'Thêm cây bóng mát',
  canh_gravel: 'Thêm rải sỏi',
  canh_stepping_stone: 'Thêm đá bước dạo'
};

function getThacName(thacId) {
  if (!thacId) return null;
  const [baseId, variant] = thacId.split('_v');
  const baseName = THAC_NAME_MAP[baseId] || thacId;
  if (!variant) return baseName;
  return `Mẫu ${baseName.replace(/^Đá\s+/i, '')} ${String(variant).padStart(2, '0')}`;
}

function getSelectionLines(project) {
  const lines = [];
  if (project?.selections?.thac) {
    lines.push(`- Thác nước: ${getThacName(project.selections.thac)}`);
  }
  if (project?.selections?.ke?.length) {
    lines.push(`- Kè đá: ${project.selections.ke.map(id => KE_NAME_MAP[id] || id).join(', ')}`);
  }
  if (project?.selections?.canh?.length) {
    lines.push(`- Cảnh quan: ${project.selections.canh.map(id => CANH_NAME_MAP[id] || id).join(', ')}`);
  }
  return lines.length ? lines : ['- Chưa có mẫu chọn cụ thể'];
}

function buildColorRuleLines() {
  return COLOR_RULES.map(rule => `- ${rule.color} (${rule.hex}): ${rule.meaning}. ${rule.instruction}`);
}

function buildAssetLines(assets) {
  return assets.map((asset, index) => `- File ${index + 1}: ${asset.label}. ${asset.role}`);
}

function buildFallbackPrompt(project, assets) {
  return [
    'Bạn là chuyên gia dựng concept cảnh quan từ ảnh hiện trạng thực tế của khách hàng.',
    'Hãy tạo 1 hình ảnh phối cảnh mới bám sát ảnh gốc và toàn bộ file tôi tải kèm.',
    'Mục tiêu là bố trí đúng công năng theo ảnh khoanh vùng màu, đồng thời làm bố cục hợp lý, đẹp và khả thi thi công.',
    '',
    'Thông tin dự án',
    `- Khách hàng: ${project.customerName}`,
    `- Số điện thoại/Zalo: ${project.customerPhone}`,
    `- Gói dịch vụ: ${project.service}`,
    `- Nhánh xử lý: ChatGPT tạo ảnh`,
    '',
    'Mẫu đã chọn',
    ...getSelectionLines(project),
    '',
    'Quy ước màu trên ảnh khoanh vùng',
    ...buildColorRuleLines(),
    '- Nếu một màu không xuất hiện trong ảnh khoanh vùng thì không tự ý thêm hạng mục đó, trừ khi ghi chú khách yêu cầu rõ ràng.',
    '',
    'Cách hiểu bố cục và sắp xếp công năng',
    '- Ưu tiên đọc đúng vị trí từ ảnh khoanh vùng: mỗi hạng mục phải nằm đúng trong vùng màu tương ứng.',
    '- Nếu vùng đỏ và xanh dương liền nhau, bố trí thác đổ vào hồ cá hoặc mặt nước một cách tự nhiên.',
    '- Vùng tím phải ôm theo viền hồ, viền bồn hoặc bờ kè, không đặt rời rạc.',
    '- Vùng xanh lá là lớp cảnh quan mềm để cân bằng tổng thể, không che cửa chính, cửa sổ và lối đi.',
    '- Vùng vàng là hầm lọc, xử lý kín đáo, hợp lý, có thể ẩn sau cây, đá hoặc nắp kỹ thuật gọn gàng.',
    '- Vùng nâu và trắng là các lớp phụ trợ cho lối đi, sỏi, nền và chuyển tiếp vật liệu.',
    '- Bạn được phép hiệu chỉnh kích thước, cao độ, độ cong mép hồ, tỷ lệ cây và tỷ lệ đá để tổng thể cân đối, nhưng không được làm lệch vị trí chức năng chính đã khoanh màu.',
    '',
    'Mô tả khách hàng',
    project.note?.trim() || 'Không có mô tả bổ sung.',
    '',
    'Yêu cầu bắt buộc',
    '- Giữ nguyên góc chụp, phối cảnh và tỷ lệ của ảnh hiện trạng.',
    '- Giữ nguyên kiến trúc nhà, cửa, cột, bậc tam cấp, lớp ốp hiện có nếu không nằm trong vùng cần xử lý.',
    '- Chỉ can thiệp vào khu vực đã được khoanh vùng hoặc mô tả.',
    '- Ưu tiên vật liệu, bố cục và phong cách theo đúng các mẫu đã chọn và ảnh tham khảo.',
    '- Sắp xếp lại tỷ lệ công năng cho đẹp mắt, hợp lý và cân đối nhưng vẫn phải trùng vị trí quy hoạch trên ảnh màu.',
    '- Hình ảnh đầu ra cần tự nhiên, khả thi để thi công thực tế.',
    '- Nếu có xung đột giữa ảnh tham khảo và hiện trạng, ưu tiên hiện trạng thực tế của khách.',
    '',
    'Ý nghĩa từng file upload',
    ...buildAssetLines(assets),
    '',
    'Đầu ra mong muốn',
    '- 1 hình ảnh cảnh quan hoàn chỉnh, photorealistic, đẹp, rõ ràng, không bị méo hình.',
    '- Hình phải cho thấy cách đặt thác, hồ, kè, cây xanh và hầm lọc một cách thống nhất, có chú ý đến tầm nhìn từ cửa chính.',
    '- Tuyệt đối không đặt công năng sai màu, sai vị trí, sai tỷ lệ so với ảnh khoanh vùng.'
  ].join('\n');
}

async function callGemini(promptInstruction) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong server/.env');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptInstruction }] }],
      generationConfig: {
        temperature: 0.3,
        topP: 0.9,
        maxOutputTokens: 2200
      }
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Gemini không trả về phản hồi hợp lệ.');
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('')?.trim();
  if (!text) {
    throw new Error('Gemini không sinh được prompt.');
  }

  return text;
}

async function generateLandscapePrompt(project, assets) {
  const fallbackPrompt = buildFallbackPrompt(project, assets);

  const instruction = [
    'Bạn là chuyên gia viết prompt tạo ảnh cảnh quan cho mô hình AI image generation.',
    'Nhiệm vụ của bạn là biến dữ liệu dự án thô thành 1 prompt tiếng Việt hoàn chỉnh, mạch lạc, chuyên nghiệp và bám đúng cấu trúc mẫu dưới đây.',
    'Chỉ trả về duy nhất nội dung prompt hoàn chỉnh, không giải thích, không markdown, không thêm lời dẫn.',
    'Giữ nguyên các tiêu đề mục và phong cách trình bày dạng gạch đầu dòng giống mẫu.',
    'Prompt phải rất sát dữ liệu khách hàng, sát ảnh khoanh vùng, và làm rõ quy ước màu để công cụ tạo ảnh hiểu đúng công năng.',
    'Nếu dữ liệu không có thì ghi rõ là không có, không tự bịa.',
    '',
    'Dữ liệu dự án JSON:',
    JSON.stringify({
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      service: project.service,
      workflowBranch: project.workflowBranch || 'chatgpt_image',
      note: project.note || '',
      selections: {
        thac: getThacName(project?.selections?.thac),
        ke: (project?.selections?.ke || []).map(id => KE_NAME_MAP[id] || id),
        canh: (project?.selections?.canh || []).map(id => CANH_NAME_MAP[id] || id)
      },
      assets: assets.map((asset, index) => ({ order: index + 1, label: asset.label, role: asset.role }))
    }, null, 2),
    '',
    'Khung prompt chuẩn cần bám theo:',
    fallbackPrompt
  ].join('\n');

  try {
    return await callGemini(instruction);
  } catch (error) {
    console.error('Gemini prompt generation error:', error);
    return fallbackPrompt;
  }
}

module.exports = {
  generateLandscapePrompt,
  buildFallbackPrompt
};
