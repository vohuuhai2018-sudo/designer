import fs from 'fs';

// This script aims to restore the Vietnamese strings that were mangled by encoding issues.
let c = fs.readFileSync('src/App.tsx', 'utf8');

const mapping = {
    "Sáºµn sÃ ng tá»•ng há»£p prompt vÃ  tÃ i nguyÃªn AI.": "Sẵn sàng tổng hợp prompt và tài nguyên AI.",
    "Ä ang táº£i trÃ¬nh thiáº¿t káº¿ vÃ  náº¡p áº£nh gá»‘c cá»§a khÃ¡ch hÃ ng...": "Đang tải trình thiết kế và nạp ảnh gốc của khách hàng...",
    "áº¢nh gá»‘c Ä‘Ã£ vÃ o khung lÃ m viá»‡c.": "Ảnh gốc đã vào khung làm việc.",
    "CÃ³ thá»ƒ kÃ©o hoáº·c náº¡p thÃªm tÃ i nguyÃªn.": "Có thể kéo hoặc nạp thêm tài nguyên.",
    "Quay láº¡i": "Quay lại",
    "Khoanh vÃ¹ng": "Khoanh vùng",
    "Chá» n máº«u": "Chọn mẫu",
    "Táº£i báº£n váº½ AI": "Tạo bản vẽ AI",
    "Táº£i báº£n váº½ Pro": "Tạo bản vẽ Pro",
    "Táº£i báº£n váº½ Pre": "Tạo bản vẽ Pre",
    "Báº£n váº½ 3D KTS": "Bản vẽ 3D KTS",
    "ThÃ nh CÃ´ng!": "Thành Công!",
    "YÃªu cáº§u cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c gá»­i Ä‘áº¿n Admin.": "Yêu cầu của bạn đã được gửi đến Admin.",
    "ChÃºng tÃ´i sáº½ pháº£n há»“i qua Zalo trong thá» i gian sá»›m nháº¥t.": "Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất.",
    "Vá»  trang chá»§": "Về trang chủ",
    "Há»  vÃ  tÃªn": "Họ và tên",
    "Sá»‘ Ä‘iá»‡n thoáº¡i / Zalo": "Số điện thoại / Zalo",
    "Gá»­i Ä‘á»  xuáº¥t ngay": "Gửi đề xuất ngay",
    "Chá» n GÃ³i Dá»‹ch Vá»¥": "Chọn Gói Dịch Vụ",
    "Lá»±a chá» n phÆ°Æ¡ng thá»©c phÃ¡c tháº£o tá»‘i Æ°u nháº¥t cho báº¡n": "Lựa chọn phương thức phác thảo tối ưu nhất cho bạn",
    "Quay láº¡i mÃ n hÃ½nh váº½": "Quay lại màn hình vẽ",
    "Táº£i áº£nh CÃ´ng TrÃ¬nh": "Tải ảnh Công Trình",
    "Chá» n áº£nh rÃµ nÃ©t cá»§a khu vá»±c báº¡n muá»‘n thi cÃ´ng": "Chọn ảnh rõ nét của khu vực bạn muốn thi công",
    "MÃ©o nhá»  Ä‘á»ƒ cÃ³ báº£n phÃ¡c tháº£o Ä‘áº¹p:": "Mẹo nhỏ để có bản phác thảo đẹp:",
    "Chá»¥p gÃ³c rá»™ng bao quÃ¡t toÃ n bá»™ cÃ´ng trÃ¬nh.": "Chụp góc rộng bao quát toàn bộ công trình.",
    "Ä á»§ Ã¡nh sÃ¡ng tá»± nhiÃªn Ä‘á»ƒ hiá»‡n thá»‹ rÃµ chi tiáº¿t Ä‘Ã¡ vÃ  cÂ¢y.": "Đủ ánh sáng tự nhiên để hiển thị rõ chi tiết đá và cây.",
    "Ä á»™ng nÃ£o diá»…n khu vá»±c thi cÃ´ng (giÃ²ng hÃ¬nh minh há» a dÆ°á»›i).": "Đừng để vật cản che khuất khu vực thi công.",
    "HÃ¬nh minh há» a gÃ³c chá»¥p chuáº©n:": "Hình minh họa góc chụp chuẩn:",
    "Ä ang chuáº©n bá»‹ trÃ¬nh thiáº¿t káº¿...": "Đang chuẩn bị trình thiết kế...",
    "Nạp lại ảnh gốc": "Nạp lại ảnh gốc",
    "Thêm file từ máy tính": "Thêm file từ máy tính",
    "HỒ SƠ KHÁCH HÀNG": "HỒ SƠ KHÁCH HÀNG",
    "YÊU CẦU CHI TIẾT": "YÊU CẦU CHI TIẾT",
    "Ghi chú ý tưởng:": "Ghi chú ý tưởng:",
    "Không có ghi chú thêm.": "Không có ghi chú thêm.",
    "Thư viện tài nguyên": "Thư viện tài nguyên",
    "Kéo thả trực tiếp hoặc bấm nạp nhanh vào khung xử lý.": "Kéo thả trực tiếp hoặc bấm nạp nhanh vào khung xử lý.",
    "Hệ thống": "Hệ thống",
    "Ảnh hiện trạng gốc": "Ảnh hiện trạng gốc",
    "Ảnh gốc khách gửi ban đầu": "Ảnh gốc khách gửi ban đầu",
    "Ảnh khoanh vùng": "Ảnh khoanh vùng",
    "Ảnh khu vực khách đã khoanh để xử lý": "Ảnh khu vực khách đã khoanh để xử lý",
    "Nạp nhanh": "Nạp nhanh",
    "Mở ảnh": "Mở ảnh",
    "Tài nguyên khách": "Tài nguyên khách",
    "Ảnh tham khảo bổ sung do khách cung cấp": "Ảnh tham khảo bổ sung do khách cung cấp"
};

for (const [mangled, original] of Object.entries(mapping)) {
    c = c.split(mangled).join(original);
}

// Special case for mangled "Quay láº¡i" in specific context if needed
c = c.replace(/Quay láº°i/g, "Quay lại");
c = c.replace(/Táº°i/g, "Tải");

fs.writeFileSync('src/App.tsx', c);
