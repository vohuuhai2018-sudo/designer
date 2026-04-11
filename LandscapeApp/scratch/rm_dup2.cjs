const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /  const handleRunChatGptAutomation = async \(\) => \{\r?\n    if \(!selectedProject \|\| isGeneratingAi\) return;\r?\n\r?\n    try \{\r?\n      setIsGeneratingAi\(true\);\r?\n      setAiStudioStatus\('Đang mở ChatGPT, nạp tài nguyên và gửi prompt tạo ảnh\.\.\.'\);\r?\n\r?\n      const assets = getAiUploadAssets\(selectedProject\)\.map\(asset => \(\{\r?\n        \.\.\.asset,\r?\n        url: toAbsoluteAssetUrl\(asset\.url\)\r?\n      \}\)\);\r?\n\r?\n      const prompt = aiGeneratedPrompt\.trim\(\) \|\| await generatePromptWithGemini\(selectedProject, assets\);\r?\n      setAiGeneratedPrompt\(prompt\);\r?\n\r?\n      const payload = \{\r?\n        prompt,\r?\n        assets\r?\n      \};\r?\n\r?\n      const updatedProject = await onGenerateAiImage\(selectedProject\.id, payload\);\r?\n      setSelectedProject\(updatedProject\);\r?\n      setAiStudioStatus\('Đã nhận ảnh từ ChatGPT và nạp lại vào gói tài nguyên AI\.'\);\r?\n    \} catch \(error\) \{\r?\n      const message = error instanceof Error \? error\.message : 'Không thể chạy tự động ChatGPT\.';\r?\n      setAiStudioStatus\(message\);\r?\n    \} finally \{\r?\n      setIsGeneratingAi\(false\);\r?\n    \}\r?\n  \};/;

c = c.replace(regex, '');
fs.writeFileSync('src/App.tsx', c);
