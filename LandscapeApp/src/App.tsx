import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Paintbrush, 
  Image as ImageIcon, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  Send, 
  Undo2, 
  Trash2, 
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  MessageCircle,
  Camera,
  Layers,
  Palette,
  X,
  ShieldCheck,
  Phone,
  Calendar,
  FolderOpen,
  Folder,
  ArrowLeft,
  Copy,
  ExternalLink,
  Bot,
  Monitor,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './App.css';

// --- TYPES ---
type AppView = 'welcome' | 'upload' | 'editor' | 'service' | 'submit' | 'success' | 'admin';
type WorkflowBranch = 'manual_design' | 'chatgpt_image';

interface Selection {
  thac?: string;
  ke?: string[];
  canh?: string[];
}

interface Project {
  id: string;
  timestamp: string;
  customerName: string;
  customerPhone: string;
  rawImage: string;
  annotatedImage: string;
  selections: Selection;
  service: string;
  status: 'pending' | 'processing' | 'done';
  note?: string;
  extraAssets?: string[];
  workflowBranch?: WorkflowBranch;
  finalImage?: string;
  aiResults?: string[];
}

type ProjectUpdate = Partial<Pick<Project, 'status' | 'workflowBranch' | 'finalImage'>>;

interface DesignerLibraryItem {
  id: string;
  label: string;
  url: string;
  group: string;
  source: 'customer' | 'system';
  note?: string;
}

interface AiUploadAsset {
  label: string;
  url: string;
  role: string;
}

// --- ASSETS CONFIG ---
const ASSETS = {
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
  { color: 'Đỏ', hex: '#ef4444', meaning: 'Vị trí thác nước hoặc cụm đá thác chính', instruction: 'Bố trí đúng vào vùng đỏ, ưu tiên làm điểm nhấn đứng hoặc cụm thác chính.' },
  { color: 'Xanh dương', hex: '#3b82f6', meaning: 'Hồ cá hoặc mặt nước chính', instruction: 'Tạo hồ hoặc mặt nước ở đúng vùng xanh dương, kết nối hợp lý với thác nếu vùng đỏ nằm kề cận.' },
  { color: 'Tím', hex: '#a855f7', meaning: 'Kè đá, bo hồ hoặc viền kết cấu đá', instruction: 'Dùng làm mép bo, viền kè hoặc tường đá bám theo đúng đường nét vùng tím.' },
  { color: 'Xanh lá', hex: '#22c55e', meaning: 'Cảnh quan cây xanh, cỏ, bụi, bonsai', instruction: 'Bố trí mảng xanh đúng vùng xanh lá, cân đối với tổng thể và không che chắn cửa, bậc thềm.' },
  { color: 'Vàng', hex: '#eab308', meaning: 'Hầm lọc hoặc nắp kỹ thuật', instruction: 'Ẩn hầm lọc gọn gàng trong vùng vàng, kín đáo nhưng vẫn khả thi để bảo trì.' },
  { color: 'Trắng', hex: '#ffffff', meaning: 'Vùng sỏi hoặc nền trang trí phụ', instruction: 'Xử lý nền sỏi, vật liệu sáng hoặc khoảng chuyển tiếp ở vùng trắng.' },
  { color: 'Nâu', hex: '#78350f', meaning: 'Đá bước dạo hoặc lối đi nhấn', instruction: 'Bố trí đá bước, lối dạo hoặc điểm chuyển bước theo đúng vùng nâu.' }
] as const;

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState<AppView>('welcome');
  const [rawImage, setRawImage] = useState<string>('');
  const [annotatedImage, setAnnotatedImage] = useState<string>('');
  const [selections, setSelections] = useState<Selection>({ ke: [], canh: [] });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [service, setService] = useState('');
  const [note, setNote] = useState('');
  const [extraAssets, setExtraAssets] = useState<string[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (view === 'admin') {
      fetch('http://localhost:5000/api/projects')
        .then(res => res.json())
        .then(data => setProjects(data))
        .catch(err => console.error('Failed to load projects:', err));
    }
  }, [view]);

  const handleUpload = (img: string) => {
    setRawImage(img);
    setAnnotatedImage(img);
    setView('editor');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const projectData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      customerName,
      customerPhone,
      rawImage,
      annotatedImage,
      selections,
      service,
      note,
      extraAssets,
      status: 'pending' as const
    };

    try {
      const response = await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) throw new Error('Lỗi khi gửi dữ liệu.');
      confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
      setView('success');
    } catch (error) {
      alert('Không thể gửi dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setRawImage('');
    setAnnotatedImage('');
    setSelections({ ke: [], canh: [] });
    setCustomerName('');
    setCustomerPhone('');
    setService('');
    setNote('');
    setExtraAssets([]);
    setView('welcome');
  };

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {view === 'welcome' && (
          <WelcomeView onStart={() => setView('upload')} onAdmin={() => setView('admin')} />
        )}
        {view === 'upload' && (
          <UploadView onBack={() => setView('welcome')} onUpload={handleUpload} />
        )}
        {view === 'editor' && (
          <EditorView
            rawImage={rawImage}
            annotatedImage={annotatedImage}
            onAnnotatedChange={setAnnotatedImage}
            onBack={() => setView('upload')}
            onNext={() => setView('service')}
          />
        )}
        {view === 'service' && (
          <ServiceView
            selections={selections}
            onSelectionsChange={setSelections}
            service={service}
            onServiceChange={setService}
            note={note}
            onNoteChange={setNote}
            onBack={() => setView('editor')}
            onNext={() => setView('submit')}
          />
        )}
        {view === 'submit' && (
          <SubmitView
            customerName={customerName}
            onNameChange={setCustomerName}
            customerPhone={customerPhone}
            onPhoneChange={setCustomerPhone}
            rawImage={rawImage}
            annotatedImage={annotatedImage}
            extraAssets={extraAssets}
            onExtraAssetsChange={setExtraAssets}
            onBack={() => setView('service')}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
        {view === 'success' && (
          <SuccessView onReset={resetAll} />
        )}
        {view === 'admin' && (
          <AdminView
            projects={projects}
            onBack={resetAll}
            onUpdateProject={async (id, updates) => {
              const response = await fetch(`http://localhost:5000/api/projects/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              const payload = await response.json().catch(() => null);
              if (!response.ok) throw new Error(payload?.error || 'Không thể cập nhật dữ liệu dự án.');
              setProjects(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p));
              return payload as Project;
            }}
            onGenerateAiPrompt={async (id, payload) => {
              const response = await fetch(`http://localhost:5000/api/projects/${id}/ai-prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const result = await response.json().catch(() => null);
              if (!response.ok) throw new Error(result?.error || 'Không thể sinh prompt bằng AI.');
              return result.prompt as string;
            }}
            onGenerateAiImage={async (id, payload) => {
              const response = await fetch(`http://localhost:5000/api/projects/${id}/chatgpt-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const result = await response.json().catch(() => null);
              if (!response.ok) throw new Error(result?.error || 'Không thể chạy tự động ChatGPT.');
              setProjects(prev => prev.map(p => p.id === id ? { ...p, ...result.project } : p));
              return result.project as Project;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- SUB-VIEWS ---

function WelcomeView({ onStart, onAdmin }: { onStart: () => void, onAdmin: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view welcome-view">
      <button className="btn-admin-access" onClick={onAdmin} title="Quản trị hệ thống">
        <ShieldCheck size={24} />
      </button>
      <div className="hero-content">
        <div className="logo-badge">SƠN HẢI</div>
        <h1>Kiến Tạo<br/><span className="gradient-text">Không Gian Sống</span></h1>
        <p>Ứng dụng phác thảo cảnh quan chuyên nghiệp. Biến công trình thô thành tuyệt tác chỉ trong vài bước.</p>
        <div className="features-grid">
          <div className="feat-item"><div className="icon"><Camera /></div><span>Chụp ảnh thực tế</span></div>
          <div className="feat-item"><div className="icon"><Palette /></div><span>Phác thảo ý tưởng</span></div>
          <div className="feat-item"><div className="icon"><Layers /></div><span>Chọn mẫu đa dạng</span></div>
        </div>
        <button className="btn-primary main-cta" onClick={onStart}>
          Bắt đầu thiết kế <ArrowRight size={20} />
        </button>
      </div>
    </motion.div>
  );
}

function UploadView({ onBack, onUpload }: { onBack: () => void, onUpload: (img: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view upload-view">
      <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Quay lại</button>
      <div className="upload-content">
        <h2>Tải ảnh hiện trạng</h2>
        <p>Chọn một bức ảnh chụp vị trí mà bạn muốn thiết kế cảnh quan.</p>
        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Preview" className="upload-preview" />
          ) : (
            <div className="upload-placeholder">
              <Upload size={48} />
              <span>Nhấn để chọn ảnh</span>
            </div>
          )}
        </div>
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} hidden />
        {preview && (
          <button className="btn-primary" onClick={() => onUpload(preview)}>
            Tiếp tục <ArrowRight size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function EditorView({
  rawImage, annotatedImage, onAnnotatedChange, onBack, onNext
}: {
  rawImage: string;
  annotatedImage: string;
  onAnnotatedChange: (img: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);

  const colors = ANNOTATION_COLOR_RULES.map(r => ({ hex: r.hex, label: r.color, meaning: r.meaning }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    img.src = rawImage;
  }, [rawImage]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.5;
    ctx.stroke();
  };

  const endDraw = () => {
    setDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.globalAlpha = 1.0;
    setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    }
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || history.length === 0) return;
    ctx.putImageData(history[0], 0, 0);
    setHistory([history[0]]);
  };

  const saveAndNext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onAnnotatedChange(canvas.toDataURL('image/png'));
    onNext();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view editor-view">
      <div className="editor-toolbar">
        <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Quay lại</button>
        <div className="toolbar-center">
          <div className="color-palette">
            {colors.map(c => (
              <button key={c.hex} className={`color-dot ${color === c.hex ? 'active' : ''}`} style={{ background: c.hex }} onClick={() => setColor(c.hex)} title={`${c.label}: ${c.meaning}`} />
            ))}
          </div>
          <div className="brush-size-control">
            <Paintbrush size={16} />
            <input type="range" min="5" max="60" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
          </div>
        </div>
        <div className="toolbar-actions">
          <button onClick={undo} className="btn-tool" title="Hoàn tác"><Undo2 size={18} /></button>
          <button onClick={clearAll} className="btn-tool" title="Xóa tất cả"><Trash2 size={18} /></button>
        </div>
      </div>
      <div className="editor-canvas-wrapper">
        <canvas ref={canvasRef} className="editor-canvas" onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw} />
      </div>
      <div className="editor-color-legend">
        {colors.map(c => (
          <div key={c.hex} className="legend-item">
            <span className="legend-dot" style={{ background: c.hex }} />
            <span>{c.label}: {c.meaning}</span>
          </div>
        ))}
      </div>
      <button className="btn-primary editor-next" onClick={saveAndNext}>
        Tiếp tục chọn mẫu <ArrowRight size={18} />
      </button>
    </motion.div>
  );
}

function ServiceView({
  selections, onSelectionsChange, service, onServiceChange, note, onNoteChange, onBack, onNext
}: {
  selections: Selection;
  onSelectionsChange: (s: Selection) => void;
  service: string;
  onServiceChange: (s: string) => void;
  note: string;
  onNoteChange: (n: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [expandedThac, setExpandedThac] = useState<string | null>(null);

  const handleThacSelect = (variantId: string) => {
    onSelectionsChange({ ...selections, thac: variantId });
  };

  const toggleKe = (id: string) => {
    const current = selections.ke || [];
    const updated = current.includes(id) ? current.filter(k => k !== id) : [...current, id];
    onSelectionsChange({ ...selections, ke: updated });
  };

  const toggleCanh = (id: string) => {
    const current = selections.canh || [];
    const updated = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
    onSelectionsChange({ ...selections, canh: updated });
  };

  const services = [
    { id: 'basic', name: 'Tạo bản vẽ cơ bản', desc: 'Phác thảo nhanh' },
    { id: 'pro', name: 'Tạo bản vẽ Pro', desc: 'Bản vẽ chi tiết chuyên nghiệp' },
    { id: 'premium', name: 'Tạo bản vẽ Premium', desc: 'Bản vẽ kèm video 3D' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view service-view">
      <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Quay lại</button>
      <div className="service-scroll-content">
        <h2>Chọn Mẫu & Dịch Vụ</h2>

        <section className="selection-section">
          <h3>Thác nước</h3>
          <div className="thac-grid">
            {ASSETS.THAC.map(thac => (
              <div key={thac.id} className="thac-group">
                <button className={`thac-parent-btn ${expandedThac === thac.id ? 'expanded' : ''}`} onClick={() => setExpandedThac(expandedThac === thac.id ? null : thac.id)}>
                  <img src={thac.url} alt={thac.name} />
                  <span>{thac.name}</span>
                </button>
                {expandedThac === thac.id && thac.variants && (
                  <div className="variant-grid">
                    {thac.variants.map(v => (
                      <button key={v.id} className={`variant-card ${selections.thac === v.id ? 'selected' : ''}`} onClick={() => handleThacSelect(v.id)}>
                        <img src={v.url} alt={v.name} />
                        <span>{v.name}</span>
                        {selections.thac === v.id && <CheckCircle2 size={18} className="check-icon" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="selection-section">
          <h3>Kè đá</h3>
          <div className="checkbox-group">
            {ASSETS.KE.map(item => (
              <label key={item.id} className={`checkbox-item ${(selections.ke || []).includes(item.id) ? 'checked' : ''}`}>
                <input type="checkbox" checked={(selections.ke || []).includes(item.id)} onChange={() => toggleKe(item.id)} />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="selection-section">
          <h3>Cảnh quan</h3>
          <div className="checkbox-group">
            {ASSETS.CANH.map(item => (
              <label key={item.id} className={`checkbox-item ${(selections.canh || []).includes(item.id) ? 'checked' : ''}`}>
                <input type="checkbox" checked={(selections.canh || []).includes(item.id)} onChange={() => toggleCanh(item.id)} />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="selection-section">
          <h3>Gói dịch vụ</h3>
          <div className="service-cards">
            {services.map(s => (
              <button key={s.id} className={`service-card ${service === s.name ? 'active' : ''}`} onClick={() => onServiceChange(s.name)}>
                <strong>{s.name}</strong>
                <span>{s.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="selection-section">
          <h3>Ghi chú cho đội ngũ</h3>
          <textarea className="note-textarea" placeholder="Ví dụ: thêm cho tôi một viên đá để ngồi câu cá, thác không được cao quá cửa sổ..." value={note} onChange={e => onNoteChange(e.target.value)} rows={4} />
        </section>

        <button className="btn-primary" onClick={onNext} disabled={!service}>
          Tiếp tục gửi <ArrowRight size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function SubmitView({
  customerName, onNameChange, customerPhone, onPhoneChange, rawImage, annotatedImage, extraAssets, onExtraAssetsChange, onBack, onSubmit, isSubmitting
}: {
  customerName: string; onNameChange: (n: string) => void;
  customerPhone: string; onPhoneChange: (p: string) => void;
  rawImage: string; annotatedImage: string;
  extraAssets: string[]; onExtraAssetsChange: (a: string[]) => void;
  onBack: () => void; onSubmit: () => void; isSubmitting: boolean;
}) {
  const extraRef = useRef<HTMLInputElement>(null);

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const result = ev.target?.result as string;
        onExtraAssetsChange([...extraAssets, result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view submit-view">
      <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Quay lại</button>
      <div className="submit-content">
        <h2>Xác nhận & Gửi</h2>

        <div className="submit-form">
          <div className="form-group">
            <label><User size={16} /> Họ và tên</label>
            <input type="text" value={customerName} onChange={e => onNameChange(e.target.value)} placeholder="Nhập tên khách hàng" />
          </div>
          <div className="form-group">
            <label><Phone size={16} /> Số điện thoại / Zalo</label>
            <input type="tel" value={customerPhone} onChange={e => onPhoneChange(e.target.value)} placeholder="0xxx xxx xxx" />
          </div>
        </div>

        <div className="preview-row">
          <div className="preview-card">
            <label>Ảnh gốc</label>
            <img src={rawImage} alt="Raw" />
          </div>
          <div className="preview-card">
            <label>Ảnh khoanh vùng</label>
            <img src={annotatedImage} alt="Annotated" />
          </div>
        </div>

        <div className="extra-assets-section">
          <button className="btn-secondary" onClick={() => extraRef.current?.click()}>
            <Upload size={16} /> Thêm ảnh / video tham khảo
          </button>
          <input type="file" accept="image/*,video/*" multiple ref={extraRef} onChange={handleExtraFiles} hidden />
          {extraAssets.length > 0 && (
            <div className="extra-preview-grid">
              {extraAssets.map((asset, i) => (
                <div key={i} className="extra-thumb">
                  <img src={asset} alt={`Extra ${i}`} />
                  <button className="remove-extra" onClick={() => onExtraAssetsChange(extraAssets.filter((_, idx) => idx !== i))}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn-primary submit-btn" onClick={onSubmit} disabled={!customerName || !customerPhone || isSubmitting}>
          <Send size={18} /> {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
        </button>
      </div>
    </motion.div>
  );
}

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view">
      <div className="success-content">
        <CheckCircle2 size={80} className="success-icon" />
        <h2>Gửi thành công!</h2>
        <p>Dữ liệu đã được chuyển đến đội ngũ thiết kế. Chúng tôi sẽ xử lý bản vẽ và phản hồi sớm nhất qua Zalo.</p>
        <button className="btn-primary" onClick={onReset}>Quay về trang chủ</button>
      </div>
    </motion.div>
  );
}

// --- ADMIN VIEW ---
function AdminView({
  projects, onBack, onUpdateProject, onGenerateAiPrompt, onGenerateAiImage
}: {
  projects: Project[];
  onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
  onGenerateAiPrompt: (id: string, payload: any) => Promise<string>;
  onGenerateAiImage: (id: string, payload: any) => Promise<Project>;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [showDesigner, setShowDesigner] = useState(false);
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [designerReady, setDesignerReady] = useState(false);
  const [designerStatus, setDesignerStatus] = useState('Đang tải trình thiết kế...');
  const [designerTab, setDesignerTab] = useState<'customer' | 'system'>('customer');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState('');
  const [aiStudioStatus, setAiStudioStatus] = useState('Sẵn sàng.');
  const [isDraggingToDesigner, setIsDraggingToDesigner] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DesignerLibraryItem | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const designerFileRef = useRef<HTMLInputElement>(null);
  const designerFrameRef = useRef<HTMLIFrameElement>(null);
  const autoLoadedDesignerProjectRef = useRef<string | null>(null);

  useEffect(() => { if (actionFeedback) { const t = setTimeout(() => setActionFeedback(''), 4000); return () => clearTimeout(t); } }, [actionFeedback]);

  // --- HELPERS ---
  const getAssetInfo = (id: string, category: 'THAC' | 'KE' | 'CANH'): { name: string, url: string } | null => {
    const list = ASSETS[category];
    for (const item of list) {
      if (item.id === id) return { name: item.name, url: item.url };
      if ('variants' in item && item.variants) {
        const variant = item.variants.find(v => v.id === id);
        if (variant) return { name: variant.name, url: variant.url };
      }
    }
    return null;
  };

  const getAssetName = (id: string, category: 'THAC' | 'KE' | 'CANH') => {
    const info = getAssetInfo(id, category);
    return info ? info.name : id;
  };

  const getWorkflowLabel = (branch?: WorkflowBranch) => {
    if (branch === 'manual_design') return 'Thiết kế thủ công';
    if (branch === 'chatgpt_image') return 'ChatGPT tạo ảnh';
    return 'Chưa chọn nhánh';
  };

  const getWorkflowShortLabel = (branch?: WorkflowBranch) => {
    if (branch === 'manual_design') return 'Thiết kế tay';
    if (branch === 'chatgpt_image') return 'ChatGPT ảnh';
    return 'Chưa chọn';
  };

  const getStatusLabel = (status: Project['status']) => {
    if (status === 'done') return 'HOÀN THÀNH';
    if (status === 'processing') return 'ĐANG XỬ LÝ';
    return 'CHỜ XỬ LÝ';
  };

  const isVideoAsset = (src: string) => {
    return src.startsWith('data:video') || src.includes('/video/upload/') || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(src);
  };

  const groupProjects = () => {
    return projects.reduce<Record<string, Project[]>>((acc, project) => {
      const createdAt = new Date(project.timestamp);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      let dateKey = createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (createdAt.toDateString() === today.toDateString()) dateKey = 'Hôm nay';
      else if (createdAt.toDateString() === yesterday.toDateString()) dateKey = 'Hôm qua';
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(project);
      return acc;
    }, {});
  };

  const grouped = groupProjects();

  // --- DESIGNER HELPERS ---
  const getDesignerUrl = () => {
    const config = { files: [], environment: { customIO: true } };
    return `https://www.photopea.com#${encodeURIComponent(JSON.stringify(config))}`;
  };

  const postBufferToDesigner = (buffer: ArrayBuffer) => {
    const frame = designerFrameRef.current;
    if (!frame?.contentWindow) return false;
    frame.contentWindow.postMessage(buffer, '*');
    return true;
  };

  const loadRawImageIntoDesigner = async (project: Project, opts?: { force?: boolean }) => {
    if (!opts?.force && autoLoadedDesignerProjectRef.current === project.id) return;
    try {
      const response = await fetch(project.rawImage);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        if (postBufferToDesigner(buffer)) {
          autoLoadedDesignerProjectRef.current = project.id;
          setDesignerStatus('Đã nạp ảnh hiện trạng vào bàn làm việc.');
        }
      }
    } catch (e) {
      console.error('Load raw image error:', e);
    }
  };

  const pushAssetToDesigner = async (item: DesignerLibraryItem, position?: any) => {
    try {
      setDesignerStatus(`Đang nạp ${item.label}...`);
      const frame = designerFrameRef.current;
      if (!frame?.contentWindow) { setDesignerStatus('Trình thiết kế chưa sẵn sàng.'); return; }
      const script = `app.open("${item.url}", null, true);`;
      frame.contentWindow.postMessage(script, '*');
      setDesignerStatus(`Đã nạp ${item.label} vào trình thiết kế.`);
    } catch (e) {
      setDesignerStatus(`Không thể nạp ${item.label}.`);
    }
  };

  const handleDesignerAssetDragStart = (event: React.DragEvent, item: DesignerLibraryItem) => {
    setDraggedItem(item);
    setIsDraggingToDesigner(true);
  };

  const handleDesignerDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingToDesigner(false);
    if (!draggedItem) return;
    await pushAssetToDesigner(draggedItem);
    setDraggedItem(null);
  };

  const handleDesignerLocalFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      setDesignerStatus(`Đang đưa file ${file.name} vào khung làm việc...`);
      const buffer = await file.arrayBuffer();
      if (postBufferToDesigner(buffer)) {
        setDesignerStatus(`Đã nạp file ${file.name} vào trình thiết kế.`);
      }
    } catch (e) { setDesignerStatus(`Không thể nạp file ${file.name}.`); }
  };

  // --- AI HELPERS ---
  const getAiUploadAssets = (project: Project): AiUploadAsset[] => {
    const customerAssets: AiUploadAsset[] = [
      { label: 'Ảnh hiện trạng gốc', url: project.rawImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
      { label: 'Ảnh khoanh vùng thiết kế', url: project.annotatedImage, role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.' },
      ...(project.extraAssets || []).filter(a => !isVideoAsset(a)).slice(0, 2).map((a, i) => ({
        label: `Ảnh tham khảo khách ${i + 1}`, url: a, role: 'Ảnh khách gửi thêm để tham khảo phong cách, vật liệu hoặc hình khối mong muốn.'
      }))
    ];
    const systemAssets = getSelectedSystemAiAssets(project);
    const combined = [...customerAssets, ...systemAssets];
    const seen = new Set<string>();
    return combined.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; }).slice(0, 6);
  };

  const getSelectedSystemAiAssets = (project: Project): AiUploadAsset[] => {
    const assets: AiUploadAsset[] = [];
    if (project.selections.thac) {
      const info = getAssetInfo(project.selections.thac, 'THAC');
      if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu thác / vân đá chọn từ thư viện, dùng cho phối cảnh và vật liệu.' });
    }
    SYSTEM_REFERENCE_LIBRARY.slice(0, 2).forEach(item => {
      assets.push({ label: item.label, url: item.url, role: item.note || 'Tham khảo tổ hợp cảnh quan / hồ hệ thống.' });
    });
    return assets;
  };

  const getColorRuleLines = () => {
    return ANNOTATION_COLOR_RULES.map(rule => `- ${rule.color} (${rule.hex}): ${rule.meaning}. ${rule.instruction}`);
  };

  const buildSelectionLines = (project: Project) => {
    const lines: string[] = [];
    if (project.selections.thac) lines.push(`- Thác nước: ${getAssetName(project.selections.thac, 'THAC')}`);
    if (project.selections.ke?.length) lines.push(`- Kè đá: ${project.selections.ke.map(id => getAssetName(id, 'KE')).join(', ')}`);
    if (project.selections.canh?.length) lines.push(`- Cảnh quan: ${project.selections.canh.map(id => getAssetName(id, 'CANH')).join(', ')}`);
    return lines.length > 0 ? lines : ['- Chưa có mẫu chọn cụ thể'];
  };

  const buildAiAssetLines = (project: Project) => {
    return getAiUploadAssets(project).map((asset, i) => `- File ${i + 1}: ${asset.label}. ${asset.role}`);
  };

  const buildChatGptPrompt = (project: Project) => {
    return [
      'Bạn là chuyên gia dựng concept cảnh quan từ ảnh hiện trạng thực tế của khách hàng.',
      'Hãy tạo 1 hình ảnh phối cảnh mới bám sát ảnh gốc và toàn bộ file tôi tải kèm.',
      'Mục tiêu là bố trí đúng công năng theo ảnh khoanh vùng màu, đồng thời làm bố cục hợp lý, đẹp và khả thi thi công.',
      '',
      'Thông tin dự án',
      `- Khách hàng: ${project.customerName}`,
      `- Số điện thoại/Zalo: ${project.customerPhone}`,
      `- Gói dịch vụ: ${project.service}`,
      `- Nhánh xử lý: ${getWorkflowLabel(project.workflowBranch || 'chatgpt_image')}`,
      '',
      'Mẫu đã chọn',
      ...buildSelectionLines(project),
      '',
      'Quy ước màu trên ảnh khoanh vùng',
      ...getColorRuleLines(),
      '- Nếu một màu không xuất hiện trong ảnh khoanh vùng thì không tự ý thêm hạng mục đó, trừ khi ghi chú khách yêu cầu rõ ràng.',
      '',
      'Cách hiểu bố cục và sắp xếp công năng',
      '- Ưu tiên đọc đúng vị trí từ ảnh khoanh vùng: mỗi hạng mục phải nằm đúng trong vùng màu tương ứng.',
      '- Nếu vùng đỏ và xanh dương liền nhau, bố trí thác đổ vào hồ cá hoặc mặt nước một cách tự nhiên.',
      '- Vùng tím phải ôm theo viền hồ, viền bồn hoặc bờ kè, không đặt rời rạc.',
      '- Vùng xanh lá là lớp cảnh quan mềm để cân bằng tổng thể, không che cửa chính, cửa sổ và lối đi.',
      '- Vùng vàng là hầm lọc, xử lý kín đáo, hợp lý, có thể ẩn sau cây, đá hoặc nắp kỹ thuật gọn gàng.',
      '- Vùng nâu và trắng là các lớp phụ trợ cho lối đi, sỏi, nền và chuyển tiếp vật liệu.',
      '- Bạn được phép hiệu chỉnh kích thước, cao độ, độ cong mép hồ, tỷ lệ cây và tỷ lệ đá để tổng thể cân đối, nhưng không được làm lệch vị trí chức năng chính đã khoanh màu.',
      '',
      'Mô tả khách hàng',
      project.note?.trim() || 'Không có mô tả bổ sung.',
      '',
      'Yêu cầu bắt buộc',
      '- Giữ nguyên góc chụp, phối cảnh và tỷ lệ của ảnh hiện trạng.',
      '- Giữ nguyên kiến trúc nhà, cửa, cột, bậc tam cấp, lớp ốp hiện có nếu không nằm trong vùng cần xử lý.',
      '- Chỉ can thiệp vào khu vực đã được khoanh vùng hoặc mô tả.',
      '- Ưu tiên vật liệu, bố cục và phong cách theo đúng các mẫu đã chọn và ảnh tham khảo.',
      '- Sắp xếp lại tỷ lệ công năng cho đẹp mắt, hợp lý và cân đối nhưng vẫn phải trùng vị trí quy hoạch trên ảnh màu.',
      '- Hình ảnh đầu ra cần tự nhiên, khả thi để thi công thực tế.',
      '- Nếu có xung đột giữa ảnh tham khảo và hiện trạng, ưu tiên hiện trạng thực tế của khách.',
      '',
      'Ý nghĩa từng file upload',
      ...buildAiAssetLines(project),
      '',
      'Đầu ra mong muốn',
      '- 1 hình ảnh cảnh quan hoàn chỉnh, photorealistic, đẹp, rõ ràng, không bị méo hình.',
      '- Hình phải cho thấy cách đặt thác, hồ, kè, cây xanh và hầm lọc một cách thống nhất, có chú ý đến tầm nhìn từ cửa chính.',
      '- Tuyệt đối không đặt công năng sai màu, sai vị trí, sai tỷ lệ so với ảnh khoanh vùng.'
    ].join('\n');
  };

  const buildChatGptPackage = (project: Project, options?: { absoluteUrls?: boolean }) => {
    const links = getAiUploadAssets(project).map((asset, i) => {
      const url = options?.absoluteUrls ? toAbsoluteAssetUrl(asset.url) : asset.url;
      return `${i + 1}. ${asset.label}: ${url}`;
    }).join('\n');
    return `${buildChatGptPrompt(project)}\n\nĐường dẫn tài nguyên\n${links}`;
  };

  const buildChatGptPackageFromPrompt = (project: Project, prompt: string, options?: { absoluteUrls?: boolean }) => {
    const links = getAiUploadAssets(project).map((asset, i) => {
      const url = options?.absoluteUrls ? toAbsoluteAssetUrl(asset.url) : asset.url;
      return `${i + 1}. ${asset.label}: ${url}`;
    }).join('\n');
    return `${prompt}\n\nĐường dẫn tài nguyên\n${links}`;
  };

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setActionFeedback(successMessage);
    } catch (error) {
      console.error('Clipboard error:', error);
      setActionFeedback('Không thể sao chép. Hãy thử lại trên trình duyệt đang mở.');
    }
  };

  const toAbsoluteAssetUrl = (url: string) => {
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    return new URL(url, window.location.origin).toString();
  };

  const handleRunChatGptAutomation = async () => {
    if (!selectedProject || isGeneratingAi) return;
    try {
      setIsGeneratingAi(true);
      setAiStudioStatus('Đang mở ChatGPT, nạp tài nguyên và gửi prompt tạo ảnh...');
      const assets = getAiUploadAssets(selectedProject).map(asset => ({ ...asset, url: toAbsoluteAssetUrl(asset.url) }));
      let prompt = aiGeneratedPrompt.trim();
      if (!prompt) prompt = buildChatGptPrompt(selectedProject);
      setAiGeneratedPrompt(prompt);
      const payload = { prompt, assets };
      const updatedProject = await onGenerateAiImage(selectedProject.id, payload);
      setSelectedProject(updatedProject);
      setAiStudioStatus('Đã nhận ảnh từ ChatGPT và nạp lại vào gói tài nguyên AI.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể chạy tự động ChatGPT.';
      setAiStudioStatus(message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleWorkflowSelect = async (branch: WorkflowBranch) => {
    if (!selectedProject) return;
    if (branch === 'manual_design') {
      setShowDesigner(true);
      try { const updated = await onUpdateProject(selectedProject.id, { workflowBranch: branch }); setSelectedProject(updated); } catch { setActionFeedback('Có lỗi khi cập nhật nhánh xử lý.'); }
      return;
    }
    if (branch === 'chatgpt_image') {
      setShowAIStudio(true);
      try { const updated = await onUpdateProject(selectedProject.id, { workflowBranch: branch }); setSelectedProject(updated); } catch { setActionFeedback('Có lỗi khi cập nhật nhánh xử lý.'); }
      return;
    }
  };

  const handleUploadResult = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !selectedProject) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const result = ev.target?.result as string;
      try {
        const updated = await onUpdateProject(selectedProject.id, { finalImage: result, status: 'done' } as any);
        setSelectedProject(updated);
        setActionFeedback('Đã tải lên bản vẽ hoàn thiện thành công!');
      } catch (e) { setActionFeedback('Không thể tải lên bản vẽ.'); }
    };
    reader.readAsDataURL(file);
    event.currentTarget.value = '';
  };

  // --- DESIGNER DATA ---
  const designerCustomerLibrary: DesignerLibraryItem[] = selectedProject ? [
    { id: 'raw', label: 'Ảnh hiện trạng', url: selectedProject.rawImage, group: 'Ảnh khách', source: 'customer' },
    { id: 'annotated', label: 'Ảnh khoanh vùng', url: selectedProject.annotatedImage, group: 'Ảnh khách', source: 'customer' },
    ...(selectedProject.extraAssets || []).filter(a => !isVideoAsset(a)).map((a, i) => ({
      id: `extra-${i}`, label: `Ảnh tham khảo ${i + 1}`, url: a, group: 'Ảnh khách', source: 'customer' as const
    }))
  ] : [];

  const designerVideoReferences = selectedProject?.extraAssets?.filter(isVideoAsset) || [];

  const visibleDesignerLibrary = designerTab === 'customer' ? designerCustomerLibrary : SYSTEM_REFERENCE_LIBRARY;

  const aiUploadAssets = selectedProject ? getAiUploadAssets(selectedProject) : [];
  const chatGptPrompt = selectedProject ? buildChatGptPrompt(selectedProject) : '';
  const aiResultImages = selectedProject?.aiResults || [];

  const workflowOptions = [
    { id: 'manual_design' as WorkflowBranch, title: 'Thiết kế thủ công', description: 'Dùng trình thiết kế trực tuyến (Photopea) để vẽ tay.', icon: <Paintbrush size={22} /> },
    { id: 'chatgpt_image' as WorkflowBranch, title: 'ChatGPT tạo ảnh', description: 'Dùng ảnh gốc, ảnh khoanh vùng và dữ liệu khách để tạo phương án mới bằng ChatGPT.', icon: <Bot size={22} /> }
  ];

  const activeResources = selectedProject ? getAiUploadAssets(selectedProject).map(a => ({ label: a.label, url: toAbsoluteAssetUrl(a.url) })) : [];

  // --- EFFECTS ---
  useEffect(() => {
    if (!showDesigner) return;
    autoLoadedDesignerProjectRef.current = null;
    setDesignerStatus('Đang tải trình thiết kế và nạp ảnh gốc của khách hàng...');
  }, [showDesigner, selectedProject]);

  useEffect(() => {
    if (!showAIStudio || !selectedProject) return;
    setAiGeneratedPrompt('');
    setAiStudioStatus('Sẵn sàng tổng hợp prompt và tài nguyên AI.');
  }, [showAIStudio, selectedProject]);

  useEffect(() => {
    const handleDesignerMessage = async (event: MessageEvent) => {
      if (event.source !== designerFrameRef.current?.contentWindow) return;
      if (event.data === 'ready') {
        setDesignerReady(true);
        if (selectedProject) {
          setDesignerStatus('Đang nạp ảnh hiện trạng vào bàn làm việc...');
          try {
            const response = await fetch(selectedProject.rawImage);
            if (response.ok) {
              const buffer = await response.arrayBuffer();
              if (postBufferToDesigner(buffer)) {
                autoLoadedDesignerProjectRef.current = selectedProject.id;
                setDesignerStatus('Đã nạp ảnh hiện trạng thành công.');
              }
            }
          } catch { setDesignerStatus('Không thể nạp ảnh gốc tự động.'); }
        }
      }
    };
    window.addEventListener('message', handleDesignerMessage);
    return () => window.removeEventListener('message', handleDesignerMessage);
  }, [selectedProject]);

  // --- RENDER: AI STUDIO ---
  if (showAIStudio && selectedProject) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="view ai-studio-view">
        <header className="ai-studio-header">
          <button onClick={() => setShowAIStudio(false)} className="btn-close-designer"><X size={20} /> Thoát Trạm AI</button>
          <h2>Gói Tài Nguyên AI (AI Asset Package)</h2>
          <p>Hệ thống sẽ tổng hợp file, mở ChatGPT, upload tài nguyên, diễn prompt và tải kết quả về đây.</p>
        </header>

        <aside className="ai-studio-sidebar">
          <div className="ai-sidebar-project-info">
            <div className="info-row"><label>Khách hàng:</label><span><strong>{selectedProject.customerName}</strong></span></div>
            <div className="info-row"><label>Dịch vụ:</label><span>{selectedProject.service}</span></div>
          </div>
          <div className="ai-sidebar-selections">
            <label>Lựa chọn vật liệu:</label>
            {buildSelectionLines(selectedProject).map((line, i) => <div key={i} className="req-tag-mini">{line.replace('- ', '')}</div>)}
          </div>
          <div className="ai-sidebar-note">
            <label>Ghi chú khách:</label>
            <p>{selectedProject.note || 'Không có ghi chú.'}</p>
          </div>
          <div className="ai-sidebar-actions">
            <button className="btn-primary" onClick={handleRunChatGptAutomation} disabled={isGeneratingAi}>
              <Bot size={18} /> {isGeneratingAi ? 'Đang xử lý...' : 'Mở ChatGPT'}
            </button>
            <div className="ai-studio-status">{aiStudioStatus}</div>
          </div>
        </aside>

        <main className="ai-studio-main">
          <div className="studio-visual-grid">
            {aiUploadAssets.map((asset, index) => (
              <div key={`${asset.label}-${index}`} className="visual-asset-card">
                <div className="asset-media"><img src={asset.url} alt={asset.label} /></div>
                <div className="asset-meta">
                  <div><div className="asset-label">{asset.label}</div><div className="asset-role">{asset.role}</div></div>
                  <button className="btn-copy-asset" onClick={() => copyText(toAbsoluteAssetUrl(asset.url), `Đã copy link ${asset.label}`)}><Copy size={16} /> Sao chép Link</button>
                </div>
              </div>
            ))}
          </div>

          <section className="studio-prompt-center">
            <div className="prompt-header-row">
              <div className="prompt-title"><Bot size={20} /> <h3>MASTER PROMPT - CÂU LỆNH TỔNG QUAN</h3></div>
              <button className="btn-copy-all" onClick={() => copyText(buildChatGptPackageFromPrompt(selectedProject, chatGptPrompt, { absoluteUrls: true }), 'Đã sao chép tất cả prompt và link tài nguyên.')}><Copy size={18} /> SAO CHÉP TOÀN BỘ GÓI AI</button>
            </div>
            <div className="prompt-content-view"><pre>{chatGptPrompt}</pre></div>
          </section>

          <section className="studio-result-center">
            <div className="prompt-header-row">
              <div className="prompt-title"><ImageIcon size={20} /> <h3>KẾT QUẢ ẢNH AI ĐÃ TẢI VỀ</h3></div>
            </div>
            {aiResultImages.length === 0 ? (
              <div className="ai-result-empty">Ảnh tạo xong từ ChatGPT sẽ tự động xuất hiện ở đây.</div>
            ) : (
              <div className="ai-result-grid">
                {aiResultImages.slice().reverse().map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="ai-result-card">
                    <img src={imageUrl} alt={`Kết quả AI ${index + 1}`} />
                    <div className="ai-result-actions">
                      <button type="button" className="btn-link-inline" onClick={() => window.open(imageUrl, '_blank', 'noopener,noreferrer')}><ExternalLink size={16} /> Mở ảnh</button>
                      <button type="button" className="btn-link-inline" onClick={() => copyText(imageUrl, 'Đã sao chép link ảnh AI.')}><Copy size={16} /> Copy link</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </motion.div>
    );
  }

  // --- RENDER: DESIGNER ---
  if (showDesigner && selectedProject) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="integrated-designer-view">
        <div className="designer-sidebar">
          <div className="designer-top-actions">
            <button onClick={() => setShowDesigner(false)} className="btn-close-designer"><X size={20} /> Đóng trình thiết kế</button>
            <button className="designer-side-action ghost" onClick={() => window.open('https://photoshoponline.me/', '_blank', 'noopener,noreferrer')}><ExternalLink size={18} /> Mở trang Photoshop Online</button>
          </div>

          <div className="designer-quick-actions">
            <button className="designer-side-action primary" onClick={() => { if (designerCustomerLibrary[0]) void loadRawImageIntoDesigner(selectedProject, { force: true }); }} disabled={!designerCustomerLibrary[0]}>
              <ImageIcon size={18} /> Nạp lại ảnh gốc
            </button>
            <button className="designer-side-action" onClick={() => designerFileRef.current?.click()}><Upload size={18} /> Thêm file từ máy tính</button>
            <input type="file" accept="image/*" ref={designerFileRef} onChange={handleDesignerLocalFile} hidden />
          </div>

          <div className="designer-customer-info">
            <h3>HỒ SƠ KHÁCH HÀNG</h3>
            <div className="info-row"><label>Khách hàng:</label><span>{selectedProject.customerName}</span></div>
            <div className="info-row"><label>SĐT/Zalo:</label><span>{selectedProject.customerPhone}</span></div>
          </div>

          <div className="designer-requirements">
            <h3>YÊU CẦU CHI TIẾT</h3>
            <div className="req-block">
              <label>Mẫu chuẩn đã chọn:</label>
              <div className="req-tags-visual">
                {(() => {
                  const items: { id: string, cat: 'THAC' | 'KE' | 'CANH' }[] = [];
                  if (selectedProject.selections.thac) items.push({ id: selectedProject.selections.thac, cat: 'THAC' });
                  (selectedProject.selections.ke || []).forEach(id => items.push({ id, cat: 'KE' }));
                  (selectedProject.selections.canh || []).forEach(id => items.push({ id, cat: 'CANH' }));
                  if (items.length === 0) return <div className="req-tag-mini">Chưa chọn mẫu</div>;
                  return items.map((item, idx) => {
                    const info = getAssetInfo(item.id, item.cat);
                    return (
                      <div key={idx} className="req-asset-preview" title={info?.name || item.id}>
                        <div className="req-asset-thumb"><img src={info?.url} alt={info?.name} /></div>
                        <div className="req-asset-info"><div className="req-asset-name">{info?.name || item.id}</div></div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="req-block">
              <label>Ghi chú ý tưởng:</label>
              <div className="req-note-box">{selectedProject.note || 'Không có ghi chú thêm.'}</div>
            </div>
          </div>

          {designerVideoReferences.length > 0 && (
            <div className="designer-video-list">
              <h3>VIDEO THAM KHẢO</h3>
              {designerVideoReferences.map((video, index) => (
                <button key={`${video}-${index}`} type="button" className="designer-video-item" onClick={() => window.open(video, '_blank', 'noopener,noreferrer')}>
                  <ExternalLink size={16} /> Mở video tham khảo {index + 1}
                </button>
              ))}
            </div>
          )}

          <div className="designer-status-box"><Monitor size={16} /><span>{designerStatus}</span></div>
          <div className="designer-tips"><Info size={16} /><p>Ảnh khách đã được nạp tự động. Kéo ảnh từ thư viện vào khung làm việc hoặc bấm Nạp nhanh để mở thêm tài nguyên.</p></div>
        </div>

        <div className="designer-main">
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <iframe ref={designerFrameRef} src={getDesignerUrl()} className="photopea-iframe" title="Photoshop Online"
              onLoad={() => {
                if (!selectedProject.rawImage.startsWith('data:')) return;
                window.setTimeout(() => { void loadRawImageIntoDesigner(selectedProject); }, 1800);
              }}
            />
            {isDraggingToDesigner && (
              <div className="designer-drag-overlay" onDragOver={e => e.preventDefault()} onDrop={handleDesignerDrop} onDragLeave={() => setIsDraggingToDesigner(false)}>
                <div className="overlay-message">Thả vào đây để nạp tài nguyên</div>
              </div>
            )}
          </div>

          <motion.div drag dragMomentum={false} className="designer-resource-panel glass-panel" style={{ x: 0, y: 0 }}>
            <div className="designer-resource-header">
              <div><h4>Thư viện tài nguyên (Có thể di chuyển)</h4><p>Kéo thả ảnh hoặc bấm nạp nhanh.</p></div>
              <div className={`designer-ready-pill ${designerReady ? 'ready' : ''}`}>{designerReady ? 'Sẵn sàng' : 'Đang tải'}</div>
            </div>
            <div className="designer-resource-tabs">
              <button type="button" className={designerTab === 'customer' ? 'active' : ''} onClick={() => setDesignerTab('customer')}>Khách hàng</button>
              <button type="button" className={designerTab === 'system' ? 'active' : ''} onClick={() => setDesignerTab('system')}>Tài nguyên hệ thống</button>
            </div>
            <div className="designer-library-grid">
              {visibleDesignerLibrary.map(item => (
                <div key={item.id} className="designer-library-card" draggable onDragStart={event => handleDesignerAssetDragStart(event, item)}>
                  <div className="designer-library-thumb"><img src={item.url} alt={item.label} /></div>
                  <div className="designer-library-meta"><strong>{item.label}</strong><span>{item.note || item.group}</span></div>
                  <div className="designer-library-actions">
                    <button type="button" className="btn-link-inline" onClick={() => pushAssetToDesigner(item)}><Upload size={14} /> Nạp nhanh</button>
                    <button type="button" className="btn-link-inline" onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} /> Mở ảnh</button>
                  </div>
                </div>
              ))}
              {visibleDesignerLibrary.length === 0 && (<div className="designer-library-empty">Chưa có ảnh phù hợp trong nhóm tài nguyên này.</div>)}
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // --- RENDER: DEFAULT ADMIN ---
  return (
    <motion.div className="view admin-view">
      <header className="admin-header-premium">
        <div className="admin-nav-row">
          <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Về trang chủ</button>
        </div>
        <div className="admin-title-section">
          <h1>Hệ Thống Quản Lý Dự Án</h1>
          <div className="stats-pill-bar"><span className="count-badge">{projects.length}</span><span>Tệp khách hàng hiện có</span></div>
        </div>
      </header>

      {selectedProject ? (
        <div className="project-detail-premium">
          <div className="detail-header-row">
            <button onClick={() => setSelectedProject(null)} className="btn-back-universal"><ChevronLeft size={18} /> Danh sách dự án</button>
          </div>

          <div className="detail-grid">
            <div className="detail-left">
              <div className="section-card glass-panel">
                <div className="section-header"><User size={18} /> <h3>Thông tin khách hàng</h3></div>
                <div className="info-row"><label>Họ và tên:</label><span className="highlight">{selectedProject.customerName}</span></div>
                <div className="info-row"><label>SĐT / Zalo:</label><span>{selectedProject.customerPhone}</span></div>
                <div className="info-row"><label>Gói dịch vụ:</label><span>{selectedProject.service}</span></div>
              </div>

              <div className="section-card glass-panel image-gallery-card">
                <div className="section-header"><ImageIcon size={18} /> <h3>Ảnh dự án</h3></div>
                <div className="image-gallery-grid">
                  <div className="gallery-item"><label>Ảnh gốc</label><img src={selectedProject.rawImage} alt="Ảnh gốc" /></div>
                  <div className="gallery-item"><label>Ảnh khoanh vùng</label><img src={selectedProject.annotatedImage} alt="Ảnh khoanh vùng" /></div>
                  {(selectedProject.extraAssets || []).filter(a => !isVideoAsset(a)).map((asset, i) => (
                    <div key={i} className="gallery-item"><label>Tham khảo {i + 1}</label><img src={asset} alt={`Extra ${i}`} /></div>
                  ))}
                </div>
                {designerVideoReferences.length > 0 && (
                  <div className="video-refs-bar">
                    {designerVideoReferences.map((video, i) => (
                      <button key={i} className="btn-link-inline" onClick={() => window.open(video, '_blank', 'noopener,noreferrer')}><ExternalLink size={14} /> Video {i + 1}</button>
                    ))}
                  </div>
                )}
                {selectedProject.finalImage && (
                  <div className="final-preview-panel"><label>Bản vẽ hoàn thiện</label><img className="final-preview-image" src={selectedProject.finalImage} alt="Bản vẽ hoàn thiện" /></div>
                )}
              </div>
            </div>

            <div className="requirement-section">
              <div className="section-card glass-panel">
                <div className="section-header"><CheckCircle2 size={18} /> <h3>Phân tích yêu cầu & Mẫu chọn</h3></div>
                <div className="requirement-checklist">
                  <div className="check-item"><label>Gói dịch vụ:</label><span className="val-tag service">{selectedProject.service}</span></div>
                  <div className="check-item"><label>Nhánh xử lý:</label><span className="val-tag workflow">{getWorkflowLabel(selectedProject.workflowBranch)}</span></div>
                  {selectedProject.selections.thac && (<div className="check-item"><label>Thác nước:</label><span className="val-tag">{getAssetName(selectedProject.selections.thac, 'THAC')}</span></div>)}
                  {selectedProject.selections.ke && selectedProject.selections.ke.length > 0 && (<div className="check-item"><label>Kè đá:</label><div className="tags-list">{selectedProject.selections.ke.map(id => (<span key={id} className="val-tag">{getAssetName(id, 'KE')}</span>))}</div></div>)}
                  {selectedProject.selections.canh && selectedProject.selections.canh.length > 0 && (<div className="check-item"><label>Cảnh quan:</label><div className="tags-list">{selectedProject.selections.canh.map(id => (<span key={id} className="val-tag">{getAssetName(id, 'CANH')}</span>))}</div></div>)}
                </div>
                <div className="note-display"><label>Mô tả ý tưởng khách hàng:</label><div className="note-text">{selectedProject.note || 'Không có mô tả chi tiết.'}</div></div>
              </div>

              <div className="section-card glass-panel workflow-section">
                <div className="section-header"><Bot size={18} /> <h3>Nhánh tác vụ xử lý</h3></div>
                <div className="workflow-grid">
                  {workflowOptions.map(option => (
                    <button key={option.id} type="button" className={`workflow-card ${selectedProject.workflowBranch === option.id ? 'active' : ''}`} onClick={() => handleWorkflowSelect(option.id)}>
                      <div className="workflow-card-icon">{option.icon}</div>
                      <div className="workflow-card-content"><strong>{option.title}</strong><span>{option.description}</span></div>
                    </button>
                  ))}
                </div>

                {selectedProject.workflowBranch === 'chatgpt_image' && (
                  <div className="chatgpt-helper-panel" style={{ padding: '1rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', marginTop: '1rem' }}>
                    <p style={{ marginBottom: '1rem', color: '#64748b' }}>Tiến trình xử lý bằng AI được thực hiện độc lập tại <strong>Trạm AI (AI Studio)</strong>.</p>
                    <button className="btn-primary" onClick={() => setShowAIStudio(true)} style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bot size={18} /> Mở Trạm AI (để xem Master Prompt)
                    </button>
                  </div>
                )}
              </div>

              <div className="section-card glass-panel actions-panel">
                <div className="section-header"><Send size={18} /> <h3>Xử lý & Phản hồi</h3></div>
                <div className="action-buttons">
                  <button className="btn-secondary" onClick={() => handleWorkflowSelect('manual_design')}>Mở trình thiết kế</button>
                  <button className="btn-primary-admin" onClick={() => fileRef.current?.click()}>{selectedProject.status === 'done' ? 'Cập nhật bản vẽ' : 'Tải lên Design Hoàn thiện'}</button>
                  <input type="file" accept="image/*" ref={fileRef} onChange={handleUploadResult} hidden />
                  {selectedProject.status === 'done' && (
                    <button className="btn-zalo-admin" onClick={() => window.open(`https://zalo.me/${selectedProject.customerPhone.replace(/\D/g, '')}`, '_blank', 'noopener,noreferrer')}>Gửi Zalo cho khách hàng</button>
                  )}
                </div>
                {actionFeedback && <div className="action-feedback">{actionFeedback}</div>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="project-list-premium">
          {Object.keys(grouped).length === 0 ? (
            <div className="empty-state glass-panel"><FolderOpen size={64} /><p>Chưa có dữ liệu nào được gửi về hệ thống.</p></div>
          ) : (
            Object.keys(grouped).map(dateGroup => (
              <div key={dateGroup} className="folder-date-section">
                <div className="date-badge"><Folder size={16} /> {dateGroup}</div>
                <div className="customer-cards-grid">
                  {grouped[dateGroup].map(project => (
                    <button key={project.id} type="button" className={`management-card ${project.status}`} onClick={() => setSelectedProject(project)}>
                      <div className="card-header">
                        <span className="time">{new Date(project.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        <div className={`status-indicator ${project.status}`}></div>
                      </div>
                      <div className="card-main">
                        <div className="customer-name">{project.customerName}</div>
                        <div className="customer-phone">{project.customerPhone}</div>
                      </div>
                      <div className="card-meta-row">
                        <div className="service-name">{project.service}</div>
                        <div className={`workflow-mini-tag ${project.workflowBranch || 'empty'}`}>{getWorkflowShortLabel(project.workflowBranch)}</div>
                      </div>
                      <div className="card-footer"><span>{getStatusLabel(project.status)}</span><ChevronRight size={18} /></div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </motion.div>
  );
}
