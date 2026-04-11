import fs from 'fs';

let c = fs.readFileSync('src/App.tsx', 'utf8');

// Use an exhaustive map to fix both mojibake and diamond replacement characters
const map = {
    "Mẹo nhỏ  Ổ có phác thảo  đẹp:": "Mẹo nhỏ để có bản phác thảo đẹp:",
    "Chá» n áº£nh rÃµ nÃ©t cá»§a khu vá»±c báº¡n muá»‘n thi cÃ´ng": "Chọn ảnh rõ nét của khu vực bạn muốn thi công",
    "GÃµ  Ổ chọn hoặc chụp ảnh": "Gõ vào để chọn hoặc chụp ảnh",
    "H trợ JPG, PNG, HEIC": "Hỗ trợ JPG, PNG, HEIC",
    "Ä á»§ Ã¡nh sÃ¡ng tá»± nhiÃªn  Ổ hiá»ƒn th9 rÃµ chi tiáº¿t  Ã¡ vÃ  cÃ¢y.": "Đủ ánh sáng tự nhiên để hiển thị rõ chi tiết đá và cây.",
    "Ä á»™ng nÃ£o diá»…n khu vá»±c thi cÃ´ng (gi ng hÃ¬nh minh há» a dÆ°:i).": "Đừng để vật cản che khuất khu vực thi công (giống hình minh họa dưới).",
    "Ä á»©ng chÃ­nh di!n": "Đứng chính diện",
    "Kiáº¿n Táº¡o": "Kiến Tạo",
    "KhÃ´ng Gian Sá»‘ng": "Không Gian Sống",
    "á»¨ng dá»¥ng phÃ¡c tháº£o cáº£nh quan chuyÃªn nghiá»‡p": "Ứng dụng phác thảo cảnh quan chuyên nghiệp",
    "Biáº¿n cÃ´ng trÃ¬nh thÃ´ thÃ nh tuyá»‡t tÃ¡c chá»‰ trong vÃ i bÆ°á»›c.": "Biến công trình thô thành tuyệt tác chỉ trong vài bước.",
    "Báº¯t Ä‘áº§u thiáº¿t káº¿": "Bắt đầu thiết kế",
    "Quáº£n trá»‹ há»‡ thá»‘ng": "Quản trị hệ thống",
    "SÆ N Háº¢I": "SƠN HẢI",
    "Há»  vÃ  tÃªn": "Họ và tên",
    "Sá»‘ Ä‘i&n tho&i / Zalo": "Số điện thoại / Zalo",
    "Gửi đề xuất ngay": "Gửi đề xuất ngay",
    "Chọn Gói Dịch Vụ": "Chọn Gói Dịch Vụ",
    "Lựa chọn phương thức phác thảo tối ưu nhất cho bạn": "Lựa chọn phương thức phác thảo tối ưu nhất cho bạn",
    "Quay lại màn hình vẽ": "Quay lại màn hình vẽ",
    "HỒ SƠ KHÁCH HÀNG": "HỒ SƠ KHÁCH HÀNG",
    "YÊU CẦU CHI TIẾT": "YÊU CẦU CHI TIẾT",
    "Ghi chú ý tưởng:": "Ghi chú ý tưởng:",
    "Thư viện tài nguyên": "Thư viện tài nguyên",
    "Kéo thả trực tiếp hoặc bấm nạp nhanh vào khung xử lý.": "Kéo thả trực tiếp hoặc bấm nạp nhanh vào khung xử lý.",
    "Khách hàng": "Khách hàng",
    "Hệ thống": "Hệ thống",
    "Ảnh hiện trạng gốc": "Ảnh hiện trạng gốc",
    "Ảnh gốc khách gửi ban đầu": "Ảnh gốc khách gửi ban đầu",
    "Ảnh khoanh vùng": "Ảnh khoanh vùng",
    "Ảnh khu vực khách đã khoanh để xử lý": "Ảnh khu vực khách đã khoanh để xử lý",
    "Nạp nhanh": "Nạp nhanh",
    "Mở ảnh": "Mở ảnh",
    "Tài nguyên khách": "Tài nguyên khách",
    "Ảnh tham khảo bổ sung do khách cung cấp": "Ảnh tham khảo bổ sung do khách cung cấp",
    "Đang nạp ảnh hiện trạng vào bàn làm việc...": "Đang nạp ảnh hiện trạng vào bàn làm việc...",
    "Ảnh khách hàng đã được nạp thành công. Bạn có thể bắt đầu vẽ.": "Ảnh khách hàng đã được nạp thành công. Bạn có thể bắt đầu vẽ.",
    "SẴN SÀNG": "SẴN SÀNG",
    "ĐANG TẢI...": "ĐANG TẢI...",
    "Quay lại": "Quay lại",
    "Khoanh vùng": "Khoanh vùng",
    "Chọn mẫu": "Chọn mẫu",
    "Tạo bản vẽ AI": "Tạo bản vẽ AI",
    "Tạo bản vẽ Pro": "Tạo bản vẽ Pro",
    "Tạo bản vẽ Pre": "Tạo bản vẽ Pre",
    "Bản vẽ 3D KTS": "Bản vẽ 3D KTS",
    "Nhanh chóng": "Nhanh chóng",
    "Phổ biến": "Phổ biến",
    "Đề xuất": "Đề xuất",
    "Cao cấp": "Cao cấp",
    "Thành Công!": "Thành Công!",
    "Yêu cầu của bạn đã được gửi đến Admin.": "Yêu cầu của bạn đã được gửi đến Admin.",
    "Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất.": "Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất.",
    "Về trang chủ": "Về trang chủ",
    "Đang chuẩn bị trình thiết kế...": "Đang chuẩn bị trình thiết kế...",
    "Sẵn sàng tổng hợp prompt và tài nguyên AI.": "Sẵn sàng tổng hợp prompt và tài nguyên AI.",
    "Đang tải trình thiết kế và nạp ảnh gốc của khách hàng...": "Đang tải trình thiết kế và nạp ảnh gốc của khách hàng..."
};

for (const [mangled, original] of Object.entries(map)) {
    c = c.split(mangled).join(original);
}

// Brute force restore the UploadView list items which are very prone to mangling
const listItemsFix = `<ul>
          <li><Sparkles size={16} /> Chụp góc rộng bao quát toàn bộ công trình.</li>
          <li><Sparkles size={16} /> Đủ ánh sáng tự nhiên để hiển thị rõ chi tiết đá và cây.</li>
          <li><Sparkles size={16} /> Đừng để vật cản che khuất khu vực thi công (giống hình minh họa dưới).</li>
        </ul>`;

c = c.replace(/<ul>[\s\S]*?<\/ul>/, listItemsFix);

fs.writeFileSync('src/App.tsx', c);
