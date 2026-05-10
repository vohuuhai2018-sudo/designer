const fs = require('fs');
const path = require('path');

const filePath = 'd:\\4. DỰ ÁN SƠN HẢI\\1. WEB\\APP VẼ\\LandscapeApp\\src\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Update Title
const oldTitle = 'Kiến tạo không gian<br /><em>sống đẹp như mơ.</em>';
const newTitle = 'Thiết kế & Diễn họa 3D<br /><em>chuyên nghiệp trong 5 phút.</em>';
content = content.replace(oldTitle, newTitle);

// Update Subtitle
const oldSub = 'Giải pháp thiết kế bản vẽ toàn diện và nhanh chóng nhất. Cảnh quan, kiến trúc, nội thất — AI render thần tốc trong 5 phút, hoặc KTS chuyên môn cao thiết kế tinh xảo trong 24h.';
const newSub = 'Nâng tầm không gian sống với sự kết hợp hoàn hảo giữa công nghệ AI và tư duy KTS chuyên sâu. Render 3D thần tốc hoặc thiết kế bản vẽ kỹ thuật chi tiết chỉ từ 24h.';
content = content.replace(oldSub, newSub);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated text in App.tsx');
