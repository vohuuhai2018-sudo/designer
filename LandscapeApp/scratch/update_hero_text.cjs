const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const oldTitle = 'Hồ koi sân vườn<br /><em>đẹp như mơ.</em>';
const newTitle = 'Kiến tạo không gian sống<br /><em>đẹp như mơ.</em>';

const oldSub = 'Hệ thống thiết kế bản vẽ nhanh nhất Việt Nam. Cảnh quan, kiến trúc, nội thất — AI render chỉ 5 phút, hoặc KTS thiết kế chuyên sâu trong 24h.';
const newSub = 'Giải pháp thiết kế bản vẽ toàn diện và nhanh chóng nhất. Cảnh quan, kiến trúc, nội thất — AI render thần tốc trong 5 phút, hoặc KTS chuyên môn cao thiết kế tinh xảo trong 24h.';

content = content.replace(oldTitle, newTitle);
content = content.replace(oldSub, newSub);

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
