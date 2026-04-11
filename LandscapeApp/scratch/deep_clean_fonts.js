import fs from 'fs';

let c = fs.readFileSync('src/App.tsx', 'utf8');

// The file contains literal replacement characters '' (U+FFFD)
// because of previous encoding disasters. We must replace the fragments.

const bruteFixes = [
    { from: "mu n", to: "muốn" },
    { from: " Ồ", to: "vào để" },
    { from: " Ồ", to: "để" }, // Catch variations
    { from: "H  trợ", to: "Hỗ trợ" },
    { from: "H trợ", to: "Hỗ trợ" },
    { from: " ẹp", to: "đẹp" },
    { from: " ê", to: "đề" },
    { from: " i", to: "di" },
    { from: "di n", to: "diễn" },
    { from: "gi  ng", to: "giống" },
    { from: "dÆ°:i", to: "dưới" },
    { from: "SÆ N Háº¢I", to: "SƠN HẢI" },
    { from: "Kiáº¿n Táº¡o", to: "Kiến Tạo" },
    { from: "KhÃ´ng Gian Sá»‘ng", to: "Không Gian Sống" },
    { from: "Quáº£n trá»‹", to: "Quản trị" },
    { from: "Chá»¥p áº£nh", to: "Chụp ảnh" },
    { from: "phÃ¡c tháº£o", to: "phác thảo" },
    { from: "Ä ang táº£i", to: "Đang tải" },
    { from: "náº¡p áº£nh", to: "nạp ảnh" },
    { from: "Sáºµn sÃ ng", to: "Sẵn sàng" },
    { from: "Táº¡o báº£n", to: "Tạo bản" },
    { from: "Sá»­ dá»¥ng", to: "Sử dụng" },
    { from: "D dá»¥ng", to: "Dùng" },
    { from: "thá»§ cÃ´ng", to: "thủ công" },
    { from: "PhÃ¡c tháº£o Ã½ tÆ°á»Ÿng", to: "Phác thảo ý tưởng" }
];

for (const fix of bruteFixes) {
    const regex = new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    c = c.replace(regex, fix.to);
}

// Ensure the specific UploadView instruction text is perfect
c = c.replace(/Chọn ảnh rõ nét của khu vực bạn.*thi công/, "Chọn ảnh rõ nét của khu vực bạn muốn thi công");
c = c.replace(/Gõ.*chọn hoặc chụp ảnh/, "Gõ vào để chọn hoặc chụp ảnh");
c = c.replace(/H.*trợ JPG, PNG, HEIC/, "Hỗ trợ JPG, PNG, HEIC");
c = c.replace(/Mẹo nhỏ.*phác thảo.*đẹp:/, "Mẹo nhỏ để có bản phác thảo đẹp:");

fs.writeFileSync('src/App.tsx', c);
