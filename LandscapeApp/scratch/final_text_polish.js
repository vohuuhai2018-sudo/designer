import fs from 'fs';

const filePath = 'src/App.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const regexFixes = [
  [/.{0,5}i khi lưu lên Cloud/g, 'Lỗi khi lưu lên Cloud'],
  [/Chọn mẫu .a dạng/g, 'Chọn mẫu đa dạng'],
  [/Vui lòng vào mục "Chọn mẫu" và chọn ít nhất .*? mẫu \(Thác nước, Kè đá hoặc Cảnh quan\) .*? tiếp tục\./g, 'Vui lòng vào mục "Chọn mẫu" và chọn ít nhất một mẫu (Thác nước, Kè đá hoặc Cảnh quan) trước khi tiếp tục.'],
  [/Yêu cầu của bạn.*?Admin\.<br\/>Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất\./g, 'Yêu cầu của bạn đã được gửi đến Admin.<br/>Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất.'],
  [/setDesignerStatus\('Đang tải trình thiết kế.*?khách hàng\.\.\.'\);/g, "setDesignerStatus('Đang tải trình thiết kế và nạp ảnh gốc của khách hàng...');"],
  [/description: '.*?Photoshop Online và nạp sẵn ảnh khách\.'/g, "description: 'Mở khung thiết kế thủ công theo luồng Photoshop Online và nạp sẵn ảnh khách.'"],
  [/Mục tiêu là .*? công .*? theo ảnh khoanh vùng màu, .*? thời làm .*? cục hợp lý, .*? và khả thi thi công\./g, 'Mục tiêu là bố trí đúng công năng theo ảnh khoanh vùng màu, đồng thời làm bố cục hợp lý, đẹp và khả thi thi công.'],
  [/Trình thiết kế .*? tải\. Chờ .*? chút .*? thử lại\./g, 'Trình thiết kế đang tải. Chờ một chút rồi thử lại.'],
  [/error\.message : '.*?tải lên\.'/g, "error.message : 'Lỗi tải lên.'"],
  [/Lựa chọn vật li.u/g, 'Lựa chọn vật liệu'],
  [/H.! th.ng/g, 'Hệ thống'],
  [/M.x ảnh/g, 'Mở ảnh'],
  [/M.x ChatGPT/g, 'Mở ChatGPT'],
  [/gói .*?đường dẫn tài nguyên\./g, 'gói đường dẫn tài nguyên.'],
  [/Sao chép .*?đường dẫn/g, 'Sao chép đường dẫn'],
  [/>M.x</g, '>Mở<'],
  [/Xử lý & Phản h.i/g, 'Xử lý & Phản hồi'],
  [/M.x trình thiết kế/g, 'Mở trình thiết kế'],
  [/Tải lên Design Hoàn thi.n/g, 'Tải lên Design Hoàn thiện'],
  [/Chưa có dữ li.u nào .*? gửi về .*?\./g, 'Chưa có dữ liệu nào được gửi về hệ thống.']
];

for (const [pattern, replacement] of regexFixes) {
  c = c.replace(pattern, replacement);
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('final-text-polish-done');
