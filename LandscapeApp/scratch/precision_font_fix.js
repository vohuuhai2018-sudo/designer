import fs from 'fs';

let c = fs.readFileSync('src/App.tsx', 'utf8');

const mapping = {
    "Kiáº¿n Táº¡o": "Kiến Tạo",
    "KhÃ´ng Gian Sá»‘ng": "Không Gian Sống",
    "á»¨ng dá»¥ng phÃ¡c tháº£o cáº£nh quan chuyÃªn nghiá»‡p": "Ứng dụng phác thảo cảnh quan chuyên nghiệp",
    "Biáº¿n cÃ´ng trÃ¬nh thÃ´ thÃ nh tuyá»‡t tÃ¡c chá»‰ trong vÃ i bÆ°á»›c.": "Biến công trình thô thành tuyệt tác chỉ trong vài bước.",
    "Báº¯t Ä‘áº§u thiáº¿t káº¿": "Bắt đầu thiết kế",
    "Chá»¥p áº£nh thá»±c táº¿": "Chụp ảnh thực tế",
    "PhÃ¡c tháº£o Ã½ tÆ°á»Ÿng": "Phác thảo ý tưởng",
    "Chá» n máº«u Ä‘a dáº¡ng": "Chọn mẫu đa dạng",
    "Quáº£n trá»‹ há»‡ thá»‘ng": "Quản trị hệ thống",
    "SÆ N Háº¢I": "SƠN HẢI",
    "Táº£i áº£nh CÃ´ng TrÃ¬nh": "Tải ảnh Công Trình",
    "Chá» n áº£nh rÃµ nÃ©t cá»§a khu vá»±c báº¡n muá»‘n thi cÃ´ng": "Chọn ảnh rõ nét của khu vực bạn muốn thi công",
    "GÃ©p áº£nh hoặcc chọn tệp": "Gộp ảnh hoặc chọn tệp",
    "HEIC": "HEIC",
    "MÃ©o nhá»  Ä‘á»ƒ cÃ³ báº£n phÃ¡c tháº£o Ä‘áº¹p:": "Mẹo nhỏ để có bản phác thảo đẹp:",
    "Chá»¥p gÃ³c rá»™ng bao quÃ¡t toÃ n bá»™ cÃ´ng trÃ¬nh.": "Chụp góc rộng bao quát toàn bộ công trình.",
    "Ä á»§ Ã¡nh sÃ¡ng tá»± nhiÃªn": "Đủ ánh sáng tự nhiên",
    "hiá»‡n thá»‹ rÃµ chi tiáº¿t Ä‘Ã¡ vÃ  cÂ¢y.": "hiển thị rõ chi tiết đá và cây.",
    "Ä á»™ng nÃ£o diá»…n khu vá»±c thi cÃ´ng": "Đừng để vật cản che khuất khu vực thi công",
    "HÃ¬nh minh há» a gÃ³c chá»¥p chuáº©n:": "Hình minh họa góc chụp chuẩn:",
    "Quay láº¡i": "Quay lại",
    "ThÃ nh CÃ´ng!": "Thành Công!",
    "YÃªu cáº§u cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘Ã£ Ä‘áº¿n Admin.": "Yêu cầu của bạn đã được gửi đến Admin.",
    "ChÃºng tÃ´i sáº½ pháº£n há»“i qua Zalo": "Chúng tôi sẽ phản hồi qua Zalo",
    "Vá»  trang chá»§": "Về trang chủ",
    "Há»  vÃ  tÃªn": "Họ và tên",
    "Sá»‘ Ä‘iá»‡n thoáº¡i / Zalo": "Số điện thoại / Zalo",
    "Gá»­i Ä‘á»  xuáº¥t ngay": "Gửi đề xuất ngay",
    "Chá» n GÃ³i Dá»‹ch Vá»¥": "Chọn Gói Dịch Vụ",
    "Lá»±a chá» n phÆ°Æ¡ng thá»©c": "Lựa chọn phương thức",
    "tá»‘ Æ°u nháº¥t cho báº¡n": "tối ưu nhất cho bạn",
    "Táº¡o báº£n váº½ AI": "Tạo bản vẽ AI",
    "Táº¡o báº£n váº½ Pro": "Tạo bản vẽ Pro",
    "Táº¡o báº£n váº½ Pre": "Tạo bản vẽ Pre",
    "Báº£n váº½ 3D KTS": "Bản vẽ 3D KTS",
    "Nhanh chÃ³ng": "Nhanh chóng",
    "Phá»• biáº¿n": "Phổ biến",
    "Ä á»  xuáº¥t": "Đề xuất",
    "Cao cáº¥p": "Cao cấp",
    "Sá»­ dá»¥ng trÃ­ tuá»‡ nhÃ¢n táº¡o": "Sử dụng trí tuệ nhân tạo",
    "Sáº£n pháº©m cÃ³ sá»± hiá»‡u chá»‰nh": "Sản phẩm có sự hiệu chỉnh",
    "KTS chuyÃªn nghiá»‡p": "KTS chuyên nghiệp",
    "xuáº¥t 2-3 gÃ³c nhÃ¬n vÃ  video mÃ´ phá» ng.": "xuất 2-3 góc nhìn và video mô phỏng.",
    "BÃ¡o giÃ¡ qua Zalo": "Báo giá qua Zalo",
    "diá»…n há» a Ä‘a gÃ³c": "diễn họa đa góc",
    "KhÃ´ng thá»ƒ cáº­p nháº­t dá»¯ liá»‡u dá»± Ã¡n.": "Không thể cập nhật dữ liệu dự án.",
    "KhÃ´ng thá»ƒ cháº¡y tá»± Ä‘á»™ng ChatGPT.": "Không thể chạy tự động ChatGPT.",
    "Ä ang chuáº©n bá»‹ trÃ¬nh thiáº¿t káº¿...": "Đang chuẩn bị trình thiết kế...",
    "Sáºµn sÃ ng tá»•ng há»£p prompt vÃ  tÃ i nguyÃªn AI.": "Sẵn sàng tổng hợp prompt và tài nguyên AI.",
    "Ä ang táº£i trÃ¬nh thiáº¿t káº¿": "Đang tải trình thiết kế",
    "náº¡p áº£nh gá»‘c cá»§a khÃ¡ch hÃ ng...": "nạp ảnh gốc của khách hàng...",
    "áº¢nh gá»‘c Ä‘Ã£ vÃ o khung lÃ m viá»‡c.": "Ảnh gốc đã vào khung làm việc.",
    "CÃ³ thá»ƒ kÃ©o hoáº·c náº¡p thÃªm tÃ i nguyÃªn.": "Có thể kéo hoặc nạp thêm tài nguyên.",
    "Khoanh vÃ¹ng": "Khoanh vùng",
    "Chá» n máº«u": "Chọn mẫu"
};

for (const [mangled, original] of Object.entries(mapping)) {
    c = c.split(mangled).join(original);
}

fs.writeFileSync('src/App.tsx', c);
