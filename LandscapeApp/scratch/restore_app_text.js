import fs from 'fs';

const filePath = 'src/App.tsx';
let c = fs.readFileSync(filePath, 'utf8');

const assetsBlock = String.raw`const ASSETS = {
  THAC: [
    {
      id: 'thac_cothach',
      url: '/assets/THAC/Đá Cổ Thạch/cothach_v7.png',
      name: 'Đá Cổ Thạch',
      variants: Array.from({ length: 13 }, (_, i) => ({
        id: 'thac_cothach_v' + (i + 1),
        url: '/assets/THAC/Đá Cổ Thạch/cothach_v' + (i + 1) + '.png',
        name: 'Mẫu Cổ Thạch ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_vanmay',
      url: '/assets/THAC/Đá Vân Mây/vanmay_v3.png',
      name: 'Đá Vân Mây',
      variants: Array.from({ length: 7 }, (_, i) => ({
        id: 'thac_vanmay_v' + (i + 1),
        url: '/assets/THAC/Đá Vân Mây/vanmay_v' + (i + 1) + '.png',
        name: 'Mẫu Vân Mây ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_dalua',
      url: '/assets/THAC/dalua.png',
      name: 'Đá Lũa',
      variants: Array.from({ length: 10 }, (_, i) => ({
        id: 'thac_dalua_v' + (i + 1),
        url: '/assets/THAC/dalua_v' + (i + 1) + '.png',
        name: 'Mẫu Đá Lũa ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_tuyetson',
      url: '/assets/THAC/tuyetson.png',
      name: 'Đá Tuyết Sơn',
      variants: Array.from({ length: 10 }, (_, i) => ({
        id: 'thac_tuyetson_v' + (i + 1),
        url: '/assets/THAC/tuyetson_v' + (i + 1) + '.png',
        name: 'Mẫu Tuyết Sơn ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_sanho',
      url: '/assets/THAC/sanho.png',
      name: 'Đá San Hô',
      variants: Array.from({ length: 10 }, (_, i) => ({
        id: 'thac_sanho_v' + (i + 1),
        url: '/assets/THAC/sanho_v' + (i + 1) + '.png',
        name: 'Mẫu San Hô ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_modern',
      url: '/assets/THAC/modern.png',
      name: 'Thác hiện đại',
      variants: Array.from({ length: 10 }, (_, i) => ({
        id: 'thac_modern_v' + (i + 1),
        url: '/assets/THAC/modern_v' + (i + 1) + '.png',
        name: 'Mẫu Thác Hiện Đại ' + String(i + 1).padStart(2, '0')
      }))
    },
  ],
  KE: [
    { id: 'ke_vanmay', name: 'Kè đá vân mây' },
    { id: 'ke_cothach', name: 'Kè đá cổ thạch' },
    { id: 'ke_lua', name: 'Kè đá lũa' },
    { id: 'ke_hoacuong', name: 'Thành đá hoa cương' },
  ],
  CANH: [
    { id: 'canh_bush_stone', name: 'Cỏ nhung và đá điểm cây bụi' },
    { id: 'canh_hill', name: 'Thêm đồi' },
    { id: 'canh_stone_lamp', name: 'Thêm đèn đá' },
    { id: 'canh_pine', name: 'Thêm tùng la hán' },
    { id: 'canh_shade_tree', name: 'Thêm cây bóng mát' },
    { id: 'canh_gravel', name: 'Thêm rải sỏi' },
    { id: 'canh_stepping_stone', name: 'Thêm đá bước dạo' }
  ]
};

const SYSTEM_REFERENCE_LIBRARY: DesignerLibraryItem[] = [
  {
    id: 'sys-thac-cover',
    label: 'Thác hệ thống',
    url: '/assets/THÁC/ChatGPT Image 13_05_01 10 thg 4, 2026.png',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Ảnh tài nguyên thác dùng kéo nhanh vào bố cục.'
  },
  {
    id: 'sys-ke-01',
    label: 'Kè hệ thống 01',
    url: '/assets/KÈ/ChatGPT Image 12_44_41 10 thg 4, 2026.png',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Ảnh kè mẫu từ thư viện nội bộ.'
  },
  {
    id: 'sys-ke-02',
    label: 'Kè hệ thống 02',
    url: '/assets/KÈ/ChatGPT Image 12_43_04 10 thg 4, 2026.png',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Biến thể kè khác để xử lý nhanh.'
  },
  {
    id: 'sys-canh-01',
    label: 'Cảnh quan hệ thống',
    url: '/assets/CANH/ChatGPT Image 12_48_58 10 thg 4, 2026.png',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Ảnh cảnh quan mẫu từ thư viện hệ thống.'
  },
  {
    id: 'sys-ca-01',
    label: 'Cá hệ thống',
    url: '/assets/CA/ChatGPT Image 12_53_42 10 thg 4, 2026.png',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Ảnh tham khảo hồ cá / sinh vật cảnh.'
  },
  {
    id: 'sys-nuoc-01',
    label: 'Nước hệ thống',
    url: '/assets/NƯỚC/pngtree-clear-spring-daytime-lake-water-green-clear-spring-play-photography-map-image_848570.jpg',
    group: 'Tài nguyên hệ thống',
    source: 'system',
    note: 'Ảnh chất liệu nước tham khảo.'
  }
];

const ANNOTATION_COLOR_RULES = [
  {
    color: 'Đỏ',
    hex: '#ef4444',
    meaning: 'Vị trí thác nước hoặc cụm đá thác chính',
    instruction: 'Bố trí đúng vào vùng đỏ, ưu tiên làm điểm nhấn đứng hoặc cụm thác chính.'
  },
  {
    color: 'Xanh dương',
    hex: '#3b82f6',
    meaning: 'Hồ cá hoặc mặt nước chính',
    instruction: 'Tạo hồ hoặc mặt nước ở đúng vùng xanh dương, kết nối hợp lý với thác nếu vùng đỏ nằm kề cận.'
  },
  {
    color: 'Tím',
    hex: '#a855f7',
    meaning: 'Kè đá, bo hồ hoặc viền kết cấu đá',
    instruction: 'Dùng làm mép bo, viền kè hoặc tường đá bám theo đúng đường nét vùng tím.'
  },
  {
    color: 'Xanh lá',
    hex: '#22c55e',
    meaning: 'Cảnh quan cây xanh, cỏ, bụi, bonsai',
    instruction: 'Bố trí mảng xanh đúng vùng xanh lá, cân đối với tổng thể và không che chắn cửa, bậc thềm.'
  },
  {
    color: 'Vàng',
    hex: '#eab308',
    meaning: 'Hầm lọc hoặc nắp kỹ thuật',
    instruction: 'Ẩn hầm lọc gọn gàng trong vùng vàng, kín đáo nhưng vẫn khả thi để bảo trì.'
  },
  {
    color: 'Trắng',
    hex: '#ffffff',
    meaning: 'Vùng sỏi hoặc nền trang trí phụ',
    instruction: 'Xử lý nền sỏi, vật liệu sáng hoặc khoảng chuyển tiếp ở vùng trắng.'
  },
  {
    color: 'Nâu',
    hex: '#78350f',
    meaning: 'Đá bước dạo hoặc lối đi nhấn',
    instruction: 'Bố trí đá bước, lối dạo hoặc điểm chuyển bước theo đúng vùng nâu.'
  }
] as const;`;

c = c.replace(/const ASSETS = \{[\s\S]*?\] as const;/, assetsBlock);

const fixes = {
  "description: 'M�x khung thiết kế thủ công theo lu�\u001dng Photoshop Online và nạp sẵn ảnh khách.'": "description: 'Mở khung thiết kế thủ công theo luồng Photoshop Online và nạp sẵn ảnh khách.'",
  "description: 'Dùng ảnh g�\u0018c, ảnh khoanh vùng và dữ li�!u khách �\u0018Ồ tạo phương án m�:i bằng ChatGPT.'": "description: 'Dùng ảnh gốc, ảnh khoanh vùng và dữ liệu khách để tạo phương án mới bằng ChatGPT.'",
  "return 'HOìN THìNH';": "return 'HOÀN THÀNH';",
  "return 'CH�S XỬ LÝ';": "return 'CHỜ XỬ LÝ';",
  "{ label: 'Ảnh hi�!n trạng g�\u0018c', url: project.rawImage },": "{ label: 'Ảnh hiện trạng gốc', url: project.rawImage },",
  "label: `Tài nguyên b�\" sung \${index + 1}`,": "label: `Tài nguyên bổ sung \${index + 1}`,",
  "role: 'Mẫu thác / vật li�!u thác �\u0018úng theo lựa chọn của khách.'": "role: 'Mẫu thác / vật liệu thác đúng theo lựa chọn của khách.'",
  "label: 'Mẫu tham khảo kè �\u0018á h�! th�\u0018ng',": "label: 'Mẫu tham khảo kè đá hệ thống',",
  "url: '/assets/K��/ChatGPT Image 12_44_41 10 thg 4, 2026.png',": "url: '/assets/KÈ/ChatGPT Image 12_44_41 10 thg 4, 2026.png',",
  "role: 'Tham khảo chất li�!u và cách xử lý kè �\u0018á.'": "role: 'Tham khảo chất liệu và cách xử lý kè đá.'",
  "label: 'Mẫu cảnh quan h�! th�\u0018ng',": "label: 'Mẫu cảnh quan hệ thống',",
  "role: 'Tham khảo b�\u0018 cục mảng xanh, bụi cây và �\u0018èn �\u0018á.'": "role: 'Tham khảo bố cục mảng xanh, bụi cây và đèn đá.'",
  "label: 'Mẫu nư�:c / h�\u001c h�! th�\u0018ng',": "label: 'Mẫu nước / hồ hệ thống',",
  "url: '/assets/NƯ�aC/pngtree-clear-spring-daytime-lake-water-green-clear-spring-play-photography-map-image_848570.jpg',": "url: '/assets/NƯỚC/pngtree-clear-spring-daytime-lake-water-green-clear-spring-play-photography-map-image_848570.jpg',",
  "role: 'Tham khảo chất li�!u nư�:c, mặt h�\u001c và phản chiếu.'": "role: 'Tham khảo chất liệu nước, mặt hồ và phản chiếu.'",
  "label: 'Ảnh hi�!n trạng g�\u0018c',": "label: 'Ảnh hiện trạng gốc',",
  "role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và ph�\u0018i cảnh.'": "role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.'",
  "role: 'Ảnh quy hoạch công nĒng bằng màu, dùng �\u0018Ồ xác �\u0018�9nh �\u0018úng v�9 trí từng hạng mục.'": "role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.'",
  "role: 'Ảnh khách gửi thêm �\u0018Ồ tham khảo phong cách, vật li�!u hoặc hình kh�\u0018i mong mu�\u0018n.'": "role: 'Ảnh khách gửi thêm để tham khảo phong cách, vật liệu hoặc hình khối mong muốn.'",
  "lines.push(`- Thác nư�:c: \${getAssetName(project.selections.thac, 'THAC')}`);": "lines.push(`- Thác nước: \${getAssetName(project.selections.thac, 'THAC')}`);",
  "lines.push(`- Kè �\u0018á: \${project.selections.ke.map(id => getAssetName(id, 'KE')).join(', ')}`);": "lines.push(`- Kè đá: \${project.selections.ke.map(id => getAssetName(id, 'KE')).join(', ')}`);",
  "return lines.length > 0 ? lines : ['- Chưa có mẫu chọn cụ thỒ'];": "return lines.length > 0 ? lines : ['- Chưa có mẫu chọn cụ thể'];",
  "'Bạn là chuyên gia dựng concept cảnh quan từ ảnh hi�!n trạng thực tế của khách hàng.',": "'Bạn là chuyên gia dựng concept cảnh quan từ ảnh hiện trạng thực tế của khách hàng.',",
  "'Hãy tạo 1 hình ảnh ph�\u0018i cảnh m�:i bám sát ảnh g�\u0018c và toàn b�\" file tôi tải kèm.',": "'Hãy tạo 1 hình ảnh phối cảnh mới bám sát ảnh gốc và toàn bộ file tôi tải kèm.',",
  "'Mục tiêu là b�\u0018 trí �\u0018úng công nĒng theo ảnh khoanh vùng màu, �\u0018�\u001dng thời làm b�\u0018 cục hợp lý, �\u0018ẹp và khả thi thi công.',": "'Mục tiêu là bố trí đúng công năng theo ảnh khoanh vùng màu, đồng thời làm bố cục hợp lý, đẹp và khả thi thi công.',",
  "group: 'Mẫu �\u0018ã chọn',": "group: 'Mẫu đã chọn',",
  "note: 'Tài nguyên �\u0018úng theo mẫu khách �\u0018ã chọn.'": "note: 'Tài nguyên đúng theo mẫu khách đã chọn.'",
  "note: 'Tài nguyên �\u0018úng theo biến thỒ khách �\u0018ã chọn.'": "note: 'Tài nguyên đúng theo biến thể khách đã chọn.'",
  "note: 'Ảnh g�\u0018c khách gửi ban �\u0018ầu.'": "note: 'Ảnh gốc khách gửi ban đầu.'",
  "note: 'Ảnh khu vực khách �\u0018ã khoanh �\u0018Ồ xử lý.'": "note: 'Ảnh khu vực khách đã khoanh để xử lý.'",
  "note: 'Ảnh tham khảo b�\" sung do khách cung cấp.'": "note: 'Ảnh tham khảo bổ sung do khách cung cấp.'",
  "group: 'Thư vi�!n mẫu thác',": "group: 'Thư viện mẫu thác',",
  "note: 'Tài nguyên mẫu từ thư vi�!n h�! th�\u0018ng.'": "note: 'Tài nguyên mẫu từ thư viện hệ thống.'",
  "setDesignerStatus('Khung làm vi�!c chưa sẵn sàng �\u0018Ồ nhận tài nguyên.');": "setDesignerStatus('Khung làm việc chưa sẵn sàng để nhận tài nguyên.');",
  "setDesignerStatus('Trình thiết kế �\u0018ang tải. Chờ m�\"t chút r�\u001di thử lại.');": "setDesignerStatus('Trình thiết kế đang tải. Chờ một chút rồi thử lại.');",
  "setDesignerStatus(`Đang nạp \${item.label} vào khung làm vi�!c...`);": "setDesignerStatus(`Đang nạp \${item.label} vào khung làm việc...`);",
  "throw new Error('Không �\u0018ọc �\u0018ược tài nguyên.');": "throw new Error('Không đọc được tài nguyên.');",
  "setDesignerStatus(`Không thỒ nạp \${item.label}. Bạn có thỒ kéo thả hoặc m�x trực tiếp tài nguyên này.`);": "setDesignerStatus(`Không thể nạp \${item.label}. Bạn có thể kéo thả hoặc mở trực tiếp tài nguyên này.`);",
  "setDesignerStatus(`Đang �\u0018ưa file \${file.name} vào khung làm vi�!c...`);": "setDesignerStatus(`Đang đưa file \${file.name} vào khung làm việc...`);",
  "setDesignerStatus(`Không thỒ nạp file \${file.name}.`);": "setDesignerStatus(`Không thể nạp file \${file.name}.`);",
  "setActionFeedback('Không thỒ sao chép. Hãy thử lại trên trình duy�!t �\u0018ang m�x.');": "setActionFeedback('Không thể sao chép. Hãy thử lại trên trình duyệt đang mở.');",
  "setAiStudioStatus('Đang m�x ChatGPT, nạp tài nguyên và gửi prompt tạo ảnh...');": "setAiStudioStatus('Đang mở ChatGPT, nạp tài nguyên và gửi prompt tạo ảnh...');",
  "setActionFeedback('Có l�\u0014i khi cập nhật nhánh xử lý.');": "setActionFeedback('Có lỗi khi cập nhật nhánh xử lý.');",
  "setActionFeedback(`Đã chuyỒn nhánh xử lý sang \${getWorkflowLabel(branch)}.`);": "setActionFeedback(`Đã chuyển nhánh xử lý sang \${getWorkflowLabel(branch)}.`);",
  "const message = error instanceof Error ? error.message : 'Không thỒ cập nhật nhánh xử lý.';": "const message = error instanceof Error ? error.message : 'Không thể cập nhật nhánh xử lý.';",
  "setActionFeedback('Đã cập nhật bản vẽ hoàn thi�!n.');": "setActionFeedback('Đã cập nhật bản vẽ hoàn thiện.');",
  "setActionFeedback(error instanceof Error ? error.message : 'L�\u0014i tải lên.');": "setActionFeedback(error instanceof Error ? error.message : 'Lỗi tải lên.');",
  ">H�\u0019 SƠ DỰ ÁN<": ">HỒ SƠ DỰ ÁN<",
  ">D�9ch vụ:<": ">Dịch vụ:<",
  "{isGeneratingAi ? 'Đang chạy ChatGPT...' : 'M�x ChatGPT'}": "{isGeneratingAi ? 'Đang chạy ChatGPT...' : 'Mở ChatGPT'}",
  "<p>H�! th�\u0018ng sẽ t�\"ng hợp file, m�x ChatGPT, upload tài nguyên, �\u0018iền prompt và tải ảnh kết quả về �\u0018ây.</p>": "<p>Hệ thống sẽ tổng hợp file, mở ChatGPT, upload tài nguyên, điền prompt và tải ảnh kết quả về đây.</p>",
  "<Bot size={20} /> <h3>MASTER PROMPT - C�\u001aU L� NH T�\u001dNG QUAN</h3>": "<Bot size={20} /> <h3>MASTER PROMPT - CÂU LỆNH TỔNG QUAN</h3>",
  "<Copy size={18} /> SAO CH�0P TOìN B�� G�\u001cI AI": "<Copy size={18} /> SAO CHÉP TOÀN BỘ GÓI AI",
  "<ImageIcon size={20} /> <h3>KẾT QUẢ ẢNH AI ĐÒ TẢI VỬ</h3>": "<ImageIcon size={20} /> <h3>KẾT QUẢ ẢNH AI ĐÃ TẢI VỀ</h3>",
  "Ảnh tạo xong từ ChatGPT sẽ tự �\u0018�\"ng xuất hi�!n �x �\u0018ây.": "Ảnh tạo xong từ ChatGPT sẽ tự động xuất hiện ở đây.",
  "<ExternalLink size={16} /> M�x ảnh": "<ExternalLink size={16} /> Mở ảnh",
  "<ExternalLink size={18} /> M�x trang Photoshop Online": "<ExternalLink size={18} /> Mở trang Photoshop Online",
  "<ImageIcon size={18} /> Nạp lại ảnh g�\u0018c": "<ImageIcon size={18} /> Nạp lại ảnh gốc",
  ">H�\u0019 SƠ KHÁCH HìNG<": ">HỒ SƠ KHÁCH HÀNG<",
  ">Y�`U CẦU CHI TIẾT<": ">YÊU CẦU CHI TIẾT<",
  "<label>Mẫu chuẩn �\u0018ã chọn:</label>": "<label>Mẫu chuẩn đã chọn:</label>",
  "<label>Ghi chú ý tư�xng:</label>": "<label>Ghi chú ý tưởng:</label>",
  "<ExternalLink size={16} /> M�x video tham khảo": "<ExternalLink size={16} /> Mở video tham khảo",
  "<p>Ảnh khách �\u0018ã �\u0018ược nạp tự �\u0018�\"ng. Kéo ảnh từ thư vi�!n vào khung làm vi�!c hoặc bấm Nạp nhanh �\u0018Ồ m�x thêm tài nguyên.</p>": "<p>Ảnh khách đã được nạp tự động. Kéo ảnh từ thư viện vào khung làm việc hoặc bấm Nạp nhanh để mở thêm tài nguyên.</p>",
  ">Thư vi�!n tài nguyên<": ">Thư viện tài nguyên<",
  ">H�! th�\u0018ng<": ">Hệ thống<",
  ">H�! Th�\u0018ng Quản Lý Dự Án<": ">Hệ Thống Quản Lý Dự Án<",
  ">T�!p khách hàng hi�!n có<": ">Tệp khách hàng hiện có<",
  "Quay l�i danh sách t�!p": "Quay lại danh sách tệp",
  "â€¢": "•",
  "Nhánh hi�!n tại": "Nhánh hiện tại",
  "Dữ li�!u hi�!n trạng & Phác thảo": "Dữ liệu hiện trạng & Phác thảo",
  "Ảnh hi�!n trạng g�\u0018c": "Ảnh hiện trạng gốc",
  "Dữ li�!u style/hi�!n trạng b�\" sung": "Dữ liệu style/hiện trạng bổ sung",
  "Tài nguyên b�\" sung": "Tài nguyên bổ sung",
  "Bản vẽ hoàn thi�!n": "Bản vẽ hoàn thiện",
  "Gói d�9ch vụ": "Gói dịch vụ",
  "Thác nư�:c": "Thác nước",
  "Kè �\u0018á": "Kè đá",
  "Mô tả ý tư�xng khách hàng": "Mô tả ý tưởng khách hàng",
  "Quay l�i chọn gói": "Quay lại chọn gói",
  "Thông Tin Liên H�!": "Thông Tin Liên Hệ",
  "Gửi �\u0018ề xuất �\u0018Ồ chúng tôi tiến hành xử lý": "Gửi đề xuất để chúng tôi tiến hành xử lý",
  "Gửi �\u0018ề xuất ngay": "Gửi đề xuất ngay",
  "Y�u c�u c�a b�n": "Yêu cầu của bạn",
  "Ch�ng t�i s� ph�n h�i qua Zalo trong thời gian s�:m nhất.": "Chúng tôi sẽ phản hồi qua Zalo trong thời gian sớm nhất.",
  "Chọn ảnh rõ nét của khu vực bạn mu�\u0018n thi công": "Chọn ảnh rõ nét của khu vực bạn muốn thi công",
  "Gõ �\u0018Ồ chọn hoặc chụp ảnh": "Gõ để chọn hoặc chụp ảnh",
  "H�\u0014 trợ JPG, PNG, HEIC": "Hỗ trợ JPG, PNG, HEIC",
  "Mẹo nhỏ �\u0018Ồ có phác thảo �\u0018ẹp:": "Mẹo nhỏ để có phác thảo đẹp:",
  "Đủ ánh sáng tự nhiên �\u0018Ồ hiỒn th�9 rõ chi tiết �\u0018á và cây.": "Đủ ánh sáng tự nhiên để hiển thị rõ chi tiết đá và cây.",
  "Đứng chính di�!n khu vực thi công (gi�\u0018ng hình minh họa dư�:i).": "Đứng chính diện khu vực thi công (giống hình minh họa dưới).",
  "Hình minh họa góc chụp chuẩn": "Hình minh họa góc chụp chuẩn",
  "Hãy khoanh vùng mô tả v�9 trí": "Hãy khoanh vùng mô tả vị trí",
  "Đá bư�:c": "Đá bước",
  "H�\u001c cá": "Hồ cá",
  "Thác nư�:c": "Thác nước",
  "Làm m�:i": "Làm mới",
  "Vui lòng vào mục \"Chọn mẫu\" và chọn ít nhất m�\"t mẫu (Thác nư�:c, Kè �\u0018á hoặc Cảnh quan) trư�:c khi tiếp tục.": "Vui lòng vào mục \"Chọn mẫu\" và chọn ít nhất một mẫu (Thác nước, Kè đá hoặc Cảnh quan) trước khi tiếp tục.",
  "Vui lòng chọn ít nhất 1 mẫu �\u0018Ồ tiếp tục": "Vui lòng chọn ít nhất 1 mẫu để tiếp tục",
  "THAY Đ�\u001dI": "THAY ĐỔI",
  "Yêu cầu b�\" sung khác": "Yêu cầu bổ sung khác",
  "Ví dụ: tôi mu�\u0018n thêm sỏi �\u0018á bư�:c dạo hoặc thêm cây vú sữa l�:n...": "Ví dụ: tôi muốn thêm sỏi đá bước dạo hoặc thêm cây vú sữa lớn...",
  "Dữ li�!u thực tế & Phong cách mong mu�\u0018n": "Dữ liệu thực tế & Phong cách mong muốn",
  "Tải lên hình ảnh/video hi�!n trạng hoặc mẫu s�x thích của bạn": "Tải lên hình ảnh/video hiện trạng hoặc mẫu sở thích của bạn"
};

for (const [bad, good] of Object.entries(fixes)) {
  c = c.split(bad).join(good);
}

fs.writeFileSync(filePath, c, 'utf8');
console.log('restore-app-text-done');
