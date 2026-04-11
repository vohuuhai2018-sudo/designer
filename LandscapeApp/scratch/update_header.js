import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

const target = '<h4>Thư viện tài nguyên</h4>\n                <p>Kéo thả trực tiếp hoặc bấm nạp nhanh vào khung xử lý.</p>';
const replacement = '<h4>Thư viện tài nguyên (Có thể di chuyển)</h4>\n                <p>Kéo thả ảnh hoặc bấm nạp nhanh.</p>';

c = c.replace(target, replacement);

fs.writeFileSync('src/App.tsx', c);
