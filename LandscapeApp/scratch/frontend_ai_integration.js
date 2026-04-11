import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const aiLogic = `
  const generatePromptWithGemini = async (project: Project, assets: AiUploadAsset[]) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Chưa cấu hình VITE_GEMINI_API_KEY');
    }

    const fallbackPrompt = buildChatGptPrompt(project);
    const instruction = [
      'Bạn là chuyên gia viết prompt tạo ảnh cảnh quan cho mô hình AI image generation.',
      'Nhiệm vụ của bạn là biến dữ liệu dự án thô thành 1 prompt tiếng Việt hoàn chỉnh, mạch lạc, chuyên nghiệp và bám đúng cấu trúc mẫu dưới đây.',
      'Chỉ trả về duy nhất nội dung prompt hoàn chỉnh, không giải thích, không markdown, không thêm lời dẫn.',
      'Giữ nguyên các tiêu đề mục và phong cách trình bày dạng gạch đầu dòng giống mẫu.',
      'Prompt phải rất sát dữ liệu khách hàng, sát ảnh khoanh vùng, và làm rõ quy ước màu để công cụ tạo ảnh hiểu đúng công năng.',
      'Đặc biệt phần "Mô tả khách hàng" cần được diễn đạt lại chuyên nghiệp nhưng giữ nguyên ý và yêu cầu gốc của khách.',
      '',
      'Dữ liệu dự án JSON:',
      JSON.stringify({
        customerName: project.customerName,
        customerPhone: project.customerPhone,
        service: project.service,
        workflowBranch: project.workflowBranch || 'chatgpt_image',
        note: project.note || '',
        selections: project.selections,
        assets: assets.map((asset, index) => ({ order: index + 1, label: asset.label, role: asset.role }))
      }, null, 2),
      '',
      'Khung prompt chuẩn cần bám theo:',
      fallbackPrompt
    ].join('\\n');

    const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${apiKey}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instruction }] }],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2500
        }
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Gemini không trả về phản hồi hợp lệ.');
    }

    const text = payload?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('')?.trim();
    if (!text) {
      throw new Error('Gemini không sinh được prompt.');
    }

    return text;
  };
`;

// Insert generatePromptWithGemini right before handleRunChatGptAutomation
const handleRunMarker = "  const handleRunChatGptAutomation = async () => {";
c = c.replace(handleRunMarker, aiLogic + "\n" + handleRunMarker);

// Update loadAiPrompt to use it
const loadAiPromptBlock = `        const prompt = await onGenerateAiPrompt(selectedProject.id, {
          assets: getAiUploadAssets(selectedProject).map(asset => ({
            ...asset,
            url: toAbsoluteAssetUrl(asset.url)
          }))
        });`;

const newLoadAiPromptBlock = `        const assets = getAiUploadAssets(selectedProject).map(asset => ({
            ...asset,
            url: toAbsoluteAssetUrl(asset.url)
        }));
        // Use direct frontend Gemini call to bypass backend
        const prompt = await generatePromptWithGemini(selectedProject, assets);`;

c = c.replace(loadAiPromptBlock, newLoadAiPromptBlock);

// Also replace await onGenerateAiPrompt in handleRunChatGptAutomation
const runPromptBlock = `const prompt = aiGeneratedPrompt.trim() || await onGenerateAiPrompt(selectedProject.id, { assets });`;
const newRunPromptBlock = `const prompt = aiGeneratedPrompt.trim() || await generatePromptWithGemini(selectedProject, assets);`;
c = c.replace(runPromptBlock, newRunPromptBlock);

fs.writeFileSync('src/App.tsx', c);
