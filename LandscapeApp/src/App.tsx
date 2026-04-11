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
  Camera,
  Layers,
  Palette,
  X,
  ShieldCheck,
  Phone,
  FolderOpen,
  Folder,
  Copy,
  ExternalLink,
  Bot,
  Monitor,
  Info,
  HelpCircle
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
  { color: 'Đỏ', hex: '#ef4444', meaning: 'Vùng thác nước', instruction: 'Vị trí điểm nhấn thác nước chính.' },
  { color: 'Xanh dương', hex: '#3b82f6', meaning: 'Vùng hồ nước', instruction: 'Vùng nước chính của công trình.' },
  { color: 'Hầm lọc', hex: '#eab308', meaning: 'Vùng hầm lọc', instruction: 'Khu vực hệ thống xử lý nước.' },
  { color: 'Tím', hex: '#a855f7', meaning: 'Vùng kè đá', instruction: 'Dùng để bo viền hồ hoặc xây kè tường.' },
  { color: 'Xanh lá', hex: '#22c55e', meaning: 'Vùng cảnh quan', instruction: 'Bố trí tùng, bụi và thảm cỏ.' },
  { color: 'Trắng', hex: '#ffffff', meaning: 'Vùng sỏi', instruction: 'Rải sỏi và vật liệu trang trí sáng màu.' }
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
    <div className="container">
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
            onAnnotatedChange={setAnnotatedImage}
            note={note}
            onNoteChange={setNote}
            onBack={() => setView('upload')}
            onNext={() => setView('service')}
          />
        )}
        {view === 'service' && (
          <ServiceView
            selections={selections}
            onSelectionsChange={setSelections}
            note={note}
            onNoteChange={setNote}
            extraAssets={extraAssets}
            onExtraAssetsChange={setExtraAssets}
            onBack={() => setView('editor')}
            onNext={() => setView('plan')}
          />
        )}
        {view === 'plan' && (
          <PlanSelectionView
            service={service}
            onServiceChange={setService}
            onBack={() => setView('service')}
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
      onUpload(result); // Go straight to markings
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view upload-view">
      <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={18} /> Quay lại</button>
      <h2>Tải ảnh hiện trạng</h2>
      <p className="hint">Chọn một bức ảnh chụp vị trí mà bạn muốn thiết kế cảnh quan.</p>
      <div className="upload-area" onClick={() => fileRef.current?.click()}>
        {preview ? (
          <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '28px' }} />
        ) : (
          <>
            <div className="upload-circle"><Upload size={40} /></div>
            <span className="hint">Nhấn để chọn ảnh</span>
          </>
        )}
      </div>
      <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} hidden />
      
      {!preview && (
        <div className="tips glass-panel">
          <h3>Mẹo chụp ảnh hiện trạng</h3>
          <ul>
            <li>Chụp bao quát toàn bộ không gian cần thiết kế.</li>
            <li>Đứng ở góc chính diện, tránh chụp quá nghiêng.</li>
            <li>Đảm bảo ảnh rõ nét, không bị rung hay mờ.</li>
            <li>Ưu tiên ánh sáng ban ngày để màu sắc chuẩn nhất.</li>
          </ul>
          <div className="sample-photo-container">
            <p className="sample-label">Góc chụp minh họa chuẩn:</p>
            <div className="sample-photo">
              <img src="/assets/sample_angle.jpg" alt="Minh họa góc chụp chuẩn" />
            </div>
          </div>
        </div>
      )}

      {preview && (
        <button className="btn-primary main-cta" onClick={() => onUpload(preview)} style={{ marginTop: '20px' }}>
          Dùng ảnh này để thiết kế <ArrowRight size={20} />
        </button>
      )}
    </motion.div>
  );
}

function EditorView({
  rawImage, onAnnotatedChange, note, onNoteChange, onBack, onNext
}: {
  rawImage: string;
  onAnnotatedChange: (img: string) => void;
  note: string;
  onNoteChange: (n: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [brushSize, setBrushSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [showSample, setShowSample] = useState(false);
  const [hasSeenSample, setHasSeenSample] = useState(false);

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
      <div className="editor-top">
        <button onClick={onBack} className="btn-back-editor"><ChevronLeft size={18} /> Quay lại</button>
        <button onClick={saveAndNext} className="btn-done">Xong ✓</button>
      </div>
      <div className="workspace">
        <canvas ref={canvasRef} onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; const mouseEvent = new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }); canvasRef.current?.dispatchEvent(mouseEvent); }}
          onTouchMove={e => { e.preventDefault(); const t = e.touches[0]; const mouseEvent = new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }); canvasRef.current?.dispatchEvent(mouseEvent); }}
          onTouchEnd={e => { e.preventDefault(); canvasRef.current?.dispatchEvent(new MouseEvent('mouseup')); }}
        />
      </div>
      <div className="brush-controls-container">
        <div className="editor-header-row">
          <div className="editor-title">Khoanh vùng công năng</div>
          <button 
            className={`btn-help-modal ${!hasSeenSample ? 'pulse-btn' : ''}`} 
            onClick={() => { setShowSample(true); setHasSeenSample(true); }}
          >
            <HelpCircle size={20} /> Cách khoanh vùng mẫu
          </button>
        </div>
        <div className="colors">
          {colors.map(c => (
            <button 
              key={c.hex} 
              className={`color-item ${color === c.hex ? 'active' : ''}`} 
              onClick={() => setColor(c.hex)}
            >
              <span className="color-dot" style={{ backgroundColor: c.hex }} />
              <span className="color-label">{c.meaning}</span>
            </button>
          ))}
        </div>
        <div className="brush-info">
          <div className="brush-tools">
            <button onClick={undo} className="btn-tool" disabled={history.length <= 1}><Undo2 size={18} /> Hoàn tác</button>
            <button onClick={clearAll} className="btn-tool"><Trash2 size={18} /> Xóa hết</button>
          </div>
          <div className="customer-request-area">
            <label>Mô tả chi tiết (Nếu có)</label>
            <textarea 
              placeholder="Anh chị hãy mô tả thêm chi tiết khác nếu có ví dụ như thác cao bao nhiêu kích thước công trình..."
              value={note}
              onChange={e => onNoteChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSample && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="sample-marking-modal-overlay"
            onClick={() => setShowSample(false)}
          >
            <div className="sample-marking-minimal-container" onClick={e => e.stopPropagation()}>
              <button className="btn-close-modal-large" onClick={() => setShowSample(false)}>
                <X size={40} />
              </button>
              <div className="modal-header-premium">Hướng dẫn khoanh vùng chuẩn</div>
              <img src="/assets/sample_marking.jpg" alt="Hướng dẫn khoanh vùng" className="sample-img-full" />
              <div className="modal-legend-mini-premium">
                <div className="legend-row">
                  <div className="legend-item"><span className="dot" style={{ background: '#ef4444' }}/> Thác nước (Đỏ)</div>
                  <div className="legend-item"><span className="dot" style={{ background: '#3b82f6' }}/> Hồ cá (Xanh dương)</div>
                </div>
                <div className="legend-row">
                  <div className="legend-item"><span className="dot" style={{ background: '#a855f7' }}/> Kè đá (Tím)</div>
                  <div className="legend-item"><span className="dot" style={{ background: '#22c55e' }}/> Cây xanh (Xanh lá)</div>
                </div>
                <div className="legend-row">
                  <div className="legend-item"><span className="dot" style={{ background: '#eab308' }}/> Hầm lọc (Vàng)</div>
                  <div className="legend-item"><span className="dot" style={{ background: '#ffffff' }}/> Vùng sỏi (Trắng)</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ServiceView({
  selections, onSelectionsChange, note, onNoteChange, extraAssets, onExtraAssetsChange, onBack, onNext
}: {
  selections: Selection;
  onSelectionsChange: (s: Selection) => void;
  note: string;
  onNoteChange: (n: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

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

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        onExtraAssetsChange([...extraAssets, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view service-view">
      <header className="service-header-main">
        <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={20} /> Quay lại</button>
        <div className="title-group">
          <h2>Chọn Mẫu Thiết Kế</h2>
          <p>Tùy chỉnh phong cách đá và các hạng mục trang trí cho công trình của bạn.</p>
        </div>
      </header>

      <div className="selection-panel">
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>1. Chọn Kiểu Thác Nước</h4>
          </div>
          <div className="category-grid">
            {ASSETS.THAC.map(cat => (
              <button 
                key={cat.id} 
                className={`category-card ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              >
                <div className="cat-img"><img src={cat.url} alt={cat.name} /></div>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {activeCategory && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="variant-reveal"
              >
                <div className="variant-grid">
                  {ASSETS.THAC.find(c => c.id === activeCategory)?.variants?.map(v => (
                    <button 
                      key={v.id} 
                      className={`variant-card-mini ${selections.thac === v.id ? 'selected' : ''}`}
                      onClick={() => handleThacSelect(v.id)}
                    >
                      <img src={v.url} alt={v.name} />
                      <div className="variant-label">{v.name}</div>
                      {selections.thac === v.id && <div className="check-mark"><CheckCircle2 size={16} /></div>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="asset-group">
          <div className="asset-group-header">
            <h4>Mẫu Kè Đá</h4>
          </div>
          <div className="checkbox-list">
            {ASSETS.KE.map(item => (
              <label key={item.id} className={`checkbox-item ${(selections.ke || []).includes(item.id) ? 'active' : ''}`}>
                <div className="check-box" onClick={() => toggleKe(item.id)}>
                  {(selections.ke || []).includes(item.id) && <CheckCircle2 size={16} />}
                </div>
                <span onClick={() => toggleKe(item.id)}>{item.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="asset-group">
          <div className="asset-group-header">
            <h4>Tiểu Cảnh & Cây Xanh</h4>
          </div>
          <div className="checkbox-list">
            {ASSETS.CANH.map(item => (
              <label key={item.id} className={`checkbox-item ${(selections.canh || []).includes(item.id) ? 'active' : ''}`}>
                <div className="check-box" onClick={() => toggleCanh(item.id)}>
                  {(selections.canh || []).includes(item.id) && <CheckCircle2 size={16} />}
                </div>
                <span onClick={() => toggleCanh(item.id)}>{item.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="asset-group" style={{ marginTop: '20px' }}>
          <div className="asset-group-header">
            <h4>2. Yêu cầu chi tiết khác (Nếu có)</h4>
          </div>
          <div className="customer-request-area-v2">
            <textarea 
              placeholder="Ví dụ: Tôi muốn thác cao 1.5m, đá bo viền dày, thêm nhiều tùng bonsai..."
              value={note}
              onChange={e => onNoteChange(e.target.value)}
            />
          </div>
        </section>

        <section className="asset-group">
          <div className="asset-group-header">
            <h4>3. Gửi hình ảnh/video hiện trạng liên quan</h4>
            <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>Giúp chúng tôi hiểu rõ hơn về không gian dự án của bạn.</p>
          </div>
          <div className="media-upload-center" onClick={() => mediaRef.current?.click()}>
            <input type="file" multiple accept="image/*,video/*" ref={mediaRef} onChange={handleMediaUpload} hidden />
            <div className="upload-box-mini">
              <Camera size={24} />
              <span>Bấm để tải lên ảnh hoặc video</span>
            </div>
          </div>
          {extraAssets.length > 0 && (
            <div className="media-preview-row">
              {extraAssets.map((asset, idx) => (
                <div key={idx} className="media-preview-item">
                  <img src={asset} alt="extra" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <button className="btn-primary main-cta" onClick={onNext} style={{ marginTop: '20px' }}>
        Tiếp tục chọn gói dịch vụ <ArrowRight size={20} />
      </button>
    </motion.div>
  );
}

function PlanSelectionView({ service, onServiceChange, onBack, onNext }: {
  service: string;
  onServiceChange: (s: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const services = [
    { id: 'basic', name: 'Gói Cơ Bản', desc: 'Phác thảo nhanh ý tưởng cơ bản', price: 'Miễn phí', icon: <ImageIcon size={32} />, color: '#94a3b8' },
    { id: 'pro', name: 'Gói Chuyên Nghiệp', desc: 'Bản vẽ chi tiết, đầy đủ vật liệu', price: '290.000đ', icon: <Palette size={32} />, color: '#e2b170' },
    { id: 'premium', name: 'Gói Premium', desc: 'Bản vẽ Pro kèm Video 3D mô phỏng', price: '590.000đ', icon: <Camera size={32} />, color: '#a855f7' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view plan-view">
      <header className="service-header-main">
        <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={20} /> Quay lại</button>
        <div className="title-group">
          <h2>Chọn Gói Giải Pháp</h2>
          <p>Lựa chọn gói thiết kế phù hợp để hiện thực hóa ý tưởng của bạn.</p>
        </div>
      </header>

      <div className="service-list-premium">
        {services.map(s => (
          <button
            key={s.id}
            className={`service-card-premium ${service === s.name ? 'active' : ''}`}
            onClick={() => onServiceChange(s.name)}
            style={{ border: service === s.name ? `2.5px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="card-inner-premium">
              <div className="service-icon-box-premium" style={{ background: s.color }}>{s.icon}</div>
              <div className="service-content-premium">
                <div className="service-title-row-premium">
                  <h3>{s.name}</h3>
                  {s.id === 'pro' && <div className="service-badge-premium" style={{ color: s.color }}>Phổ biến</div>}
                </div>
                <p className="service-description-premium">{s.desc}</p>
                <div className="service-footer-row-premium">
                  <div className="price-label-premium">Giá chỉ từ: <span className="highlight-price-premium">{s.price}</span></div>
                  <div className="arrow-icon-premium"><ChevronRight size={24} /></div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <button className="btn-primary main-cta" onClick={onNext} disabled={!service} style={{ marginTop: '30px' }}>
        Xác nhận thông tin <ArrowRight size={20} />
      </button>
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
      <header className="service-header-main">
        <button onClick={onBack} className="btn-back-universal"><ChevronLeft size={20} /> Quay lại</button>
        <div className="title-group">
          <h2>Xác Nhận<br/>& Gửi Thông Tin</h2>
          <p>Dữ liệu phác thảo sẽ được chuyển đến đội ngũ chuyên gia Sơn Hải để báo giá chính xác.</p>
        </div>
      </header>

      <div className="form">
        <div className="input-group">
          <label><User size={16} /> Họ và tên khách hàng</label>
          <input type="text" value={customerName} onChange={e => onNameChange(e.target.value)} placeholder="Nhập tên của bạn..." />
        </div>
        <div className="input-group">
          <label><Phone size={16} /> Số điện thoại / Zalo</label>
          <input type="tel" value={customerPhone} onChange={e => onPhoneChange(e.target.value)} placeholder="Chúng tôi sẽ gửi bản vẽ qua số này..." />
        </div>

        <div className="preview-row" style={{ marginTop: '20px' }}>
          <div className="preview-card">
            <label>Hiện trạng gốc</label>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', height: '140px' }}>
              <img src={rawImage} alt="Raw" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
          <div className="preview-card">
            <label>Vùng phác thảo</label>
            <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--accent)', height: '140px' }}>
              <img src={annotatedImage} alt="Annotated" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          </div>
        </div>

        <div className="extra-assets-area">
          <h4>Ảnh & Video hiện trạng khác</h4>
          <p className="sub-hint">Giúp kỹ sư hiểu rõ hơn về góc nhìn xung quanh (không bắt buộc).</p>
          <div className="assets-uploader" onClick={() => extraRef.current?.click()}>
            <Upload size={32} color="var(--accent)" />
            <span>Tải thêm ảnh/video</span>
          </div>
          <input type="file" accept="image/*,video/*" multiple ref={extraRef} onChange={handleExtraFiles} hidden />
          
          {extraAssets.length > 0 && (
            <div className="assets-preview-grid">
              {extraAssets.map((asset, i) => (
                <div key={i} className="asset-preview-item">
                  <img src={asset} alt={`Extra ${i}`} />
                  <button className="btn-remove-asset" onClick={(e) => { e.stopPropagation(); onExtraAssetsChange(extraAssets.filter((_, idx) => idx !== i)); }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="btn-primary main-cta" onClick={onSubmit} disabled={!customerName || !customerPhone || isSubmitting}>
        {isSubmitting ? 'Đang gửi thông tin...' : 'Gửi yêu cầu phác thảo'} <Send size={20} style={{ marginLeft: '12px' }} />
      </button>
    </motion.div>
  );
}

function SuccessView({ onReset }: { onReset: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view">
      <div className="success-icon"><CheckCircle2 size={100} /></div>
      <h2 style={{ fontSize: '2.5rem', fontWeight: 950 }}>Gửi Thành Công!</h2>
      <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', lineHeight: '1.6', maxWidth: '90%' }}>
        Cảm ơn bạn đã tin tưởng Sơn Hải. Đội ngũ thiết kế sẽ xử lý phác thảo và liên hệ lại với bạn trong thời gian sớm nhất.
      </p>
      <button className="btn-primary main-cta" onClick={onReset} style={{ marginTop: '20px' }}>
        Quay lại Trang Chủ
      </button>
    </motion.div>
  );
}

// --- ADMIN VIEW ---
function AdminView({
  projects, onBack, onUpdateProject, onGenerateAiImage
}: {
  projects: Project[];
  onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
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
      if (item.id === id) return { name: item.name, url: 'url' in item ? item.url : '' };
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

  const pushAssetToDesigner = async (item: DesignerLibraryItem) => {
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

  const handleDesignerAssetDragStart = (_event: React.DragEvent, item: DesignerLibraryItem) => {
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="studio-container-premium">
        <aside className="studio-sidebar-premium">
          <button onClick={() => setShowAIStudio(false)} className="btn-exit-studio"><ChevronLeft size={20} /> Thoát Trạm AI</button>
          
          <div className="studio-req-section">
            <h4 className="section-title">THÔNG TIN DỰ ÁN</h4>
            <div className="req-summary-card">
              <div className="summary-info"><label>Khách hàng:</label><span>{selectedProject.customerName}</span></div>
              <div className="summary-info"><label>Dịch vụ:</label><span className="service-highlight">{selectedProject.service}</span></div>
              <div className="tech-tags">
                <div className="tech-tag-item">AI Render</div>
                <div className="tech-tag-item">4K Upscale</div>
              </div>
            </div>
          </div>

          <div className="studio-req-section">
            <h4 className="section-title">LỰA CHỌN MẪU</h4>
            <div className="req-summary-card">
              <div className="summary-info">
                 <label>Danh sách mẫu đã chọn:</label>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {buildSelectionLines(selectedProject).map((line, i) => (
                      <div key={i} style={{ fontSize: '0.9rem', color: '#bababa' }}>{line}</div>
                    ))}
                 </div>
              </div>
            </div>
          </div>

          <div className="studio-req-section">
            <h4 className="section-title">YÊU CẦU RIÊNG</h4>
            <div className="note-summary-box">{selectedProject.note || 'Khách hàng không có ghi chú thêm.'}</div>
          </div>

          <div className="studio-automation-box">
             <button className="btn-open-chatgpt" onClick={handleRunChatGptAutomation} disabled={isGeneratingAi}>
               <Bot size={22} /> {isGeneratingAi ? 'Đang gửi Prompt...' : 'Khởi chạy ChatGPT'}
             </button>
             {aiStudioStatus && <div className="studio-status-inline">{aiStudioStatus}</div>}
          </div>
        </aside>

        <main className="studio-main-premium">
          <div className="studio-visual-grid">
            {aiUploadAssets.map((asset, index) => (
              <div key={`${asset.label}-${index}`} className="visual-asset-card">
                <div className="asset-media">
                  {isVideoAsset(asset.url) ? (
                    <video src={asset.url} controls />
                  ) : (
                    <img src={asset.url} alt={asset.label} />
                  )}
                </div>
                <div className="asset-meta">
                  <div>
                    <div className="asset-label">{asset.label}</div>
                    <div className="asset-role">{asset.role}</div>
                  </div>
                  <button className="btn-copy-asset" onClick={() => copyText(toAbsoluteAssetUrl(asset.url), `Đã copy link: ${asset.label}`)}>
                    <Copy size={14} /> Link
                  </button>
                </div>
              </div>
            ))}
          </div>

          <section className="studio-prompt-center">
            <div className="prompt-header-row">
              <div className="prompt-title"><Bot size={24} /> <h3>MASTER GENERATIVE PROMPT</h3></div>
              <button className="btn-copy-all" onClick={() => {
                const fullText = buildChatGptPackageFromPrompt(selectedProject, chatGptPrompt, { absoluteUrls: true });
                copyText(fullText, 'Đã sao chép Master Prompt và toàn bộ link tài nguyên.');
              }}>
                <Copy size={18} /> SAO CHÉP TOÀN BỘ GÓI
              </button>
            </div>
            <div className="prompt-content-view">
              <pre>{chatGptPrompt || 'Đang tổng hợp Prompt...'}</pre>
            </div>
          </section>

          <section className="studio-result-center">
            <div className="prompt-header-row">
              <div className="prompt-title"><ImageIcon size={24} /> <h3>KẾT QUẢ AI DESIGN (DALL-E 3)</h3></div>
            </div>
            {aiResultImages.length === 0 ? (
              <div className="ai-result-empty">
                Chưa có ảnh kết quả. Sau khi ChatGPT tạo xong, hãy tải ảnh lên nhánh "AI Results" của dự án để hiển thị ở đây.
              </div>
            ) : (
              <div className="ai-result-grid">
                {aiResultImages.slice().reverse().map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="ai-result-card">
                    <img src={imageUrl} alt={`AI Generation ${index + 1}`} />
                    <div className="ai-result-actions">
                      <button className="btn-link-inline" onClick={() => window.open(imageUrl, '_blank')}><ExternalLink size={16} /> Xem ảnh</button>
                      <button className="btn-link-inline" onClick={() => copyText(imageUrl, 'Đã copy link ảnh AI.')}><Copy size={16} /> Link</button>
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
      <div className="admin-content">
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
                  <div className="media-comparison">
                    <div className="image-item"><label>Ảnh gốc</label><img src={selectedProject.rawImage} alt="Ảnh gốc" /></div>
                    <div className="image-item"><label>Ảnh khoanh vùng</label><img src={selectedProject.annotatedImage} alt="Ảnh khoanh vùng" /></div>
                    {(selectedProject.extraAssets || []).filter(a => !isVideoAsset(a)).map((asset, i) => (
                      <div key={i} className="image-item"><label>Tham khảo {i + 1}</label><img src={asset} alt={`Extra ${i}`} /></div>
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
                    <div className="check-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px', marginTop: '10px' }}>
                      <label>Mẫu thiết kế đã chọn:</label>
                      <div className="req-tags-visual">
                        {selectedProject.selections.thac && (
                           <div className="req-asset-preview">
                              <div className="req-asset-thumb"><img src={getAssetInfo(selectedProject.selections.thac, 'THAC')?.url} alt="" /></div>
                              <div className="req-asset-info"><div className="req-asset-name">{getAssetName(selectedProject.selections.thac, 'THAC')}</div></div>
                           </div>
                        )}
                        {(selectedProject.selections.ke || []).map(id => (
                          <div key={id} className="req-asset-preview">
                            <div className="req-asset-thumb"><img src={getAssetInfo(id, 'KE')?.url} alt="" /></div>
                            <div className="req-asset-info"><div className="req-asset-name">{getAssetName(id, 'KE')}</div></div>
                          </div>
                        ))}
                        {(selectedProject.selections.canh || []).map(id => (
                          <div key={id} className="req-asset-preview">
                            <div className="req-asset-thumb"><img src={getAssetInfo(id, 'CANH')?.url} alt="" /></div>
                            <div className="req-asset-info"><div className="req-asset-name">{getAssetName(id, 'CANH')}</div></div>
                          </div>
                        ))}
                        {!selectedProject.selections.thac && (!selectedProject.selections.ke?.length) && (!selectedProject.selections.canh?.length) && (
                          <span className="val-tag">Chưa chọn mẫu</span>
                        )}
                      </div>
                    </div>
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
      </div>
    </motion.div>
  );
}
