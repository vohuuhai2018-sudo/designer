import fs from 'fs';
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. RE-CONSTRUCT SERVICE VIEW (It was mangled from line 986 to 1008)
const brokenServiceView = /function ServiceView[\s\S]*?\/\/ --- ADMIN VIEW ---/g;
const correctServiceView = `function ServiceView({ onSelect, onBack }: { onSelect: (s: string) => void, onBack: () => void }) {
  const services = [
    {
      id: 'AI',
      title: 'Tạo bản vẽ AI',
      price: '29k / bản vẽ',
      desc: 'Sử dụng trí tuệ nhân tạo phác thảo nhanh ý tưởng cho không gian của bạn.',
      color: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      icon: <LayoutDashboard size={36} />,
      tag: 'Nhanh chóng'
    },
    {
      id: 'PRO',
      title: 'Tạo bản vẽ Pro',
      price: '199k / bản vẽ',
      desc: 'Sản phẩm có sự hiệu chỉnh của KTS chuyên nghiệp, đúng với mẫu bạn chọn.',
      color: 'linear-gradient(135deg, var(--accent) 0%, #b48a4d 100%)',
      icon: <Paintbrush size={36} />,
      tag: 'Phổ biến'
    },
    {
      id: 'PRE',
      title: 'Tạo bản vẽ Pre',
      price: '399k / bản vẽ',
      desc: 'KTS hiệu chỉnh chuyên nghiệp, xuất 2-3 góc nhìn và video mô phỏng.',
      color: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      icon: <Palette size={36} />,
      tag: 'Đề xuất'
    },
    {
      id: '3D',
      title: 'Bản vẽ 3D KTS',
      price: 'Báo giá qua Zalo',
      desc: 'Dựng 3D diễn họa đa góc và video chuyên nghiệp. Báo giá trực tiếp qua Zalo.',
      color: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      icon: <ImageIcon size={36} />,
      tag: 'Cao cấp'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }} 
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="view service-view"
    >
      <header className="service-header-main">
        <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={24} /> Quay lại màn hình vẽ</button>
        <div className="title-group">
          <h2 style={{ textTransform: 'uppercase' }}>Chọn Gói Dịch Vụ</h2>
          <p style={{ fontSize: '1.2rem', color: '#fff' }}>Lựa chọn phương thức phác thảo tối ưu nhất cho bạn</p>
        </div>
      </header>

      <div className="service-list-premium">
        {services.map(s => (
          <motion.div 
            key={s.id} 
            className="service-card-premium glass-panel"
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(s.title)}
          >
            <div className="card-inner-premium">
              <div className="service-icon-box-premium" style={{ background: s.color }}>
                {s.icon}
              </div>
              <div className="service-content-premium">
                <div className="service-title-row-premium">
                  <h3>{s.title}</h3>
                  <div className="service-badge-premium">{s.tag}</div>
                </div>
                <p className="service-description-premium">{s.desc}</p>
                <div className="service-footer-row-premium">
                  <div className="price-label-premium">Giá: <span className="highlight-price-premium">{s.price}</span></div>
                  <ArrowRight size={22} className="arrow-icon-premium" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// --- ADMIN VIEW ---`;

c = c.replace(brokenServiceView, correctServiceView);

// 2. RE-CONSTRUCT ADMIN VIEW HEADER (It had duplicate prop declarations)
const brokenAdminHeader = /function AdminView\(\{[\s\S]*?\}\) \{/g;
const correctAdminHeader = `function AdminView({
  projects,
  onBack,
  onUpdateProject
}: {
  projects: Project[];
  onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
}) {`;

c = c.replace(brokenAdminHeader, correctAdminHeader);

// 3. FINAL SYNTAX POLISH (Removing orphaned double quotes if any)
c = c.replace(/useState<string>\('\)/g, "useState<string>('')");
c = c.replace(/useState\('\)/g, "useState('')");

fs.writeFileSync('src/App.tsx', c);
