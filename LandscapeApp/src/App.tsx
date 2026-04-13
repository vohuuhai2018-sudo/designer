import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Paintbrush, 
  Image as ImageIcon, 
  CheckCircle2, 
  RefreshCcw,
  ArrowRight, 
  User, 
  Send, 
  Undo2, 
  Trash2,
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
  HelpCircle,
  Mail,
  AlertTriangle,
  MessageCircle,
  Zap,
  Sparkles,
  Video as VideoIcon,
  Crown,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './App.css';

// --- API BASE ---
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- API HELPER ---
// Tự động thêm header ngrok-skip-browser-warning để bỏ qua trang cảnh báo ngrok free tier
function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(options?.headers || {}),
    },
  });
}

// --- TYPES ---
type AppView = 'welcome' | 'upload' | 'editor' | 'service' | 'plan' | 'submit' | 'success' | 'admin';
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
  customerEmail?: string;
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

type ProjectUpdate = Partial<Pick<Project, 'status' | 'workflowBranch' | 'finalImage' | 'aiResults'>>;

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
      url: '/assets/THAC/Da Co Thach/cothach_v7.png',
      name: 'Đá Cổ Thạch',
      variants: Array.from({ length: 13 }, (_, i) => ({
        id: 'thac_cothach_v' + (i + 1),
        url: '/assets/THAC/Da Co Thach/cothach_v' + (i + 1) + '.png',
        name: 'Mẫu Cổ Thạch ' + String(i + 1).padStart(2, '0')
      }))
    },
    {
      id: 'thac_vanmay',
      url: '/assets/THAC/Da Van May/vanmay_v3.png',
      name: 'Đá Vân Mây',
      variants: Array.from({ length: 7 }, (_, i) => ({
        id: 'thac_vanmay_v' + (i + 1),
        url: '/assets/THAC/Da Van May/vanmay_v' + (i + 1) + '.png',
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
  const [customerEmail, setCustomerEmail] = useState('');
  const [extraAssets, setExtraAssets] = useState<string[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [viewNotification, setViewNotification] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedProjectId, setSubmittedProjectId] = useState<string>('');

  // Load projects when entering admin view
  useEffect(() => {
    if (view === 'admin') {
      setIsLoadingProjects(true);
      apiFetch('/api/projects')
        .then(res => res.json())
        .then(data => {
          setProjects(data);
          setIsLoadingProjects(false);
        })
        .catch(err => {
          console.error('Failed to load projects:', err);
          setIsLoadingProjects(false);
        });
    }
  }, [view]);

  // Auto-poll mỗi 10s khi có project đang processing
  useEffect(() => {
    if (view !== 'admin') return;
    const hasProcessing = projects.some(p => p.status === 'processing');
    if (!hasProcessing) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/projects');
        const data = await res.json();
        setProjects(data);
        const stillProcessing = data.some((p: Project) => p.status === 'processing');
        if (!stillProcessing) clearInterval(pollInterval);
      } catch (e) { /* bỏ qua lỗi mạng */ }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [view, projects]);


  const compressImage = (base64Str: string, maxWidth = 1200): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleUpload = async (img: string) => {
    const compressed = await compressImage(img);
    setRawImage(compressed);
    setAnnotatedImage(compressed);
    setView('editor');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Final compression of annotated image if needed
    
    const selectedThacVariant = selections.thac 
      ? ASSETS.THAC.flatMap(c => c.variants || []).find(v => v.id === selections.thac)
      : null;

    const projectData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      customerName,
      customerPhone,
      customerEmail,
      rawImage,
      annotatedImage,
      selections: {
        ...selections,
        thacUrl: selectedThacVariant?.url,
        thacName: selectedThacVariant?.name
      },
      service,
      note,
      extraAssets,
      status: 'pending' as const
    };

    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) throw new Error('Lỗi khi gửi dữ liệu.');
      
      setSubmittedProjectId(projectData.id);
      if (service !== 'Gói Cơ Bản') confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } });
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
    setCustomerEmail('');
    setService('');
    setNote('');
    setExtraAssets([]);
    setSubmittedProjectId('');
    setView('welcome');
  };

  const canGoNext = () => {
    switch (view) {
      case 'upload': return !!rawImage;
      case 'editor': return historySize > 1 || note.trim().length > 0;
      case 'service': return !!selections.thac;
      case 'plan': return !!service;
      case 'submit': return !!customerName && !!customerPhone;
      default: return true;
    }
  };

  const handleGlobalNext = () => {
    if (!canGoNext()) {
      if (view === 'editor') setViewNotification("Anh/Chị vui lòng hãy thực hiện thao tác khoanh vùng trên ảnh hoặc viết mô tả ý tưởng chi tiết nhé!");
      if (view === 'service') setViewNotification("Anh/Chị vui lòng hãy chọn một mẫu thiết kế mà mình ưng ý nhất nhé!");
      return;
    }
    if (view === 'plan') setView('upload');
    else if (view === 'upload') setView('editor');
    else if (view === 'editor') setView('service');
    else if (view === 'service') setView('submit');
    else if (view === 'submit') handleSubmit();
  };

  const handleGlobalBack = () => {
    if (view === 'plan') setView('welcome');
    else if (view === 'upload') setView('plan');
    else if (view === 'editor') setView('upload');
    else if (view === 'service') setView('editor');
    else if (view === 'submit') setView('service');
  };

  const showGlobalNav = ['upload', 'editor', 'service', 'plan', 'submit'].includes(view);

  return (
    <>
      {showGlobalNav && (
        <div className="global-nav-premium">
          <div className="nav-inner-luxe">
            <button onClick={handleGlobalBack} className="btn-nav-glass">
              <ChevronLeft size={20} /> Quay lại
            </button>
            <button 
              onClick={handleGlobalNext} 
              className={`btn-nav-glass next-accent ${canGoNext() ? 'ready' : 'locked'}`}
            >
              Tiếp theo <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
      
      {viewNotification && (
        <div className="notification-overlay" onClick={() => setViewNotification(null)}>
           <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="notification-modal">
             <AlertTriangle size={48} color="var(--accent)" />
             <p>{viewNotification}</p>
             <button onClick={() => setViewNotification(null)}>Đã hiểu</button>
           </motion.div>
        </div>
      )}

      <div className="container">
        <AnimatePresence mode="wait">
        {view === 'welcome' && (
          <WelcomeView onStart={() => setView('plan')} onAdmin={() => setView('admin')} />
        )}
        {view === 'upload' && (
          <UploadView 
            rawImage={rawImage}
            onUpload={handleUpload} 
            extraAssets={extraAssets}
            onExtraAssetsChange={setExtraAssets}
          />
        )}
        {view === 'editor' && (
          <EditorView
            rawImage={rawImage}
            annotatedImage={annotatedImage}
            onAnnotatedChange={setAnnotatedImage}
            note={note}
            onNoteChange={setNote}
            setHistorySize={setHistorySize}
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
          />
        )}
        {view === 'plan' && (
          <PlanSelectionView 
            service={service} 
            onServiceChange={(s) => {
              setService(s);
              setView('upload'); // Jump immediately
            }} 
          />
        )}
        {view === 'submit' && (
          <SubmitView
            customerName={customerName}
            onNameChange={setCustomerName}
            customerPhone={customerPhone}
            onPhoneChange={setCustomerPhone}
            customerEmail={customerEmail}
            onEmailChange={setCustomerEmail}
            rawImage={rawImage}
            annotatedImage={annotatedImage}
            extraAssets={extraAssets}
            onExtraAssetsChange={setExtraAssets}
          />
        )}
        {view === 'success' && (
          <SuccessView projectId={submittedProjectId} service={service} onReset={resetAll} />
        )}
        {view === 'admin' && (
          <AdminView
            projects={projects}
            isLoading={isLoadingProjects}
            onBack={resetAll}
            onUpdateProject={async (id, updates) => {
              const response = await apiFetch(`/api/projects/${id}`, {
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
              const response = await apiFetch(`/api/projects/${id}/chatgpt-generate`, {
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
    </>
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

function UploadView({ 
  rawImage, onUpload, extraAssets, onExtraAssetsChange 
}: { 
  rawImage: string; 
  onUpload: (img: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(rawImage || '');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      onUpload(result);
    };
    reader.readAsDataURL(file);
  };

  const handleMultiFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      onExtraAssetsChange([...extraAssets, ...results]);
    });
    e.target.value = '';
  };

  const removeExtraAsset = (index: number) => {
    onExtraAssetsChange(extraAssets.filter((_, i) => i !== index));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view upload-view nav-offset">
      <h2 style={{marginTop: '2rem'}}>Tải ảnh hiện trạng công trình</h2>
      <div className="upload-area" onClick={() => fileRef.current?.click()} style={{ border: preview ? 'none' : '3px dashed rgba(226,177,112,0.4)', borderRadius: '28px', background: '#0f172a' }}>
        {preview ? (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '28px' }} />
            <div className="tag-overlay-premium">ẢNH CHÍNH</div>
          </div>
        ) : (
          <>
            <div className="upload-circle"><Camera size={60} /></div>
            <span className="upload-prompt" style={{ fontWeight: 800 }}>NHẤN ĐỂ CHỌN ẢNH CHÍNH</span>
          </>
        )}
      </div>

      <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} hidden />
      
      {!preview && (
        <div className="upload-guide-side">
          <div className="guide-content-left">
            <div className="guide-header-side">
              <Zap size={20} color="var(--accent)" />
              <span>MẸO CHỤP ẢNH</span>
            </div>
            <ul className="guide-list-side">
              <li>Bao quát toàn bộ không gian.</li>
              <li>Đứng chính diện, tránh nghiêng.</li>
              <li>Ảnh rõ nét, không rung mờ.</li>
            </ul>
          </div>
          <div className="guide-visual-right">
            <img src="/assets/sample_angle.jpg" alt="Guide" />
          </div>
        </div>
      )}

      {/* NEW SECTION FOR ADDITIONAL ASSETS */}
      <div className="extra-assets-section-premium">
        <div className="extra-header-premium">
          <div className="extra-title-group">
            <Layers size={26} color="var(--accent)" />
            <h3>Hình ảnh, video và tài liệu liên quan</h3>
          </div>
          <p className="extra-desc-premium">
            Gửi thêm để KTS hiểu ý bạn hơn: các góc chụp khác, video quay dự án, ảnh phác thảo tay, 
            ảnh mẫu bạn yêu thích, video bạn mô tả yêu cầu trên giấy...
          </p>
        </div>

        <div className="multi-upload-trigger" onClick={() => multiFileRef.current?.click()}>
          <div className="multi-upload-box-premium">
            <div className="multi-icon-stack">
              <ImageIcon size={32} />
              <Play size={24} />
              <Folder size={20} />
            </div>
            <span>NHẤN ĐỂ CHỌN NHIỀU TÀI LIỆU CÙNG LÚC</span>
          </div>
        </div>
        <input type="file" multiple accept="image/*,video/*" ref={multiFileRef} onChange={handleMultiFiles} hidden />

        {extraAssets.length > 0 && (
          <div className="extra-preview-grid-premium">
            {extraAssets.map((asset, idx) => (
              <div key={idx} className="extra-preview-item" style={{ width: '100px', height: '100px' }}>
                {asset.startsWith('data:video') ? (
                  <video src={asset} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={asset} alt={`Extra ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <button className="btn-remove-extra" onClick={(e) => { e.stopPropagation(); removeExtraAsset(idx); }}>
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <button className="btn-primary main-cta" onClick={() => onUpload(preview)} style={{ marginTop: '20px' }}>
          Dùng ảnh này để thiết kế <ArrowRight size={20} />
        </button>
      )}
    </motion.div>
  );
}

function EditorView({
  rawImage, annotatedImage, onAnnotatedChange, note, onNoteChange, setHistorySize
}: {
  rawImage: string;
  annotatedImage: string;
  onAnnotatedChange: (img: string) => void;
  note: string;
  onNoteChange: (n: string) => void;
  setHistorySize: (n: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#ef4444');
  const [brushSize] = useState(20);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [showSample, setShowSample] = useState(false);
  const [hasSeenSample, setHasSeenSample] = useState(false);
  const [, setIsDrawn] = useState(false);
  const [showNotification, setShowNotification] = useState<string | null>(null);

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
      // Nếu đã có ảnh hiệu chỉnh trước đó, đánh dấu là đã vẽ để hiện nút Tiếp theo
      if (annotatedImage) {
        setIsDrawn(true);
      }
    };
    // Ưu tiên nạp lại ảnh đã khoanh vùng nếu có
    img.src = annotatedImage || rawImage;
  }, [rawImage, annotatedImage]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDraw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    const newHistory = [...history, ctx.getImageData(0, 0, canvas.width, canvas.height)];
    setHistory(newHistory);
    setHistorySize(newHistory.length);
    setIsDrawn(true);
    onAnnotatedChange(canvas.toDataURL('image/png'));
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setHistorySize(newHistory.length);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
      onAnnotatedChange(canvasRef.current!.toDataURL('image/png'));
    }
  };

  const clearAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || history.length === 0) return;
    ctx.putImageData(history[0], 0, 0);
    setHistory([history[0]]);
    setHistorySize(1);
    setIsDrawn(false);
    onAnnotatedChange(canvas.toDataURL('image/png'));
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view editor-view nav-offset">
      <div className="workspace">
        <canvas 
          ref={canvasRef} 
          onPointerDown={startDraw} 
          onPointerMove={draw} 
          onPointerUp={endDraw} 
          onPointerLeave={endDraw}
          onPointerCancel={endDraw}
          style={{ 
            touchAction: 'none',
            width: '100%',
            height: 'auto',
            display: 'block'
          }}
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

        {showNotification && (
          <div className="notification-overlay" onClick={() => setShowNotification(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              className="notification-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="notif-header">
                <div className="notif-alert-orb"><AlertTriangle size={60} color="var(--accent)" /></div>
                <h3>YÊU CẦU TƯƠNG TÁC</h3>
              </div>
              <p className="notif-body">{showNotification}</p>
              <button className="btn-primary notif-btn" onClick={() => setShowNotification(null)}>
                XÁC NHẬN & QUAY LẠI VẼ
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ServiceView({
  selections, onSelectionsChange, note, onNoteChange, extraAssets, onExtraAssetsChange
}: {
  selections: Selection;
  onSelectionsChange: (s: Selection) => void;
  note: string;
  onNoteChange: (n: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const selectedCategory = ASSETS.THAC.find(cat => 
    cat.variants?.some(v => v.id === selections.thac)
  );

  const handleThacSelect = (variantId: string) => {
    onSelectionsChange({ ...selections, thac: variantId });
    setActiveCategory(null); // Close the "tab"
  };

  const handleResetThac = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionsChange({ ...selections, thac: undefined });
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
    
    const promises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      onExtraAssetsChange([...extraAssets, ...results]);
    });
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view service-view">
      <div className="selection-panel">
        <div className="title-group" style={{textAlign: 'center', marginBottom: '2.5rem', marginTop: '160px'}}>
          <h2 style={{ fontSize: '2.2rem' }}>Chọn Mẫu Thiết Kế</h2>
          <p style={{ fontSize: '1.1rem' }}>Tùy chỉnh phong cách đá và các hạng mục trang trí cho công trình.</p>
        </div>
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>1. Chọn Kiểu Thác Nước</h4>
          </div>

          <AnimatePresence mode="wait">
            {!activeCategory ? (
              <motion.div 
                key="cats"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="category-grid"
              >
                {ASSETS.THAC.map(cat => {
                  const isSelectedCat = selectedCategory?.id === cat.id;
                  const hasSelectionGlobal = !!selections.thac;
                  const isLocked = hasSelectionGlobal && !isSelectedCat;
                  const displayImg = isSelectedCat 
                    ? cat.variants?.find(v => v.id === selections.thac)?.url 
                    : cat.url;

                  return (
                    <button 
                      key={cat.id} 
                      className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`}
                      onClick={() => !isLocked && setActiveCategory(cat.id)}
                      disabled={isLocked}
                    >
                      <div className="cat-img">
                        <img src={displayImg} alt={cat.name} />
                        {isSelectedCat && (
                          <div className="change-badge" onClick={handleResetThac}>
                            <RefreshCcw size={12} /> Thay đổi
                          </div>
                        )}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find(v => v.id === selections.thac)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="vars"
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="variant-selection-inline"
              >
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setActiveCategory(null)}>
                    <ChevronLeft size={16} /> Quay lại chọn kiểu đá
                  </button>
                  <h5>Mẫu {ASSETS.THAC.find(c => c.id === activeCategory)?.name}</h5>
                </div>
                <div className="category-grid">
                  {ASSETS.THAC.find(c => c.id === activeCategory)?.variants?.map(v => (
                    <button 
                      key={v.id} 
                      className={`category-card ${selections.thac === v.id ? 'picked' : ''}`}
                      onClick={() => handleThacSelect(v.id)}
                    >
                      <div className="cat-img">
                        <img src={v.url} alt={v.name} />
                        {selections.thac === v.id && (
                          <div className="check-badge-inline">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                      <span>{v.name}</span>
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
            <h4>2. Mô tả ý tưởng chi tiết (Khuyến nghị)</h4>
          </div>
          <div className="customer-request-area-v2">
            <textarea 
              placeholder="Anh/Chị hãy mô tả càng chi tiết càng tốt để KTS nắm rõ ý tưởng (Ví dụ: Phong cách Nhật hay Hiện đại, thác cao bao nhiêu, đá bo viền dày hay mỏng, muốn trồng bao nhiêu cây tùng...)"
              value={note}
              onChange={e => onNoteChange(e.target.value)}
            />
          </div>
        </section>

        <section className="asset-group">
          <div className="asset-group-header-stacked">
            <h4>3. Gửi hình ảnh/video thực tế</h4>
            <div className="section-hint">
              Hãy đính kèm video/hình ảnh hiện trạng. <strong>Lưu ý:</strong> Anh/Chị hãy viết thêm yêu cầu cụ thể vào ô <strong>Mô tả chi tiết</strong> bên trên để KTS nắm rõ nhất ý tưởng của mình.
            </div>
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
    </motion.div>
  );
}

function PlanSelectionView({ service, onServiceChange }: {
  service: string;
  onServiceChange: (s: string) => void;
}) {
  const [showSamples, setShowSamples] = useState(false);
  const services = [
    { id: 'free', name: 'Gói Miễn phí', desc: 'Giúp bạn phác thảo nhanh ý tưởng', price: 'Miễn phí', icon: <Sparkles size={32} />, color: '#94a3b8' },
    { id: 'basic', name: 'Gói Cơ bản', desc: 'KTS thiết kế cho bạn 1 tấm ảnh đúng yêu cầu', price: '199.000đ', icon: <ImageIcon size={32} />, color: '#e2b170' },
    { id: 'advanced', name: 'Gói Nâng cao', desc: '1 bản vẽ chuẩn và thêm 1 video diễn họa', price: '299.000đ', icon: <VideoIcon size={32} />, color: '#6366f1' },
    { id: 'premium', name: 'Gói Premium', desc: 'KTS thiết kế 3D chuyên sâu cho bạn', price: 'Báo giá Zalo', icon: <Crown size={32} />, color: '#a855f7' }
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view plan-view">
      <h2 style={{textAlign: 'center', marginBottom: '1.5rem', marginTop: '160px', fontSize: '2.2rem'}}>Chọn Gói Giải Pháp</h2>
      <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', fontSize: '1.1rem'}}>Lựa chọn gói thiết kế phù hợp để hiện thực hóa ý tưởng của bạn.</p>

      <div className="service-list-premium">
        {services.map(s => (
          <button
            key={s.id}
            className={`service-card-premium ${service === s.name ? 'active' : ''}`}
            onClick={() => onServiceChange(s.name)}
            style={{ border: service === s.name ? `3.5px solid ${s.color}` : '1.5px solid rgba(255,255,255,0.1)' }}
          >
            <div className="card-inner-premium-v2">
              <div className="service-icon-box-v2" style={{ background: s.color }}>{s.icon}</div>
              <div className="service-info-v2">
                <div className="service-header-v2">
                  <h3 className="service-title-v2">{s.name}</h3>
                  <div className="service-price-v2">{s.price}</div>
                </div>
                <p className="service-desc-v2">{s.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <button 
          className="btn-show-samples"
          onClick={() => setShowSamples(true)}
        >
          <Play size={24} fill="currentColor" />
          XEM KẾT QUẢ MẪU CỦA CÁC GÓI
        </button>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.1rem', fontWeight: 600 }}>* Vui lòng chọn 1 gói bên trên để tiếp tục</span>
      </div>

      {showSamples && (
        <div className="samples-modal-overlay">
          <div className="samples-modal-content">
            <button className="btn-close-samples" onClick={() => setShowSamples(false)}>
              <X size={44} />
            </button>
            <div className="samples-scroll">
              <h2 style={{ color: 'var(--accent)', marginBottom: '1rem', fontSize: '2.4rem', textAlign: 'center' }}>Hành Trình Thiết Kế Mẫu</h2>
              
              <div className="sample-case req-box">
                <div className="case-header" style={{ color: '#fbbf24' }}>YÊU CẦU KHÁCH HÀNG (HIỆN TRẠNG)</div>
                <p className="case-sub" style={{ fontSize: '1.3rem', color: '#fff', fontWeight: 600 }}>
                  "Thiết kế một hồ cá koi thác đá vân mây bên trái có tùng la hán và đèn đá, có hầm lọc tròn và bộ bàn để lên trên đó."
                </p>
                <img src="https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?q=80&w=1200" alt="Hiện trạng" className="sample-img-large" />
              </div>

              <div className="sample-case">
                <div className="case-header">1. GÓI MIỄN PHÍ</div>
                <p className="case-sub">Phác thảo nhanh ý tưởng sơ bộ (1 tấm hình gọn gàng).</p>
                <img src="https://images.unsplash.com/photo-1598902108854-10e335adac99?q=80&w=1200" alt="Miễn phí" className="sample-img-large" />
              </div>

              <div className="sample-case">
                <div className="case-header">2. GÓI CƠ BẢN</div>
                <p className="case-sub">KTS thiết kế 1 bản vẽ 3D chuẩn hóa (1 tấm hình chất lượng cao).</p>
                <img src="https://images.unsplash.com/photo-1516455590571-18256e5bb4ff?q=80&w=1200" alt="Cơ bản" className="sample-img-large" />
              </div>

              <div className="sample-case">
                <div className="case-header">3. GÓI NÂNG CAO</div>
                <p className="case-sub">1 Bản vẽ thiết kế chuẩn + 1 Video diễn họa 3D sống động.</p>
                <img src="https://images.unsplash.com/photo-1613545325278-f24b0cae1224?q=80&w=1200" alt="Nâng cao" className="sample-img-large" />
                <div className="sample-video-placeholder" style={{ marginTop: '20px' }}>
                  <video autoPlay loop muted playsInline className="sample-img-large">
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-residential-house-with-a-pool-and-green-landscaping-12270-large.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>

              <div className="sample-case">
                <div className="case-header">4. GÓI PREMIUM (TRỌN BỘ 3D)</div>
                <p className="case-sub">Thiết kế 3D toàn diện, xuất 6 góc nhìn đẹp nhất + 1 Video 4K diễn họa chi tiết.</p>
                <div className="sample-grid-6">
                  {[...Array(6)].map((_, i) => (
                    <img key={i} src={`https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=${i}`} alt={`Premium ${i}`} className="sample-img-grid" />
                  ))}
                </div>
                <div className="sample-video-placeholder" style={{ marginTop: '20px' }}>
                   <video autoPlay loop muted playsInline className="sample-img-large">
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-with-green-garden-and-pool-21272-large.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function SubmitView({
  customerName, onNameChange, customerPhone, onPhoneChange, customerEmail, onEmailChange, extraAssets, onExtraAssetsChange
}: {
  customerName: string; onNameChange: (n: string) => void;
  customerPhone: string; onPhoneChange: (p: string) => void;
  customerEmail: string; onEmailChange: (e: string) => void;
  rawImage?: string; annotatedImage?: string;
  extraAssets: string[]; onExtraAssetsChange: (a: string[]) => void;
}) {
  const extraRef = useRef<HTMLInputElement>(null);

  const handleExtraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const promises = Array.from(files).map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      onExtraAssetsChange([...extraAssets, ...results]);
    });
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view submit-view">
      <div className="title-group" style={{textAlign: 'center', marginBottom: '2rem', marginTop: '160px'}}>
        <h2 style={{ fontSize: '2.2rem' }}>Thông Tin Liên Hệ</h2>
        <p style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 600, maxWidth: '600px', margin: '0.5rem auto' }}>
          Hệ thống sẽ gửi bản vẽ phác thảo về Zalo và Email của Anh/Chị ngay sau khi hoàn tất.
        </p>
      </div>

      <div className="form" style={{ padding: 0 }}>
        <div className="input-group">
          <label><User size={20} /> Họ và tên khách hàng</label>
          <input 
            type="text" 
            placeholder="Nhập họ tên của Anh/Chị..." 
            value={customerName} 
            onChange={e => onNameChange(e.target.value)} 
          />
        </div>
        
        <div className="input-group">
          <label><Phone size={20} /> Số điện thoại (Zalo)</label>
          <input 
            type="tel" 
            placeholder="Nhập số điện thoại để nhận bản vẽ..." 
            value={customerPhone} 
            onChange={e => onPhoneChange(e.target.value)} 
          />
        </div>

        <div className="input-group">
          <label><Mail size={20} /> Email (Nếu có)</label>
          <input 
            type="email" 
            placeholder="Nhập email để nhận bản vẽ (không bắt buộc)..." 
            value={customerEmail} 
            onChange={e => onEmailChange(e.target.value)} 
          />
        </div>

        <div className="extra-assets-area" style={{ marginTop: '20px' }}>
          <h4>Hình ảnh/Video bổ sung khác</h4>
          <p className="sub-hint">Giúp kỹ sư hiểu rõ hơn về góc nhìn xung quanh (không bắt buộc).</p>
          <div className="upload-area" onClick={() => extraRef.current?.click()}>
            <Upload size={48} color="var(--accent)" />
            <span className="upload-prompt">Tải thêm ảnh/video công trình</span>
            <span className="hint">Kéo thả hoặc bấm để chọn tệp từ thiết bị</span>
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

      <div className="submit-guidance-card">
         <div className="guidance-icon"><Zap size={32} /></div>
         <p>Vui lòng nhấn nút <strong>Tiếp theo</strong> ở phía trên cùng để gửi yêu cầu phác thảo của Anh/Chị về hệ thống.</p>
      </div>
    </motion.div>
  );
}

function SuccessView({ projectId, service, onReset }: { projectId: string; service: string; onReset: () => void }) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!projectId || service !== 'Gói Cơ Bản') return;
    
    const fetchProject = async () => {
      try {
        const res = await apiFetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          setProject(data);
        }
      } catch (e) {
        // ignore
      }
    };
    
    fetchProject();
    const interval = setInterval(fetchProject, 5000);
    return () => clearInterval(interval);
  }, [projectId, service]);

  if (service === 'Gói Cơ Bản') {
    const isDone = project?.status === 'done';
    const images = project?.aiResults || [];
    
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view" style={{ maxWidth: '800px', width: '90%' }}>
         {!isDone ? (
           <>
             <div className="processing-spinner" style={{margin: '2rem auto'}}>
               <RefreshCcw size={64} className="spin" color="var(--accent)" />
             </div>
             <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Hệ thống đang thiết kế...</h2>
             <p className="hint">Máy chủ Sơn Hải đang tự động vẽ các phương án dựa trên ý tưởng của Anh/Chị. Quá trình này có thể mất vài phút. Vui lòng không đóng trang.</p>
             {images.length > 0 && <p style={{color: 'var(--accent)', fontWeight: 'bold', fontSize: '1.2rem'}}>Đã hoàn thiện {images.length}/2 phương án...</p>}
           </>
         ) : (
           <>
             <div className="success-icon"><CheckCircle2 size={64} /></div>
             <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Đã hoàn thành bản vẽ!</h2>
             <p className="hint">Dưới đây là các phương án thiết kế AI đã tự động tổng hợp theo yêu cầu của Anh/Chị.</p>
           </>
         )}
         
         {images.length > 0 && (
           <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem', width: '100%' }}>
             {images.map((url, i) => (
               <div key={i} style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', display: 'flex', justifyContent: 'center' }}>
                 <img src={url} alt={`Phương án ${i+1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                 <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.7)', padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>
                   Phương án {i + 1}
                 </div>
               </div>
             ))}
           </div>
         )}
         
         {isDone && (
           <button className="btn-primary main-cta" onClick={onReset} style={{ marginTop: '3rem' }}>
             Tạo Dự Án Mới
           </button>
         )}
      </motion.div>
    );
  }

  // Hiển thị cho các gói không phải "Gói Cơ Bản"
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view">
      <div className="success-icon"><CheckCircle2 size={100} /></div>
      <h2 style={{ fontSize: '2.5rem', fontWeight: 950 }}>Gửi Thành Công!</h2>
      <p className="hint" style={{ lineHeight: '1.6', maxWidth: '90%' }}>
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
  projects, isLoading, onBack, onUpdateProject, onGenerateAiImage
}: {
  projects: Project[];
  isLoading: boolean;
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
    // Sort projects strictly descending by timestamp first
    const sortedProjects = [...projects].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Get VN time for today and yesterday
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    const opts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Ho_Chi_Minh' };
    const todayVN = today.toLocaleDateString('vi-VN', opts);
    const yesterdayVN = yesterday.toLocaleDateString('vi-VN', opts);

    return sortedProjects.reduce<Record<string, Project[]>>((acc, project) => {
      const pDate = new Date(project.timestamp);
      const pDateVN = pDate.toLocaleDateString('vi-VN', opts);
      
      let dateKey = pDateVN;

      if (pDateVN === todayVN) {
        dateKey = 'Hôm nay';
      } else if (pDateVN === yesterdayVN) {
        dateKey = 'Hôm qua';
      } else {
        // Calculate difference in days using VN time
        const diffTime = new Date(new Date().toLocaleString('en-US', opts)).setHours(0,0,0,0) - new Date(pDate.toLocaleString('en-US', opts)).setHours(0,0,0,0);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7 && diffDays > 1) {
            dateKey = `${diffDays} ngày trước`;
        } else {
            dateKey = `Ngày ${pDateVN}`;
        }
      }

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
      if (project.rawImage.startsWith('data:')) {
        const response = await fetch(project.rawImage);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          if (postBufferToDesigner(buffer)) {
            autoLoadedDesignerProjectRef.current = project.id;
            setDesignerStatus('Đã nạp ảnh hiện trạng vào bàn làm việc.');
          }
        }
      } else {
        const frame = designerFrameRef.current;
        if (!frame?.contentWindow) { setDesignerStatus('Trình thiết kế chưa sẵn sàng.'); return; }
        const absoluteUrl = toAbsoluteAssetUrl(project.rawImage);
        const script = `app.open("${absoluteUrl}", null, true);`;
        frame.contentWindow.postMessage(script, '*');
        autoLoadedDesignerProjectRef.current = project.id;
        setDesignerStatus('Đã nạp ảnh hiện trạng vào bàn làm việc.');
      }
    } catch (e) {
      console.error('Load raw image error:', e);
      setDesignerStatus('Lỗi khi nạp ảnh gốc.');
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
    const assets: AiUploadAsset[] = [
      { label: 'Ảnh hiện trạng gốc', url: project.rawImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
      { label: 'Ảnh khoanh vùng thiết kế', url: project.annotatedImage, role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.' }
    ];

    if (project.selections.thac) {
      const info = getAssetInfo(project.selections.thac, 'THAC');
      if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu thác / vân đá chọn từ thư viện, dùng cho phối cảnh và vật liệu.' });
    }

    return assets;
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
    const hasNote = !!project.note?.trim();
    const hasExtraAssets = (project.extraAssets?.length ?? 0) > 0;

    return [
      'Bạn là chuyên gia concept cảnh quan. Nhiệm vụ của bạn là tạo ra 1 hình ảnh phối cảnh photorealistic bám sát dữ liệu thực tế tôi cung cấp — không sáng tạo tuỳ tiện.',
      '',
      '═══ DỮ LIỆU DỰ ÁN ═══',
      `Khách hàng: ${project.customerName}`,
      `Gói dịch vụ: ${project.service}`,
      '',
      '═══ CÁCH ĐỌC ẢNH KHOANH VÙNG (File 2) ═══',
      'Hãy nhìn trực tiếp vào hình ảnh khoanh vùng thiết kế (File 2) mà tôi đính kèm.',
      '→ Chỉ xử lý đúng những vùng màu bạn thực sự nhìn thấy trong ảnh đó.',
      '→ Mỗi vùng màu tô là một khu vực công năng cần can thiệp. Đặt đúng hạng mục vào đúng vị trí không gian đó.',
      '→ Nếu một loại công năng không có vùng màu tương ứng trong ảnh → TUYỆT ĐỐI không thêm vào.',
      '→ Khu vực không có màu khoanh vùng = giữ nguyên hiện trạng, không thay đổi.',
      '',
      '═══ GỢI Ý CÁCH HIỂU CÁC MÀU PHỔ BIẾN (chỉ dùng nếu màu đó thực sự xuất hiện) ═══',
      '  Đỏ / cam đậm → vị trí thác nước hoặc điểm nhấn nước rơi',
      '  Xanh dương / xanh da trời → vùng hồ nước, mặt nước',
      '  Tím / hoa cà → viền kè đá bao quanh hồ hoặc bồn',
      '  Xanh lá → cây xanh, tùng, cỏ, thảm thực vật',
      '  Vàng / cam nhạt → hầm lọc, kỹ thuật ẩn',
      '  Trắng / xám sáng → sỏi, vật liệu nền trang trí',
      '  Nâu → lối đi, gỗ, hoặc vật liệu chuyển tiếp',
      '',
      '═══ YÊU CẦU VÀ PHONG CÁCH TỪ KHÁCH HÀNG ═══',
      hasNote
        ? `"${project.note!.trim()}"`
        : 'Khách không để lại ghi chú cụ thể. Hãy dựa hoàn toàn vào ảnh khoanh vùng và mẫu đã chọn.',
      '',
      '═══ MẪU PHONG CÁCH ĐÃ CHỌN ═══',
      ...buildSelectionLines(project),
      '',
      ...(hasExtraAssets
        ? [
            '═══ TÀI NGUYÊN THAM KHẢO BỔ SUNG ═══',
            'Khách có gửi thêm hình tham khảo phong cách/vật liệu. Tinh thần của các hình đó đã được tổng hợp trong phần yêu cầu ở trên.',
            'Hãy bám sát yêu cầu văn bản, không phán đoán thêm.',
            '',
          ]
        : []),
      '═══ QUY TẮC TẠO ẢNH BẮT BUỘC ═══',
      '1. Giữ nguyên 100% góc chụp, phối cảnh, tỷ lệ từ ảnh hiện trạng (File 1).',
      '2. Giữ nguyên toàn bộ kiến trúc nhà, tường, cửa, cột, bậc thang — trừ phần nằm trong vùng khoanh màu.',
      '3. Chỉ thêm / thay đổi đúng vị trí không gian đã được đánh dấu màu trong ảnh khoanh vùng.',
      '4. Áp dụng vật liệu và bố cục từ mẫu đã chọn cho đúng hạng mục tương ứng.',
      '5. Không thêm bất kỳ hạng mục nào không có vùng màu trong ảnh khoanh vùng.',
      '6. Kết quả phải tự nhiên, khả thi thi công thực tế, không méo hình, không sai tỷ lệ.',
      '',
      '═══ FILE ĐÍNH KÈM ═══',
      ...buildAiAssetLines(project),
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
             <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
               <strong style={{ color: '#f59e0b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                 <AlertTriangle size={14} /> Khắc phục lỗi tải ảnh ChatGPT:
               </strong>
               <p style={{ color: '#fcd34d', fontSize: '0.8rem', marginTop: '6px', lineHeight: '1.4' }}>
                 Nếu ChatGPT hiển thị báo lỗi màu đỏ <em>"Tối đa 0 lần tải lên..."</em>, nguyên nhân do anh đang dùng nhánh <strong>DALL-E GPT</strong> (Nó không cho phép gửi file).<br/>
                 👉 Hãy mở giao diện ChatGPT, chuyển về <strong>GPT-4o</strong> (mặc định), sau đó tải lại ảnh. GPT-4o sẽ phân tích ảnh và tự động điều khiển DALL-E vẽ kết quả.
               </p>
             </div>
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
            <div className="prompt-header-row" style={{ justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="prompt-title"><ImageIcon size={24} /> <h3>KẾT QUẢ AI DESIGN (DALL-E 3)</h3></div>
              {aiResultImages.length > 0 && (
                 <button 
                    className="btn-luxe-admin outline" 
                    style={{ padding: '6px 12px', fontSize: '13px', background: 'rgba(255, 60, 60, 0.1)', color: '#ff4d4f', border: '1px solid #ff4d4f', height: 'auto' }}
                    onClick={async () => {
                       if (window.confirm("Bạn có chắc muốn xóa TOÀN BỘ ảnh kết quả hiện tại để tạo lứa mới không?")) {
                          const updated = await onUpdateProject(selectedProject.id, { aiResults: [] });
                          setSelectedProject(updated);
                       }
                    }}
                 >
                    <Trash2 size={16} /> Xóa tất cả
                 </button>
              )}
            </div>
            {aiResultImages.length === 0 ? (
              <div className="ai-result-empty">
                Chưa có ảnh kết quả. Sau khi ChatGPT tạo xong, hãy tải ảnh lên nhánh "AI Results" của dự án để hiển thị ở đây.
              </div>
            ) : (
              <div className="ai-result-grid">
                {aiResultImages.slice().reverse().map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="ai-result-card" style={{ position: 'relative' }}>
                    <button 
                       className="ai-result-delete-btn" 
                       title="Xóa ảnh này"
                       style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                       onClick={async () => {
                          const newResults = (selectedProject.aiResults || []).filter((img: string) => img !== imageUrl);
                          try {
                             const updated = await onUpdateProject(selectedProject.id, { aiResults: newResults });
                             setSelectedProject(updated);
                          } catch {
                             setActionFeedback("Lỗi khi xóa ảnh.");
                          }
                       }}
                    >
                       <X size={14} />
                    </button>
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
            <button onClick={onBack} className="btn-back-premium"><ChevronLeft size={18} /> Về trang chủ</button>
          </div>
          <div className="admin-title-section">
            <h1>Hệ Thống Quản Lý Dự Án</h1>
            <div className="stats-pill-bar"><span className="count-badge">{projects.length}</span><span>Tệp khách hàng hiện có</span></div>
          </div>
        </header>

        {selectedProject ? (
          <div className="project-detail-premium">
            <div className="detail-header-row">
              <button onClick={() => setSelectedProject(null)} className="btn-back-premium"><ChevronLeft size={18} /> Danh sách dự án</button>
            </div>

            <div className="dossier-layout">
              {/* SECTION: CUSTOMER IDENTITY */}
              <div className="section-card glass-panel profile-section">
                <div className="section-header luxe"><User size={24} color="var(--accent)" /> <h3>Hồ sơ khách hàng</h3></div>
                <div className="profile-identity">
                  <div className="id-group">
                    <label>Họ và tên khách hàng</label>
                    <div className="id-value">{selectedProject.customerName}</div>
                  </div>
                  <div className="id-group">
                    <label>Số điện thoại / Zalo</label>
                    <div className="id-value">{selectedProject.customerPhone}</div>
                  </div>
                  {selectedProject.customerEmail && (
                    <div className="id-group">
                      <label>Email liên hệ</label>
                      <div className="id-value">{selectedProject.customerEmail}</div>
                    </div>
                  )}
                  <div className="id-group">
                    <label>Gói dịch vụ đã đăng ký</label>
                    <div className="val-tag service-hero">{selectedProject.service}</div>
                  </div>
                </div>
              </div>

              {/* SECTION: PROJECT MEDIA */}
              <div className="section-card glass-panel media-section">
                <div className="section-header luxe"><ImageIcon size={24} color="var(--accent)" /> <h3>Dữ liệu hiện trạng công trình</h3></div>
                <div className="media-dossier-grid">
                  <div className="image-luxe-card">
                    <div className="card-label-orb">01</div>
                    <label>Ảnh hiện trạng gốc</label>
                    <div className="image-frame"><img src={selectedProject.rawImage} alt="Ảnh gốc" /></div>
                  </div>
                  <div className="image-luxe-card">
                    <div className="card-label-orb">02</div>
                    <label>Ảnh khoanh vùng ý tưởng</label>
                    <div className="image-frame"><img src={selectedProject.annotatedImage} alt="Ảnh khoanh vùng" /></div>
                  </div>
                  {(selectedProject.extraAssets || []).length > 0 && (
                     <div className="extra-media-luxe">
                        <label>Hình ảnh & Video tham khảo thêm</label>
                        <div className="extra-luxe-scroll">
                          {selectedProject.extraAssets?.map((asset, i) => (
                            <div key={i} className="extra-item-frame" onClick={() => window.open(asset, '_blank')}>
                              {isVideoAsset(asset) ? <div className="video-thumb-placeholder"><ExternalLink size={24} /></div> : <img src={asset} alt="Extra" />}
                            </div>
                          ))}
                        </div>
                     </div>
                  )}
                </div>
              </div>

              {/* SECTION: ANALYSIS & CHOICES */}
              <div className="section-card glass-panel analytic-section">
                <div className="section-header luxe"><Layers size={24} color="var(--accent)" /> <h3>Phân tích yêu cầu & Mẫu đã chọn</h3></div>
                
                <div className="analytic-entry">
                  <label>Mô tả chi tiết từ khách hàng</label>
                  <div className="quote-box">{selectedProject.note || 'Khách hàng không để lại ghi chú thêm.'}</div>
                </div>

                <div className="analytic-entry">
                  <label>Chi tiết các hạng mục đã lựa chọn</label>
                  <div className="asset-luxe-grid">
                    {selectedProject.selections.thac && (
                      <div className="asset-luxe-pill">
                        <img src={getAssetInfo(selectedProject.selections.thac, 'THAC')?.url} alt="" />
                        <span>{getAssetName(selectedProject.selections.thac, 'THAC')} (Thác nước)</span>
                      </div>
                    )}
                    {(selectedProject.selections.ke || []).map(id => (
                      <div key={id} className="asset-luxe-pill">
                        <img src={getAssetInfo(id, 'KE')?.url} alt="" />
                        <span>{getAssetName(id, 'KE')} (Kè đá)</span>
                      </div>
                    ))}
                    {(selectedProject.selections.canh || []).map(id => (
                      <div key={id} className="asset-luxe-pill">
                        <img src={getAssetInfo(id, 'CANH')?.url} alt="" />
                        <span>{getAssetName(id, 'CANH')} (Cây xanh)</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION: ACTIONS */}
              <div className="section-card glass-panel action-section-luxe">
                <div className="section-header luxe"><Send size={24} color="var(--accent)" /> <h3>Xử lý & Phản hồi</h3></div>
                <div className="action-button-stack">
                  <div className="workflow-status-bar">
                    <label>Tiến trình hiện tại:</label>
                    <div className="workflow-luxe-grid">
                      {workflowOptions.map(option => (
                        <button key={option.id} type="button" className={`workflow-luxe-card ${selectedProject.workflowBranch === option.id ? 'active' : ''}`} onClick={() => handleWorkflowSelect(option.id)}>
                          <div className="workflow-card-orb">{option.icon}</div>
                          <div className="workflow-card-txt">
                            <strong>{option.title}</strong>
                            <span>{option.description}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedProject.workflowBranch === 'chatgpt_image' && (
                    <div className="chatgpt-luxe-box">
                      <div className="ai-status-pulse"><Bot size={24} /> <span>Hệ thống AI đã sẵn sàng</span></div>
                      <p>KTS có thể sử dụng Trạm AI để lấy <strong>Master Prompt</strong> và xử lý ảnh hiện trạng.</p>
                      <button className="btn-luxe-admin ai-btn" onClick={() => setShowAIStudio(true)}>
                        Mở Trạm AI & Lấy Prompt
                      </button>
                    </div>
                  )}
                  <div className="btn-group-vertical">
                    <button className="btn-luxe-admin main" onClick={() => handleWorkflowSelect('manual_design')}>
                      <Paintbrush size={20} /> Mở trình thiết kế chuyên sâu
                    </button>
                    <button className="btn-luxe-admin outline" onClick={() => fileRef.current?.click()}>
                      <Upload size={20} /> {selectedProject.status === 'done' ? 'Cập nhật bản vẽ mới' : 'Tải lên bản vẽ hoàn thiện'}
                    </button>
                    <input type="file" accept="image/*" ref={fileRef} onChange={handleUploadResult} hidden />
                    {selectedProject.status === 'done' && (
                      <button className="btn-luxe-admin zalo" onClick={() => window.open(`https://zalo.me/${selectedProject.customerPhone.replace(/\D/g, '')}`, '_blank')}>
                         <MessageCircle size={20} /> Phản hồi qua Zalo khách hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="project-list-premium">
            {isLoading ? (
              <div className="empty-state glass-panel">
                <div className="generating-spinner" style={{ width: 40, height: 40 }} />
                <p>Đang tải danh sách dự án...</p>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="empty-state glass-panel"><FolderOpen size={64} /><p>Chưa có dữ liệu nào được gửi về hệ thống.</p></div>
            ) : (
              Object.keys(grouped).map(dateGroup => (
                <div key={dateGroup} className="folder-date-section">
                  <div className="date-badge-luxe"><Folder size={18} color="var(--accent)" /> {dateGroup}</div>
                  <div className="customer-cards-grid">
                    {grouped[dateGroup].map(project => (
                      <button key={project.id} type="button" className="management-card-luxe" onClick={() => setSelectedProject(project)}>
                        <div className="card-top-row">
                          <span className="time-stamp-luxe">
                            {new Date(project.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}
                          </span>
                          <div className={`status-badge-luxe ${project.status}`}>{getStatusLabel(project.status)}</div>
                        </div>
                        <div className="card-client-info">
                          <div className="client-name">{project.customerName}</div>
                          <div className="client-phone"><Phone size={14} /> {project.customerPhone}</div>
                        </div>
                        <div className="card-package-row">
                          <div className="pkg-tag">{project.service}</div>
                          <div className="wf-tag">{getWorkflowShortLabel(project.workflowBranch)}</div>
                        </div>
                        {project.status === 'processing' && (
                          <div className="card-ai-generating">
                            <span className="generating-spinner" />
                            <span>Đã hoàn thiện {project.aiResults?.length || 0}/2 phương án...</span>
                          </div>
                        )}
                        {project.aiResults && project.aiResults.length > 0 && (
                          <div className="card-ai-preview-grid">
                            {project.aiResults.slice(0, 4).reverse().map((img, i) => (
                               <div key={i} className="card-ai-thumb" title="Ảnh AI tạo ra">
                                  <img src={img} alt={`AI Thumb ${i+1}`} />
                               </div>
                            ))}
                          </div>
                        )}
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
