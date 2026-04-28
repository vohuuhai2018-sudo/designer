import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload,
  Paintbrush,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCcw,
  RefreshCw,
  ArrowRight,
  User,
  Undo2,
  Trash2,
  ChevronLeft,
  Camera,
  Layers,
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
  AlertTriangle,
  MessageCircle,
  Zap,
  Sparkles,
  Video as VideoIcon,
  Crown,
  Play,
  Box,
  Loader2,
  Share2,
  Waves,
  Sprout,
  Map,
  Coffee,
  Droplets,
  Home,
  Settings,
  Search,
  CircleDollarSign,
  TrendingUp,
  Clock,
  Hash,
  Circle,
  GripVertical,
  Plus,
  EyeOff,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import './App.css';
import { PaymentModal } from './PaymentModal';

// --- API BASE ---
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// --- API HELPER ---
// Tự động thêm header ngrok-skip-browser-warning để bỏ qua trang cảnh báo ngrok free tier
const ProtectedImage = ({ src, alt, style, className }: { src: string, alt?: string, style?: any, className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !src) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const watermark = new Image();
    
    img.crossOrigin = "anonymous";
    watermark.crossOrigin = "anonymous";

    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Cấu hình kích thước canvas theo ảnh gốc để không mất nét
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // 1. Vẽ ảnh gốc
        ctx.drawImage(img, 0, 0);

        // 2. Cấu hình Logo "nướng" vào ảnh
        const wmWidth = canvas.width * 0.45; // 45% chiều rộng ảnh
        const wmHeight = (watermark.naturalHeight / watermark.naturalWidth) * wmWidth;
        const x = canvas.width - wmWidth - (canvas.width * 0.02); // Cách lề 2%
        const y = canvas.height - wmHeight - (canvas.height * 0.02);

        ctx.globalAlpha = 0.85;
        // Hiệu ứng đổ bóng trực tiếp vào pixels
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        
        ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
      }
    };

    img.onload = onLoaded;
    watermark.onload = onLoaded;
    
    img.src = src;
    watermark.src = '/assets/CHU KY _ HAI VO.png';
  }, [src]);

  return (
    <div className={`image-watermark-wrapper ${className || ''}`} style={style} onContextMenu={(e) => e.preventDefault()}>
      <canvas ref={canvasRef} title={alt} />
      <div className="security-overlay" />
    </div>
  );
};

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
type AppView = 'welcome' | 'upload' | 'editor' | 'service' | 'plan' | 'submit' | 'success' | 'admin' | 'login' | 'basic_selection' | 'my_projects' | 'branch_selection';
type MainBranch = 'landscape' | 'architecture' | 'interior';

// Device ID — định danh thiết bị thay cho đăng nhập
function getDeviceId(): string {
  let id = localStorage.getItem('sh_device_id');
  if (!id) {
    id = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem('sh_device_id', id);
  }
  return id;
}
type WorkflowBranch = 'manual_design' | 'chatgpt_image';

interface Selection {
  ho?: string;
  ho_hien_dai?: string;
  tuong_da?: string;
  tuong_cay?: string;
  farm?: string;
  cafe?: string;
  ho_boi?: string;
  ke?: string[];
  canh?: string[];
  thac?: string;
  thacName?: string;
  thacUrl?: string;
  nha_pho?: string;
  biet_thu?: string;
  nha_cap_4?: string;
  nha_vuon?: string;
  nha_tien_che?: string;
  hien_dai?: string;
  tan_co_dien?: string;
  indochine?: string;
  wabi_sabi?: string;
  tan_co_dien_go?: string;
}

interface PaymentInfo {
  packageId?: string;
  packageLabel?: string;
  area?: number;
  amount?: number;
  status?: 'pending' | 'paid' | 'failed' | 'cancelled';
  orderId?: string;
  requestId?: string;
  transId?: string;
  payUrl?: string;
  qrCodeUrl?: string;
  deeplink?: string;
  message?: string;
  resultCode?: number | string;
  createdAt?: string;
  paidAt?: string;
  manual?: boolean;
  note?: string;
  cancelledAt?: string;
}

interface Project {
  id: string;
  timestamp: string;
  customerName: string;
  customerPhone: string;
  rawImage: string;
  annotatedImage: string;
  referenceModelUrl?: string;
  selections: Selection;
  service: string;
  status: 'pending' | 'processing' | 'done';
  note?: string;
  extraAssets?: string[];
  basicCategory?: string;
  workflowBranch?: WorkflowBranch;
  finalImage?: string;
  aiResults?: string[];
  deviceId?: string;
  pass2Results?: Pass2Results | null;
  interiorPairs?: { siteImage: string; referenceImage: string }[];
  payment?: PaymentInfo;
}

interface Pass2Task {
  taskId: string;
  type: 'image' | 'video';
  label: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  url?: string | null;
  chatUrl?: string | null;
  error?: string | null;
}

interface Pass2Results {
  referenceImageUrl: string;
  dimensions: { width: number; length: number };
  status: 'pending' | 'running' | 'done' | 'failed';
  startedAt?: string;
  completedAt?: string | null;
  tasks: Pass2Task[];
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

function extractSelectedModelUrl(note?: string): string | null {
  const modelMatch = note?.match(/\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:\s*(https?:\/\/[^\n]+)/i)
    ?? note?.match(/https?:\/\/[^\s\n]+/);
  return modelMatch ? (modelMatch[1] ?? modelMatch[0])?.trim() : null;
}

function getProjectReferenceAsset(project: Project): { label: string; url: string; alt: string } {
  const modelUrl = project.referenceModelUrl || extractSelectedModelUrl(project.note);

  if ((project.service === 'Gói Cơ bản' || project.service === 'Gói Cơ Bản') && modelUrl) {
    return {
      label: 'Ảnh mẫu khách đã chọn',
      url: modelUrl,
      alt: 'Ảnh mẫu khách đã chọn'
    };
  }

  return {
    label: 'Ảnh khoanh vùng ý tưởng',
    url: project.annotatedImage,
    alt: 'Ảnh khoanh vùng'
  };
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
    { 
      id: 'group_ke_da', 
      name: 'Kè đá hệ thống',
      variants: [
        { id: 'sys-ke-01', name: 'Kè hệ thống 01', url: '/assets/KÈ/ChatGPT Image 12_44_41 10 thg 4, 2026.png' },
        { id: 'sys-ke-02', name: 'Kè hệ thống 02', url: '/assets/KÈ/ChatGPT Image 12_43_04 10 thg 4, 2026.png' }
      ]
    },
  ],
  CANH: [
    { 
      id: 'group_canh_quan', 
      name: 'Cảnh quan hệ thống',
      variants: [
        { id: 'sys-canh-01', name: 'Cảnh quan mẫu 01', url: '/assets/CANH/ChatGPT Image 12_48_58 10 thg 4, 2026.png' }
      ]
    }
  ],
  HO: [
    {
      id: 'ho_co_dien',
      url: '/assets/Cảnh quan/1. HO KOI SAN VUON CO DIEN_THUMB.png',
      name: 'Hồ Koi Cổ Điển',
      variants: [
        { id: 'ho_co_dien_v1', url: '/assets/Cảnh quan/1. HO KOI SAN VUON CO DIEN_THUMB.png', name: 'Mẫu hồ số 01' }
      ]
    }
  ],
  HO_HIEN_DAI: [
    {
      id: 'ho_hien_dai_root',
      url: '/assets/Cảnh quan/2. HO KOI SAN VUON HIEN DAI_THUMB.png',
      name: 'Hồ Koi Hiện Đại',
      variants: [
        { id: 'ho_hien_dai_v1', url: '/assets/Cảnh quan/2. HO KOI SAN VUON HIEN DAI_THUMB.png', name: 'Mẫu hồ số 01' }
      ]
    }
  ],
  TUONG_DA: [
    {
      id: 'tuong_da_root',
      url: '/assets/Cảnh quan/3. TUONG DA TRANG TRI _THUMB.png',
      name: 'Tường Đá Trang Trí',
      variants: [
        { id: 'tuong_da_v1', url: '/assets/Cảnh quan/3. TUONG DA TRANG TRI _THUMB.png', name: 'Mẫu tường đá 01' }
      ]
    }
  ],
  TUONG_CAY: [
    {
      id: 'tuong_cay_root',
      url: '/assets/Cảnh quan/4. TUONG CAY_THUMB.png',
      name: 'Tường Cây',
      variants: [
        { id: 'tuong_cay_v1', url: '/assets/Cảnh quan/4. TUONG CAY_THUMB.png', name: 'Mẫu tường cây 01' }
      ]
    }
  ],
  FARM: [
    {
      id: 'farm_root',
      url: '/assets/Cảnh quan/5. QUY HOACH FARM_THUMB.png',
      name: 'Quy Hoạch Farm',
      variants: [
        { id: 'farm_v1', url: '/assets/Cảnh quan/5. QUY HOACH FARM_THUMB.png', name: 'Mẫu farm 01' }
      ]
    }
  ],
  CAFE: [
    {
      id: 'cafe_root',
      url: '/assets/Cảnh quan/6. CANH QUAN CA PHE_THUMB.png',
      name: 'Cảnh Quan Cafe',
      variants: [
        { id: 'cafe_v1', url: '/assets/Cảnh quan/6. CANH QUAN CA PHE_THUMB.png', name: 'Mẫu cafe 01' }
      ]
    }
  ],
  HO_BOI: [
    {
      id: 'ho_boi_root',
      url: '/assets/Cảnh quan/7. HO BOI THIEN NHIEN_THUMB.png',
      name: 'Hồ Bơi Thiên Nhiên',
      variants: [
        { id: 'ho_boi_v1', url: '/assets/Cảnh quan/7. HO BOI THIEN NHIEN_THUMB.png', name: 'Mẫu hồ bơi 01' }
      ]
    }
  ],
  // Architecture
  NHA_PHO: [
    {
      id: 'nha_pho_root',
      url: '/assets/Kiến trúc/1. NHA PHO_THUMB.png',
      name: 'Nhà Phố Hiện Đại',
      variants: [
        { id: 'nha_pho_v1', url: '/assets/Kiến trúc/1. NHA PHO_THUMB.png', name: 'Mẫu nhà phố 01' }
      ]
    }
  ],
  BIET_THU: [
    {
      id: 'biet_thu_root',
      url: '/assets/Kiến trúc/2. BIET THU_THUMB.png',
      name: 'Biệt Thự Sang Trọng',
      variants: [
        { id: 'biet_thu_v1', url: '/assets/Kiến trúc/2. BIET THU_THUMB.png', name: 'Mẫu biệt thự 01' }
      ]
    }
  ],
  NHA_CAP_4: [
    {
      id: 'nha_cap_4_root',
      url: '/assets/Kiến trúc/3. NHA CAP 4_THUMB.png',
      name: 'Nhà Cấp 4',
      variants: [
        { id: 'nha_cap_4_v1', url: '/assets/Kiến trúc/3. NHA CAP 4_THUMB.png', name: 'Mẫu nhà cấp 4 01' }
      ]
    }
  ],
  NHA_VUON: [
    {
      id: 'nha_vuon_root',
      url: '/assets/Kiến trúc/4. NHA VUON_THUMB.png',
      name: 'Nhà Vườn',
      variants: [
        { id: 'nha_vuon_v1', url: '/assets/Kiến trúc/4. NHA VUON_THUMB.png', name: 'Mẫu nhà vườn 01' }
      ]
    }
  ],
  NHA_TIEN_CHE: [
    {
      id: 'nha_tien_che_root',
      url: '/assets/Kiến trúc/5. NHA TIEN CHE_THUMB.png',
      name: 'Nhà Tiền Chế',
      variants: [
        { id: 'nha_tien_che_v1', url: '/assets/Kiến trúc/5. NHA TIEN CHE_THUMB.png', name: 'Mẫu nhà tiền chế 01' }
      ]
    }
  ],
  // Interior — each variant needs `images` array for 4-photo combo flow
  HIEN_DAI: [
    {
      id: 'hien_dai_root',
      url: '/assets/Nội thất/1. HIEN DAI _ THUMB.png',
      name: 'Nội Thất Hiện Đại',
      images: [
        '/assets/Nội thất/1. HIEN DAI _ THUMB.png',
        '/assets/Nội thất/1. HIEN DAI _ THUMB.png',
        '/assets/Nội thất/1. HIEN DAI _ THUMB.png',
        '/assets/Nội thất/1. HIEN DAI _ THUMB.png'
      ],
      variants: [
        { id: 'hien_dai_v1', url: '/assets/Nội thất/1. HIEN DAI _ THUMB.png', name: 'Mẫu hiện đại 01', images: ['/assets/Nội thất/1. HIEN DAI _ THUMB.png', '/assets/Nội thất/1. HIEN DAI _ THUMB.png', '/assets/Nội thất/1. HIEN DAI _ THUMB.png', '/assets/Nội thất/1. HIEN DAI _ THUMB.png'] }
      ]
    }
  ],
  TAN_CO_DIEN: [
    {
      id: 'tan_co_dien_root',
      url: '/assets/Nội thất/2. TAN CO DIEN_THUMB.png',
      name: 'Tân Cổ Điển',
      images: [
        '/assets/Nội thất/2. TAN CO DIEN_THUMB.png',
        '/assets/Nội thất/2. TAN CO DIEN_THUMB.png',
        '/assets/Nội thất/2. TAN CO DIEN_THUMB.png',
        '/assets/Nội thất/2. TAN CO DIEN_THUMB.png'
      ],
      variants: [
        { id: 'tan_co_dien_v1', url: '/assets/Nội thất/2. TAN CO DIEN_THUMB.png', name: 'Mẫu tân cổ điển 01', images: ['/assets/Nội thất/2. TAN CO DIEN_THUMB.png', '/assets/Nội thất/2. TAN CO DIEN_THUMB.png', '/assets/Nội thất/2. TAN CO DIEN_THUMB.png', '/assets/Nội thất/2. TAN CO DIEN_THUMB.png'] }
      ]
    }
  ],
  INDOCHINE: [
    {
      id: 'indochine_root',
      url: '/assets/Nội thất/3. INDOCHINE_THUMB.png',
      name: 'Indochine',
      images: [
        '/assets/Nội thất/3. INDOCHINE_THUMB.png',
        '/assets/Nội thất/3. INDOCHINE_THUMB.png',
        '/assets/Nội thất/3. INDOCHINE_THUMB.png',
        '/assets/Nội thất/3. INDOCHINE_THUMB.png'
      ],
      variants: [
        { id: 'indochine_v1', url: '/assets/Nội thất/3. INDOCHINE_THUMB.png', name: 'Mẫu Indochine 01', images: ['/assets/Nội thất/3. INDOCHINE_THUMB.png', '/assets/Nội thất/3. INDOCHINE_THUMB.png', '/assets/Nội thất/3. INDOCHINE_THUMB.png', '/assets/Nội thất/3. INDOCHINE_THUMB.png'] }
      ]
    }
  ],
  WABI_SABI: [
    {
      id: 'wabi_sabi_root',
      url: '/assets/Nội thất/4. WABI SABI_THUMB.png',
      name: 'Wabi Sabi',
      images: [
        '/assets/Nội thất/4. WABI SABI_THUMB.png',
        '/assets/Nội thất/4. WABI SABI_THUMB.png',
        '/assets/Nội thất/4. WABI SABI_THUMB.png',
        '/assets/Nội thất/4. WABI SABI_THUMB.png'
      ],
      variants: [
        { id: 'wabi_sabi_v1', url: '/assets/Nội thất/4. WABI SABI_THUMB.png', name: 'Mẫu Wabi Sabi 01', images: ['/assets/Nội thất/4. WABI SABI_THUMB.png', '/assets/Nội thất/4. WABI SABI_THUMB.png', '/assets/Nội thất/4. WABI SABI_THUMB.png', '/assets/Nội thất/4. WABI SABI_THUMB.png'] }
      ]
    }
  ],
  TAN_CO_DIEN_GO: [
    {
      id: 'tan_co_dien_go_root',
      url: '/assets/Nội thất/5. NOI THAT GO_THUMB.png',
      name: 'Tân Cổ Điển Gỗ',
      images: [
        '/assets/Nội thất/5. NOI THAT GO_THUMB.png',
        '/assets/Nội thất/5. NOI THAT GO_THUMB.png',
        '/assets/Nội thất/5. NOI THAT GO_THUMB.png',
        '/assets/Nội thất/5. NOI THAT GO_THUMB.png'
      ],
      variants: [
        { id: 'tan_co_dien_go_v1', url: '/assets/Nội thất/5. NOI THAT GO_THUMB.png', name: 'Mẫu tân cổ điển gỗ 01', images: ['/assets/Nội thất/5. NOI THAT GO_THUMB.png', '/assets/Nội thất/5. NOI THAT GO_THUMB.png', '/assets/Nội thất/5. NOI THAT GO_THUMB.png', '/assets/Nội thất/5. NOI THAT GO_THUMB.png'] }
      ]
    }
  ],
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

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#fff', background: '#1a1a2e', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ff6b6b' }}>⚠️ Lỗi ứng dụng</h2>
          <pre style={{ background: '#0d1117', padding: '20px', borderRadius: '12px', overflow: 'auto', fontSize: '14px', color: '#ff9999', marginTop: '20px' }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ marginTop: '20px', padding: '12px 24px', background: '#e2b170', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
            Quay về trang chủ
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- MAIN APP ---
export default function App() {
  const [view, setView] = useState<AppView>('welcome');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [rawImage, setRawImage] = useState<string>('');
  const [annotatedImage, setAnnotatedImage] = useState<string>('');
  const [selections, setSelections] = useState<Selection>({ ke: [], canh: [] });
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [service, setService] = useState('');
  const [basicSubStep, setBasicSubStep] = useState<'category' | 'gallery'>('category');
  const [note, setNote] = useState('');
  const [referenceModelUrl, setReferenceModelUrl] = useState('');
  const [extraAssets, setExtraAssets] = useState<string[]>([]);
  const [basicCategory, setBasicCategory] = useState('ho_co_dien');
  const [templateSelected, setTemplateSelected] = useState(false);
  const [historySize, setHistorySize] = useState(0);
  const [viewNotification, setViewNotification] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submittedProjectId, setSubmittedProjectId] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [interiorComboImages, setInteriorComboImages] = useState<string[]>([]);
  const [interiorSiteImages, setInteriorSiteImages] = useState<string[]>([]);

  // --- PRIVACY SHIELD & SECURITY ---
  useEffect(() => {
    const handleBlur = () => document.body.classList.add('privacy-locked');
    const handleFocus = () => document.body.classList.remove('privacy-locked');
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') document.body.classList.add('privacy-locked');
      else document.body.classList.remove('privacy-locked');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.key === 'p')) {
        document.body.classList.add('privacy-locked');
        setTimeout(() => document.body.classList.remove('privacy-locked'), 2000);
        alert("Nội dung bản quyền thuộc về Sơn Hải Landscape. Vui lòng không sao chép.");
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // --- SIMPLE ROUTING ---
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setView('login');
    }
    // Route /result/<projectId> — cho phép user xem lại kết quả mà không cần đăng nhập
    const resultMatch = path.match(/^\/result\/(.+)$/);
    if (resultMatch) {
      setSubmittedProjectId(resultMatch[1]);
      setService('Gói Cơ Bản');
      setRetryCount(99);
      setView('success');
    }
    // Route /my — dự án của tôi (theo thiết bị)
    if (path === '/my') {
      setView('my_projects');
    }
  }, []);

  // --- SYSTEM DYNAMIC CONTENT ---
  const SYSTEM_DEFAULTS = {
    tips: {
      title: "MẸO CHỤP ẢNH",
      items: ["Vị trí giống mẫu chọn", "Bao quát không gian", "Góc rộng chính diện"],
      sampleImage: "/assets/sample_angle.jpg"
    },
    plans: [
      { id: "basic", name: "Gói Cơ bản", header: "1. GÓI CƠ BẢN", sub: "KTS thiết kế 1 bản vẽ 3D chuẩn hóa (1 tấm hình chất lượng cao).", media: [{ type: 'image', url: "https://images.unsplash.com/photo-1516455590571-18256e5bb4ff?q=80&w=1200" }] },
      { id: "advanced", name: "Gói Nâng cao", header: "2. GÓI NÂNG CAO", sub: "1 Bản vẽ thiết kế chuẩn + 1 Video diễn họa 3D sống động.", media: [{ type: 'image', url: "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?q=80&w=1200" }, { type: 'video', url: "https://assets.mixkit.co/videos/preview/mixkit-residential-house-with-a-pool-and-green-landscaping-12270-large.mp4" }] },
      { id: "premium", name: "Gói Premium", header: "3. GÓI PREMIUM (TRỌN BỘ 3D)", sub: "Thiết kế 3D toàn diện, xuất 6 góc nhìn đẹp nhất + 1 Video 4K diễn họa chi tiết.", media: [
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=1" },
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=2" },
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=3" },
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=4" },
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=5" },
        { type: 'image', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&sig=6" },
        { type: 'video', url: "https://assets.mixkit.co/videos/preview/mixkit-modern-apartment-building-with-green-garden-and-pool-21272-large.mp4" }
      ]}
    ],
    library: ASSETS
  };

  const [systemContent, setSystemContent] = useState(() => {
    const saved = localStorage.getItem('sh_system_content');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...SYSTEM_DEFAULTS, ...parsed, tips: SYSTEM_DEFAULTS.tips };
      } catch(e) { return SYSTEM_DEFAULTS; }
    }
    return SYSTEM_DEFAULTS;
  });

  const fetchSystemContent = async () => {
    try {
      const res = await apiFetch('/api/system-content');
      if (res.ok) {
        const data = await res.json();
        setSystemContent((prev: any) => ({
          ...prev,
          ...data,
          tips: SYSTEM_DEFAULTS.tips
        }));
      }
    } catch (err) {
      console.error('Lỗi khi tải cấu hình hệ thống:', err);
    }
  };

  useEffect(() => {
    fetchSystemContent();
  }, []);

  const [mainBranch, setMainBranch] = useState<MainBranch>('landscape');


  // --- AUTO-SAVE DRAFT TO LOCALSTORAGE ---
  useEffect(() => {
    try {
      localStorage.setItem('sh_system_content', JSON.stringify(systemContent));
    } catch (e) {
      console.warn('Auto-save to localStorage failed (limit reached).');
    }
  }, [systemContent]);

  // --- SAVE SYSTEM CONTENT TO SERVER (MANUAL TRIGGER) ---
  const syncSystemContent = async () => {
    console.log('Syncing system content to:', API_BASE);
    try {
      // 1. Local Cache (Optional - don't let it block server sync)
      try {
        localStorage.setItem('sh_system_content', JSON.stringify(systemContent));
      } catch (localErr) {
        console.warn('LocalStorage limit reached - skipping local cache, relying on server sync.');
      }
      
      // 2. Server Sync
      const res = await apiFetch('/api/system-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(systemContent)
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status}`);
      }
      
      console.log('✅ Successfully synced system content.');
      return true;
    } catch(e: any) {
      console.error('Manual sync failed:', e);
      // Detailed error for the user
      const msg = e.message || 'Lỗi không xác định';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
         alert(`❌ KHÔNG THỂ KẾT NỐI SERVER!\nLink API: ${API_BASE}\n\nAnh vui lòng kiểm tra:\n1. Backend/ngrok trên máy đã bật chưa?\n2. Nếu chạy trên Vercel, link API phải là HTTPS (Ngrok).\n3. Đảm bảo đúng link Ngrok trong file .env`);
      } else {
         alert(`❌ LỖI LƯU TRỮ: ${msg}`);
      }
      return false;
    }
  };

  // Auto-poll mỗi 10s khi đang ở trang Admin
  useEffect(() => {
    if (view !== 'admin') return;

    // Luôn poll mỗi 10s nếu là admin để cập nhật danh sách mới
    const pollDelay = projects.some(project => project.status === 'processing') ? 3000 : 10000;
    const pollInterval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/projects');
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
        }
      } catch (e) { /* ignore network errors */ }
    }, pollDelay);

    return () => clearInterval(pollInterval);
  }, [view, projects]);

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
    const resized = await compressImage(img);
    setRawImage(resized);
    setAnnotatedImage(resized);
  };

  // Handler khi user chọn 1 mẫu thiết kế trong BasicSelectionView
  const handleBasicSelect = (url: string, category?: string, images?: string[]) => {
    setReferenceModelUrl(url);
    setTemplateSelected(true);
    if (category) setBasicCategory(category);
    // Nếu là nội thất có combo 4 hình, lưu lại danh sách ảnh combo
    if (images && images.length > 0) {
      setInteriorComboImages(images);
      // Khởi tạo mảng ảnh hiện trạng tương ứng (rỗng)
      setInteriorSiteImages(new Array(images.length).fill(''));
    } else {
      setInteriorComboImages([]);
      setInteriorSiteImages([]);
    }
    setView('upload');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Final compression of annotated image if needed

    const projectData = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      timestamp: new Date().toISOString(),
      deviceId: getDeviceId(),
      customerName,
      customerPhone,
      rawImage,
      annotatedImage,
      referenceModelUrl: referenceModelUrl || extractSelectedModelUrl(note) || undefined,
      selections,
      service,
      note,
      extraAssets,
      basicCategory: service === 'Gói Cơ bản' ? basicCategory : undefined,
      mainBranch: mainBranch,
      status: 'pending' as const,
      interiorPairs: interiorComboImages.length > 0 ? interiorSiteImages.map((site, i) => ({ siteImage: site, referenceImage: interiorComboImages[i] })).filter(p => p.siteImage) : undefined
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
    setService('');
    setNote('');
    setReferenceModelUrl('');
    setExtraAssets([]);
    setBasicCategory('ho_co_dien');
    setTemplateSelected(false);
    setSubmittedProjectId('');
    setRetryCount(0);
    setInteriorComboImages([]);
    setInteriorSiteImages([]);
    setView('welcome');
  };

  const canGoNext = () => {
    switch (view) {
      case 'upload': return interiorComboImages.length > 0 ? interiorSiteImages.some(img => !!img) : !!rawImage;
      case 'editor': return historySize > 1 || note.trim().length > 0;
      case 'service': return !!(selections.ho || selections.ho_hien_dai || selections.tuong_da || selections.tuong_cay || selections.farm || selections.cafe || selections.ho_boi);
      case 'basic_selection': return templateSelected;
      case 'plan': return !!service;
      case 'submit': return !!customerName && !!customerPhone;
      default: return true;
    }
  };

  const handleGlobalNext = () => {
    if (!canGoNext()) {
      if (view === 'editor') setViewNotification("Anh/Chị vui lòng hãy thực hiện thao tác khoanh vùng trên ảnh hoặc viết mô tả ý tưởng chi tiết nhé!");
      if (view === 'service') setViewNotification("Anh/Chị vui lòng hãy chọn một mẫu thiết kế mà mình ưng ý nhất nhé!");
      if (view === 'basic_selection') setViewNotification("Anh/Chị vui lòng hãy chọn một mẫu thiết kế mà mình ưng ý nhất nhé!");
      return;
    }
    if (view === 'plan') {
      setView('submit');
    }
    else if (view === 'basic_selection') setView('upload');
    else if (view === 'upload') {
      setView('plan');
    }
    else if (view === 'submit') handleSubmit();
  };

  const handleGlobalBack = () => {
    if (view === 'plan') setView('upload');
    else if (view === 'basic_selection') {
      if (basicSubStep === 'gallery') {
        setBasicSubStep('category');
      } else {
        setView('welcome');
      }
    }
    else if (view === 'upload') {
      setTemplateSelected(false);
      setBasicSubStep('gallery');
      setView('basic_selection');
    }
    else if (view === 'submit') setView('plan');
  };

  const showGlobalNav = ['upload', 'editor', 'service', 'plan', 'submit', 'basic_selection'].includes(view);

  return (
    <ErrorBoundary>
    <>
      {showGlobalNav && (
        <div className={`global-nav-premium ${view === 'plan' ? 'wider' : ''}`}>
          <div className="nav-inner-luxe">
            <button onClick={handleGlobalBack} className="btn-nav-glass">
              <ChevronLeft size={20} /> Quay lại
            </button>
            <button 
              onClick={handleGlobalNext} 
              className={`btn-nav-glass next-accent ${canGoNext() ? 'ready' : 'locked'}`}
            >
              {view === 'submit' ? (
                <>{isSubmitting ? <span className="generating-spinner" style={{width:18, height:18, borderTopColor: 'currentColor'}} /> : <Sparkles size={18} />} {isSubmitting ? 'ĐANG GỬI...' : 'Tạo thiết kế'}</>
              ) : (
                <>Tiếp theo <ArrowRight size={20} /></>
              )}
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

      <div className={`container ${['admin', 'login', 'welcome'].includes(view as any) ? 'full-width' : ''} ${view === 'plan' ? 'wider' : ''}`}>
        <AnimatePresence mode="wait">
        {view === 'welcome' && (
          <WelcomeView
            onStart={(branch) => {
              setMainBranch(branch);
              setView('basic_selection');
            }}
            onAdmin={() => {
               if (isAdminAuthenticated) setView('admin');
               else setView('login' as any);
            }}
            onMyProjects={() => setView('my_projects')}
          />
        )}
        {(view as any) === 'login' && (
          <LoginView 
            onSuccess={() => {
              setIsAdminAuthenticated(true);
              setView('admin');
            }} 
            onBack={() => setView('welcome')} 
          />
        )}
        {view === 'basic_selection' && (
          <BasicSelectionView
            systemContent={systemContent}
            mainBranch={mainBranch}
            subStep={basicSubStep}
            setSubStep={setBasicSubStep}
            selectedCategory={basicCategory}
            onCategoryChange={setBasicCategory}
            onSelect={handleBasicSelect}
            onBack={() => setView('plan')}
          />
        )}
        {view === 'upload' && (
          <UploadView 
            rawImage={rawImage}
            onUpload={handleUpload} 
            extraAssets={extraAssets}
            onExtraAssetsChange={setExtraAssets}
            onProceed={handleGlobalNext}
            systemContent={systemContent}
            service={service}
            note={note}
            referenceModelUrl={referenceModelUrl}
            onNoteChange={setNote}
            interiorComboImages={interiorComboImages}
            interiorSiteImages={interiorSiteImages}
            onInteriorSiteImageChange={(idx, img) => {
              const newImages = [...interiorSiteImages];
              newImages[idx] = img;
              setInteriorSiteImages(newImages);
            }}
            mainBranch={mainBranch}
            selectedCategory={basicCategory}
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
            systemContent={systemContent}
          />
        )}
        {view === 'plan' && (
          <PlanSelectionView
            service={service}
            systemContent={systemContent}
            mainBranch={mainBranch}
            onServiceChange={(s) => {
              setService(s);
              setView('submit');
            }}
            onTestPayment={async () => {
              try {
                const placeholder = 'https://res.cloudinary.com/dj9ge7jca/image/upload/v1777130977/landscape_app/usg0qckadpdexlrni1ww.jpg';
                const res = await apiFetch('/api/projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: `test-quick-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    deviceId: getDeviceId(),
                    customerName: '[TEST] Thanh toán nhanh',
                    customerPhone: '0000000000',
                    rawImage: placeholder,
                    annotatedImage: placeholder,
                    selections: { ke: [], canh: [] },
                    service: 'Gói Test',
                    mainBranch,
                    workflowBranch: 'chatgpt_image',
                    aiResults: [placeholder, placeholder],
                    note: '[TEST_QUICK] tạo đơn để verify cổng thanh toán MoMo'
                  })
                });
                if (!res.ok) throw new Error('Không tạo được dự án test');
                const created = await res.json();
                await apiFetch(`/api/projects/${created.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'done' })
                }).catch(() => {});
                window.location.href = `/result/${created.id}?pay=test_1k`;
              } catch (e: any) {
                alert(`Lỗi: ${e.message || 'Không tạo được đơn test'}`);
              }
            }}
          />
        )}
        {view === 'submit' && (
          <SubmitView
            customerName={customerName}
            onNameChange={setCustomerName}
            customerPhone={customerPhone}
            onPhoneChange={setCustomerPhone}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            systemContent={systemContent}
          />
        )}
        {view === 'success' && (
          <SuccessView
            projectId={submittedProjectId}
            service={service}
            onReset={resetAll}
            onBack={() => setView('my_projects')}
            retryCount={retryCount}
            onRetry={async () => {
              setRetryCount(prev => prev + 1);
              setIsSubmitting(true);
              try {
                const projectData = {
                  id: Date.now().toString(36) + Math.random().toString(36).slice(2),
                  timestamp: new Date().toISOString(),
                  deviceId: getDeviceId(),
                  customerName,
                  customerPhone,
                  rawImage,
                  annotatedImage,
                  referenceModelUrl: referenceModelUrl || extractSelectedModelUrl(note) || undefined,
                  selections,
                  service,
                  note,
                  extraAssets,
                  status: 'pending' as const
                };
                const response = await apiFetch('/api/projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(projectData)
                });
                if (!response.ok) throw new Error('Lỗi khi gửi dữ liệu.');
                setSubmittedProjectId(projectData.id);
              } catch (error) {
                alert('Không thể thử lại. Vui lòng thử lại sau.');
              } finally {
                setIsSubmitting(false);
              }
            }}
            isRetrying={isSubmitting}
          />
        )}
        {view === 'my_projects' && (
          <MyProjectsView
            onBack={resetAll}
            onViewResult={(projectId) => {
              setSubmittedProjectId(projectId);
              setService('Gói Cơ Bản');
              setRetryCount(99);
              setView('success');
            }}
          />
        )}
        {view === 'admin' && (
          <AdminView
            projects={projects}
            isLoading={isLoadingProjects}
            systemContent={systemContent}
            onSystemContentUpdate={setSystemContent}
            onRefreshConfig={fetchSystemContent}
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
            onDeleteProject={async (id) => {
              let response = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
              if (response.status === 404) {
                response = await apiFetch(`/api/projects/${id}/delete`, { method: 'POST' });
              }
              const payload = await response.json().catch(() => null);
              if (!response.ok) throw new Error(payload?.error || 'Không thể xóa dữ liệu dự án.');
              setProjects(prev => prev.filter(p => p.id !== id));
            }}
            onDeleteAllProjects={async () => {
              let response = await apiFetch('/api/projects', { method: 'DELETE' });
              if (response.status === 404) {
                response = await apiFetch('/api/projects/delete-all', { method: 'POST' });
              }
              const payload = await response.json().catch(() => null);
              if (!response.ok) throw new Error(payload?.error || 'Không thể xóa toàn bộ dữ liệu dự án.');
              setProjects([]);
              return payload?.deletedCount || 0;
            }}
            onSync={syncSystemContent}
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
    </ErrorBoundary>
  );
}

// --- LOGIN VIEW ---
function LoginView({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLogin = () => {
    if (pin === '2024') {
      onSuccess();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => { setError(false); setShake(false); }, 600);
      setPin('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'radial-gradient(ellipse at top, #1a1f2e 0%, #0d1117 60%, #06080d 100%)',
        fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',
        padding: '24px', overflow: 'auto', zIndex: 100
      }}
    >
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
        transition={{ duration: 0.5 }}
        style={{
          width: '100%', maxWidth: 460,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '48px 44px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          position: 'relative'
        }}
      >
        {/* Hairline gold rule */}
        <div style={{ position: 'absolute', top: 0, left: 24, right: 24, height: 1, background: 'linear-gradient(90deg, transparent, rgba(226,177,112,0.5), transparent)' }} />

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(226,177,112,0.12)', border: '1px solid rgba(226,177,112,0.4)', display: 'grid', placeItems: 'center', color: '#e2b170', fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em' }}>SH</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            Sơn Hải · Atelier
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, color: '#e2b170', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
            — Khu vực hạn chế
          </div>
          <h2 style={{
            margin: 0,
            fontFamily: '"Fraunces", "Times New Roman", serif',
            fontWeight: 600,
            fontSize: 36,
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#fff'
          }}>
            Xác thực <em style={{ color: '#e2b170', fontStyle: 'italic', fontWeight: 500 }}>Quản trị</em>
          </h2>
          <p style={{
            marginTop: 14, marginBottom: 0,
            fontSize: 13, lineHeight: 1.55,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'inherit'
          }}>
            Khu vực chứa tài nguyên & cấu hình hệ thống. Nhập mã PIN 4 chữ số để tiếp tục.
          </p>
        </div>

        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8 }}>
          [ Mã PIN ]
        </label>
        <input
          type="password"
          value={pin}
          inputMode="numeric"
          maxLength={6}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder="••••"
          style={{
            width: '100%',
            padding: '18px 16px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.35)',
            border: error ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 22,
            fontWeight: 600,
            textAlign: 'center',
            letterSpacing: '0.6em',
            outline: 'none',
            transition: 'border-color .2s, box-shadow .2s',
            boxShadow: error ? '0 0 0 4px rgba(239,68,68,0.15)' : 'none',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = 'rgba(226,177,112,0.5)'; e.currentTarget.style.boxShadow = error ? '0 0 0 4px rgba(239,68,68,0.15)' : '0 0 0 4px rgba(226,177,112,0.1)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = error ? '#ef4444' : 'rgba(255,255,255,0.12)'; e.currentTarget.style.boxShadow = error ? '0 0 0 4px rgba(239,68,68,0.15)' : 'none'; }}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#fca5a5', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
            ✕ Mã PIN không chính xác — thử lại
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          <button
            onClick={onBack}
            style={{
              flex: '0 0 auto', padding: '13px 22px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 11,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all .2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            ← Hủy
          </button>
          <button
            onClick={handleLogin}
            disabled={pin.length < 1}
            style={{
              flex: 1, padding: '13px 22px',
              background: pin.length < 1 ? 'rgba(226,177,112,0.2)' : 'linear-gradient(180deg, #e8b878 0%, #c8954f 100%)',
              border: '1px solid rgba(226,177,112,0.5)',
              borderRadius: 11,
              color: pin.length < 1 ? 'rgba(13,17,23,0.4)' : '#0d1117',
              fontFamily: 'inherit',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              cursor: pin.length < 1 ? 'not-allowed' : 'pointer',
              transition: 'all .2s',
              boxShadow: pin.length < 1 ? 'none' : '0 8px 20px rgba(226,177,112,0.25)'
            }}
            onMouseOver={(e) => { if (pin.length >= 1) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(226,177,112,0.35)'; }}}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = pin.length < 1 ? 'none' : '0 8px 20px rgba(226,177,112,0.25)'; }}
          >
            Vào Portal →
          </button>
        </div>

        <div style={{ marginTop: 32, paddingTop: 18, borderTop: '1px dashed rgba(255,255,255,0.08)', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
          <span>v1.0 · Production</span>
          <span>{new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- SUB-VIEWS ---

function WelcomeView({ onStart, onAdmin, onMyProjects }: { onStart: (branch: MainBranch) => void, onAdmin: () => void, onMyProjects: () => void }) {
  const [clickCount, setClickCount] = useState(0);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    if (newCount >= 5) {
      onAdmin();
      setClickCount(0);
    } else {
      setClickCount(newCount);
      setTimeout(() => setClickCount(0), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view welcome-view welcome-v2">
      <div className="founder-bg-overlay" />
      <div className="hero-content">
        <div className="logo-tech-container" onClick={handleLogoClick}>
           <img decoding="async" loading="lazy" src="/assets/LOGO _ PNG.png" alt="Logo" className="main-logo-image" />
        </div>
        <h1 className="main-title-v3">Hệ thống thiết kế bản vẽ nhanh nhất Việt Nam</h1>
        
        <div className="branch-cta-group-v2">
          <button className="btn-v2-main" onClick={() => onStart('landscape')}>
            <div className="btn-v2-icon"><img decoding="async" loading="lazy" src="/assets/LUỒNG THIẾT KẾ/1. THIET KE CANH QUAN.png" alt="Cảnh quan" className="full-width-icon" /></div>
            <div className="btn-v2-text">
              <strong>Thiết kế cảnh quan</strong>
              <span>Hồ koi, sân vườn, farm, hồ bơi</span>
            </div>
            <img decoding="async" loading="lazy" src="/assets/mui ten.png" alt="Arrow" className="arrow-float custom-arrow" />
          </button>
          
          <button className="btn-v2-main" onClick={() => onStart('architecture')}>
            <div className="btn-v2-icon"><img decoding="async" loading="lazy" src="/assets/LUỒNG THIẾT KẾ/2. THIET KE KIEN TRUC.png" alt="Kiến trúc" className="full-width-icon" /></div>
            <div className="btn-v2-text">
              <strong>Thiết kế kiến trúc</strong>
              <span>Nhà phố, biệt thự, nhà tiền chế</span>
            </div>
            <img decoding="async" loading="lazy" src="/assets/mui ten.png" alt="Arrow" className="arrow-float custom-arrow" />
          </button>

          <button className="btn-v2-main" onClick={() => onStart('interior')}>
            <div className="btn-v2-icon"><img decoding="async" loading="lazy" src="/assets/LUỒNG THIẾT KẾ/3. THIET KE NOI THAT.png" alt="Nội thất" className="full-width-icon" /></div>
            <div className="btn-v2-text">
              <strong>Thiết kế nội thất</strong>
              <span>Hiện đại, tân cổ điển, indochine</span>
            </div>
            <img decoding="async" loading="lazy" src="/assets/mui ten.png" alt="Arrow" className="arrow-float custom-arrow" />
          </button>
        </div>

        <button
          className="btn-my-projects-v2"
          onClick={onMyProjects}
        >
          <FolderOpen size={22} /> <span>Dự án của bạn</span>
        </button>

        <div className="process-flow-v3">
          <div className="process-step">
            <div className="step-icon"><img decoding="async" loading="lazy" src="/assets/ICON TRANG CHU/1. CHON MAU.png" alt="Chọn mẫu đẹp" className="full-width-icon" /></div>
            <span>Chọn mẫu đẹp</span>
          </div>
          <div className="step-arrow"><img decoding="async" loading="lazy" src="/assets/mui ten.png" alt="->" className="custom-arrow-small" /></div>
          <div className="process-step">
            <div className="step-icon"><img decoding="async" loading="lazy" src="/assets/ICON TRANG CHU/2. CHUP HIEN TRANG.png" alt="Chụp hiện trạng" className="full-width-icon" /></div>
            <span>Chụp hiện trạng</span>
          </div>
          <div className="step-arrow"><img decoding="async" loading="lazy" src="/assets/mui ten.png" alt="->" className="custom-arrow-small" /></div>
          <div className="process-step">
            <div className="step-icon"><img decoding="async" loading="lazy" src="/assets/ICON TRANG CHU/3. NHAN BAN VE.png" alt="Nhận bản vẽ" className="full-width-icon" /></div>
            <span>Nhận bản vẽ</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UploadView({ 
  rawImage, onUpload, extraAssets, onExtraAssetsChange, onProceed, systemContent,
  service, note, referenceModelUrl, onNoteChange,
  interiorComboImages, interiorSiteImages, onInteriorSiteImageChange, 
  mainBranch, selectedCategory
}: { 
  rawImage: string; 
  onUpload: (img: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
  onProceed: () => void;
  systemContent: any;
  service?: string;
  note?: string;
  referenceModelUrl?: string;
  onNoteChange?: (note: string) => void;
  interiorComboImages?: string[];
  interiorSiteImages?: string[];
  onInteriorSiteImageChange?: (idx: number, img: string) => void;
  mainBranch?: MainBranch;
  selectedCategory?: string;
}) {
  const t = (key: string, defaultVal: string) => systemContent.uiText?.[key] || defaultVal;
  const fileRef = useRef<HTMLInputElement>(null);
  const multiFileRef = useRef<HTMLInputElement>(null);
  const interiorFileRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [preview, setPreview] = useState<string>(rawImage || '');

  const getDynamicPlaceholder = () => {
    const categoryExamples: Record<string, string> = {
      'ho': "Ví dụ:\n• Kích thước khu vườn khoảng 50m2 (10x5m)\n• Góc trái bố trí hồ cá koi 12m2, thác nước cao 1.2m đổ từ hòn non bộ\n• Chính giữa là lối đi lát đá tự nhiên trên thảm cỏ nhung Nhật\n• Phía sau hồ đặt tiểu cảnh và cây tùng la hán trang trí",
      'ho_hien_dai': "Ví dụ:\n• Diện tích sân vườn 40m2 (8x5m)\n• Hồ cá koi thiết kế vuông vắn đặt sát tường rào bên phải\n• Sử dụng thác nước tràn hiện đại, ốp đá slate đen\n• Phía trước là sàn gỗ nhựa outdoor và bộ bàn ghế thư giãn",
      'tuong_da': "Ví dụ:\n• Diện tích bức tường trang trí 15m2 (cao 3m, dài 5m)\n• Mảng đá tự nhiên ốp trung tâm, có khe suối nước chảy tuần hoàn\n• Hai bên bố trí dải cây dương xỉ và hệ thống đèn hắt sáng nghệ thuật\n• Phía dưới chân tường đặt bồn hoa hoặc bể cá cảnh nhỏ",
      'tuong_cay': "Ví dụ:\n• Tường cây xanh đứng diện tích 12m2 (cao 3m, dài 4m)\n• Bố trí các loại cây nhiệt đới (dương xỉ, trầu bà, lan ý) xen kẽ tạo mảng màu\n• Lắp đặt hệ thống tưới tự động âm tường\n• Phía dưới chân tường rải sỏi trắng và đặt đèn spotlight hắt lên",
      'farm': "Ví dụ:\n• Tổng diện tích quy hoạch 2000m2 (40x50m)\n• Cổng chính hướng Đông, lối vào rộng 4m\n• Khu trung tâm làm hồ nước điều hòa, xung quanh là các Bungalow nghỉ dưỡng\n• Phía sau bố trí vườn cây ăn trái và khu chăn nuôi tách biệt",
      'cafe': "Ví dụ:\n• Sân vườn quán cafe diện tích 100m2 (10x10m)\n• Khu vực trung tâm đặt tiểu cảnh nước và cây tán rộng che mát\n• Các dãy bàn ghế bố trí dọc lối đi lát đá trang trí\n• Sử dụng đèn dây trang trí treo trên cao tạo không gian chill",
      'ho_boi': "Ví dụ:\n• Kích thước hồ bơi 4x12m, sàn gỗ nhựa quanh hồ rộng 2m\n• Góc sau sân bố trí nhà chòi nghỉ (Gazebo) và khu tắm tráng\n• Hệ thống đèn âm nước và thác nước tràn từ thành hồ\n• Trồng các loại cây nhiệt đới (chuối cảnh, dừa) sát tường rào",
      'nha_pho': "Ví dụ:\n• Khu đất diện tích 90m2 (5x18m), xây dựng 5x15m\n• Chừa sân trước 3m làm cổng và bồn hoa, sân sau 2m lấy thoáng\n• Tầng 1: Phòng khách mặt tiền, bếp phía sau kết nối sân vườn\n• Mặt tiền hiện đại với mảng kính lớn và lam gỗ tạo điểm nhấn",
      'biet_thu': "Ví dụ:\n• Diện tích khu đất 300m2 (15x20m), xây dựng 150m2/sàn\n• Biệt thự nằm giữa tâm đất, sân vườn bao quanh 4 mặt\n• Sảnh đón sang trọng chính diện, gara để 2 ô tô bên hông trái\n• Tầng 2 có ban công rộng nhìn ra khu vực sân vườn phía trước",
      'nha_cap_4': "Ví dụ:\n• Nhà cấp 4 diện tích 120m2 (8x15m), phong cách tối giản\n• Bố trí 3 phòng ngủ dọc bên phải, phòng khách và bếp bên trái\n• Hiên nhà rộng 2m phía trước để đặt ghế thư giãn\n• Sử dụng mái Nhật màu xanh đen, sơn tường màu trắng kem",
      'nha_vuon': "Ví dụ:\n• Nhà vườn nghỉ dưỡng diện tích 150m2 trên khuôn viên 500m2\n• Nhà nằm phía sau đất để ưu tiên khoảng sân cỏ rộng phía trước\n• Bố trí hiên rộng bao quanh nhà kết nối trực tiếp với không gian xanh\n• Sử dụng vật liệu tự nhiên: đá ốp tường, mái ngói và khung cửa gỗ",
      'nha_tien_che': "Ví dụ:\n• Nhà khung thép diện tích 60m2 (6x10m) làm Bungalow\n• Toàn bộ mặt tiền lắp kính cường lực lấy view nhìn ra sân vườn\n• Hiên gỗ rộng 3m phía trước tích hợp bồn cây xanh\n• Kết cấu thép sơn đen mờ, mái lợp tôn giả ngói cách nhiệt",
    };
    if (selectedCategory && categoryExamples[selectedCategory]) return categoryExamples[selectedCategory];
    if (mainBranch === 'architecture') return "Ví dụ:\n• Diện tích xây dựng 100m2 (5x20m)\n• Tầng 1 làm phòng khách và bếp không gian mở\n• Mặt tiền hiện đại, ốp đá tự nhiên và có ban công xanh";
    if (mainBranch === 'interior') return "Ví dụ:\n• Phòng khách chung cư 30m2, phong cách Hiện đại\n• Sofa chữ L đặt sát tường, tivi treo đối diện\n• Sử dụng tông màu trắng xám chủ đạo, đèn trần decor";
    return "Ví dụ:\n• Diện tích sân vườn 40m2 (8x5m)\n• Góc trái làm hồ cá koi nhỏ, chính giữa là thảm cỏ\n• Bố trí cây xanh tầng cao ở góc và hoa bụi dọc lối đi";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh (JPG, PNG, WEBP).');
      e.target.value = '';
      return;
    }
    const MAX = 25 * 1024 * 1024;
    if (file.size > MAX) {
      alert(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Vui lòng chọn ảnh dưới 25MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result;
      if (typeof result !== 'string' || !result.startsWith('data:image/')) {
        alert('Đọc file ảnh thất bại. Vui lòng thử ảnh khác.');
        return;
      }
      setPreview(result);
      onUpload(result);
    };
    reader.onerror = () => {
      alert('Không thể đọc file. Vui lòng thử lại.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const isValidPreview = (p: string) => !!p && (p.startsWith('data:image/') || /^https?:\/\//.test(p) || p.startsWith('blob:') || p.startsWith('/'));

  const handleInteriorFile = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file || !onInteriorSiteImageChange) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      onInteriorSiteImageChange(idx, result);
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

  const basicModelUrl = referenceModelUrl || extractSelectedModelUrl(note);
  const isInteriorCombo = interiorComboImages && interiorComboImages.length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view upload-view nav-offset">
      <h2>{isInteriorCombo ? t('upload_title_interior', 'Tải ảnh hiện trạng công trình theo các góc tương ứng') : t('upload_title', 'Tải ảnh hiện trạng công trình')}</h2>
      
      {isInteriorCombo ? (
        <div className="interior-upload-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
          {interiorComboImages.map((comboImg, idx) => (
            <div key={idx} className="interior-upload-pair" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ marginBottom: '15px' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> 
                  Ảnh Mẫu {idx + 1}_{['Phòng khách', 'Phòng ngủ', 'Phòng bếp', 'Phòng tắm'][idx] || 'Khác'}
                </span>
                <ProtectedImage src={comboImg} alt={`Combo ${idx}`} style={{ width: '100%', height: '140px', borderRadius: '12px' }} />
              </div>
              <div 
                className="upload-area-mini" 
                onClick={() => interiorFileRefs.current[idx]?.click()} 
              >
                {interiorSiteImages?.[idx] ? (
                  <>
                    <img decoding="async" loading="lazy" src={interiorSiteImages[idx]} alt={`Site ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div className="tag-overlay-premium">
                      <CheckCircle2 size={12} /> ĐÃ TẢI ẢNH
                    </div>
                  </>
                ) : (
                  <>
                    <Camera size={32} style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '0 10px' }}>
                      TẢI ẢNH HIỆN TRẠNG<br/>{['PHÒNG KHÁCH', 'PHÒNG NGỦ', 'PHÒNG BẾP', 'PHÒNG TẮM'][idx] || 'GÓC TƯƠNG TỰ'}
                    </span>
                  </>
                )}
              </div>

              <input type="file" accept="image/*" ref={el => { interiorFileRefs.current[idx] = el; }} onChange={(e) => handleInteriorFile(e, idx)} hidden />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={`upload-area ${isValidPreview(preview) ? 'has-preview' : ''}`} onClick={() => fileRef.current?.click()}>
            {isValidPreview(preview) ? (
              <div className="preview-wrap">
                <img
                  decoding="async"
                  src={preview}
                  alt="Preview"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    console.log('[upload] preview loaded:', { w: img.naturalWidth, h: img.naturalHeight });
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                      console.warn('[upload] preview has 0×0 dimensions — resetting');
                      setPreview('');
                    }
                  }}
                  onError={() => {
                    console.error('[upload] preview <img> failed to load');
                    setPreview('');
                  }}
                />
                <div className="change-image-overlay">
                  <div className="change-image-btn">
                    <RefreshCw size={20} />
                    <span>Thay đổi ảnh</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="upload-circle"><Camera size={60} /></div>
                <span className="upload-prompt">NHẤN ĐỂ CHỌN ẢNH CHÍNH</span>
                <span style={{ fontSize: '0.85rem', color: '#9b6e2e', fontWeight: 500 }}>
                  JPG / PNG / WEBP — tối đa 25MB
                </span>
              </>
            )}
          </div>

          <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} hidden />

          <div className="upload-guide-side">
            <div className="guide-content-left">
              <div className="guide-header-side">
                <Zap size={24} color="#e2b170" />
                <span>{systemContent.tips.title}</span>
              </div>
              <ul className="guide-list-side">
                {systemContent.tips.items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
              </ul>
            </div>
            <div className="guide-visual-right">
              {basicModelUrl ? (
                <div className="guide-template-side">
                  <span className="guide-template-label">ẢNH MẪU ĐÃ CHỌN</span>
                  <img decoding="async" loading="lazy" src={basicModelUrl} alt="Selected Template" className="guide-template-img" />
                </div>
              ) : (
                <img decoding="async" loading="lazy" src={systemContent.tips.sampleImage} alt="Guide" className="guide-template-img" />
              )}
            </div>
          </div>

        </>
      )}

      {/* MÔ TẢ Ý TƯỞNG CHI TIẾT - LUÔN HIỆN */}
      <div className="idea-desc-section" style={{ marginTop: '20px' }}>
        <div className="idea-desc-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--accent)', fontWeight: 800 }}>
            <CheckCircle2 size={32} />
            <span style={{ fontSize: '1.6rem', fontWeight: 950, letterSpacing: '0.02em' }}>{t('upload_title_note', 'Mô tả ý tưởng chi tiết')}</span>
          </div>
        </div>
        <textarea
          className="luxe-textarea"
          placeholder={getDynamicPlaceholder()}
          value={note ? note.replace(/(\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:[^\n]*\n?)/gi, '').replace(/^https?:\/\/\S+\n?/gm, '').trimStart() : ''}
          onChange={(e) => {
            if (onNoteChange) onNoteChange(e.target.value);
          }}
          style={{
            width: '100%',
            minHeight: '200px',
            background: '#ffffff',
            color: '#1a1a1a',
            border: '1.5px solid #fed7aa',
            borderRadius: '16px',
            padding: '20px',
            marginTop: '8px',
            fontSize: '1.25rem',
            lineHeight: '1.8',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>

      {/* CONDITIONAL SECTION FOR ADDITIONAL ASSETS */}
      {service !== 'Gói Cơ bản' && (
        <div className="extra-assets-section-premium" style={{ marginTop: '20px' }}>
          <div className="extra-header-premium">
            <div className="extra-title-group">
              <Layers size={26} color="var(--accent)" />
              <h3>Hình ảnh, video và tài liệu liên quan</h3>
            </div>
            <p className="extra-desc-premium">
              Gửi thêm ảnh, video, hoặc bản phác thảo để KTS hiểu rõ không gian và yêu cầu của bạn (áp dụng cho gói thiết kế chuyên nghiệp).
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
                    <img decoding="async" loading="lazy" src={asset} alt={`Extra ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <button className="btn-remove-extra" onClick={(e) => { e.stopPropagation(); removeExtraAsset(idx); }}>
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(preview || (isInteriorCombo && interiorSiteImages && interiorSiteImages.some(img => img !== ''))) && (
        <button className="btn-primary main-cta" onClick={onProceed} style={{ marginTop: '20px', width: '100%' }}>
          {t('upload_btn_next', 'Tiếp theo')} <ArrowRight size={20} />
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
              <img decoding="async" loading="lazy" src="/assets/sample_marking.jpg" alt="Hướng dẫn khoanh vùng" className="sample-img-full" />
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
  selections, onSelectionsChange, note, onNoteChange, extraAssets, onExtraAssetsChange, systemContent
}: {
  selections: Selection;
  onSelectionsChange: (s: Selection) => void;
  note: string;
  onNoteChange: (n: string) => void;
  extraAssets: string[];
  onExtraAssetsChange: (assets: string[]) => void;
  systemContent: any;
}) {
  const lib = (systemContent.library && Object.keys(systemContent.library).length > 0) ? systemContent.library : ASSETS;
  const [hoActive, setHoActive] = useState<string | null>(null);
  const [hoHienDaiActive, setHoHienDaiActive] = useState<string | null>(null);
  const [tuongDaActive, setTuongDaActive] = useState<string | null>(null);
  const [tuongCayActive, setTuongCayActive] = useState<string | null>(null);
  const [farmActive, setFarmActive] = useState<string | null>(null);
  const [cafeActive, setCafeActive] = useState<string | null>(null);
  const [hoBoiActive, setHoBoiActive] = useState<string | null>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const makeHandleSelect = (key: 'ho' | 'ho_hien_dai' | 'tuong_da' | 'tuong_cay' | 'farm' | 'cafe' | 'ho_boi', setActiveFn: (v: string | null) => void) => (variantId: string) => {
    onSelectionsChange({ ...selections, [key]: variantId });
    setActiveFn(null);
  };
  const makeHandleReset = (key: 'ho' | 'ho_hien_dai' | 'tuong_da' | 'tuong_cay' | 'farm' | 'cafe' | 'ho_boi') => (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionsChange({ ...selections, [key]: undefined });
  };
  const makeSelectedCategory = (libKey: string, selKey: keyof Selection) =>
    (lib[libKey] || []).find((cat: any) => cat.variants?.some((v: any) => v.id === selections[selKey]));

  const selectedHo = makeSelectedCategory('HO', 'ho');
  const selectedHoHienDai = makeSelectedCategory('HO_HIEN_DAI', 'ho_hien_dai');
  const selectedTuongDa = makeSelectedCategory('TUONG_DA', 'tuong_da');
  const selectedTuongCay = makeSelectedCategory('TUONG_CAY', 'tuong_cay');
  const selectedFarm = makeSelectedCategory('FARM', 'farm');
  const selectedCafe = makeSelectedCategory('CAFE', 'cafe');
  const selectedHoBoi = makeSelectedCategory('HO_BOI', 'ho_boi');

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
        <div className="title-group" style={{textAlign: 'center', marginBottom: '2.5rem', marginTop: '20px'}}>
          <h2 style={{ fontSize: '2.2rem' }}>Chọn mẫu thiết kế</h2>
          <p style={{ fontSize: '1.1rem' }}>Hãy chọn một danh mục để thực hiện dự án của bạn.</p>
        </div>

        {/* === 1. HỒ KOI SÂN VƯỜN CỔ ĐIỂN === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>1. Hồ Koi Sân Vườn Cổ Điển</h4>
          </div>
          <AnimatePresence mode="wait">
            {!hoActive ? (
              <motion.div key="ho-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.HO || []).map((cat: any) => {
                  const isSelectedCat = selectedHo?.id === cat.id;
                  const hasSel = !!selections.ho;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setHoActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('ho')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="ho-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setHoActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.HO || []).find((c: any) => c.id === hoActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.HO || []).find((c: any) => c.id === hoActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.ho === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('ho', setHoActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.ho === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 2. HỒ KOI SÂN VƯỜN HIỆN ĐẠI === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>2. Hồ Koi Sân Vườn Hiện Đại</h4>
          </div>
          <AnimatePresence mode="wait">
            {!hoHienDaiActive ? (
              <motion.div key="ho-hd-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.HO_HIEN_DAI || []).map((cat: any) => {
                  const isSelectedCat = selectedHoHienDai?.id === cat.id;
                  const hasSel = !!selections.ho_hien_dai;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho_hien_dai)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setHoHienDaiActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('ho_hien_dai')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho_hien_dai)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="ho-hd-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setHoHienDaiActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.HO_HIEN_DAI || []).find((c: any) => c.id === hoHienDaiActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.HO_HIEN_DAI || []).find((c: any) => c.id === hoHienDaiActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.ho_hien_dai === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('ho_hien_dai', setHoHienDaiActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.ho_hien_dai === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 2. TƯỜNG ĐÁ TRANG TRÍ === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>3. Tường Đá Trang Trí</h4>
          </div>
          <AnimatePresence mode="wait">
            {!tuongDaActive ? (
              <motion.div key="td-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.TUONG_DA || []).map((cat: any) => {
                  const isSelectedCat = selectedTuongDa?.id === cat.id;
                  const hasSel = !!selections.tuong_da;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.tuong_da)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setTuongDaActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('tuong_da')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.tuong_da)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="td-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setTuongDaActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.TUONG_DA || []).find((c: any) => c.id === tuongDaActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.TUONG_DA || []).find((c: any) => c.id === tuongDaActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.tuong_da === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('tuong_da', setTuongDaActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.tuong_da === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 3. TƯỜNG CÂY & VƯỜN NHIỆT ĐỚI === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>4. Tường Cây & Vườn Nhiệt Đới</h4>
          </div>
          <AnimatePresence mode="wait">
            {!tuongCayActive ? (
              <motion.div key="tc-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.TUONG_CAY || []).map((cat: any) => {
                  const isSelectedCat = selectedTuongCay?.id === cat.id;
                  const hasSel = !!selections.tuong_cay;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.tuong_cay)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setTuongCayActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('tuong_cay')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.tuong_cay)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="tc-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setTuongCayActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.TUONG_CAY || []).find((c: any) => c.id === tuongCayActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.TUONG_CAY || []).find((c: any) => c.id === tuongCayActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.tuong_cay === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('tuong_cay', setTuongCayActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.tuong_cay === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 4. QUY HOẠCH FARM & DU LỊCH === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>5. Quy Hoạch Farm & Du Lịch</h4>
          </div>
          <AnimatePresence mode="wait">
            {!farmActive ? (
              <motion.div key="farm-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.FARM || []).map((cat: any) => {
                  const isSelectedCat = selectedFarm?.id === cat.id;
                  const hasSel = !!selections.farm;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.farm)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setFarmActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('farm')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.farm)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="farm-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setFarmActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.FARM || []).find((c: any) => c.id === farmActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.FARM || []).find((c: any) => c.id === farmActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.farm === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('farm', setFarmActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.farm === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 5. CẢNH QUAN QUÁN CÀ PHÊ === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>6. Cảnh Quan Quán Cà Phê</h4>
          </div>
          <AnimatePresence mode="wait">
            {!cafeActive ? (
              <motion.div key="cafe-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.CAFE || []).map((cat: any) => {
                  const isSelectedCat = selectedCafe?.id === cat.id;
                  const hasSel = !!selections.cafe;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.cafe)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setCafeActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('cafe')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.cafe)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="cafe-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setCafeActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.CAFE || []).find((c: any) => c.id === cafeActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.CAFE || []).find((c: any) => c.id === cafeActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.cafe === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('cafe', setCafeActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.cafe === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === 6. HỒ BƠI THIÊN NHIÊN === */}
        <section className="asset-group">
          <div className="asset-group-header">
            <h4>7. Hồ Bơi Thiên Nhiên</h4>
          </div>
          <AnimatePresence mode="wait">
            {!hoBoiActive ? (
              <motion.div key="hb-cats" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="category-grid">
                {(lib.HO_BOI || []).map((cat: any) => {
                  const isSelectedCat = selectedHoBoi?.id === cat.id;
                  const hasSel = !!selections.ho_boi;
                  const isLocked = hasSel && !isSelectedCat;
                  const displayImg = isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho_boi)?.url : cat.url;
                  return (
                    <button key={cat.id} className={`category-card ${isSelectedCat ? 'picked' : ''} ${isLocked ? 'locked' : ''}`} onClick={() => !isLocked && setHoBoiActive(cat.id)} disabled={isLocked}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={displayImg} alt={cat.name} />
                        {isSelectedCat && <div className="change-badge" onClick={(e) => makeHandleReset('ho_boi')(e as any)}><RefreshCcw size={12} /> Thay đổi</div>}
                      </div>
                      <div className="picked-label-container">
                        <span>{isSelectedCat ? cat.variants?.find((v: any) => v.id === selections.ho_boi)?.name : cat.name}</span>
                        {isSelectedCat && <div className="picked-status-mini"><CheckCircle2 size={14} /> Đã chọn</div>}
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="hb-vars" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="variant-selection-inline">
                <div className="inline-header">
                  <button className="btn-back-premium" onClick={() => setHoBoiActive(null)}><ChevronLeft size={16} /> Quay lại</button>
                  <h5>Mẫu {(lib.HO_BOI || []).find((c: any) => c.id === hoBoiActive)?.name}</h5>
                </div>
                <div className="category-grid">
                  {(lib.HO_BOI || []).find((c: any) => c.id === hoBoiActive)?.variants?.map((v: any) => (
                    <button key={v.id} className={`category-card ${selections.ho_boi === v.id ? 'picked' : ''}`} onClick={() => makeHandleSelect('ho_boi', setHoBoiActive)(v.id)}>
                      <div className="cat-img">
                        <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                        {selections.ho_boi === v.id && <div className="check-badge-inline"><CheckCircle2 size={16} /></div>}
                      </div>
                      <span>{v.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="asset-group" style={{ marginTop: '20px' }}>
          <div className="asset-group-header">
            <h4>Mô tả ý tưởng chi tiết (Khuyến nghị)</h4>
          </div>
          <div className="customer-request-area-v2">
            <textarea
              placeholder="Anh/Chị hãy mô tả càng chi tiết càng tốt để KTS nắm rõ ý tưởng..."
              value={note}
              onChange={e => onNoteChange(e.target.value)}
            />
          </div>
        </section>

        <section className="asset-group">
          <div className="asset-group-header-stacked">
            <h4>Gửi hình ảnh/video thực tế</h4>
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
                  <img decoding="async" loading="lazy" src={asset} alt="extra" />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </motion.div>
  );
}

function BasicSelectionView({
  systemContent, onSelect, mainBranch, subStep, setSubStep, onBack: _onBack,
  selectedCategory, onCategoryChange
}: {
  systemContent: any, 
  onSelect: (url: string, category?: string, images?: string[]) => void, 
  mainBranch: MainBranch, 
  subStep: 'category' | 'gallery', 
  setSubStep: (v: 'category' | 'gallery') => void, 
  onBack?: () => void,
  selectedCategory: string,
  onCategoryChange: (cat: string) => void
}) {
  const t = (key: string, defaultVal: string) => systemContent.uiText?.[key] || defaultVal;
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const getBranchCategories = (branch: MainBranch) => {
    if (branch === 'architecture') return [
      { id: 'nha_pho', name: t('cat_architecture_nha_pho', 'Nhà phố hiện đại'), thumb: '/assets/Kiến trúc/1. NHA PHO_THUMB.png', active: true, libraryKey: 'NHA_PHO' },
      { id: 'biet_thu', name: t('cat_architecture_biet_thu', 'Biệt thự sang trọng'), thumb: '/assets/Kiến trúc/2. BIET THU_THUMB.png', active: true, libraryKey: 'BIET_THU' },
      { id: 'nha_cap_4', name: t('cat_architecture_nha_cap_4', 'Nhà cấp 4 tiện nghi'), thumb: '/assets/Kiến trúc/3. NHA CAP 4_THUMB.png', active: true, libraryKey: 'NHA_CAP_4' },
      { id: 'nha_vuon', name: t('cat_architecture_nha_vuon', 'Nhà vườn nghỉ dưỡng'), thumb: '/assets/Kiến trúc/4. NHA VUON_THUMB.png', active: true, libraryKey: 'NHA_VUON' },
      { id: 'nha_tien_che', name: t('cat_architecture_nha_tien_che', 'Nhà tiền chế độc đáo'), thumb: '/assets/Kiến trúc/5. NHA TIEN CHE_THUMB.png', active: true, libraryKey: 'NHA_TIEN_CHE' },
    ];
    if (branch === 'interior') return [
      { id: 'hien_dai', name: t('cat_interior_hien_dai', 'Nội thất hiện đại'), thumb: '/assets/Nội thất/1. HIEN DAI _ THUMB.png', active: true, libraryKey: 'HIEN_DAI' },
      { id: 'tan_co_dien', name: t('cat_interior_tan_co_dien', 'Tân cổ điển quý phái'), thumb: '/assets/Nội thất/2. TAN CO DIEN_THUMB.png', active: true, libraryKey: 'TAN_CO_DIEN' },
      { id: 'indochine', name: t('cat_interior_indochine', 'Phong cách Indochine'), thumb: '/assets/Nội thất/3. INDOCHINE_THUMB.png', active: true, libraryKey: 'INDOCHINE' },
      { id: 'wabi_sabi', name: t('cat_interior_wabi_sabi', 'Wabi sabi tối giản'), thumb: '/assets/Nội thất/4. WABI SABI_THUMB.png', active: true, libraryKey: 'WABI_SABI' },
      { id: 'tan_co_dien_go', name: t('cat_interior_tan_co_dien_go', 'Tân cổ điển gỗ'), thumb: '/assets/Nội thất/5. NOI THAT GO_THUMB.png', active: true, libraryKey: 'TAN_CO_DIEN_GO' },
    ];
    return [
      { id: 'ho', name: t('cat_landscape_ho', 'Hồ koi sân vườn cổ điển'), thumb: '/assets/Cảnh quan/1. HO KOI SAN VUON CO DIEN_THUMB.png', active: true, libraryKey: 'HO' },
      { id: 'ho_hien_dai', name: t('cat_landscape_ho_hien_dai', 'Hồ koi sân vườn hiện đại'), thumb: '/assets/Cảnh quan/2. HO KOI SAN VUON HIEN DAI_THUMB.png', active: true, libraryKey: 'HO_HIEN_DAI' },
      { id: 'tuong_da', name: t('cat_landscape_tuong_da', 'Tường đá trang trí'), thumb: '/assets/Cảnh quan/3. TUONG DA TRANG TRI _THUMB.png', active: true, libraryKey: 'TUONG_DA' },
      { id: 'tuong_cay', name: t('cat_landscape_tuong_cay', 'Tường cây & vườn nhiệt đới'), thumb: '/assets/Cảnh quan/4. TUONG CAY_THUMB.png', active: true, libraryKey: 'TUONG_CAY' },
      { id: 'farm', name: t('cat_landscape_farm', 'Quy hoạch farm & du lịch'), thumb: '/assets/Cảnh quan/5. QUY HOACH FARM_THUMB.png', active: true, libraryKey: 'FARM' },
      { id: 'cafe', name: t('cat_landscape_cafe', 'Cảnh quan quán cà phê'), thumb: '/assets/Cảnh quan/6. CANH QUAN CA PHE_THUMB.png', active: true, libraryKey: 'CAFE' },
      { id: 'ho_boi', name: t('cat_landscape_ho_boi', 'Hồ bơi thiên nhiên'), thumb: '/assets/Cảnh quan/7. HO BOI THIEN NHIEN_THUMB.png', active: true, libraryKey: 'HO_BOI' }
    ];
  };

  const categories = getBranchCategories(mainBranch);
  
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      onCategoryChange(categories[0].id);
    }
  }, [mainBranch, categories, selectedCategory, onCategoryChange]);

  const lib = (systemContent.library && Object.keys(systemContent.library).length > 0) ? systemContent.library : ASSETS;
  const currentCat = categories.find(c => c.id === selectedCategory);
  const libraryKey = currentCat?.libraryKey || categories[0]?.libraryKey || 'HO';
  const galleryImages: any[] = [];
  (lib[libraryKey] || []).forEach((cat: any) => {
    if (cat.variants && cat.variants.length > 0) {
      cat.variants.forEach((v: any) => {
        galleryImages.push({ ...v, parentName: cat.name });
      });
    } else {
      // Nếu không có biến thể, dùng chính mẫu cha làm mục gallery
      galleryImages.push(cat);
    }
  });


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="view basic-selection-view nav-offset" style={{ alignItems: 'flex-start' }}>
       <div className="selection-panel">
          <div className="title-group" style={{ textAlign: 'left', marginBottom: '1.5rem', paddingLeft: '10px', width: '100%', marginTop: '40px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>
              {subStep === 'category' 
                ? t('selection_title_cats', 'Chọn mẫu thiết kế') 
                : t('selection_title_gallery', 'Nhấn chọn mẫu phù hợp')
              }
            </h2>
            {subStep === 'category' && (
              <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)' }}>
                {t('selection_sub_cats', 'Hãy chọn một danh mục để thực hiện dự án của bạn.')}
              </p>
            )}
          </div>

          <AnimatePresence mode="wait">
            {subStep === 'category' ? (
              <motion.div 
                key="cats" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 1.05 }}
                className="basic-cat-grid"
              >
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    className={`basic-cat-card ${!cat.active ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!cat.active) return;
                      onCategoryChange(cat.id);
                      setSubStep('gallery');
                    }}
                  >
                    {cat.thumb ? (
                      <img decoding="async" loading="lazy" src={cat.thumb} alt={cat.name} className="cat-thumb" />
                    ) : (
                      <div className="cat-icon-orb">{(cat as any).icon}</div>
                    )}
                    <h3>{cat.name}</h3>
                    {!cat.active && <span className="cat-coming-soon">Sắp ra mắt</span>}
                    <div className="cat-arrow"><ArrowRight size={24} /></div>
                  </button>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="gallery"
                initial={{ opacity: 0, x: 50 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -50 }}
                className="basic-gallery-container"
              >
                {/* Nút quay lại đã được tích hợp vào global-nav bên trên */}
                
                <div className={mainBranch === 'interior' ? "interior-full-stack-gallery" : "full-width-gallery"}>
                   {galleryImages.map((img, idx) => {
                     const isInterior = mainBranch === 'interior';
                     if (isInterior && img.images && img.images.length > 0) {
                       return (
                         <div key={img.id || idx} className="interior-combo-stack-card" onClick={() => setSelectedImage(img)}>
                           <div className="combo-header-luxe">
                             <span className="combo-badge">BỘ SƯU TẬP MẪU</span>
                             <h3>{img.name}</h3>
                           </div>
                           <div className="combo-images-stack">
                             {img.images.map((url: string, i: number) => (
                               <div key={i} className="stack-image-frame">
                                 <ProtectedImage src={url} alt={`${img.name} perspective ${i+1}`} />
                               </div>
                             ))}
                           </div>
                           <div className="combo-footer-action">
                             <button className="btn-select-combo" onClick={(e) => { e.stopPropagation(); const url = img.url; const imgs = img.images; setSelectedImage(null); setTimeout(() => onSelect(url, selectedCategory, imgs), 150); }}>
                               CHỌN PHONG CÁCH NÀY <CheckCircle2 size={18} />
                             </button>
                           </div>
                         </div>
                       );
                     }
                     return (
                       <div 
                         key={img.id || idx} 
                         className={`gallery-item-luxe ${isInterior ? 'interior-item' : ''}`}
                         onClick={() => setSelectedImage(img)}
                       >
                         <ProtectedImage src={img.url} alt={img.name} />
                         <div className="gallery-overlay">
                            <CheckCircle2 size={40} className="check-icon" style={{ opacity: 0.5 }} />
                            <span>{img.name}</span>
                         </div>
                       </div>
                     );
                   })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Modal Chốt Mẫu (Fullscreen Modal) */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="samples-modal-overlay" 
                style={{ zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="preview-modal-content" style={{ background: 'var(--primary)', width: '95%', maxWidth: mainBranch === 'interior' ? '900px' : '450px', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--accent)' }}>
                  <div style={{ position: 'relative', width: '100%', aspectRatio: mainBranch === 'interior' ? 'auto' : '1/1.2' }}>
                    {mainBranch === 'interior' && selectedImage.images ? (
                      <div className="interior-preview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px' }}>
                        {selectedImage.images.map((url: string, i: number) => (
                          <ProtectedImage key={i} src={url} alt={`${selectedImage.name} ${i+1}`} style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px' }} />
                        ))}
                      </div>
                    ) : (
                        <ProtectedImage src={selectedImage.url} alt={selectedImage.name} style={{ width: '100%', height: '100%' }} />
                    )}
                    <button 
                      onClick={() => setSelectedImage(null)} 
                      style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '8px', color: '#fff', zIndex: 10 }}
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div style={{ padding: '24px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.6rem', color: 'var(--accent)', marginBottom: '10px' }}>{selectedImage.name}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '24px', fontSize: '1rem' }}>Anh/Chị đã ưng ý mẫu phong cách này và muốn KTS dùng làm chuẩn tham khảo?</p>
                    <button
                      className="btn-primary"
                      style={{ width: '100%', fontSize: '1.2rem', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                      onClick={() => {
                        const url = selectedImage.url;
                        const cats = selectedImage.images;
                        setSelectedImage(null);
                        setTimeout(() => onSelect(url, selectedCategory, cats), 150);
                      }}
                    >
                      CHỐT MẪU NÀY <CheckCircle2 size={24} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
    </motion.div>
  );
}

function PlanSelectionView({ service, onServiceChange, systemContent, mainBranch, onTestPayment }: {
  service: string;
  onServiceChange: (s: string) => void;
  systemContent: any;
  mainBranch: MainBranch;
  onTestPayment?: () => void;
}) {
  const t = (key: string, defaultVal: string) => systemContent.uiText?.[key] || defaultVal;
  const services = (mainBranch === 'landscape')
    ? [
        { id: 'basic', name: 'Gói Cơ bản', img: '/assets/GOI CANH QUAN/1. CO BAN.png', color: '#5eb44b' },
        { id: 'advanced', name: 'Gói Nâng cao', img: '/assets/GOI CANH QUAN/2. NANG CAO.png', color: '#2a7fff' },
        { id: 'premium', name: 'Gói Premium', img: '/assets/GOI CANH QUAN/3. CAO CAP.png', color: '#9146ff' }
      ]
    : [
        { id: 'basic', name: 'Gói Cơ bản', img: '/assets/GOI KIEN TRUC - NOI THAT/1. CO BAN.png', color: '#5eb44b' },
        { id: 'advanced', name: 'Gói Nâng cao', img: '/assets/GOI KIEN TRUC - NOI THAT/2. NANG CAO.png', color: '#2a7fff' },
        { id: 'premium', name: 'Gói Premium', img: '/assets/GOI KIEN TRUC - NOI THAT/3. CAO CAP.png', color: '#9146ff' }
      ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view plan-view nav-offset">
      <h2 style={{textAlign: 'center', marginBottom: '0.5rem', fontSize: '2.2rem', fontWeight: 950}}>{t('plan_title', 'Chọn Gói Giải Pháp')}</h2>

      <div className="service-list-premium">
        {services.map(s => (
          <button
            key={s.id}
            className={`service-card-premium ${service === s.name ? 'active' : ''}`}
            onClick={() => onServiceChange(s.name)}
            style={{
              padding: 0,
              border: service === s.name ? `4px solid ${s.color}` : '2px solid transparent',
              borderRadius: '24px',
              overflow: 'hidden',
              background: 'transparent',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: service === s.name ? `0 0 30px ${s.color}66` : '0 10px 30px rgba(0,0,0,0.3)'
            }}
          >
            <img decoding="async" loading="lazy"
              src={s.img}
              alt={s.name}
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                transition: 'transform 0.3s'
              }}
            />
          </button>
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', fontWeight: 600 }}>* Vui lòng chọn 1 gói bên trên để tiếp tục</span>

        {onTestPayment && (
          <button
            onClick={onTestPayment}
            style={{
              marginTop: '12px',
              padding: '12px 22px',
              borderRadius: '12px',
              border: '1.5px dashed rgba(245,158,11,0.55)',
              background: 'rgba(245,158,11,0.08)',
              color: '#f59e0b',
              fontSize: '0.85rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all .2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.18)'; e.currentTarget.style.borderStyle = 'solid'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(245,158,11,0.08)'; e.currentTarget.style.borderStyle = 'dashed'; }}
            title="Tạo đơn 1.000đ và đi thẳng tới cổng MoMo (không qua bước upload/AI)"
          >
            🧪 Test thanh toán nhanh — 1.000đ
          </button>
        )}
      </div>

    </motion.div>
  );
}

function SubmitView({
  customerName, onNameChange, customerPhone, onPhoneChange,
  onSubmit, isSubmitting, systemContent
}: {
  customerName: string; onNameChange: (n: string) => void;
  customerPhone: string; onPhoneChange: (p: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  systemContent: any;
}) {
  const t = (key: string, defaultVal: string) => systemContent.uiText?.[key] || defaultVal;
  const isReady = customerName.trim().length > 0 && customerPhone.trim().length > 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="view submit-view nav-offset">
      <div className="title-group" style={{textAlign: 'center', marginBottom: '1.5rem'}}>
        <h2 style={{ fontSize: '2.2rem' }}>{t('contact_title', 'Thông Tin Liên Hệ')}</h2>
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
      </div>

      <motion.button
        onClick={onSubmit}
        disabled={!isReady || isSubmitting}
        animate={isSubmitting ? { scale: [1, 0.98, 1], opacity: [1, 0.7, 1] } : (isReady ? { scale: [1, 1.03, 1], boxShadow: ['0 0 0px rgba(226,177,112,0)', '0 0 30px rgba(226,177,112,0.6)', '0 0 20px rgba(226,177,112,0.3)'] } : {})}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          marginTop: '36px',
          width: '100%',
          padding: '20px',
          background: isReady ? 'var(--accent)' : 'rgba(255,255,255,0.08)',
          color: isReady ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
          border: 'none',
          borderRadius: '16px',
          fontSize: '1.2rem',
          fontWeight: 900,
          letterSpacing: '0.05em',
          cursor: (isReady && !isSubmitting) ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          transition: 'background 0.4s, color 0.4s',
        }}
      >
        {isSubmitting ? (
          <><span className="generating-spinner" style={{width: 22, height: 22, borderTopColor: 'currentColor'}} /> ĐANG GỬI TÀI LIỆU LÊN TRẠM VẼ AI...</>
        ) : (
          <><Sparkles size={22} /> TẠO THIẾT KẾ NGAY</>
        )}
      </motion.button>

      {!isReady && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '12px' }}>
          Điền Họ tên và Số điện thoại để kích hoạt nút tạo thiết kế.
        </p>
      )}
    </motion.div>
  );
}

function MyProjectsView({ onBack, onViewResult }: { onBack: () => void; onViewResult: (id: string) => void }) {
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deviceId = getDeviceId();
    apiFetch(`/api/projects/by-device/${deviceId}`)
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMyProjects(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusLabel = (s: string) => {
    if (s === 'done') return { text: 'Hoàn thành', color: '#22c55e' };
    if (s === 'processing') return { text: 'Đang xử lý...', color: '#eab308' };
    return { text: 'Chờ xử lý', color: '#94a3b8' };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="view" style={{ maxWidth: '700px', width: '100%', padding: '2rem 10px', margin: '0 auto' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
        <ChevronLeft size={18} /> Quay lại
      </button>
      <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem', textAlign: 'center', color: '#0f172a' }}>Dự Án Của Tôi</h2>
      <p style={{ color: '#64748b', marginBottom: '2.5rem', textAlign: 'center', fontSize: '0.95rem' }}>Các thiết kế đã tạo trên thiết bị này</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <RefreshCcw size={32} className="spin" color="var(--accent)" />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.5)' }}>Đang tải...</p>
        </div>
      ) : myProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Camera size={48} color="rgba(255,255,255,0.2)" />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.4)' }}>Chưa có dự án nào trên thiết bị này</p>
          <button className="btn-primary" onClick={onBack} style={{ marginTop: '1.5rem' }}>Thiết kế cảnh quan</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myProjects.map((p) => {
            const st = statusLabel(p.status);
            const previewImg = (p.aiResults && p.aiResults.length > 0) ? p.aiResults[0] : p.rawImage;
            return (
              <div
                key={p.id}
                onClick={() => p.status === 'done' || p.status === 'processing' ? onViewResult(p.id) : null}
                style={{
                  display: 'flex', gap: '16px', alignItems: 'center',
                  background: '#ffffff', borderRadius: '16px', padding: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  cursor: p.status === 'done' || p.status === 'processing' ? 'pointer' : 'default',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <img
decoding="async" loading="lazy"                   src={previewImg} alt=""
                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '10px', flexShrink: 0, background: '#f1f5f9' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#0f172a' }}>
                    {p.customerName || 'Dự án'}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {p.service} — {new Date(p.timestamp).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: st.color, background: `${st.color}20`, padding: '3px 10px', borderRadius: '20px' }}>
                    {st.text}
                  </span>
                  {p.aiResults && p.aiResults.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{p.aiResults.length} ảnh</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function SuccessView({ projectId, service, onReset, retryCount = 0, onRetry, isRetrying = false, onBack }: { projectId: string; service: string; onReset: () => void; retryCount?: number; onRetry?: () => void; isRetrying?: boolean; onBack?: () => void }) {
  const [pass2Picked, setPass2Picked] = useState('');
  const [pass2W, setPass2W] = useState('4');
  const [pass2L, setPass2L] = useState('4');
  const [pass2Starting, setPass2Starting] = useState(false);
  const [pass2Msg, setPass2Msg] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [previousImages, setPreviousImages] = useState<string[]>([]);
  const presetPay = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('pay') : null;
  const [paymentOpen, setPaymentOpen] = useState(!!presetPay);
  const isPaid = (project as any)?.payment?.status === 'paid';

  useEffect(() => {
    // Poll for Gói Cơ bản and Gói Nâng cao
    const isAuto = service === 'Gói Cơ Bản' || service === 'Gói Cơ bản' || service === 'Gói Nâng cao';
    if (!projectId || !isAuto) return;

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

  // Khi retry, lưu ảnh cũ trước khi projectId thay đổi
  useEffect(() => {
    if (retryCount > 0 && project?.aiResults && project.aiResults.length > 0) {
      setPreviousImages(prev => prev.length === 0 ? project.aiResults! : prev);
    }
  }, [retryCount, project]);

  const isAutoPlan = service === 'Gói Cơ Bản' || service === 'Gói Cơ bản' || service === 'Gói Nâng cao';

  if (isAutoPlan) {
    const isDone = project?.status === 'done';
    const images = project?.aiResults || [];
    const allImages = retryCount > 0 && isDone ? [...previousImages, ...images] : images;

    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view" style={{ position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto', paddingTop: '3rem' }}>
         {onBack && (
           <button onClick={onBack} style={{ position: 'absolute', top: '0', left: '0', background: 'none', border: 'none', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '10px 0', zIndex: 10 }}>
             <ChevronLeft size={18} /> Quay lại
           </button>
         )}
         {!isDone ? (
           <>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                 <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: '4px solid rgba(226,177,112,0.2)', borderTopColor: '#e2b170', animation: 'spin 1s linear infinite' }} />
                 <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111', letterSpacing: '0.05em' }}>ĐANG XỬ LÝ</span>
               </div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', textAlign: 'center', whiteSpace: 'nowrap' }}>Hệ thống đang tạo phương án thiết kế (~5 phút).</h2>
             <p className="hint" style={{ fontSize: '1rem', color: '#555', lineHeight: '1.6', textAlign: 'center' }}>
               Bạn có thể theo dõi trực tiếp tại đây hoặc xem trong mục <strong style={{color: 'var(--accent)'}}>“Dự án của bạn”</strong> khi hoàn tất.
             </p>
             {images.length > 0 && <p style={{color: '#e2b170', fontWeight: 'bold', fontSize: '1.1rem', marginTop: '1rem', textAlign: 'center'}}>Đã hoàn thiện {images.length}/2 phương án...</p>}
             {previousImages.length > 0 && (
               <>
                 <p style={{ fontSize: '0.85rem', color: '#888', marginTop: '1rem', textAlign: 'center', fontWeight: 600 }}>Kết quả lần 1:</p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '8px', width: '100%' }}>
                   {previousImages.map((url, i) => (
                     <div key={`prev-${i}`} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16/10' }}>
                       <ProtectedImage src={url} alt={`Lần 1 - ${i+1}`} />
                       <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.7)', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                         Lần 1 - PA{i + 1}
                       </div>
                     </div>
                   ))}
                 </div>
               </>
             )}
           </>
         ) : (
           <>
             <div className="success-icon"><CheckCircle2 size={48} /></div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111', textAlign: 'center' }}>Đã hoàn thành bản vẽ!</h2>
             <p className="hint" style={{ fontSize: '0.85rem' }}>
               {retryCount > 0 ? `Tổng cộng ${allImages.length} phương án từ ${retryCount + 1} lần thiết kế.` : 'Dưới đây là các phương án thiết kế AI.'}
             </p>
           </>
         )}

         {allImages.length > 0 && isDone && (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '1rem', width: '100%' }}>
             {allImages.map((url, i) => {
               const isOld = retryCount > 0 && i < previousImages.length;
               const label = retryCount > 0
                 ? (isOld ? `Lần 1 - PA${i + 1}` : `Lần 2 - PA${i - previousImages.length + 1}`)
                 : `Phương án ${i + 1}`;
               return (
                 <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)', aspectRatio: '16/10' }}>
                   <ProtectedImage src={url} alt={label} />
                   <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: isOld ? 'rgba(0,0,0,0.7)' : 'rgba(226,177,112,0.85)', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.75rem', color: isOld ? '#fff' : '#000' }}>
                     {label}
                   </div>
                 </div>
               );
             })}
           </div>
         )}

{!isDone && images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '1rem', width: '100%' }}>
            {images.map((url, i) => (
              <div key={i} style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16/10' }}>
                <ProtectedImage src={url} alt={`Phương án ${i+1}`} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', background: 'rgba(0,0,0,0.7)', padding: '5px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                  Phương án {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

         {isDone && (
           <div style={{ marginTop: '1.5rem', width: '100%', textAlign: 'center' }}>
             {/* SHARE LINK BLOCK */}
             <div style={{
               background: '#ffffff',
               borderRadius: '14px', padding: '14px', marginBottom: '1rem',
               border: '1.5px solid rgba(212,163,115,0.25)',
               boxShadow: '0 4px 14px rgba(28,20,12,0.05)'
             }}>
               <p style={{ fontSize: '0.78rem', color: '#7c5c2e', marginBottom: '8px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Link xem kết quả</p>
               <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                 <code style={{ background: 'rgba(212,163,115,0.12)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', wordBreak: 'break-all', color: '#1a1a1a', fontWeight: 600, border: '1px solid rgba(212,163,115,0.25)' }}>
                   {window.location.origin}/result/{projectId}
                 </code>
                 <button
                   onClick={() => {
                     navigator.clipboard.writeText(`${window.location.origin}/result/${projectId}`);
                     alert('Đã sao chép link!');
                   }}
                   style={{ padding: '8px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, #d4a373, #b88857)', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.82rem', boxShadow: '0 4px 12px rgba(212,163,115,0.3)' }}
                 >
                   Sao chép
                 </button>
               </div>
             </div>
             {/* PAYMENT BLOCK */}
             <div style={{
               marginBottom: '12px', padding: '18px', borderRadius: '16px',
               background: isPaid
                 ? 'linear-gradient(135deg, rgba(34,197,94,0.08), #ffffff 80%)'
                 : 'linear-gradient(135deg, rgba(165,0,100,0.06), #ffffff 80%)',
               border: isPaid ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid rgba(165,0,100,0.3)',
               boxShadow: isPaid ? '0 4px 14px rgba(34,197,94,0.1)' : '0 4px 14px rgba(165,0,100,0.08)',
               textAlign: 'left'
             }}>
               {isPaid ? (
                 <>
                   <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d', marginBottom: '12px', textAlign: 'center' }}>
                     ✅ Đã thanh toán — Tải về toàn bộ tài liệu
                   </p>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                     {[
                       ...(project?.aiResults || []),
                       ...((project as any)?.pass2Results?.tasks || []).filter((t: any) => t.url).map((t: any) => t.url)
                     ].map((url: string, i: number) => {
                       const isVid = url.endsWith('.mp4') || url.includes('/video/');
                       return (
                         <a key={`${url}-${i}`} href={url} download
                           style={{ padding: '10px 12px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1.5px solid rgba(34,197,94,0.4)', color: '#15803d', fontWeight: 800, fontSize: '0.82rem', textAlign: 'center', textDecoration: 'none' }}
                         >
                           ⬇ {isVid ? `Video ${i + 1}` : `Ảnh ${i + 1}`}
                         </a>
                       );
                     })}
                   </div>
                 </>
               ) : (
                 <>
                   <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a1a1a', marginBottom: '4px', textAlign: 'center' }}>
                     Tải bản vẽ chất lượng cao
                   </p>
                   <p style={{ fontSize: '0.82rem', color: '#7c5c2e', marginBottom: '14px', textAlign: 'center' }}>
                     Thanh toán để tải ảnh và video độ phân giải cao về máy.
                   </p>
                   <button
                     onClick={() => setPaymentOpen(true)}
                     style={{
                       width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800,
                       border: 'none', cursor: 'pointer',
                       background: 'linear-gradient(135deg, #a50064, #d6336c)', color: '#fff',
                       display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                       boxShadow: '0 8px 22px rgba(165,0,100,0.3)'
                     }}
                   >
                     💳 Thanh toán để tải bản vẽ
                   </button>
                 </>
               )}
             </div>

             {retryCount < 1 && onRetry && (
               <button
                 onClick={onRetry}
                 disabled={isRetrying}
                 style={{
                   width: '100%',
                   padding: '14px',
                   marginBottom: '10px',
                   background: isRetrying ? 'rgba(212,163,115,0.15)' : '#ffffff',
                   border: '2px solid var(--accent)',
                   borderRadius: '14px',
                   color: '#7c5c2e',
                   fontSize: '0.95rem',
                   fontWeight: 800,
                   cursor: isRetrying ? 'wait' : 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   gap: '10px',
                   boxShadow: '0 4px 14px rgba(212,163,115,0.15)'
                 }}
               >
                 {isRetrying ? (
                   <><RefreshCcw size={18} className="spin" /> Đang gửi lại...</>
                 ) : (
                   <><RefreshCcw size={18} /> Thử lại lần 2 — Tìm mẫu ưng ý hơn</>
                 )}
               </button>
             )}

             {/* PASS 2 CTA — chỉ hiện khi chưa chạy */}
             {!project?.pass2Results && allImages.length > 0 && (
               <div style={{
                 marginBottom: '10px', padding: '18px', borderRadius: '16px',
                 background: 'linear-gradient(135deg, rgba(250,204,21,0.10), #ffffff 80%)',
                 border: '1.5px solid rgba(202,138,4,0.35)',
                 boxShadow: '0 4px 14px rgba(202,138,4,0.08)',
                 textAlign: 'left'
               }}>
                 <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#854d0e', marginBottom: '4px', textAlign: 'center' }}>
                   ⭐ Tiếp tục tạo bổ sung (7 bản)
                 </p>
                 <p style={{ fontSize: '0.8rem', color: '#7c5c2e', marginBottom: '14px', textAlign: 'center', lineHeight: 1.5 }}>
                   Chọn 1 phương án ưng ý nhất, hệ thống sẽ tạo thêm:<br />
                   <strong style={{ color: '#854d0e' }}>3 góc chụp · 2 bản vẽ · 2 video</strong>
                 </p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                   {allImages.slice(0, 8).map((url, i) => {
                     const isOldImg = retryCount > 0 && i < previousImages.length;
                     const label = retryCount > 0
                       ? (isOldImg ? `L1-${i + 1}` : `L2-${i - previousImages.length + 1}`)
                       : `PA${i + 1}`;
                     return (
                       <div key={i} onClick={() => setPass2Picked(url)} style={{
                         position: 'relative', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                         border: pass2Picked === url ? '3px solid #ca8a04' : '2px solid rgba(212,163,115,0.3)',
                         opacity: pass2Picked === url ? 1 : 0.7, transition: 'all 0.15s', aspectRatio: '1',
                         boxShadow: pass2Picked === url ? '0 6px 20px rgba(202,138,4,0.4)' : 'none'
                       }}>
                         <img decoding="async" loading="lazy" src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '0.6rem', padding: '3px', textAlign: 'center', fontWeight: 700 }}>{label}</div>
                       </div>
                     );
                   })}
                 </div>
                 <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                   <input type="number" min="1" step="0.5" value={pass2W} onChange={e => setPass2W(e.target.value)} placeholder="Ngang (m)"
                     style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffffff', color: '#1a1a1a', border: '1.5px solid rgba(202,138,4,0.3)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }} />
                   <span style={{ color: '#854d0e', fontWeight: 700 }}>×</span>
                   <input type="number" min="1" step="0.5" value={pass2L} onChange={e => setPass2L(e.target.value)} placeholder="Dài (m)"
                     style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#ffffff', color: '#1a1a1a', border: '1.5px solid rgba(202,138,4,0.3)', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }} />
                 </div>
                 <button
                   disabled={!pass2Picked || pass2Starting}
                   onClick={async () => {
                     if (!pass2Picked) return;
                     setPass2Starting(true);
                     setPass2Msg('');
                     try {
                       const res = await apiFetch(`/api/projects/${projectId}/pass2`, {
                         method: 'POST', headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ referenceImageUrl: pass2Picked, dimensions: { width: parseFloat(pass2W) || 4, length: parseFloat(pass2L) || 4 } })
                       });
                       const data = await res.json();
                       if (!res.ok) throw new Error(data.error || 'Không khởi động được.');
                       setPass2Msg('Đã bắt đầu tạo! Vui lòng giữ trang, kết quả sẽ hiện bên dưới.');
                     } catch (e: any) { setPass2Msg(`Lỗi: ${e.message}`); }
                     finally { setPass2Starting(false); }
                   }}
                   style={{
                     width: '100%', padding: '14px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 800,
                     border: 'none', cursor: !pass2Picked || pass2Starting ? 'not-allowed' : 'pointer',
                     background: pass2Picked ? 'linear-gradient(135deg, #ca8a04 0%, #a16207 100%)' : 'rgba(202,138,4,0.15)',
                     color: pass2Picked ? '#fff' : '#a16207',
                     boxShadow: pass2Picked ? '0 8px 22px rgba(202,138,4,0.35)' : 'none',
                     transition: 'all .2s'
                   }}
                 >
                   {pass2Starting ? 'Đang khởi động...' : '✨ Tiếp tục tạo bổ sung'}
                 </button>
                 {pass2Msg && <p style={{ fontSize: '0.78rem', fontWeight: 600, color: pass2Msg.startsWith('Lỗi') ? '#b91c1c' : '#15803d', marginTop: '10px', textAlign: 'center' }}>{pass2Msg}</p>}
               </div>
             )}

             {/* PASS 2 PROGRESS + RESULTS */}
             {project?.pass2Results && (
               <div style={{
                 marginBottom: '10px', padding: '16px', borderRadius: '16px',
                 background: 'linear-gradient(135deg, rgba(250,204,21,0.06), #ffffff 80%)',
                 border: '1.5px solid rgba(202,138,4,0.25)',
                 boxShadow: '0 4px 14px rgba(202,138,4,0.05)',
                 textAlign: 'left'
               }}>
                 <p style={{ fontSize: '0.95rem', fontWeight: 800, color: '#854d0e', marginBottom: '12px', textAlign: 'center' }}>
                   Kết quả bổ sung — {project.pass2Results.tasks?.filter(t => t.status === 'done').length || 0}/7 xong
                   {project.pass2Results.status === 'running' && ' · đang xử lý...'}
                   {project.pass2Results.status === 'done' && ' · ✅ Hoàn tất'}
                   {project.pass2Results.status === 'failed' && ' · ❌ Lỗi'}
                 </p>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                   {project.pass2Results.tasks?.map(task => (
                     <div key={task.taskId} style={{ borderRadius: '10px', overflow: 'hidden', background: '#ffffff', border: '1.5px solid rgba(212,163,115,0.2)', boxShadow: '0 2px 8px rgba(28,20,12,0.04)' }}>
                       {task.url ? (
                         task.type === 'video'
                           ? <video src={task.url} controls style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block', background: '#000' }} />
                           : <img decoding="async" loading="lazy" src={task.url} alt={task.label} style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', display: 'block' }} />
                       ) : (
                         <div style={{ aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c5c2e', fontSize: '0.75rem', background: 'rgba(212,163,115,0.08)', fontWeight: 600 }}>
                           {task.status === 'failed' ? '❌' : task.status === 'running' ? '⏳ Đang tạo...' : '... chờ'}
                         </div>
                       )}
                       <div style={{ padding: '8px', fontSize: '0.72rem', color: '#1a1a1a', fontWeight: 700, textAlign: 'center', background: 'rgba(212,163,115,0.06)' }}>{task.label}</div>
                       {(task.status === 'failed' || (task.status === 'done' && !task.url)) && (
                         <button
                           onClick={async () => {
                             try {
                               const res = await apiFetch(`/api/projects/${projectId}/pass2/retry`, {
                                 method: 'POST', headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify({ taskId: task.taskId })
                               });
                               if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Retry failed'); }
                             } catch (e: any) { alert(`Lỗi: ${e.message}`); }
                           }}
                           style={{ width: '100%', padding: '8px', border: 'none', background: '#ca8a04', color: '#fff', fontWeight: 800, fontSize: '0.74rem', cursor: 'pointer' }}
                         >
                           🔄 Thử lại
                         </button>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <button className="btn-primary main-cta" onClick={onReset} style={{ fontSize: '0.95rem', padding: '14px' }}>
               Tạo Dự Án Mới
             </button>
           </div>
         )}
        <PaymentModal
          projectId={projectId}
          open={paymentOpen}
          presetPackageId={presetPay as any || undefined}
          onClose={() => setPaymentOpen(false)}
          onPaid={async () => {
            try {
              const res = await apiFetch(`/api/projects/${projectId}`);
              if (res.ok) setProject(await res.json());
            } catch { /* ignore */ }
            setPaymentOpen(false);
          }}
        />
      </motion.div>
    );
  }

  // Hiển thị cho các gói không phải "Gói Cơ Bản"
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="view success-view" style={{ maxWidth: '600px', width: '90%', textAlign: 'center' }}>
      <div className="success-icon" style={{ marginBottom: '2rem' }}>
        <CheckCircle2 size={100} color="var(--accent)" style={{ filter: 'drop-shadow(0 0 15px rgba(212, 163, 115, 0.4))' }} />
      </div>
      <h2 style={{ fontSize: '1.6rem', fontWeight: 850, marginBottom: '1.2rem', lineHeight: '1.4' }}>
        Đội ngũ KTS đã tiếp nhận dự án. Chúng tôi sẽ sớm liên hệ qua điện thoại hoặc Zalo để triển khai.
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
        Cảm ơn bạn đã tin tưởng dịch vụ thiết kế chuyên nghiệp của Sơn Hải.
      </p>
      <button className="btn-primary main-cta" onClick={onReset} style={{ width: '100%' }}>
        Quay lại Trang Chủ
      </button>
    </motion.div>
  );
}

// --- HELPER WRAPPER FOR ASSET MANAGER ---
function AssetManagerView({ systemContent, onSystemContentUpdate, onSync, onFeedback, onClose, adminBranch }: { 
  systemContent: any, onSystemContentUpdate: (c: any) => void, onSync: () => Promise<boolean>, onFeedback: (msg: string) => void, onClose: () => void, adminBranch: MainBranch 
}) {
  const getBranchCats = (branch: MainBranch) => {
    if (branch === 'architecture') return ['NHA_PHO', 'BIET_THU', 'NHA_CAP_4', 'NHA_VUON', 'NHA_TIEN_CHE'];
    if (branch === 'interior') return ['HIEN_DAI', 'TAN_CO_DIEN', 'INDOCHINE', 'WABI_SABI', 'TAN_CO_DIEN_GO'];
    return ['HO', 'HO_HIEN_DAI', 'TUONG_DA', 'TUONG_CAY', 'FARM', 'CAFE', 'HO_BOI'];
  };

  const libraryCats = getBranchCats(adminBranch);
  const [selectedCat, setSelectedCat] = useState<string>(libraryCats[0]);

  // Update selectedCat when adminBranch changes
  useEffect(() => {
    setSelectedCat(getBranchCats(adminBranch)[0]);
    setSelectedItem(null);
  }, [adminBranch]);

  const catItems = libraryCats.includes(selectedCat)
    ? (systemContent.library?.[selectedCat] || (ASSETS as any)[selectedCat] || [])
    : [];
  
  const replacerRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null); // For drill-down variants
  const [pendingReplace, setPendingReplace] = useState<{ 
    type: 'tip' | 'plan' | 'library' | 'variant', 
    planIdx?: number, 
    mediaIdx?: number, 
    cat?: string, 
    itemId?: string,
    variantId?: string 
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const handleGlobalSync = async () => {
    setIsSyncing(true);
    onFeedback('Đang kết nối database và xuất bản dữ liệu...');
    const success = await onSync();
    setIsSyncing(false);
    if (success) {
      onFeedback('✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG LÊN TOÀN HỆ THỐNG!');
    } else {
      onFeedback('❌ LỖI KẾT NỐI! Vui lòng kiểm tra lại Backend/ngrok.');
    }
  };

  // Xóa 1 biến thể khỏi mẫu cha
  const handleDeleteVariant = (vIdx: number) => {
    if (!selectedItem) return;
    const currentLib = systemContent.library || ASSETS;
    const newLib = { ...currentLib };
    const cat = selectedCat as keyof typeof ASSETS;
    const catList = [...(newLib[cat] || (ASSETS as any)[cat] || [])];
    const pIdx = catList.findIndex((it: any) => it.id === selectedItem.id);
    if (pIdx !== -1) {
      const vars = [...(catList[pIdx].variants || [])];
      vars.splice(vIdx, 1);
      catList[pIdx] = { ...catList[pIdx], variants: vars };
      newLib[cat] = catList as any;
      onSystemContentUpdate({ ...systemContent, library: newLib });
      setSelectedItem(catList[pIdx]);
      onFeedback(`Đã xóa biến thể khỏi mẫu.`);
    }
  };

  // Xóa 1 mẫu cha khỏi danh mục
  const handleDeleteItem = (itemId: string) => {
    if (!window.confirm('Xóa mẫu này khỏi hệ thống?')) return;
    const currentLib = systemContent.library || ASSETS;
    const newLib = { ...currentLib };
    const cat = selectedCat as keyof typeof ASSETS;
    const catList = (newLib[cat] || (ASSETS as any)[cat] || []).filter((it: any) => it.id !== itemId);
    newLib[cat] = catList as any;
    onSystemContentUpdate({ ...systemContent, library: newLib });
    setSelectedItem(null);
    onFeedback(`Đã xóa mẫu khỏi hệ thống. Nhấn "ĐỒNG BỘ HỆ THỐNG" để lưu thay đổi.`);
  };

  // Xóa toàn bộ danh mục
  const handleClearCategory = () => {
    const catLabel = { HO: 'Hồ Koi Cổ Điển', HO_HIEN_DAI: 'Hồ Koi Hiện Đại', TUONG_DA: 'Tường Đá', TUONG_CAY: 'Tường Cây', FARM: 'Farm & Du Lịch', CAFE: 'Cà Phê', HO_BOI: 'Hồ Bơi' }[selectedCat] || selectedCat;
    if (!window.confirm(`XÓA TOÀN BỘ "${catLabel}"?\n\nHành động này không thể hoàn tác.`)) return;
    const currentLib = systemContent.library || ASSETS;
    const newLib = { ...currentLib };
    const cat = selectedCat as keyof typeof ASSETS;
    newLib[cat] = [] as any;
    onSystemContentUpdate({ ...systemContent, library: newLib });
    setSelectedItem(null);
    onFeedback(`Đã xóa toàn bộ danh mục "${catLabel}". Nhấn "ĐỒNG BỘ HỆ THỐNG" để lưu.`);
  };

  const handleMediaReplace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingReplace) return;
    
    onFeedback('Đang xử lý và tải lên máy chủ...');
    const reader = new FileReader();
    reader.onload = async ev => {
      let result = ev.target?.result as string;
      
      // Upload to Cloudinary if possible
      try {
        const uploadRes = await apiFetch('/api/upload', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ file: result })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) result = uploadData.url;
      } catch (err) {
        console.warn('Backend upload failed, using local result:', err);
      }

      if (pendingReplace.type === 'tip') {
        onSystemContentUpdate({ ...systemContent, tips: { ...systemContent.tips, sampleImage: result } });
        onFeedback('Đã cập nhật ảnh minh họa mẹo chụp.');
      } else if (pendingReplace.type === 'plan' && pendingReplace.planIdx !== undefined && pendingReplace.mediaIdx !== undefined) {
        const newPlans = [...systemContent.plans];
        newPlans[pendingReplace.planIdx].media[pendingReplace.mediaIdx].url = result;
        onSystemContentUpdate({ ...systemContent, plans: newPlans });
        onFeedback('Đã cập nhật tệp mẫu cho gói dịch vụ.');
      } else if (pendingReplace.type === 'library' && pendingReplace.cat && pendingReplace.itemId) {
        const currentLib = systemContent.library || ASSETS;
        const newLib = { ...currentLib };
        const cat = pendingReplace.cat as keyof typeof ASSETS;
        const catList = [...(newLib[cat] || (ASSETS as any)[cat])];
        const idx = catList.findIndex((it: any) => it.id === pendingReplace.itemId);
        if (idx !== -1) {
          if (pendingReplace.mediaIdx !== undefined) {
            const newImages = [...(catList[idx].images || Array(4).fill(catList[idx].url))];
            newImages[pendingReplace.mediaIdx] = result;
            catList[idx] = { ...catList[idx], images: newImages };
            if (pendingReplace.mediaIdx === 0) catList[idx].url = result;
          } else {
            catList[idx] = { ...catList[idx], url: result };
          }
          newLib[cat] = catList as any;
          onSystemContentUpdate({ ...systemContent, library: newLib });
          onFeedback(`Đã cập nhật ảnh mẫu cho ${catList[idx].name}.`);
        }
      } else if (pendingReplace.type === 'variant' && pendingReplace.cat && pendingReplace.itemId && pendingReplace.variantId) {
        const currentLib = systemContent.library || ASSETS;
        const newLib = { ...currentLib };
        const cat = pendingReplace.cat as keyof typeof ASSETS;
        const catList = [...(newLib[cat] || (ASSETS as any)[cat])];
        const pIdx = catList.findIndex((it: any) => it.id === pendingReplace.itemId);
        if (pIdx !== -1) {
          const variants = [...(catList[pIdx].variants || [])];
          const vIdx = variants.findIndex(v => v.id === pendingReplace.variantId);
          if (vIdx !== -1) {
            if (pendingReplace.mediaIdx !== undefined && variants[vIdx].images) {
              const newImages = [...variants[vIdx].images];
              newImages[pendingReplace.mediaIdx] = result;
              variants[vIdx] = { ...variants[vIdx], images: newImages };
              // Also update main url to the first image if it's the first one
              if (pendingReplace.mediaIdx === 0) variants[vIdx].url = result;
            } else {
              variants[vIdx] = { ...variants[vIdx], url: result };
            }
            catList[pIdx] = { ...catList[pIdx], variants };
            newLib[cat] = catList as any;
            onSystemContentUpdate({ ...systemContent, library: newLib });
            onFeedback(`Đã cập nhật ảnh biến thể ${variants[vIdx].name}.`);
            if (selectedItem?.id === pendingReplace.itemId) setSelectedItem(catList[pIdx]);
          }
        }
      }
      setPendingReplace(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="asset-manager-workspace-fixed">
      <input type="file" ref={replacerRef} onChange={handleMediaReplace} hidden />
      <div className="workspace-sidebar">
        <div className="sidebar-header-luxe">
           <button onClick={onClose} className="btn-exit-workspace"><ChevronLeft size={20} /> QUAY LẠI TRANG CHỦ</button>
           <h3>KHO TÀI NGUYÊN</h3>
        </div>

        <div className="sidebar-group">
          <label>DANH MỤC THƯ VIỆN</label>
          {libraryCats.map(cat => {
            const labelMap: Record<string, string> = {
              HO: 'MẪU HỒ KOI CỔ ĐIỂN',
              HO_HIEN_DAI: 'MẪU HỒ KOI HIỆN ĐẠI',
              TUONG_DA: 'MẪU TƯỜNG ĐÁ TRANG TRÍ',
              TUONG_CAY: 'MẪU TƯỜNG CÂY & VƯỜN',
              FARM: 'MẪU FARM & DU LỊCH',
              CAFE: 'MẪU CẢNH QUAN CÀ PHÊ',
              HO_BOI: 'MẪU HỒ BƠI THIÊN NHIÊN',
              NHA_PHO: 'MẪU NHÀ PHỐ',
              BIET_THU: 'MẪU BIỆT THỰ',
              NHA_CAP_4: 'MẪU NHÀ CẤP 4',
              NHA_VUON: 'MẪU NHÀ VƯỜN',
              NHA_TIEN_CHE: 'MẪU NHÀ TIỀN CHẾ',
              HIEN_DAI: 'NỘI THẤT HIỆN ĐẠI',
              TAN_CO_DIEN: 'NỘI THẤT TÂN CỔ ĐIỂN',
              INDOCHINE: 'NỘI THẤT INDOCHINE',
              WABI_SABI: 'NỘI THẤT WABI SABI',
              TAN_CO_DIEN_GO: 'TÂN CỔ ĐIỂN GỖ'
            };
            const iconMap: Record<string, any> = {
              HO: <Waves size={18} />,
              HO_HIEN_DAI: <Monitor size={18} />,
              TUONG_DA: <Layers size={18} />,
              TUONG_CAY: <Sprout size={18} />,
              FARM: <Map size={18} />,
              CAFE: <Coffee size={18} />,
              HO_BOI: <Droplets size={18} />,
              NHA_PHO: <Box size={18} />,
              BIET_THU: <Crown size={18} />,
              NHA_CAP_4: <Home size={18} />,
              NHA_VUON: <Map size={18} />,
              NHA_TIEN_CHE: <Layers size={18} />,
              HIEN_DAI: <Monitor size={18} />,
              TAN_CO_DIEN: <ShieldCheck size={18} />,
              INDOCHINE: <Sprout size={18} />,
              WABI_SABI: <Waves size={18} />,
              TAN_CO_DIEN_GO: <Layers size={18} />
            };
            return (
              <button 
                key={cat} 
                className={selectedCat === cat ? 'active' : ''} 
                onClick={() => { setSelectedCat(cat); setSelectedItem(null); }}
              >
                {iconMap[cat] || <Layers size={18} />} {labelMap[cat] || cat}
              </button>
            );
          })}
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-group">
          <label>NỘI DUNG GIAO DIỆN</label>
          <button className={selectedCat === 'PLANS' ? 'active' : ''} onClick={() => setSelectedCat('PLANS')}><Crown size={18} /> GÓI DỊCH VỤ</button>
          <button className={selectedCat === 'TIPS' ? 'active' : ''} onClick={() => setSelectedCat('TIPS')}><Zap size={18} /> MẸO CHỤP ẢNH</button>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-group">
          <label>CÔNG CỤ HỆ THỐNG</label>
          <button className={selectedCat === 'AI_STUDIO' ? 'active' : ''} onClick={() => setSelectedCat('AI_STUDIO')}><Bot size={18} /> AI ASSET STUDIO</button>
          <button className={selectedCat === 'LOGIC' ? 'active' : ''} onClick={() => setSelectedCat('LOGIC')}><Monitor size={18} /> CẤU HÌNH LOGIC & VIDEO</button>
        </div>

        <div className="sidebar-footer-info" style={{ padding: '0 20px' }}>
           <Info size={16} />
           <p>Giao diện điều hành hệ thống chuyên sâu dành cho Kỹ thuật viên.</p>
        </div>

        <div className="sidebar-group" style={{ marginTop: 'auto', padding: '10px' }}>
           <button 
             className={`btn-sync-global ${isSyncing ? 'loading' : ''}`}
             onClick={handleGlobalSync}
             style={{
               width: '100%',
               padding: '16px',
               background: 'linear-gradient(135deg, #ff9d00, #ff5e00)',
               color: '#fff',
               border: 'none',
               borderRadius: '12px',
               fontWeight: 900,
               fontSize: '0.9rem',
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '10px',
               boxShadow: '0 10px 20px rgba(255,94,0,0.3)',
               animation: isSyncing ? 'pulse 1s infinite' : 'none'
             }}
           >
             {isSyncing ? <Loader2 className="animate-spin" size={20} /> : <Share2 size={20} />}
             LƯU & XUẤT BẢN TOÀN HỆ THỐNG
           </button>
        </div>
      </div>
      
      <div className="workspace-main-content">
        {selectedCat === 'AI_STUDIO' ? (
          <div className="ai-studio-integrated">
            <div className="studio-hero">
              <h2>AI ASSET STUDIO <Sparkles size={32} /></h2>
              <p>Mô tả và yêu cầu AI chỉnh sửa, resize hoặc tối ưu hóa hình ảnh tài nguyên.</p>
            </div>
            <div className="studio-work-area">
              <div className="upload-studio-box" onClick={() => onFeedback('Bấm để chọn ảnh cần xử lý')}>
                <Upload size={64} />
                <span>Tải ảnh gốc cần Resize / AI Edit</span>
              </div>
              <AIStudioContent onFeedback={onFeedback} />
            </div>
          </div>
        ) : selectedCat === 'TIPS' ? (
          <div className="logic-editor-box">
             <div className="manager-header">
               <h3>Quản lý: Mẹo chụp ảnh hiện trạng</h3>
             </div>
             <div className="tips-editor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
               <div className="tips-form">
                  <label>Tiêu đề vùng</label>
                  <input className="luxe-input" value={systemContent.tips.title} onChange={e => {
                    const newTips = {...systemContent.tips, title: e.target.value};
                    onSystemContentUpdate({...systemContent, tips: newTips});
                  }} style={{width: '100%', background: '#000', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #444', marginBottom: '15px'}} />
                  
                  <label style={{marginTop: '20px', display: 'block'}}>Danh sách mẹo (Mỗi dòng 1 mẹo)</label>
                  <textarea className="luxe-textarea" style={{height: '200px', width: '100%', background: '#000', color: '#fff', padding: '15px', borderRadius: '12px', border: '1px solid #444'}} value={systemContent.tips.items.join('\n')} onChange={e => {
                    const newTips = {...systemContent.tips, items: e.target.value.split('\n')};
                    onSystemContentUpdate({...systemContent, tips: newTips});
                  }} />
               </div>
               <div className="tips-visual">
                  <label>Ảnh minh họa mẹo chụp</label>
                  <div className="asset-card-admin" style={{marginTop: '10px'}}>
                    <div className="asset-preview-box">
                      <img decoding="async" loading="lazy" src={systemContent.tips.sampleImage} alt="Tips" />
                      <div className="asset-actions-overlay">
                        <button onClick={() => { setPendingReplace({ type: 'tip' }); replacerRef.current?.click(); }}>THAY THẾ ẢNH</button>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
             <button className="btn-save-logic" style={{marginTop: '30px'}} onClick={() => onFeedback('Hệ thống đã tự động lưu thay đổi Mẹo chụp ảnh.')}>CẬP NHẬT GIAO DIỆN</button>
          </div>
        ) : selectedCat === 'PLANS' ? (
          <div className="logic-editor-box">
             <div className="manager-header">
               <h3>Quản lý: Dữ liệu mẫu các Gói dịch vụ</h3>
             </div>
             <div className="plans-editor-scroll" style={{display: 'flex', flexDirection: 'column', gap: '40px'}}>
                {systemContent.plans.map((p: any, pIdx: number) => (
                  <div key={p.id} className="plan-edit-card" style={{background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)'}}>
                    <h4 style={{color: 'var(--accent)', fontSize: '1.4rem', marginBottom: '15px', fontWeight: 900}}>{p.name}</h4>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                      <div>
                        <label>Tiêu đề hiển thị</label>
                        <input className="luxe-input" value={p.header} onChange={e => {
                          const newPlans = [...systemContent.plans];
                          newPlans[pIdx].header = e.target.value;
                          onSystemContentUpdate({...systemContent, plans: newPlans});
                        }} style={{width: '100%', background: '#000', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #444', marginBottom: '15px'}} />
                        
                        <label>Mô tả phụ</label>
                        <textarea className="luxe-input" value={p.sub} onChange={e => {
                          const newPlans = [...systemContent.plans];
                          newPlans[pIdx].sub = e.target.value;
                          onSystemContentUpdate({...systemContent, plans: newPlans});
                        }} style={{width: '100%', height: '80px', background: '#000', color: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #444'}} />
                      </div>
                      <div className="plan-media-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px'}}>
                        {p.media.map((m: any, mIdx: number) => (
                          <div key={mIdx} className="asset-preview-box" style={{borderRadius: '8px', overflow: 'hidden', height: '80px'}}>
                             {m.type === 'video' ? <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222'}}><VideoIcon size={20} /></div> : <img decoding="async" loading="lazy" src={m.url} alt="plan" style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
                             <div className="asset-actions-overlay">
                                <button style={{padding: '4px', fontSize: '0.6rem'}} onClick={() => { setPendingReplace({ type: 'plan', planIdx: pIdx, mediaIdx: mIdx }); replacerRef.current?.click(); }}>EDIT</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
             </div>
             <button className="btn-save-logic" style={{marginTop: '30px'}} onClick={() => onFeedback('Toàn bộ dữ liệu gói đã được lưu thành công.')}>LƯU TOÀN BỘ DỮ LIỆU GÓI</button>
          </div>
        ) : selectedCat === 'LOGIC' ? (
           <div className="logic-editor-box">
             <div className="manager-header">
               <h3>Cấu hình quy tắc hệ thống (Logic Rules)</h3>
             </div>
             <p className="hint">Chỉnh sửa tệp JSON cấu hình các phân nhánh (Branches/Rules) và tài nguyên Global.</p>
             <textarea 
               className="logic-textarea" 
               defaultValue={JSON.stringify({
                 branches: ['manual_design', 'chatgpt_image'],
                 rules: {
                   auto_process_free: true,
                   auto_resize_aspect: "19.5:9",
                   cdn_path: "/assets/production/v2"
                 },
                 video_config: {
                   renderer: "unreal_bridge_v4",
                   default_res: "4K"
                 }
               }, null, 2)}
             />
             <button className="btn-save-logic" onClick={() => onFeedback('Đã lưu cấu hình logic mới.')}>LƯU CẤU HÌNH HỆ THỐNG</button>
           </div>
        ) : selectedItem ? (
           <div className="logic-editor-box">
             <div className="manager-header" style={{ marginBottom: '30px' }}>
               <button className="btn-back-minimal" onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', padding: 0 }}>
                 <ChevronLeft size={20} /> QUAY LẠI DANH SÁCH
               </button>
               <h3 style={{ marginTop: '15px' }}>Quản lý biến thể: {selectedItem.name}</h3>
               <button className="btn-add-asset" onClick={() => {
                 const currentLib = systemContent.library || ASSETS;
                 const newLib = { ...currentLib };
                 const cat = selectedCat as keyof typeof ASSETS;
                 const catList = [...(newLib[cat] || (ASSETS as any)[cat] || [])];
                 const pIdx = catList.findIndex((it: any) => it.id === selectedItem.id);
                 if (pIdx !== -1) {
                   const variants = [...(catList[pIdx].variants || [])];
                   const newId = `${selectedItem.id}_v${variants.length + 1}`;
                   const isInterior = adminBranch === 'interior';
                   variants.push({
                     id: newId,
                     url: "https://images.unsplash.com/photo-1546027667-435374996526?q=80&w=600",
                     name: `Biến thể mới ${variants.length + 1}`,
                     ...(isInterior ? { images: Array(4).fill("https://images.unsplash.com/photo-1546027667-435374996526?q=80&w=600") } : {})
                   });
                   catList[pIdx] = { ...catList[pIdx], variants };
                   newLib[cat] = catList as any;
                   onSystemContentUpdate({ ...systemContent, library: newLib });
                   setSelectedItem(catList[pIdx]);
                   onFeedback('Đã thêm 1 biến thể mới. Anh/Chị hãy nhấn EDIT để thay ảnh nhé!');
                 }
               }}>+ Thêm biến thể mới</button>
             </div>
             
             <div className="asset-grid-manager">
               {(selectedItem.variants || []).map((v: any, vIdx: number) => {
                 const isInterior = adminBranch === 'interior';
                 return (
                   <div key={v.id} className={`asset-card-admin ${isInterior ? 'interior-combo' : ''}`} style={{ width: isInterior ? '100%' : '200px' }}>
                     <div className="asset-preview-box-group" style={{ display: isInterior ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                       {isInterior ? (
                         [0, 1, 2, 3].map(imgIdx => (
                           <div key={imgIdx} className="asset-preview-box" style={{ height: '120px' }}>
                             <img decoding="async" loading="lazy" src={v.images?.[imgIdx] || "https://images.unsplash.com/photo-1546027667-435374996526?q=80&w=600"} alt={`${v.name} ${imgIdx + 1}`} />
                             <div className="asset-actions-overlay">
                               <button onClick={() => { 
                                 setPendingReplace({ 
                                   type: 'variant', 
                                   cat: selectedCat, 
                                   itemId: selectedItem.id, 
                                   variantId: v.id,
                                   mediaIdx: imgIdx 
                                 }); 
                                 replacerRef.current?.click(); 
                               }}>THAY ẢNH {imgIdx + 1}</button>
                             </div>
                           </div>
                         ))
                       ) : (
                         <div className="asset-preview-box">
                           <img decoding="async" loading="lazy" src={v.url} alt={v.name} />
                           <div className="asset-actions-overlay">
                             <button onClick={() => { 
                               setPendingReplace({ type: 'variant', cat: selectedCat, itemId: selectedItem.id, variantId: v.id }); 
                               replacerRef.current?.click(); 
                             }}>THAY THẾ</button>
                           </div>
                         </div>
                       )}
                     </div>
                     <div className="asset-meta-box">
                       <div className="asset-id">{v.id}</div>
                       <input 
                         className="variant-name-edit" 
                         value={v.name} 
                         onChange={(e) => {
                            const currentLib = systemContent.library || ASSETS;
                            const newLib = { ...currentLib };
                            const cat = selectedCat as keyof typeof ASSETS;
                            const catList = [...(newLib[cat] || (ASSETS as any)[cat])];
                            const pIdx = catList.findIndex((it: any) => it.id === selectedItem.id);
                            if (pIdx !== -1) {
                              const vars = [...catList[pIdx].variants];
                              vars[vIdx] = { ...vars[vIdx], name: e.target.value };
                              catList[pIdx] = { ...catList[pIdx], variants: vars };
                              newLib[cat] = catList as any;
                              onSystemContentUpdate({ ...systemContent, library: newLib });
                              setSelectedItem(catList[pIdx]);
                            }
                           }
                         } 
                         style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '100%', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9rem' }}
                       />
                       <button
                         onClick={() => handleDeleteVariant(vIdx)}
                         style={{ marginTop: '4px', background: 'rgba(255,60,60,0.2)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff6666', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                       >
                         <Trash2 size={12} /> Xóa
                       </button>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
        ) : (
          <>
            <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Quản lý { { HO: 'Hồ Koi Cổ Điển', HO_HIEN_DAI: 'Hồ Koi Hiện Đại', TUONG_DA: 'Tường Đá Trang Trí', TUONG_CAY: 'Tường Cây & Vườn Nhiệt Đới', FARM: 'Farm & Du Lịch', CAFE: 'Cảnh Quan Quán Cà Phê', HO_BOI: 'Hồ Bơi Thiên Nhiên' }[selectedCat] || selectedCat }</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-add-asset" onClick={() => handleClearCategory()} style={{ background: 'rgba(255,60,60,0.15)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff8888' }}><Trash2 size={14} /> Xóa danh mục</button>
                <button className="btn-add-asset" onClick={() => {
                const newLib = { ...systemContent.library };
                const currentCat = selectedCat as string;
                const list = [...(newLib[currentCat] || (ASSETS as any)[currentCat] || [])];
                const newId = `${currentCat.toLowerCase()}_new_${list.length + 1}`;

                const isInterior = adminBranch === 'interior';
                const placeholderUrl = "https://images.unsplash.com/photo-1546027667-435374996526?q=80&w=600";

                const newItem: any = {
                  id: newId,
                  name: `Mẫu mới ${list.length + 1}`,
                  url: placeholderUrl
                };

                // Nội thất: parent cần images[] cho giao diện combo
                if (isInterior) {
                   newItem.images = Array(4).fill(placeholderUrl);
                }

                // TẤT CẢ danh mục đều tạo variants
                const defaultVariant: any = { id: `${newId}_v1`, name: "Biến thể mặc định", url: placeholderUrl };
                if (isInterior) {
                  defaultVariant.images = Array(4).fill(placeholderUrl);
                }
                newItem.variants = [defaultVariant];

                list.push(newItem);
                newLib[currentCat] = list as any;
                onSystemContentUpdate({ ...systemContent, library: newLib });
                onFeedback(`Đã thêm mẫu ${newItem.name} vào hệ thống.`);
              }}>+ Thêm mẫu mới</button>
            </div>
          </div>
          <div className="asset-grid-manager">
            {catItems.map((item: any) => {
              const isInterior = adminBranch === 'interior';
              return (
                <div key={item.id} className={`asset-card-admin ${isInterior ? 'interior-combo' : ''}`} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer', width: isInterior ? '100%' : 'auto' }}>
                  <div className="asset-preview-box-group" style={{ display: isInterior ? 'grid' : 'block', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {isInterior ? (
                      [0, 1, 2, 3].map(imgIdx => (
                        <div key={imgIdx} className="asset-preview-box" style={{ height: '120px' }}>
                          <img decoding="async" loading="lazy" src={item.images?.[imgIdx] || item.url} alt={`${item.name} ${imgIdx + 1}`} />
                          <div className="asset-actions-overlay" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { 
                              setPendingReplace({ 
                                type: 'library', 
                                cat: selectedCat, 
                                itemId: item.id,
                                mediaIdx: imgIdx 
                              }); 
                              replacerRef.current?.click(); 
                            }}>THAY ẢNH {imgIdx + 1}</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="asset-preview-box">
                        <img decoding="async" loading="lazy" src={item.url} alt={item.name} />
                        <div className="asset-actions-overlay" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { 
                            setPendingReplace({ type: 'library', cat: selectedCat, itemId: item.id }); 
                            replacerRef.current?.click(); 
                          }}>THAY THẾ ẢNH</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="asset-meta-box">
                    <div className="asset-id">{item.id}</div>
                    <div className="asset-name">{item.name}</div>
                    <div className="asset-variants-count">{item.variants?.length || 0} biến thể (Bấm để quản lý)</div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                      style={{ marginTop: '6px', background: 'rgba(255,60,60,0.2)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff8888', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'center' }}
                    >
                      <Trash2 size={11} /> Xóa mẫu
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}
      </div>
    </motion.div>
  );
}

function AIStudioContent({ onFeedback }: { onFeedback: (msg: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  return (
    <div className="ai-controls-box">
      <label>Yêu cầu chỉnh sửa của AI</label>
      <textarea 
        placeholder="Ví dụ: Resize lại tấm hình này về tỷ lệ 16:9, làm mờ hậu cảnh và đưa chủ thể vào giữa để cân đối hơn..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button 
        className={`btn-ai-process ${isProcessing ? 'loading' : ''}`}
        onClick={() => {
          setIsProcessing(true);
          setTimeout(() => {
            setIsProcessing(false);
            onFeedback('AI đã hoàn tất xử lý hình ảnh!');
          }, 3000);
        }}
      >
        {isProcessing ? 'ĐANG XỬ LÝ...' : 'BẮT ĐẦU CHẠY AI'}
      </button>
    </div>
  );
}

// --- PROMPT EDITOR VIEW (Tab Manager — CRUD tab + flowConfig + drag-drop reorder) ---
const TAB_COLORS = [
  '#d4a373', '#3b82f6', '#6366f1', '#10b981', '#22c55e',
  '#f59e0b', '#ec4899', '#ef4444', '#8b5cf6', '#06b6d4'
];
const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'] as const;
const VARIANT_COUNTS = [1, 2, 3, 4] as const;

interface FlowConfigModel {
  mode: 'image' | 'video';
  variantCount: 1 | 2 | 3 | 4;
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
}

interface Pass1TaskModel {
  id: string;
  label: string;
  prompt: string;
  flowConfig: FlowConfigModel;
  order: number;
}

interface TabModel {
  id: string;
  branch: 'landscape' | 'architecture' | 'interior';
  label: string;
  color: string;
  order: number;
  prompt: string;
  flowConfig: FlowConfigModel;
  pass1Tasks?: Pass1TaskModel[];
  hidden?: boolean;
}

const tmLabelStyle: React.CSSProperties = { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' };
const tmInputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', boxSizing: 'border-box' };
const tmSelectStyle: React.CSSProperties = { ...tmInputStyle, padding: '10px' };

function PromptEditorView({ onFeedback, adminBranch, onBranchChange }: {
  systemContent?: any;
  onSystemContentUpdate?: (c: any) => void;
  onSync?: () => Promise<boolean>;
  onFeedback: (msg: string) => void;
  adminBranch: MainBranch;
  onBranchChange?: (b: MainBranch) => void;
}) {
  const [tabs, setTabs] = useState<TabModel[]>([]);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTabs = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/tabs?branch=${adminBranch}&includeHidden=${showHidden}`);
      const data = await res.json();
      setTabs(data);
      if (data.length > 0 && !data.find((t: TabModel) => t.id === editingTabId)) {
        setEditingTabId(data[0].id);
      }
    } catch {
      onFeedback('❌ Lỗi tải danh sách tab.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTabs(); }, [adminBranch, showHidden]);

  const editingTab = tabs.find(t => t.id === editingTabId);

  const updateTab = async (id: string, patch: Partial<TabModel>) => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/tabs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTabs(prev => prev.map(t => t.id === id ? updated : t));
      onFeedback('✅ Đã lưu.');
    } catch (e: any) {
      onFeedback(`❌ Lỗi lưu: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const createTab = async (data: { id: string; label: string; color: string }) => {
    try {
      const res = await apiFetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, branch: adminBranch, prompt: '', flowConfig: { mode: 'image', variantCount: 4, aspectRatio: '16:9' } })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Tạo tab thất bại');
      }
      const created = await res.json();
      setTabs(prev => [...prev, created]);
      setEditingTabId(created.id);
      setShowCreateModal(false);
      onFeedback('✅ Đã tạo tab mới.');
    } catch (e: any) {
      onFeedback(`❌ ${e.message}`);
    }
  };

  const deleteTab = async (id: string) => {
    if (!window.confirm('Ẩn tab này? Project cũ ref tới nó vẫn xem được. Có thể bật "Hiện tab ẩn" để khôi phục.')) return;
    try {
      const res = await apiFetch(`/api/tabs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onFeedback('✅ Đã ẩn tab.');
      fetchTabs();
    } catch (e: any) {
      onFeedback(`❌ ${e.message}`);
    }
  };

  const restoreTab = async (id: string) => {
    await updateTab(id, { hidden: false } as any);
    fetchTabs();
  };

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const oldIdx = tabs.findIndex(t => t.id === draggedId);
    const newIdx = tabs.findIndex(t => t.id === targetId);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = [...tabs];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    setTabs(reordered);
    setDraggedId(null);
    try {
      const res = await apiFetch('/api/tabs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: adminBranch, order: reordered.map(t => t.id) })
      });
      if (!res.ok) throw new Error('reorder fail');
      onFeedback('✅ Đã đổi thứ tự.');
    } catch {
      onFeedback('❌ Lỗi lưu thứ tự.');
      fetchTabs();
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {onBranchChange && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['landscape','architecture','interior'] as const).map(b => (
            <button
              key={b}
              onClick={() => onBranchChange(b)}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                background: adminBranch === b ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: adminBranch === b ? '#000' : '#fff',
                fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
              }}
            >
              {b === 'landscape' ? '🌳 Cảnh quan' : b === 'architecture' ? '🏛 Kiến trúc' : '🛋 Nội thất'}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', background: 'var(--accent)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Thêm tab mới
        </button>
        <button onClick={() => setShowHidden(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: showHidden ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, cursor: 'pointer' }}>
          {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          {showHidden ? 'Đang hiện tab ẩn' : 'Hiện tab ẩn'}
        </button>
        {isSaving && <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Đang lưu...</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 3fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isLoading && <div style={{ color: 'rgba(255,255,255,0.5)' }}>Đang tải...</div>}
          {tabs.map(tab => {
            const isHidden = tab.hidden;
            const isSelected = tab.id === editingTabId;
            return (
              <div
                key={tab.id}
                draggable={!isHidden}
                onDragStart={() => handleDragStart(tab.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, tab.id)}
                onClick={() => setEditingTabId(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderRadius: '12px',
                  background: isSelected ? `${tab.color}33` : (isHidden ? 'rgba(80,80,80,0.15)' : 'rgba(255,255,255,0.04)'),
                  border: isSelected ? `2px solid ${tab.color}` : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  opacity: isHidden ? 0.5 : 1,
                  transition: 'all 0.15s'
                }}
              >
                <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.4)', cursor: isHidden ? 'not-allowed' : 'grab' }} />
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: tab.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{tab.id} · {tab.flowConfig?.mode === 'video' ? 'Video' : 'Ảnh'} · x{tab.flowConfig?.variantCount} · {tab.flowConfig?.aspectRatio}</div>
                </div>
                {isHidden ? (
                  <button onClick={(e) => { e.stopPropagation(); restoreTab(tab.id); }} title="Hiện lại" style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4 }}><Eye size={16} /></button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }} title="Ẩn" style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                )}
              </div>
            );
          })}
          {!isLoading && tabs.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px' }}>Chưa có tab.</div>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
          {editingTab ? (
            <TabEditor key={editingTab.id} tab={editingTab} onSave={(patch) => updateTab(editingTab.id, patch)} disabled={isSaving} />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px' }}>Chọn tab bên trái để chỉnh sửa</div>
          )}
        </div>
      </div>

      {showCreateModal && <CreateTabModal onCreate={createTab} onCancel={() => setShowCreateModal(false)} />}
    </div>
  );
}

function TabEditor({ tab, onSave, disabled }: { tab: TabModel; onSave: (patch: Partial<TabModel>) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState<TabModel>(tab);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [draggedPass1Id, setDraggedPass1Id] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(tab);
  useEffect(() => { setDraft(tab); }, [tab.id]);
  const setFlow = (k: keyof FlowConfigModel, v: any) => setDraft(d => ({ ...d, flowConfig: { ...d.flowConfig, [k]: v } }));

  const pass1Tasks = draft.pass1Tasks || [];
  const setPass1 = (newTasks: Pass1TaskModel[]) => setDraft(d => ({ ...d, pass1Tasks: newTasks }));
  const updatePass1Task = (id: string, patch: Partial<Pass1TaskModel>) => {
    setPass1(pass1Tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  };
  const addPass1Task = () => {
    let i = pass1Tasks.length + 1;
    let nextId = `task_${i}`;
    while (pass1Tasks.some(t => t.id === nextId)) { i++; nextId = `task_${i}`; }
    const newTask: Pass1TaskModel = { id: nextId, label: `Phương án ${i}`, prompt: '', flowConfig: { mode: 'image', variantCount: 1, aspectRatio: '16:9' }, order: pass1Tasks.length };
    setPass1([...pass1Tasks, newTask]);
    setExpandedTaskId(nextId);
  };
  const deletePass1Task = (id: string) => {
    if (!window.confirm(`Xoá task ${id}?`)) return;
    setPass1(pass1Tasks.filter(t => t.id !== id));
  };
  const handlePass1Drop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedPass1Id || draggedPass1Id === targetId) return;
    const arr = [...pass1Tasks];
    const oldIdx = arr.findIndex(t => t.id === draggedPass1Id);
    const newIdx = arr.findIndex(t => t.id === targetId);
    if (oldIdx < 0 || newIdx < 0) return;
    const [moved] = arr.splice(oldIdx, 1);
    arr.splice(newIdx, 0, moved);
    setPass1(arr.map((t, i) => ({ ...t, order: i })));
    setDraggedPass1Id(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: draft.color, margin: 0 }}>Chỉnh tab — {tab.id}</h3>
        <button
          onClick={() => onSave({ label: draft.label, color: draft.color, prompt: draft.prompt, flowConfig: draft.flowConfig, pass1Tasks: draft.pass1Tasks })}
          disabled={disabled || !dirty}
          style={{ padding: '8px 18px', borderRadius: '10px', background: dirty ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: dirty ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: dirty ? 'pointer' : 'default' }}
        >
          {disabled ? 'Đang lưu...' : (dirty ? 'LƯU' : 'Đã lưu')}
        </button>
      </div>

      <div>
        <label style={tmLabelStyle}>Tên tab</label>
        <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} style={tmInputStyle} />
      </div>

      <div>
        <label style={tmLabelStyle}>Màu</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {TAB_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setDraft(d => ({ ...d, color: c }))} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: draft.color === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div>
          <label style={tmLabelStyle}>Chế độ</label>
          <select value={draft.flowConfig.mode} onChange={e => setFlow('mode', e.target.value)} style={tmSelectStyle}>
            <option value="image">Hình ảnh</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div>
          <label style={tmLabelStyle}>Số phương án</label>
          <select value={draft.flowConfig.variantCount} onChange={e => setFlow('variantCount', Number(e.target.value))} style={tmSelectStyle}>
            {VARIANT_COUNTS.map(v => <option key={v} value={v}>x{v}</option>)}
          </select>
        </div>
        <div>
          <label style={tmLabelStyle}>Tỉ lệ khung</label>
          <select value={draft.flowConfig.aspectRatio} onChange={e => setFlow('aspectRatio', e.target.value)} style={tmSelectStyle}>
            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {draft.branch === 'interior' && (
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <label style={{ ...tmLabelStyle, color: '#a5b4fc', marginBottom: 2 }}>Pass 1 — Task song song</label>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Mỗi task = 1 Flow tab độc lập, chạy SONG SONG → mỗi task trả 1 ảnh. Nội thất dùng mode này thay vì 1 task variantCount=4.</p>
            </div>
            <button onClick={addPass1Task} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              <Plus size={14} /> Thêm task
            </button>
          </div>
          {pass1Tasks.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 14, fontStyle: 'italic', fontSize: '0.85rem' }}>Chưa có task. Bấm "+ Thêm task" để tạo (đề xuất 4 task).</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...pass1Tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(task => {
              const expanded = expandedTaskId === task.id;
              return (
                <div key={task.id} draggable onDragStart={() => setDraggedPass1Id(task.id)} onDragOver={e => e.preventDefault()} onDrop={e => handlePass1Drop(e, task.id)} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, border: expanded ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)' }}>
                  <div onClick={() => setExpandedTaskId(expanded ? null : task.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, cursor: 'pointer' }}>
                    <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.4)', cursor: 'grab' }} />
                    <input value={task.label} onClick={e => e.stopPropagation()} onChange={e => updatePass1Task(task.id, { label: e.target.value })} style={{ flex: 1, padding: '4px 8px', borderRadius: 6, background: 'transparent', color: '#fff', border: '1px solid transparent', fontWeight: 700, fontSize: '0.9rem' }} />
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                      {task.flowConfig.mode === 'video' ? '🎬' : '🖼'} x{task.flowConfig.variantCount} · {task.flowConfig.aspectRatio} · {(task.prompt || '').length} ký tự
                    </span>
                    <button onClick={e => { e.stopPropagation(); deletePass1Task(task.id); }} style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
                  </div>
                  {expanded && (
                    <div style={{ padding: '4px 10px 12px 30px', display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                        <span>ID:</span><code style={{ background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: 4 }}>{task.id}</code>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        <div>
                          <label style={tmLabelStyle}>Chế độ</label>
                          <select value={task.flowConfig.mode} onChange={e => updatePass1Task(task.id, { flowConfig: { ...task.flowConfig, mode: e.target.value as any } })} style={tmSelectStyle}>
                            <option value="image">Hình ảnh</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div>
                          <label style={tmLabelStyle}>Variant</label>
                          <select value={task.flowConfig.variantCount} onChange={e => updatePass1Task(task.id, { flowConfig: { ...task.flowConfig, variantCount: Number(e.target.value) as any } })} style={tmSelectStyle}>
                            {VARIANT_COUNTS.map(v => <option key={v} value={v}>x{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={tmLabelStyle}>Tỉ lệ</label>
                          <select value={task.flowConfig.aspectRatio} onChange={e => updatePass1Task(task.id, { flowConfig: { ...task.flowConfig, aspectRatio: e.target.value as any } })} style={tmSelectStyle}>
                            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={tmLabelStyle}>Prompt task này</label>
                        <textarea value={task.prompt} onChange={e => updatePass1Task(task.id, { prompt: e.target.value })} style={{ ...tmInputStyle, minHeight: 180, fontFamily: 'monospace', resize: 'vertical' }} placeholder="Prompt cho phương án này. Hệ thống sẽ append project data sau prompt." />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={tmLabelStyle}>Prompt {draft.branch === 'interior' && pass1Tasks.length > 0 ? '(fallback — chỉ dùng khi không có task)' : ''}</label>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{(draft.prompt || '').length} ký tự</span>
        </div>
        <textarea
          value={draft.prompt}
          onChange={e => setDraft(d => ({ ...d, prompt: e.target.value }))}
          style={{ ...tmInputStyle, minHeight: '400px', fontFamily: 'monospace', resize: 'vertical' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
          {draft.branch === 'interior' && pass1Tasks.length > 0
            ? 'Tab nội thất có Pass 1 task — bot dùng prompt từng task ở trên, không dùng prompt này. Có thể để rỗng.'
            : 'Hệ thống tự ghép thông tin khách hàng + assets vào cuối prompt khi chạy Flow.'}
        </p>
      </div>
    </div>
  );
}

function CreateTabModal({ onCreate, onCancel }: { onCreate: (data: { id: string; label: string; color: string }) => void; onCancel: () => void }) {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(TAB_COLORS[0]);
  const idValid = /^[a-z0-9_]+$/.test(id) && id.length > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '90%', border: '1px solid rgba(255,255,255,0.15)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Thêm tab mới</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={tmLabelStyle}>ID (slug, a-z 0-9 _) *</label>
            <input value={id} onChange={e => setId(e.target.value.toLowerCase())} placeholder="vd: san_vuon_nhiet_doi" style={tmInputStyle} autoFocus />
            {id && !idValid && <span style={{ color: '#ff6666', fontSize: '0.75rem' }}>Chỉ a-z 0-9 _</span>}
          </div>
          <div>
            <label style={tmLabelStyle}>Tên hiển thị *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Sân vườn nhiệt đới" style={tmInputStyle} />
          </div>
          <div>
            <label style={tmLabelStyle}>Màu</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TAB_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>Hủy</button>
          <button onClick={() => onCreate({ id, label, color })} disabled={!idValid || !label.trim()} style={{ padding: '10px 18px', borderRadius: '10px', background: (idValid && label.trim()) ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: (idValid && label.trim()) ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 800, border: 'none', cursor: (idValid && label.trim()) ? 'pointer' : 'default' }}>Tạo</button>
        </div>
      </div>
    </div>
  );
}

// --- PASS 2 MANAGER VIEW (CRUD pass2 task per branch + flowConfig + drag-drop) ---
interface Pass2TaskModel {
  id: string;
  branch: 'landscape' | 'architecture' | 'interior';
  label: string;
  order: number;
  prompt: string;
  flowConfig: {
    mode: 'image' | 'video';
    variantCount: 1 | 2 | 3 | 4;
    aspectRatio: '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  };
  hidden?: boolean;
}

function Pass2ManagerView({ onFeedback, adminBranch, onBranchChange }: { onFeedback: (msg: string) => void; adminBranch: MainBranch; onBranchChange?: (b: MainBranch) => void }) {
  const [tasks, setTasks] = useState<Pass2TaskModel[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch(`/api/pass2-tasks?branch=${adminBranch}&includeHidden=${showHidden}`);
      const data = await res.json();
      setTasks(data);
      if (data.length > 0 && !data.find((t: Pass2TaskModel) => t.id === editingId)) {
        setEditingId(data[0].id);
      }
    } catch {
      onFeedback('❌ Lỗi tải pass 2 tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [adminBranch, showHidden]);

  const editing = tasks.find(t => t.id === editingId);

  const updateTask = async (id: string, patch: Partial<Pass2TaskModel>) => {
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/pass2-tasks/${id}?branch=${adminBranch}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      onFeedback('✅ Đã lưu.');
    } catch (e: any) {
      onFeedback(`❌ Lỗi lưu: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const createTask = async (data: { id: string; label: string }) => {
    try {
      const res = await apiFetch('/api/pass2-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, branch: adminBranch, prompt: '', flowConfig: { mode: 'image', variantCount: 1, aspectRatio: '16:9' } })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Tạo task thất bại');
      }
      const created = await res.json();
      setTasks(prev => [...prev, created]);
      setEditingId(created.id);
      setShowCreateModal(false);
      onFeedback('✅ Đã tạo task pass 2.');
    } catch (e: any) {
      onFeedback(`❌ ${e.message}`);
    }
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Ẩn task này? Bot sẽ không chạy task này nữa. Bật "Hiện task ẩn" để khôi phục.')) return;
    try {
      const res = await apiFetch(`/api/pass2-tasks/${id}?branch=${adminBranch}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onFeedback('✅ Đã ẩn task.');
      fetchTasks();
    } catch (e: any) {
      onFeedback(`❌ ${e.message}`);
    }
  };

  const restoreTask = async (id: string) => {
    await updateTask(id, { hidden: false } as any);
    fetchTasks();
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const oldIdx = tasks.findIndex(t => t.id === draggedId);
    const newIdx = tasks.findIndex(t => t.id === targetId);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved);
    setTasks(reordered);
    setDraggedId(null);
    try {
      const res = await apiFetch('/api/pass2-tasks/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: adminBranch, order: reordered.map(t => t.id) })
      });
      if (!res.ok) throw new Error('reorder fail');
      onFeedback('✅ Đã đổi thứ tự.');
    } catch {
      onFeedback('❌ Lỗi lưu thứ tự.');
      fetchTasks();
    }
  };

  return (
    <div style={{ padding: '20px 0' }}>
      {onBranchChange && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {(['landscape','architecture','interior'] as const).map(b => (
            <button
              key={b}
              onClick={() => onBranchChange(b)}
              style={{
                padding: '8px 16px', borderRadius: '10px',
                background: adminBranch === b ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: adminBranch === b ? '#000' : '#fff',
                fontWeight: 700, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer'
              }}
            >
              {b === 'landscape' ? '🌳 Cảnh quan' : b === 'architecture' ? '🏛 Kiến trúc' : '🛋 Nội thất'}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>
          Pass 2 — task bổ sung · <span style={{ color: 'var(--accent)' }}>{adminBranch === 'landscape' ? 'Cảnh quan' : adminBranch === 'architecture' ? 'Kiến trúc' : 'Nội thất'}</span>
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Sau khi khách chốt 1 phương án Pass 1, hệ thống chạy các task này để sinh thêm góc nhìn / mặt bằng / video. Hỗ trợ template <code>{'{WIDTH}'}</code> <code>{'{LENGTH}'}</code> trong prompt.</p>
      </div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={() => setShowCreateModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', background: 'var(--accent)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Thêm task mới
        </button>
        <button onClick={() => setShowHidden(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: showHidden ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, cursor: 'pointer' }}>
          {showHidden ? <Eye size={16} /> : <EyeOff size={16} />}
          {showHidden ? 'Đang hiện task ẩn' : 'Hiện task ẩn'}
        </button>
        {isSaving && <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Đang lưu...</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 3fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isLoading && <div style={{ color: 'rgba(255,255,255,0.5)' }}>Đang tải...</div>}
          {tasks.map(task => {
            const isHidden = task.hidden;
            const isSelected = task.id === editingId;
            const accent = task.flowConfig?.mode === 'video' ? '#ec4899' : '#3b82f6';
            return (
              <div
                key={task.id}
                draggable={!isHidden}
                onDragStart={() => setDraggedId(task.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, task.id)}
                onClick={() => setEditingId(task.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
                  borderRadius: '12px',
                  background: isSelected ? `${accent}33` : (isHidden ? 'rgba(80,80,80,0.15)' : 'rgba(255,255,255,0.04)'),
                  border: isSelected ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer', opacity: isHidden ? 0.5 : 1
                }}
              >
                <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>{task.id} · {task.flowConfig?.mode === 'video' ? 'Video' : 'Ảnh'} · x{task.flowConfig?.variantCount} · {task.flowConfig?.aspectRatio}</div>
                </div>
                {isHidden ? (
                  <button onClick={(e) => { e.stopPropagation(); restoreTask(task.id); }} title="Hiện lại" style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4 }}><Eye size={16} /></button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} title="Ẩn" style={{ background: 'transparent', border: 'none', color: '#ff6666', cursor: 'pointer', padding: 4 }}><Trash2 size={14} /></button>
                )}
              </div>
            );
          })}
          {!isLoading && tasks.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.5)', padding: '20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px' }}>Chưa có task pass 2.</div>
          )}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '20px' }}>
          {editing ? (
            <Pass2TaskEditor key={editing.id} task={editing} onSave={(patch) => updateTask(editing.id, patch)} disabled={isSaving} />
          ) : (
            <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px' }}>Chọn task bên trái để chỉnh sửa</div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreatePass2TaskModal onCreate={createTask} onCancel={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function Pass2TaskEditor({ task, onSave, disabled }: { task: Pass2TaskModel; onSave: (patch: Partial<Pass2TaskModel>) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState<Pass2TaskModel>(task);
  const dirty = JSON.stringify(draft) !== JSON.stringify(task);
  useEffect(() => { setDraft(task); }, [task.id]);
  const setFlow = (k: keyof Pass2TaskModel['flowConfig'], v: any) => setDraft(d => ({ ...d, flowConfig: { ...d.flowConfig, [k]: v } }));
  const accent = draft.flowConfig.mode === 'video' ? '#ec4899' : '#3b82f6';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: accent, margin: 0 }}>Chỉnh task — {task.id}</h3>
        <button
          onClick={() => onSave({ label: draft.label, prompt: draft.prompt, flowConfig: draft.flowConfig })}
          disabled={disabled || !dirty}
          style={{ padding: '8px 18px', borderRadius: '10px', background: dirty ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: dirty ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: '0.85rem', border: 'none', cursor: dirty ? 'pointer' : 'default' }}
        >
          {disabled ? 'Đang lưu...' : (dirty ? 'LƯU' : 'Đã lưu')}
        </button>
      </div>

      <div>
        <label style={tmLabelStyle}>Tên task</label>
        <input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} style={tmInputStyle} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div>
          <label style={tmLabelStyle}>Chế độ</label>
          <select value={draft.flowConfig.mode} onChange={e => setFlow('mode', e.target.value)} style={tmSelectStyle}>
            <option value="image">Hình ảnh</option>
            <option value="video">Video</option>
          </select>
        </div>
        <div>
          <label style={tmLabelStyle}>Số phương án</label>
          <select value={draft.flowConfig.variantCount} onChange={e => setFlow('variantCount', Number(e.target.value))} style={tmSelectStyle}>
            {VARIANT_COUNTS.map(v => <option key={v} value={v}>x{v}</option>)}
          </select>
        </div>
        <div>
          <label style={tmLabelStyle}>Tỉ lệ khung</label>
          <select value={draft.flowConfig.aspectRatio} onChange={e => setFlow('aspectRatio', e.target.value)} style={tmSelectStyle}>
            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={tmLabelStyle}>Prompt (hỗ trợ <code>{'{WIDTH}'}</code> <code>{'{LENGTH}'}</code>)</label>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{(draft.prompt || '').length} ký tự</span>
        </div>
        <textarea
          value={draft.prompt}
          onChange={e => setDraft(d => ({ ...d, prompt: e.target.value }))}
          style={{ ...tmInputStyle, minHeight: '400px', fontFamily: 'monospace', resize: 'vertical' }}
        />
      </div>
    </div>
  );
}

function CreatePass2TaskModal({ onCreate, onCancel }: { onCreate: (data: { id: string; label: string }) => void; onCancel: () => void }) {
  const [id, setId] = useState('');
  const [label, setLabel] = useState('');
  const idValid = /^[a-z0-9_]+$/.test(id) && id.length > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onCancel}>
      <div style={{ background: '#1a1a1a', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '90%', border: '1px solid rgba(255,255,255,0.15)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Thêm task pass 2</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={tmLabelStyle}>ID (slug, a-z 0-9 _) *</label>
            <input value={id} onChange={e => setId(e.target.value.toLowerCase())} placeholder="vd: angle_drone_45deg" style={tmInputStyle} autoFocus />
            {id && !idValid && <span style={{ color: '#ff6666', fontSize: '0.75rem' }}>Chỉ a-z 0-9 _</span>}
          </div>
          <div>
            <label style={tmLabelStyle}>Tên hiển thị *</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Góc drone 45 độ" style={tmInputStyle} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '10px 18px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>Hủy</button>
          <button onClick={() => onCreate({ id, label })} disabled={!idValid || !label.trim()} style={{ padding: '10px 18px', borderRadius: '10px', background: (idValid && label.trim()) ? 'var(--accent)' : 'rgba(255,255,255,0.1)', color: (idValid && label.trim()) ? '#000' : 'rgba(255,255,255,0.5)', fontWeight: 800, border: 'none', cursor: (idValid && label.trim()) ? 'pointer' : 'default' }}>Tạo</button>
        </div>
      </div>
    </div>
  );
}

// --- REVENUE DASHBOARD ---
interface RevenueData {
  totalAmount: number;
  totalCount: number;
  byPackage: Record<string, { count: number; amount: number; label?: string }>;
  byBranch: Record<string, { count: number; amount: number }>;
  byDay: Array<{ date: string; count: number; amount: number }>;
}

function RevenueDashboard() {
  const todayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const daysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [from, setFrom] = useState<string>(daysAgoStr(30));
  const [to, setTo] = useState<string>(todayStr());
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fmtVND = (v: number) => {
    try {
      return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
    } catch {
      return `${v} đ`;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(`/api/admin/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || `Lỗi ${res.status}`);
        }
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Không tải được dữ liệu doanh thu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (from && to) load();
    return () => { cancelled = true; };
  }, [from, to]);

  const totalAmount = data?.totalAmount ?? 0;
  const totalCount = data?.totalCount ?? 0;
  const avg = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

  const byDay = data?.byDay ?? [];
  const peakAmount = byDay.reduce((m, d) => Math.max(m, d.amount || 0), 0);
  const peakDate = byDay.find(d => d.amount === peakAmount && peakAmount > 0)?.date;

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '18px 20px'
  };

  return (
    <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Từ ngày</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.85rem' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>Đến ngày</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ padding: '8px 10px', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', fontSize: '0.85rem' }}
          />
        </div>
        {loading && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
            <span className="generating-spinner" style={{ width: 16, height: 16 }} />
            Đang tải...
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Tổng doanh thu</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent, #facc15)', marginTop: 6 }}>{fmtVND(totalAmount)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Số đơn</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 6 }}>{totalCount}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>Trung bình / đơn</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginTop: 6 }}>{fmtVND(avg)}</div>
        </div>
      </div>

      {/* Daily bar chart */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Doanh thu theo ngày</h4>
          {peakDate && peakAmount > 0 && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>Đỉnh: {peakDate} · {fmtVND(peakAmount)}</div>
          )}
        </div>
        {byDay.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Không có dữ liệu trong khoảng này.</div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {byDay.map((d, idx) => {
                const h = peakAmount > 0 ? Math.max(2, Math.round((d.amount / peakAmount) * 150)) : 2;
                const isPeak = d.date === peakDate && d.amount > 0;
                return (
                  <div
                    key={d.date + idx}
                    title={`${d.date} · ${fmtVND(d.amount)} · ${d.count} đơn`}
                    style={{
                      flex: 1,
                      minWidth: '4px',
                      height: `${h}px`,
                      background: isPeak ? 'linear-gradient(180deg, #facc15, #f59e0b)' : 'linear-gradient(180deg, rgba(99,102,241,0.85), rgba(99,102,241,0.4))',
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.2s',
                      cursor: 'pointer'
                    }}
                  />
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              <span>{byDay[0]?.date}</span>
              {peakDate && peakDate !== byDay[0]?.date && peakDate !== byDay[byDay.length - 1]?.date && (
                <span style={{ color: '#facc15' }}>{peakDate}</span>
              )}
              <span>{byDay[byDay.length - 1]?.date}</span>
            </div>
          </>
        )}
      </div>

      {/* By package table */}
      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', fontWeight: 800, color: '#fff' }}>Theo gói</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Package ID</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Tên gói</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Số đơn</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data?.byPackage || {}).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Chưa có dữ liệu.</td></tr>
              ) : (
                Object.entries(data?.byPackage || {})
                  .sort((a, b) => (b[1].amount || 0) - (a[1].amount || 0))
                  .map(([pkgId, info]) => (
                    <tr key={pkgId}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace', color: '#fff' }}>{pkgId}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.8)' }}>{info.label || '—'}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: '#fff' }}>{info.count}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: 'var(--accent, #facc15)', fontWeight: 700 }}>{fmtVND(info.amount)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* By branch table */}
      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', fontWeight: 800, color: '#fff' }}>Theo branch</h4>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>Branch</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Số đơn</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'right' }}>Tổng tiền</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(data?.byBranch || {}).length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Chưa có dữ liệu.</td></tr>
              ) : (
                Object.entries(data?.byBranch || {})
                  .sort((a, b) => (b[1].amount || 0) - (a[1].amount || 0))
                  .map(([branch, info]) => (
                    <tr key={branch}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600 }}>{branch}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: '#fff' }}>{info.count}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'right', color: 'var(--accent, #facc15)', fontWeight: 700 }}>{fmtVND(info.amount)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- PROJECT DETAIL FLOW (admin) -----------------------------------
// Vertical step-flow panel reflecting the operator's actual workflow.
// Each step has a status dot (gray=todo, info=running, ok=done, err=failed).
function ProjectDetailFlow(props: any) {
  const {
    project,
    branchLabel,
    activeStepKey,
    setActiveStepKey,
    onBack,
    onDelete,
    deleting,
    getStatusLabel,
    renderPaymentBadge,
    getWorkflowShortLabel,
    formatVND,
    copyText,
    getAssetInfo,
    getAssetName,
    isVideoAsset,
    projectReferenceAsset,
    workflowOptions,
    handleWorkflowSelect,
    handleUploadResult,
    fileRef,
    paymentBusy,
    paymentError,
    handlePaymentRecheck,
    handlePaymentCancel,
    handleMarkPaidSubmit,
    showMarkPaidForm,
    setShowMarkPaidForm,
    markPaidNote,
    setMarkPaidNote,
    markPaidPackageId,
    setMarkPaidPackageId,
    markPaidAmount,
    setMarkPaidAmount,
    videoPrompt,
    setVideoPrompt,
    selectedVideoImage,
    setSelectedVideoImage,
    isGeneratingVideo,
    setIsGeneratingVideo,
    setSelectedProject,
    systemContent,
    setActionFeedback,
    selectedPass2Image,
    setSelectedPass2Image,
    pass2Width,
    setPass2Width,
    pass2Length,
    setPass2Length,
    isStartingPass2,
    setIsStartingPass2,
    setShowAIStudio,
  } = props;

  const aiResults: string[] = project.aiResults || [];
  const photoResults = aiResults.filter((u: string) => !u.endsWith('.mp4') && !u.includes('/video/'));
  const videoResults = aiResults.filter((u: string) => u.endsWith('.mp4') || u.includes('/video/'));

  // status dot resolver per step
  type Tone = 'gray' | 'info' | 'ok' | 'err' | 'warn' | 'gold';
  const dotFor = (key: string): { tone: Tone; label: string } => {
    if (key === 'customer') return { tone: 'gold', label: 'Sẵn sàng' };
    if (key === 'request') return { tone: project.note || project.service ? 'gold' : 'gray', label: 'Đã ghi' };
    if (key === 'ai') {
      if (project.status === 'done' && photoResults.length > 0) return { tone: 'ok', label: 'Xong · ' + photoResults.length };
      if (project.status === 'processing') return { tone: 'info', label: 'Đang chạy' };
      return { tone: 'gray', label: 'Chưa' };
    }
    if (key === 'pass2') {
      const s = project.pass2Results?.status;
      if (s === 'done') return { tone: 'ok', label: 'Xong 7/7' };
      if (s === 'running' || s === 'pending') return { tone: 'info', label: 'Đang chạy' };
      if (s === 'failed') return { tone: 'err', label: 'Lỗi' };
      return { tone: 'gray', label: 'Chưa' };
    }
    if (key === 'payment') {
      const s = project.payment?.status;
      if (s === 'paid') return { tone: 'ok', label: 'Đã trả' };
      if (s === 'pending') return { tone: 'warn', label: 'Chờ' };
      if (s === 'failed') return { tone: 'err', label: 'Lỗi' };
      if (s === 'cancelled') return { tone: 'gray', label: 'Hủy' };
      return { tone: 'gray', label: 'Chưa TT' };
    }
    if (key === 'final') {
      if (project.status === 'done' && project.finalImage) return { tone: 'ok', label: 'Đã giao' };
      if (project.finalImage) return { tone: 'ok', label: 'Có bản vẽ' };
      return { tone: 'gray', label: 'Chưa' };
    }
    return { tone: 'gray', label: '—' };
  };

  const steps = [
    { key: 'customer', num: '01', title: 'Khách hàng', sub: 'Hồ sơ liên hệ' },
    { key: 'request', num: '02', title: 'Yêu cầu', sub: 'Gói · ghi chú · lựa chọn' },
    { key: 'ai', num: '03', title: 'AI tạo phương án', sub: '4 phương án ảnh AI' },
    { key: 'pass2', num: '04', title: 'Pass 2 — bổ sung', sub: '3 góc + 2 vẽ + 2 video' },
    { key: 'payment', num: '05', title: 'Thanh toán', sub: 'MoMo · thủ công' },
    { key: 'final', num: '06', title: 'Bản vẽ hoàn thiện', sub: 'Upload · giao khách' },
  ];

  // selections list (landscape branch only — falls back gracefully)
  const selectionEntries: Array<[string, string, string]> = [
    ['ho', 'HO', 'Hồ Koi cổ điển'],
    ['ho_hien_dai', 'HO_HIEN_DAI', 'Hồ Koi hiện đại'],
    ['tuong_da', 'TUONG_DA', 'Tường đá'],
    ['tuong_cay', 'TUONG_CAY', 'Tường cây'],
    ['farm', 'FARM', 'Farm & Du lịch'],
    ['cafe', 'CAFE', 'Cà phê'],
    ['ho_boi', 'HO_BOI', 'Hồ bơi'],
  ];

  const dimsLabel = project.payment?.area ? `${project.payment.area} m²` : '—';

  return (
    <>
      {/* HEADER */}
      <div className="as-detail-head">
        <div className="who">
          <span className="id">
            <Hash size={11} /> {project.id}
            <button className="copy" onClick={() => copyText(project.id, 'Đã copy ID dự án.')}>Copy</button>
          </span>
          <h2>{project.customerName}</h2>
          <div className="badges">
            <span className={`as-chip ${project.status === 'done' ? 'ok' : project.status === 'processing' ? 'info' : 'warn'}`}>
              <Circle size={6} fill="currentColor" /> {getStatusLabel(project.status)}
            </span>
            {renderPaymentBadge(project.payment)}
            <span className="as-chip gold">{branchLabel}</span>
            <span className="as-chip muted">{project.service}</span>
            <span className="as-chip muted">{getWorkflowShortLabel(project.workflowBranch)}</span>
          </div>
        </div>
        <div className="badges" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div className="head-actions">
            <button className="as-btn ghost" onClick={onBack}><ChevronLeft size={12} /> Sổ dự án</button>
            <button className="as-btn danger" onClick={onDelete} disabled={deleting}>
              <Trash2 size={12} /> {deleting ? 'Đang xóa…' : 'Xóa hồ sơ'}
            </button>
          </div>
          <div style={{ fontFamily: 'var(--as-mono)', fontSize: 10, color: 'var(--as-text-2)', letterSpacing: '0.08em' }}>
            Mở lúc · {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="as-detail">
        {/* RAIL */}
        <aside className="as-rail" aria-label="Bước xử lý">
          {steps.map(step => {
            const { tone, label } = dotFor(step.key);
            return (
              <button
                key={step.key}
                className={`as-rail-step${activeStepKey === step.key ? ' active' : ''}`}
                onClick={() => {
                  setActiveStepKey(step.key);
                  const el = document.getElementById('as-step-' + step.key);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="as-rail-num">{step.num}</span>
                <span className={`as-rail-dot ${tone}`} />
                <span className="as-rail-info">
                  <span className="ttl">{step.title}</span>
                  <span className="sub">{label}</span>
                </span>
              </button>
            );
          })}
        </aside>

        {/* STEP PANELS */}
        <div className="as-steps">
          {/* STEP 01 — Khách hàng ----------------------- */}
          <section className="as-step" id="as-step-customer">
            <div className="as-step-head">
              <span className="as-step-num">[ 01 / 06 ]</span>
              <h3 className="as-step-title">Khách hàng</h3>
              <span className={`as-step-status ${dotFor('customer').tone}`}>{dotFor('customer').label}</span>
            </div>
            <div className="as-step-body">
              <div className="as-fields">
                <div className="as-field">
                  <span className="lbl">[ ] Họ và tên</span>
                  <span className="val">{project.customerName}</span>
                </div>
                <div className="as-field">
                  <span className="lbl">[ ] Số điện thoại / Zalo</span>
                  <span className="val mono">{project.customerPhone}</span>
                  <span className="actions">
                    <button className="as-btn sm ghost" onClick={() => copyText(project.customerPhone, 'Đã copy SĐT.')}><Copy size={11} /> Copy</button>
                    <button className="as-btn sm ghost" onClick={() => window.open(`https://zalo.me/${project.customerPhone.replace(/\D/g, '')}`, '_blank')}><MessageCircle size={11} /> Zalo</button>
                  </span>
                </div>
                <div className="as-field">
                  <span className="lbl">[ ] ID dự án</span>
                  <span className="val mono">#{project.id}</span>
                  <span className="actions">
                    <button className="as-btn sm ghost" onClick={() => copyText(project.id, 'Đã copy ID.')}><Copy size={11} /> Copy</button>
                  </span>
                </div>
                <div className="as-field">
                  <span className="lbl">[ ] Thời điểm gửi</span>
                  <span className="val muted">{new Date(project.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                </div>
              </div>
            </div>
          </section>

          {/* STEP 02 — Yêu cầu --------------------------- */}
          <section className="as-step" id="as-step-request">
            <div className="as-step-head">
              <span className="as-step-num">[ 02 / 06 ]</span>
              <h3 className="as-step-title">Yêu cầu của khách</h3>
              <span className={`as-step-status ${dotFor('request').tone}`}>{dotFor('request').label}</span>
            </div>
            <div className="as-step-body">
              <div className="as-fields">
                <div className="as-field">
                  <span className="lbl">[ ] Gói dịch vụ</span>
                  <span className="val mono">{project.service}</span>
                </div>
                <div className="as-field">
                  <span className="lbl">[ ] Nhánh xử lý</span>
                  <span className="val mono">{getWorkflowShortLabel(project.workflowBranch)}</span>
                </div>
                <div className="as-field">
                  <span className="lbl">[ ] Diện tích / Kích thước</span>
                  <span className="val mono">{dimsLabel}</span>
                </div>
              </div>

              <div>
                <div className="as-subhead">Ghi chú khách hàng</div>
                <div className="as-quote">{project.note || 'Khách hàng không để lại ghi chú.'}</div>
              </div>

              <div>
                <div className="as-subhead">Hiện trạng &amp; ảnh tham khảo</div>
                <div className="as-media-grid">
                  <div className="as-media-card">
                    <div className="head"><span className="lbl">Ảnh hiện trạng</span><span className="num">[01]</span></div>
                    <img decoding="async" loading="lazy" src={project.rawImage} alt="Ảnh gốc" />
                  </div>
                  <div className="as-media-card">
                    <div className="head"><span className="lbl">{projectReferenceAsset?.label || 'Khoanh vùng ý tưởng'}</span><span className="num">[02]</span></div>
                    <img decoding="async" loading="lazy" src={projectReferenceAsset?.url || project.annotatedImage} alt="Khoanh vùng" />
                  </div>
                </div>
                {(project.extraAssets || []).length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="as-subhead">Tham khảo bổ sung · {(project.extraAssets || []).length}</div>
                    <div className="as-extra-strip">
                      {project.extraAssets.map((asset: string, i: number) => (
                        <div key={i} onClick={() => window.open(asset, '_blank')}>
                          {isVideoAsset(asset) ? (
                            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--as-text-2)' }}><VideoIcon size={20} /></div>
                          ) : (
                            <img decoding="async" loading="lazy" src={asset} alt={`Extra ${i+1}`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="as-subhead">Hạng mục đã chọn</div>
                <div className="as-selections">
                  {selectionEntries.map(([key, cat, label]) => {
                    const val = project.selections?.[key];
                    if (!val) return null;
                    const info = getAssetInfo(val, cat as any);
                    return (
                      <div className="as-sel-pill" key={key}>
                        {info?.url && <img decoding="async" loading="lazy" src={info.url} alt={label} />}
                        <div className="meta">
                          <span className="nm">{getAssetName(val, cat as any)}</span>
                          <span className="cat">{label}</span>
                        </div>
                      </div>
                    );
                  })}
                  {selectionEntries.every(([k]) => !project.selections?.[k]) && (
                    <div className="as-ai-empty">Khách chưa chọn mẫu cụ thể.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="as-subhead">Nhánh xử lý</div>
                <div className="as-actions-row">
                  {workflowOptions.map((option: any) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`as-btn ${project.workflowBranch === option.id ? 'primary' : 'ghost'}`}
                      onClick={() => handleWorkflowSelect(option.id)}
                    >
                      {option.icon} {option.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* STEP 03 — AI ------------------------------ */}
          <section className="as-step" id="as-step-ai">
            <div className="as-step-head">
              <span className="as-step-num">[ 03 / 06 ]</span>
              <h3 className="as-step-title">AI tạo phương án</h3>
              <span className={`as-step-status ${dotFor('ai').tone}`}>{dotFor('ai').label}</span>
            </div>
            <div className="as-step-body">
              {project.workflowBranch === 'chatgpt_image' && (
                <div className="as-actions-row">
                  <button className="as-btn primary" onClick={() => setShowAIStudio(true)}><Bot size={12} /> Mở Trạm AI</button>
                  <span style={{ fontFamily: 'var(--as-mono)', fontSize: 11, color: 'var(--as-text-2)', letterSpacing: '0.06em' }}>
                    Lấy Master Prompt &amp; xử lý ảnh hiện trạng
                  </span>
                </div>
              )}

              {photoResults.length === 0 && videoResults.length === 0 ? (
                <div className="as-ai-empty">Chưa có phương án AI. Mở Trạm AI để tạo.</div>
              ) : (
                <div>
                  <div className="as-subhead">Ảnh phương án · {photoResults.length}</div>
                  <div className="as-ai-grid">
                    {photoResults.map((url: string, i: number) => (
                      <div key={i} className="as-ai-card">
                        <img decoding="async" loading="lazy" src={url} alt={`PA ${i+1}`} />
                        <div className="meta">
                          <span className="nm">PA-{String(i+1).padStart(2, '0')}</span>
                          <button className="as-btn sm ghost" onClick={() => copyText(url, 'Đã copy link ảnh.')}><Copy size={10} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {videoResults.length > 0 && (
                    <>
                      <div className="as-subhead" style={{ marginTop: 16 }}>Video AI · {videoResults.length}</div>
                      <div className="as-ai-grid">
                        {videoResults.map((url: string, i: number) => (
                          <div key={i} className="as-ai-card">
                            <video src={url} controls />
                            <div className="meta">
                              <span className="nm">VID-{String(i+1).padStart(2, '0')}</span>
                              <a href={url} download className="as-btn sm ghost" style={{ textDecoration: 'none' }}><Upload size={10} style={{ transform: 'rotate(180deg)' }} /></a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {project.status === 'done' && photoResults.length > 0 && (
                <div>
                  <div className="as-subhead">Tạo video AI từ một phương án</div>
                  <div className="as-image-picker">
                    {photoResults.map((url: string, i: number) => (
                      <div
                        key={i}
                        className={`pick${selectedVideoImage === url ? ' active' : ''}`}
                        onClick={() => setSelectedVideoImage(url)}
                      >
                        <img decoding="async" loading="lazy" src={url} alt={`PA ${i+1}`} />
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="as-textarea"
                    placeholder="Prompt video (tùy chọn — để trống dùng mặc định)"
                    value={videoPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setVideoPrompt(e.target.value)}
                  />
                  <div className="as-actions-row">
                    <button
                      className="as-btn primary"
                      disabled={!selectedVideoImage || isGeneratingVideo}
                      onClick={async () => {
                        if (!selectedVideoImage) return;
                        setIsGeneratingVideo(true);
                        setActionFeedback('Đang gửi lệnh tạo video AI… (3–10 phút)');
                        try {
                          const defaultPrompt = systemContent.promptVideo || 'Smooth cinematic camera slowly panning through this beautiful landscape garden. Gentle water flowing over rocks, koi fish swimming, leaves swaying in soft breeze. Golden hour warm lighting, photorealistic quality, peaceful atmosphere. 16:9 cinematic ratio.';
                          const res = await apiFetch(`/api/projects/${project.id}/generate-video`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: videoPrompt.trim() || defaultPrompt, imageUrl: selectedVideoImage })
                          });
                          const data = await res.json();
                          if (data.videoUrl) {
                            setActionFeedback('Video AI đã tạo thành công.');
                            setSelectedProject(data.project);
                          } else {
                            setActionFeedback('Không tạo được video. Thử lại sau.');
                          }
                        } catch (e: any) {
                          setActionFeedback(`Lỗi: ${e.message}`);
                        } finally {
                          setIsGeneratingVideo(false);
                        }
                      }}
                    >
                      {isGeneratingVideo ? <><RefreshCcw size={12} className="spin" /> Đang tạo…</> : <><VideoIcon size={12} /> Tạo Video AI</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* STEP 04 — Pass 2 -------------------------- */}
          <section className={`as-step${project.status !== 'done' || photoResults.length === 0 ? ' dim' : ''}`} id="as-step-pass2">
            <div className="as-step-head">
              <span className="as-step-num">[ 04 / 06 ]</span>
              <h3 className="as-step-title">Pass 2 — Bổ sung 7 phương án</h3>
              <span className={`as-step-status ${dotFor('pass2').tone}`}>{dotFor('pass2').label}</span>
            </div>
            <div className="as-step-body">
              {photoResults.length === 0 ? (
                <div className="as-ai-empty">Chưa có ảnh AI ở bước 03 — chưa thể chạy Pass 2.</div>
              ) : (
                <>
                  <div>
                    <div className="as-subhead">Chọn 1 ảnh PA làm reference</div>
                    <div className="as-image-picker">
                      {photoResults.map((url: string, i: number) => (
                        <div
                          key={i}
                          className={`pick${selectedPass2Image === url ? ' active' : ''}`}
                          onClick={() => setSelectedPass2Image(url)}
                        >
                          <img decoding="async" loading="lazy" src={url} alt={`PA ${i+1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="as-subhead">Kích thước khu vực (m)</div>
                    <div className="as-form" style={{ background: 'transparent', border: '1px solid var(--as-line)' }}>
                      <div className="row">
                        <label>
                          <span>Chiều ngang (m)</span>
                          <input type="number" min="1" step="0.5" className="as-input" value={pass2Width} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPass2Width(e.target.value)} />
                        </label>
                        <label>
                          <span>Chiều dài (m)</span>
                          <input type="number" min="1" step="0.5" className="as-input" value={pass2Length} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPass2Length(e.target.value)} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="as-actions-row">
                    <button
                      className="as-btn primary"
                      disabled={!selectedPass2Image || isStartingPass2 || project.pass2Results?.status === 'running'}
                      onClick={async () => {
                        if (!selectedPass2Image) return;
                        setIsStartingPass2(true);
                        setActionFeedback('Đang khởi động Pass 2 (7 tab Flow song song)…');
                        try {
                          const width = parseFloat(pass2Width) || 4;
                          const length = parseFloat(pass2Length) || 4;
                          const res = await apiFetch(`/api/projects/${project.id}/pass2`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ referenceImageUrl: selectedPass2Image, dimensions: { width, length } })
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Không khởi động được Pass 2.');
                          setActionFeedback('Pass 2 đã khởi động.');
                          if (data.pass2Results) {
                            setSelectedProject((prev: any) => prev ? { ...prev, pass2Results: data.pass2Results } : prev);
                          }
                        } catch (e: any) {
                          setActionFeedback(`Lỗi: ${e.message}`);
                        } finally {
                          setIsStartingPass2(false);
                        }
                      }}
                    >
                      {project.pass2Results?.status === 'running' ? (<><RefreshCcw size={12} className="spin" /> Đang chạy Pass 2…</>) : isStartingPass2 ? (<><RefreshCcw size={12} className="spin" /> Đang khởi động…</>) : 'Chạy Pass 2 (7 output)'}
                    </button>
                    {project.pass2Results && (
                      <span style={{ fontFamily: 'var(--as-mono)', fontSize: 11, color: 'var(--as-text-2)', letterSpacing: '0.08em' }}>
                        {project.pass2Results.tasks?.filter((t: any) => t.status === 'done').length || 0}/7 xong
                      </span>
                    )}
                  </div>

                  {project.pass2Results && project.pass2Results.tasks?.length > 0 && (
                    <div>
                      <div className="as-subhead">Kết quả</div>
                      <div className="as-pass2-tasks">
                        {project.pass2Results.tasks.map((task: any) => (
                          <div key={task.taskId} className="as-pass2-task">
                            <div className={`body${task.url ? '' : ' placeholder'}`}>
                              {task.url ? (
                                task.type === 'video' ? <video src={task.url} controls /> : <img decoding="async" loading="lazy" src={task.url} alt={task.label} />
                              ) : (
                                task.status === 'failed' ? '× Lỗi' : task.status === 'running' ? 'Đang chạy…' : 'Chờ…'
                              )}
                            </div>
                            <div className="foot">
                              <span className="nm">{task.label}</span>
                              <span className={`as-chip ${task.status === 'done' ? 'ok' : task.status === 'failed' ? 'err' : task.status === 'running' ? 'info' : 'muted'}`}>{task.status}</span>
                            </div>
                            {task.error && <div className="err">{task.error}</div>}
                            {(task.status === 'failed' || (task.status === 'done' && !task.url)) && (
                              <button
                                className="as-btn sm primary"
                                style={{ width: '100%', borderRadius: 0 }}
                                onClick={async () => {
                                  try {
                                    const res = await apiFetch(`/api/projects/${project.id}/pass2/retry`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ taskId: task.taskId })
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data.error || 'Retry failed');
                                    setActionFeedback(`Đang thử lại: ${task.label}`);
                                  } catch (e: any) { setActionFeedback(`Lỗi: ${e.message}`); }
                                }}
                              >
                                <RefreshCcw size={11} /> Thử lại
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* STEP 05 — Thanh toán ---------------------- */}
          <section className="as-step" id="as-step-payment">
            <div className="as-step-head">
              <span className="as-step-num">[ 05 / 06 ]</span>
              <h3 className="as-step-title">Thanh toán</h3>
              <span className={`as-step-status ${dotFor('payment').tone}`}>{dotFor('payment').label}</span>
            </div>
            <div className="as-step-body">
              {project.payment ? (
                <>
                  <div className="as-fields">
                    <div className="as-field">
                      <span className="lbl">[ ] Gói</span>
                      <span className="val">{project.payment.packageLabel || project.payment.packageId || '—'}</span>
                      {typeof project.payment.area === 'number' && <span className="lbl" style={{ marginTop: 4 }}>Diện tích · {project.payment.area} m²</span>}
                    </div>
                    <div className="as-field">
                      <span className="lbl">[ ] Số tiền</span>
                      <span className="val amount">{formatVND(project.payment.amount)}</span>
                    </div>
                    <div className="as-field">
                      <span className="lbl">[ ] Trạng thái</span>
                      <span className="val">
                        {renderPaymentBadge(project.payment)}
                        {project.payment.manual && <span className="lbl" style={{ marginLeft: 8, display: 'inline' }}>· thủ công</span>}
                      </span>
                    </div>
                    {project.payment.orderId && (
                      <div className="as-field">
                        <span className="lbl">[ ] Order ID</span>
                        <span className="val mono">{project.payment.orderId}</span>
                      </div>
                    )}
                    {project.payment.transId && (
                      <div className="as-field">
                        <span className="lbl">[ ] Trans ID</span>
                        <span className="val mono">{project.payment.transId}</span>
                      </div>
                    )}
                    {project.payment.paidAt && (
                      <div className="as-field">
                        <span className="lbl">[ ] Đã trả lúc</span>
                        <span className="val muted">{new Date(project.payment.paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                      </div>
                    )}
                    {project.payment.cancelledAt && (
                      <div className="as-field">
                        <span className="lbl">[ ] Đã hủy lúc</span>
                        <span className="val muted">{new Date(project.payment.cancelledAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                      </div>
                    )}
                  </div>
                  {(project.payment.message || project.payment.note) && (
                    <div>
                      <div className="as-subhead">Ghi chú</div>
                      <div className="as-quote">{project.payment.note || project.payment.message}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="as-ai-empty">Chưa có giao dịch nào.</div>
              )}

              <div>
                <div className="as-subhead">Hành động</div>
                <div className="as-actions-row">
                  <button className="as-btn ghost" onClick={handlePaymentRecheck} disabled={paymentBusy}>
                    <RefreshCcw size={12} /> Kiểm tra lại MoMo
                  </button>
                  <button className="as-btn success" onClick={() => setShowMarkPaidForm((v: boolean) => !v)} disabled={paymentBusy}>
                    <CheckCircle2 size={12} /> Đánh dấu đã trả thủ công
                  </button>
                  {project.payment?.status === 'pending' && (
                    <button className="as-btn danger" onClick={handlePaymentCancel} disabled={paymentBusy}>
                      <X size={12} /> Hủy đơn
                    </button>
                  )}
                </div>
              </div>

              {showMarkPaidForm && (
                <div className="as-form">
                  <div className="row">
                    <label>
                      <span>[ ] Package ID</span>
                      <select className="as-input" value={markPaidPackageId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMarkPaidPackageId(e.target.value)}>
                        <option value="">— Giữ nguyên / Tự động —</option>
                        <option value="basic">basic</option>
                        <option value="standard">standard</option>
                        <option value="premium">premium</option>
                        <option value="custom">custom</option>
                      </select>
                    </label>
                    <label>
                      <span>[ ] Số tiền (VND)</span>
                      <input type="number" min="0" step="1000" className="as-input" value={markPaidAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMarkPaidAmount(e.target.value)} placeholder="VD 500000" />
                    </label>
                  </div>
                  <label>
                    <span>[ ] Ghi chú</span>
                    <textarea className="as-textarea" rows={2} value={markPaidNote} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMarkPaidNote(e.target.value)} placeholder="VD: Khách chuyển khoản trực tiếp…" />
                  </label>
                  <div className="footer">
                    <button className="as-btn ghost" onClick={() => setShowMarkPaidForm(false)} disabled={paymentBusy}>Hủy</button>
                    <button className="as-btn primary" onClick={handleMarkPaidSubmit} disabled={paymentBusy}>
                      {paymentBusy ? 'Đang lưu…' : 'Xác nhận đã trả'}
                    </button>
                  </div>
                </div>
              )}

              {paymentError && (
                <div className="as-form" style={{ background: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.3)' }}>
                  <div style={{ color: 'var(--as-err)', fontFamily: 'var(--as-mono)', fontSize: 12 }}>{paymentError}</div>
                </div>
              )}
            </div>
          </section>

          {/* STEP 06 — Bản vẽ hoàn thiện -------------- */}
          <section className="as-step" id="as-step-final">
            <div className="as-step-head">
              <span className="as-step-num">[ 06 / 06 ]</span>
              <h3 className="as-step-title">Bản vẽ hoàn thiện</h3>
              <span className={`as-step-status ${dotFor('final').tone}`}>{dotFor('final').label}</span>
            </div>
            <div className="as-step-body">
              {project.finalImage && (
                <div className="as-media-card" style={{ maxWidth: 540 }}>
                  <div className="head"><span className="lbl">Bản vẽ đã giao</span><span className="num">FINAL</span></div>
                  <img decoding="async" loading="lazy" src={project.finalImage} alt="Bản vẽ" />
                </div>
              )}
              <div className="as-actions-row">
                <button className="as-btn primary" onClick={() => handleWorkflowSelect('manual_design')}>
                  <Paintbrush size={12} /> Mở trình thiết kế chuyên sâu
                </button>
                <button className="as-btn ghost" onClick={() => fileRef.current?.click()}>
                  <Upload size={12} /> {project.status === 'done' ? 'Cập nhật bản vẽ mới' : 'Tải bản vẽ hoàn thiện'}
                </button>
                <input type="file" accept="image/*" ref={fileRef} onChange={handleUploadResult} hidden />
                {project.status === 'done' && (
                  <button className="as-btn success" onClick={() => window.open(`https://zalo.me/${project.customerPhone.replace(/\D/g, '')}`, '_blank')}>
                    <MessageCircle size={12} /> Phản hồi qua Zalo
                  </button>
                )}
              </div>
              {!project.finalImage && project.status !== 'done' && (
                <div className="as-ai-empty">Chưa có bản vẽ hoàn thiện. Upload để chuyển trạng thái sang &ldquo;Đã giao&rdquo;.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// --- ADMIN VIEW ---
function AdminView({
  projects, isLoading, systemContent, onSystemContentUpdate, onSync, onBack, onUpdateProject, onDeleteProject, onDeleteAllProjects, onGenerateAiImage, onRefreshConfig
}: { 
  projects: Project[]; 
  isLoading: boolean;
  systemContent: any;
  onSystemContentUpdate: (c: any) => void;
  onSync: () => Promise<boolean>;
  onBack: () => void;
  onUpdateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
  onDeleteProject: (id: string) => Promise<void>;
  onDeleteAllProjects: () => Promise<number>;
  onGenerateAiImage: (id: string, payload: any) => Promise<Project>;
  onRefreshConfig: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'projects' | 'resources' | 'prompt' | 'pass2' | 'config' | 'revenue'>('projects');
  const [adminBranch, setAdminBranch] = useState<MainBranch>('landscape');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [actionFeedback, setActionFeedback] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed' | 'cancelled' | 'none'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStepKey, setActiveStepKey] = useState<string>('customer');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [showMarkPaidForm, setShowMarkPaidForm] = useState(false);
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [markPaidPackageId, setMarkPaidPackageId] = useState('');
  const [markPaidAmount, setMarkPaidAmount] = useState('');
  const [showDesigner, setShowDesigner] = useState(false);
  const [showAIStudio, setShowAIStudio] = useState(false);
  const [designerReady, setDesignerReady] = useState(false);
  const [designerStatus, setDesignerStatus] = useState('Đang tải trình thiết kế...');
  const [designerTab, setDesignerTab] = useState<'customer' | 'system'>('customer');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState('');
  const [aiStudioStatus, setAiStudioStatus] = useState('Sẵn sàng.');
  const [isDraggingToDesigner, setIsDraggingToDesigner] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [selectedVideoImage, setSelectedVideoImage] = useState('');
  const [selectedPass2Image, setSelectedPass2Image] = useState('');
  const [pass2Width, setPass2Width] = useState('4');
  const [pass2Length, setPass2Length] = useState('4');
  const [isStartingPass2, setIsStartingPass2] = useState(false);
  const [draggedItem, setDraggedItem] = useState<DesignerLibraryItem | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isDeletingAllProjects, setIsDeletingAllProjects] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const designerFileRef = useRef<HTMLInputElement>(null);
  const designerFrameRef = useRef<HTMLIFrameElement>(null);
  const autoLoadedDesignerProjectRef = useRef<string | null>(null);

  useEffect(() => { if (actionFeedback) { const t = setTimeout(() => setActionFeedback(''), 4000); return () => clearTimeout(t); } }, [actionFeedback]);
  useEffect(() => {
    if (!selectedProject) return;
    const latestProject = projects.find(project => project.id === selectedProject.id);
    if (!latestProject) return;
    setSelectedProject(prev => {
      if (!prev || prev.id !== latestProject.id) return prev;
      return latestProject;
    });
  }, [projects, selectedProject?.id]);

  // Filter projects by adminBranch
  const branchProjects = projects.filter(p => (p as any).mainBranch === adminBranch || (!p.hasOwnProperty('mainBranch') && adminBranch === 'landscape'));
  const filteredProjects = branchProjects
    .filter(p => {
      if (paymentFilter === 'all') return true;
      const status = p.payment?.status;
      if (paymentFilter === 'none') return !p.payment || !status;
      return status === paymentFilter;
    })
    .filter(p => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (p.customerName || '').toLowerCase().includes(q) ||
        (p.customerPhone || '').toLowerCase().includes(q) ||
        (p.id || '').toLowerCase().includes(q)
      );
    });

  // KPIs computed from branchProjects (not search-filtered, so they reflect totals)
  const adminKpis = (() => {
    const todayVNDate = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    let todayCount = 0;
    let processingCount = 0;
    let paidCount = 0;
    let revenueToday = 0;
    branchProjects.forEach(p => {
      const pVN = new Date(p.timestamp).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      if (pVN === todayVNDate) todayCount += 1;
      if (p.status === 'processing') processingCount += 1;
      if (p.payment?.status === 'paid') {
        paidCount += 1;
        if (p.payment.paidAt) {
          const paidVN = new Date(p.payment.paidAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
          if (paidVN === todayVNDate && typeof p.payment.amount === 'number') {
            revenueToday += p.payment.amount;
          }
        }
      }
    });
    return { total: branchProjects.length, todayCount, processingCount, paidCount, revenueToday };
  })();

  // Pass 2 polling — khi đang chạy thì refresh project mỗi 5s để cập nhật trạng thái task
  useEffect(() => {
    const pass2Status = selectedProject?.pass2Results?.status;
    if (!selectedProject || (pass2Status !== 'running' && pass2Status !== 'pending')) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/projects/${selectedProject.id}`);
        if (!res.ok) return;
        const fresh = await res.json();
        setSelectedProject(fresh);
      } catch { /* ignore */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedProject?.id, selectedProject?.pass2Results?.status]);

  // Reset mark-paid form when switching project
  useEffect(() => {
    setShowMarkPaidForm(false);
    setMarkPaidNote('');
    setMarkPaidPackageId('');
    setMarkPaidAmount('');
    setPaymentError('');
  }, [selectedProject?.id]);

  const refreshSelectedProject = async (id: string) => {
    try {
      const res = await apiFetch(`/api/projects/${id}`);
      if (!res.ok) return;
      const fresh = await res.json();
      setSelectedProject(fresh);
    } catch { /* ignore */ }
  };

  const handlePaymentRecheck = async () => {
    if (!selectedProject) return;
    setPaymentBusy(true);
    setPaymentError('');
    try {
      const res = await apiFetch(`/api/projects/${selectedProject.id}/payment/recheck`, { method: 'POST' });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Không thể kiểm tra trạng thái MoMo');
      }
      await refreshSelectedProject(selectedProject.id);
      setActionFeedback('Đã kiểm tra lại trạng thái MoMo.');
    } catch (err: any) {
      setPaymentError(err?.message || 'Lỗi kiểm tra MoMo');
    } finally {
      setPaymentBusy(false);
    }
  };

  const handleMarkPaidSubmit = async () => {
    if (!selectedProject) return;
    setPaymentBusy(true);
    setPaymentError('');
    try {
      const body: any = {};
      if (markPaidNote.trim()) body.note = markPaidNote.trim();
      if (markPaidPackageId.trim()) body.packageId = markPaidPackageId.trim();
      const amt = parseFloat(markPaidAmount);
      if (!isNaN(amt) && amt > 0) body.amount = amt;
      const res = await apiFetch(`/api/projects/${selectedProject.id}/payment/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Không thể đánh dấu đã trả');
      }
      await refreshSelectedProject(selectedProject.id);
      setShowMarkPaidForm(false);
      setMarkPaidNote('');
      setMarkPaidPackageId('');
      setMarkPaidAmount('');
      setActionFeedback('Đã đánh dấu đã thanh toán thủ công.');
    } catch (err: any) {
      setPaymentError(err?.message || 'Lỗi đánh dấu đã trả');
    } finally {
      setPaymentBusy(false);
    }
  };

  const handlePaymentCancel = async () => {
    if (!selectedProject) return;
    if (!window.confirm('Hủy đơn thanh toán này?')) return;
    const note = window.prompt('Lý do hủy (tùy chọn):', '') || '';
    setPaymentBusy(true);
    setPaymentError('');
    try {
      const body: any = {};
      if (note.trim()) body.note = note.trim();
      const res = await apiFetch(`/api/projects/${selectedProject.id}/payment/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Không thể hủy đơn');
      }
      await refreshSelectedProject(selectedProject.id);
      setActionFeedback('Đã hủy đơn thanh toán.');
    } catch (err: any) {
      setPaymentError(err?.message || 'Lỗi hủy đơn');
    } finally {
      setPaymentBusy(false);
    }
  };

  const formatVND = (amount: number | undefined | null) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '—';
    try {
      return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
    } catch {
      return `${amount} đ`;
    }
  };

  const renderPaymentBadge = (payment?: PaymentInfo) => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '0.7rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      lineHeight: 1.4,
      border: '1px solid transparent'
    };
    if (!payment || !payment.status) {
      return <span style={{ ...baseStyle, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}>Chưa TT</span>;
    }
    if (payment.status === 'paid') {
      const k = typeof payment.amount === 'number' ? Math.round(payment.amount / 1000) : 0;
      const kLabel = new Intl.NumberFormat('vi-VN').format(k);
      return <span style={{ ...baseStyle, background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.4)' }}>💰 Đã trả {kLabel}k</span>;
    }
    if (payment.status === 'pending') {
      return <span style={{ ...baseStyle, background: 'rgba(250,204,21,0.15)', color: '#facc15', borderColor: 'rgba(250,204,21,0.4)' }}>⏳ Đang chờ</span>;
    }
    if (payment.status === 'failed') {
      return <span style={{ ...baseStyle, background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}>❌ Lỗi</span>;
    }
    if (payment.status === 'cancelled') {
      return <span style={{ ...baseStyle, background: 'rgba(148,163,184,0.15)', color: '#94a3b8', borderColor: 'rgba(148,163,184,0.3)' }}>🚫 Hủy</span>;
    }
    return null;
  };

  // --- HELPERS ---
  const getAssetInfo = (id: string, category: 'THAC' | 'KE' | 'CANH' | 'HO' | 'HO_HIEN_DAI' | 'TUONG_DA' | 'TUONG_CAY' | 'FARM' | 'CAFE' | 'HO_BOI'): { name: string, url: string } | null => {
    const list = (systemContent.library?.[category] || (ASSETS as any)[category]);
    for (const item of list) {
      if (item.id === id) return { name: item.name, url: 'url' in item ? item.url : '' };
      if ('variants' in item && item.variants) {
        const variant = (item as any).variants.find((v: any) => v.id === id);
        if (variant) return { name: variant.name, url: variant.url };
      }
    }
    return null;
  };

  const getAssetName = (id: string, category: 'THAC' | 'KE' | 'CANH' | 'HO' | 'HO_HIEN_DAI' | 'TUONG_DA' | 'TUONG_CAY' | 'FARM' | 'CAFE' | 'HO_BOI') => {
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
    const sortedProjects = [...filteredProjects].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
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

  const handleDeleteProject = async (project: Project, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (deletingProjectId) return;

    const ok = window.confirm(`Xóa dự án của "${project.customerName}" khỏi danh sách admin?`);
    if (!ok) return;

    try {
      setDeletingProjectId(project.id);
      await onDeleteProject(project.id);
      if (selectedProject?.id === project.id) setSelectedProject(null);
      setActionFeedback(`Đã xóa dự án của ${project.customerName}.`);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Không thể xóa dữ liệu dự án.');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleDeleteAllProjects = async () => {
    if (filteredProjects.length === 0 || isDeletingAllProjects) return;

    const ok = window.confirm(`Xóa toàn bộ ${filteredProjects.length} dự án khỏi admin? Thao tác này không thể hoàn tác.`);
    if (!ok) return;

    try {
      setIsDeletingAllProjects(true);
      const deletedCount = await onDeleteAllProjects();
      setSelectedProject(null);
      setActionFeedback(`Đã xóa ${deletedCount || filteredProjects.length} dự án khỏi hệ thống.`);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Không thể xóa toàn bộ dữ liệu dự án.');
    } finally {
      setIsDeletingAllProjects(false);
    }
  };

  const handleSaveSystemConfig = async (newConfig: any) => {
    try {
      const res = await apiFetch('/api/system-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
      if (res.ok) {
        setActionFeedback('Đã cập nhật cấu hình hệ thống thành công!');
        onRefreshConfig();
        return true;
      } else {
        throw new Error('Không thể lưu cấu hình');
      }
    } catch (err) {
      console.error(err);
      setActionFeedback('Lỗi khi lưu cấu hình.');
      return false;
    }
  };

  const ConfigEditorTab = () => {
    const [localConfig, setLocalConfig] = useState(systemContent);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
      if (!isSaving) {
        setLocalConfig(systemContent);
      }
    }, [systemContent, isSaving]);

    const handleSave = async () => {
      setIsSaving(true);
      const success = await handleSaveSystemConfig(localConfig);
      if (success) {
        onRefreshConfig();
        alert('Đã lưu cấu hình thành công!');
      } else {
        alert('Có lỗi xảy ra khi lưu cấu hình.');
      }
      setIsSaving(false);
    };

    const textSections = [
      { id: 'welcome', name: 'Trang chào (Slogan/Nút)', fields: [
        { key: 'slogan', label: 'Slogan trang chủ', default: 'Hệ thống thiết kế bản vẽ nhanh nhất Việt Nam' },
        { key: 'btn_landscape', label: 'Nút Thiết kế cảnh quan', default: 'Thiết kế cảnh quan' },
        { key: 'btn_architecture', label: 'Nút Thiết kế kiến trúc', default: 'Thiết kế kiến trúc' },
        { key: 'btn_interior', label: 'Nút Thiết kế nội thất', default: 'Thiết kế nội thất' },
        { key: 'my_projects', label: 'Nút Dự án của bạn', default: 'Dự án của bạn' }
      ]},
      { id: 'selection', name: 'Trang chọn mẫu', fields: [
        { key: 'title_cats', label: 'Tiêu đề chọn phong cách', default: 'Chọn mẫu thiết kế' },
        { key: 'sub_cats', label: 'Mô tả chọn phong cách', default: 'Hãy chọn một danh mục để thực hiện dự án của bạn.' },
        { key: 'title_gallery', label: 'Tiêu đề chọn mẫu', default: 'Nhấn chọn mẫu phù hợp' },
        { key: 'sub_gallery', label: 'Mô tả chọn mẫu', default: '' }
      ]},
      { id: 'upload', name: 'Trang tải ảnh', fields: [
        { key: 'title', label: 'Tiêu đề tải ảnh', default: 'Tải ảnh hiện trạng công trình' },
        { key: 'sub', label: 'Mô tả tải ảnh', default: 'Tải ảnh hiện trạng để bắt đầu thiết kế.' },
        { key: 'title_note', label: 'Tiêu đề mô tả ý tưởng', default: 'Mô tả ý tưởng của bạn' },
        { key: 'sub_note', label: 'Mô tả hướng dẫn', default: 'Hãy cho chúng tôi biết bạn muốn không gian trông như thế nào...' },
        { key: 'btn_next', label: 'Nút Tiếp theo', default: 'Tiếp theo' }
      ]},
      { id: 'contact', name: 'Trang thông tin liên hệ', fields: [
        { key: 'title', label: 'Tiêu đề', default: 'Thông Tin Liên Hệ' }
      ]},
      { id: 'cat_landscape', name: 'Tên danh mục Cảnh quan', fields: [
        { key: 'ho', label: 'Hồ koi cổ điển', default: 'Hồ koi sân vườn cổ điển' },
        { key: 'ho_hien_dai', label: 'Hồ koi hiện đại', default: 'Hồ koi sân vườn hiện đại' },
        { key: 'tuong_da', label: 'Tường đá trang trí', default: 'Tường đá trang trí' },
        { key: 'tuong_cay', label: 'Tường cây & vườn nhiệt đới', default: 'Tường cây & vườn nhiệt đới' },
        { key: 'farm', label: 'Quy hoạch farm', default: 'Quy hoạch farm & du lịch' },
        { key: 'cafe', label: 'Cảnh quan cà phê', default: 'Cảnh quan quán cà phê' },
        { key: 'ho_boi', label: 'Hồ bơi thiên nhiên', default: 'Hồ bơi thiên nhiên' }
      ]},
      { id: 'cat_architecture', name: 'Tên danh mục Kiến trúc', fields: [
        { key: 'nha_pho', label: 'Nhà phố', default: 'Nhà phố hiện đại' },
        { key: 'biet_thu', label: 'Biệt thự', default: 'Biệt thự sang trọng' },
        { key: 'nha_cap_4', label: 'Nhà cấp 4', default: 'Nhà cấp 4 tiện nghi' },
        { key: 'nha_vuon', label: 'Nhà vườn', default: 'Nhà vườn nghỉ dưỡng' },
        { key: 'nha_tien_che', label: 'Nhà tiền chế', default: 'Nhà tiền chế độc đáo' }
      ]},
      { id: 'cat_interior', name: 'Tên danh mục Nội thất', fields: [
        { key: 'hien_dai', label: 'Nội thất hiện đại', default: 'Nội thất hiện đại' },
        { key: 'tan_co_dien', label: 'Tân cổ điển', default: 'Tân cổ điển quý phái' },
        { key: 'indochine', label: 'Phong cách Indochine', default: 'Phong cách Indochine' },
        { key: 'wabi_sabi', label: 'Wabi sabi', default: 'Wabi sabi tối giản' },
        { key: 'tan_co_dien_go', label: 'Tân cổ điển gỗ', default: 'Tân cổ điển gỗ' }
      ]}
    ];

    return (
      <div className="admin-config-editor">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: 'var(--accent)', fontSize: '1.8rem' }}>Cấu hình nội dung giao diện</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Chỉnh sửa văn bản và biểu tượng hiển thị cho người dùng.</p>
          </div>
          <button 
            className="btn-primary" 
            onClick={handleSave} 
            disabled={isSaving}
            style={{ padding: '12px 24px', borderRadius: '12px', opacity: isSaving ? 0.5 : 1 }}
          >
             {isSaving ? 'ĐANG LƯU...' : 'LƯU CẤU HÌNH'}
          </button>
        </div>

        <div className="config-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          {textSections.map(section => (
            <div key={section.id} className="config-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ color: 'var(--accent)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>{section.name}</h3>
              {section.fields.map(field => {
                const configKey = `${section.id}_${field.key}`;
                const displayValue = localConfig.uiText?.[configKey] !== undefined ? localConfig.uiText[configKey] : field.default;
                
                return (
                  <div key={field.key} className="input-group" style={{ marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'block', color: 'rgba(255,255,255,0.5)' }}>{field.label}</label>
                    <input 
                      type="text" 
                      value={displayValue} 
                      onChange={e => {
                        const newVal = e.target.value;
                        setLocalConfig((prev: any) => ({
                          ...prev,
                          uiText: { ...prev.uiText, [configKey]: newVal }
                        }));
                      }}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem' }}
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <div className="config-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 style={{ color: 'var(--accent)', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>Quản lý Icon</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
              Dán URL ảnh (PNG/SVG) để thay thế.
            </p>
            {['landscape', 'architecture', 'interior'].map(branch => (
              <div key={branch} className="input-group" style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '0.85rem', marginBottom: '6px', display: 'block', textTransform: 'capitalize', color: 'rgba(255,255,255,0.5)' }}>Icon luồng {branch}</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    value={localConfig.uiIcons?.[`branch_${branch}`] || ''} 
                    placeholder="URL ảnh icon..."
                    onChange={e => setLocalConfig({
                      ...localConfig,
                      uiIcons: { ...localConfig.uiIcons, [`branch_${branch}`]: e.target.value }
                    })}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
    const isBasic = project.service === 'Gói Cơ bản' || project.service === 'Gói Cơ Bản';
    const modelUrl = getProjectReferenceAsset(project).url;

    const assets: AiUploadAsset[] = [
      { label: 'Ảnh hiện trạng gốc (Image 1)', url: project.rawImage, role: 'Ảnh nền chính, phải giữ nguyên kiến trúc, góc chụp và phối cảnh.' },
    ];

    if (isBasic) {
      if (modelUrl) {
        assets.push({ label: 'Ảnh mẫu khách đã chọn (Image 2)', url: modelUrl, role: 'Mẫu phong cách tham khảo. Dùng làm nguồn cảm hứng về đá, cây, hồ — KHÔNG sao chép layout.' });
      }
    } else {
      assets.push({ label: 'Ảnh khoanh vùng thiết kế', url: project.annotatedImage, role: 'Ảnh quy hoạch công năng bằng màu, dùng để xác định đúng vị trí từng hạng mục.' });

      if (project.selections.ho) {
        const info = getAssetInfo(project.selections.ho, 'HO');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu hồ koi cổ điển chọn từ thư viện.' });
      }
      if (project.selections.ho_hien_dai) {
        const info = getAssetInfo(project.selections.ho_hien_dai, 'HO_HIEN_DAI');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu hồ koi hiện đại chọn từ thư viện.' });
      }
      if (project.selections.tuong_da) {
        const info = getAssetInfo(project.selections.tuong_da, 'TUONG_DA');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu tường đá chọn từ thư viện.' });
      }
      if (project.selections.tuong_cay) {
        const info = getAssetInfo(project.selections.tuong_cay, 'TUONG_CAY');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu tường cây chọn từ thư viện.' });
      }
      if (project.selections.farm) {
        const info = getAssetInfo(project.selections.farm, 'FARM');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu farm chọn từ thư viện.' });
      }
      if (project.selections.cafe) {
        const info = getAssetInfo(project.selections.cafe, 'CAFE');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu cà phê chọn từ thư viện.' });
      }
      if (project.selections.ho_boi) {
        const info = getAssetInfo(project.selections.ho_boi, 'HO_BOI');
        if (info) assets.push({ label: `Mẫu khách chọn: ${info.name}`, url: info.url, role: 'Mẫu hồ bơi chọn từ thư viện.' });
      }
    }

    return assets;
  };


  const buildSelectionLines = (project: Project) => {
    const lines: string[] = [];
    if (project.selections.ho) lines.push(`- Hồ Koi Cổ Điển: ${getAssetName(project.selections.ho, 'HO')}`);
    if (project.selections.ho_hien_dai) lines.push(`- Hồ Koi Hiện Đại: ${getAssetName(project.selections.ho_hien_dai, 'HO_HIEN_DAI')}`);
    if (project.selections.tuong_da) lines.push(`- Tường Đá Trang Trí: ${getAssetName(project.selections.tuong_da, 'TUONG_DA')}`);
    if (project.selections.tuong_cay) lines.push(`- Tường Cây & Vườn Nhiệt Đới: ${getAssetName(project.selections.tuong_cay, 'TUONG_CAY')}`);
    if (project.selections.farm) lines.push(`- Farm & Du Lịch: ${getAssetName(project.selections.farm, 'FARM')}`);
    if (project.selections.cafe) lines.push(`- Cảnh Quan Quán Cà Phê: ${getAssetName(project.selections.cafe, 'CAFE')}`);
    if (project.selections.ho_boi) lines.push(`- Hồ Bơi Thiên Nhiên: ${getAssetName(project.selections.ho_boi, 'HO_BOI')}`);
    return lines.length > 0 ? lines : ['- Chưa có mẫu chọn cụ thể'];
  };

  const buildAiAssetLines = (project: Project) => {
    return getAiUploadAssets(project).map((asset, i) => `- File ${i + 1}: ${asset.label}. ${asset.role}`);
  };

  const buildChatGptPrompt = (project: Project) => {
    const hasNote = !!project.note?.trim();
    const isBasic = project.service === 'Gói Cơ bản';

    // Extract model URL and custom description from note (format: "[MẪU ĐÃ CHỌN]: url\ncustom text")
    const modelMatch = project.note?.match(/\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:\s*(https?:\/\/[^\n]+)/i)
      ?? project.note?.match(/https?:\/\/[^\s\n]+/);
    const modelUrl = modelMatch ? modelMatch[1] ?? modelMatch[0] : null;
    const customNote = project.note?.replace(/\[M[AĂ]U Đ[AĂ] CH[OỌ]N\]:[^\n]*\n?/i, '').trim();

    // Use custom prompt from admin if available (per category)
    const categoryPromptKey = isBasic
      ? (project.basicCategory === 'ho' ? 'promptBasic' : project.basicCategory === 'ho_hien_dai' ? 'promptHoHienDai' : project.basicCategory === 'tuong_da' ? 'promptTuongDa' : project.basicCategory === 'tuong_cay' ? 'promptTuongCay' : project.basicCategory === 'farm' ? 'promptFarm' : project.basicCategory === 'cafe' ? 'promptCafe' : project.basicCategory === 'ho_boi' ? 'promptHoBoi' : 'promptBasic')
      : null;

    if (isBasic && categoryPromptKey && systemContent[categoryPromptKey]) {
      const dynamicParts = [
        '',
        '====================================================',
        `PROJECT DATA — ${project.customerName} | ${project.service}`,
        '====================================================',
        '',
        ...(customNote ? [`CUSTOMER REQUEST: "${customNote}"`, ''] : []),
        ...(modelUrl ? [`REFERENCE MODEL (Image 2): ${modelUrl}`, ''] : []),
        '====================================================',
        'ATTACHED FILES',
        '====================================================',
        '',
        ...buildAiAssetLines(project),
      ].join('\n');
      return systemContent[categoryPromptKey] + '\n' + dynamicParts;
    }

    if (!isBasic && systemContent.promptAdvanced) {
      const dynamicParts = [
        '',
        '═══ DỮ LIỆU DỰ ÁN ═══',
        `Khách hàng: ${project.customerName}`,
        `Gói dịch vụ: ${project.service}`,
        '',
        ...(hasNote ? [`═══ YÊU CẦU CỦA KHÁCH ═══`, `"${project.note}"`, ''] : []),
        '═══ FILE ĐÍNH KÈM ═══',
        '',
        ...buildAiAssetLines(project),
      ].join('\n');
      return systemContent.promptAdvanced + '\n' + dynamicParts;
    }

    if (isBasic) {
      const noteContent = (project.note || '').toLowerCase();
      // Detect if user wants water features based on keywords
      const hasWaterKeywords = /hồ|thác|nước|pond|waterfall|stream|lake|flow|suối/i.test(noteContent);
      const hasWaterSelection = !!(project.selections.ho || project.selections.ho_hien_dai || project.selections.ho_boi);
      const includeWater = hasWaterKeywords || hasWaterSelection;

      // =============================================
      // NEW MASTER PROMPT — BASIC PACKAGE (Image-to-Image)
      // =============================================
      return [
        'ROLE: Landscape visualization expert (STRICT image-to-image transformation)',
        '',
        '====================================================',
        'OBJECTIVE',
        '====================================================',
        '',
        'Transform the real site (Image 1) into a built landscape design',
        'inspired by the reference model (Image 2).',
        '',
        'IMPORTANT:',
        '- Image 1 = ONLY base image (camera angle, walls, space must remain EXACT)',
        '- Image 2 = DESIGN REFERENCE ONLY (style, material, composition language)',
        '- DO NOT copy layout or scale from Image 2',
        '',
        '====================================================',
        `PROJECT DATA — ${project.customerName} | ${project.service}`,
        '====================================================',
        '',
        ...(customNote ? [
          'CUSTOMER REQUEST:',
          `"${customNote}"`,
          '',
        ] : []),
        ...(modelUrl ? [
          `REFERENCE MODEL (Image 2): ${modelUrl}`,
          '',
        ] : []),
        '====================================================',
        'CORE DESIGN TRANSLATION (CRITICAL)',
        '====================================================',
        '',
        'From Image 2, extract ONLY:',
        '',
        '- Natural stone composition',
        includeWater ? '- Waterfall flowing naturally across rocks' : '- Hill and stone arrangement',
        '- Integration between stone + plants',
        '- High-end garden feeling',
        '',
        'DO NOT copy:',
        '- Full size or full layout',
        '- Large mountain scale',
        '',
        '====================================================',
        'SITE ADAPTATION (VERY IMPORTANT)',
        '====================================================',
        '',
        'Adapt the design from Image 2 to fit the REAL residential yard in Image 1.',
        '',
        '- Scale DOWN all elements to match the real space',
        '- Keep proportions realistic to this yard size',
        '- Ensure the design feels buildable and not oversized',
        '',
        '====================================================',
        includeWater ? 'MAIN FEATURE — WATERFALL' : 'MAIN FEATURE — LANDSCAPE HILLS',
        '====================================================',
        '',
        ...(includeWater ? [
          '- Place waterfall at wall corner (like Image 1 geometry)',
          '- Inspired by stone from Image 2',
          '',
          'REQUIRED:',
          '- Compact stone waterfall',
          '- Built into wall (not freestanding mountain)',
          '- Flow naturally down into pond',
          '',
          'FORBIDDEN:',
          '- DO NOT create large rock mountain',
          '- DO NOT copy full waterfall from Image 2',
          '- DO NOT let waterfall occupy entire width',
        ] : [
          '- Create natural hills and stone arrangements (inspired by Image 2)',
          '- Place primarily against walls or in designated yard corners',
          '',
          'REQUIRED:',
          '- Detailed dry garden composition',
          '- Pine trees (Tùng La Hán) as focal points',
          '- Lush moss or velvet grass (Cỏ nhung)',
          '',
          'FORBIDDEN:',
          '- DO NOT add any water features (no ponds, no waterfalls)',
          '- DO NOT add fish',
        ]),
        '',
        ...(includeWater ? [
          '====================================================',
          'POND',
          '====================================================',
          '',
          '- Natural curved koi pond in front of waterfall',
          '- Proportional to yard size',
          '- Clean edge, elegant',
          '',
        ] : []),
        '====================================================',
        'LANDSCAPE',
        '====================================================',
        '',
        '- Use planting style from Image 2:',
        '  - bonsai trees',
        '  - shrubs',
        '  - natural greenery',
        '',
        'BUT:',
        '- Reduce density',
        '- Keep clean, breathable layout',
        '',
        '====================================================',
        'STONE LANGUAGE',
        '====================================================',
        '',
        '- Use stone type from Image 2:',
        '  - natural, slightly warm tone',
        `- Apply consistently to ${includeWater ? 'waterfall' : 'hills'} and accents`,
        '',
        '====================================================',
        'PATHWAY',
        '====================================================',
        '',
        '- Add stepping stones (inspired by Image 2)',
        '- Natural spacing',
        '- Soft garden path, not hard paving',
        '',
        '====================================================',
        'OVERALL HARMONY',
        '====================================================',
        '',
        '- High-end residential garden',
        '- Balanced composition',
        '- Not crowded',
        includeWater ? '- Clear focal point at waterfall' : '- Clear focal point at pine trees and hills',
        '',
        '====================================================',
        'REALISM',
        '====================================================',
        '',
        '- Photorealistic, built project look',
        '- Correct scale, believable materials',
        '- NO CGI look',
        '- NO oversized elements',
        '- NO copy-paste composition',
        '',
        '====================================================',
        'FINAL INTENT',
        '====================================================',
        '',
        'A realistic garden built on this exact site,',
        'inspired by the style of Image 2,',
        'but fully adapted to the real scale and layout of Image 1.',
        '',
        '====================================================',
        'ATTACHED FILES',
        '====================================================',
        '',
        ...buildAiAssetLines(project),
      ].join('\n');
    }

    // =============================================
    // ORIGINAL PROMPT — OTHER PACKAGES (Annotation-based)
    // =============================================
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

  const handleRunAiAutomation = async () => {
    if (!selectedProject || isGeneratingAi) return;
    try {
      setIsGeneratingAi(true);
      setAiStudioStatus('Đang mở Google Flow, nạp 2 hình tài nguyên và gửi cấu hình...');
      const assets = getAiUploadAssets(selectedProject).map(asset => ({ ...asset, url: toAbsoluteAssetUrl(asset.url) }));
      let prompt = aiGeneratedPrompt.trim();
      if (!prompt) prompt = buildChatGptPrompt(selectedProject);
      setAiGeneratedPrompt(prompt);
      const payload = { prompt, assets };
      const updatedProject = await onGenerateAiImage(selectedProject.id, payload);
      setSelectedProject(updatedProject);
      setAiStudioStatus(`Đã nhận ảnh kết quả từ Google Flow và nạp lại vào CSDL hệ thống.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể chạy tự động Flow.';
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

  const projectReferenceAsset = selectedProject ? getProjectReferenceAsset(selectedProject) : null;
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
    if (!showAIStudio || !selectedProject || !isGeneratingAi) return;

    const resultCount = selectedProject.aiResults?.length || 0;

    if (selectedProject.status === 'done' && resultCount > 0) {
      setAiStudioStatus(`Google Flow da tra ve ${resultCount} anh. He thong dang hoan tat dong bo giao dien...`);
      return;
    }

    if (selectedProject.status === 'processing') {
      setAiStudioStatus(
        resultCount > 0
          ? `Google Flow dang chay. Da nhan ${resultCount}/4 anh va dang tiep tuc dong bo...`
          : 'Google Flow dang sinh anh. He thong se tu cap nhat ngay khi co ket qua moi...'
      );
    }
  }, [showAIStudio, selectedProject, isGeneratingAi]);

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
             <button className="btn-open-chatgpt" onClick={handleRunAiAutomation} disabled={isGeneratingAi}>
               <Bot size={22} /> {isGeneratingAi ? 'Đang gửi Lệnh vẽ lên Flow...' : 'Khởi chạy tự động Google Flow'}
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
                    <img decoding="async" loading="lazy" src={asset.url} alt={asset.label} />
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
              <div className="prompt-title"><ImageIcon size={24} /> <h3>KẾT QUẢ AI DESIGN (GOOGLE FLOW)</h3></div>
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
                Chưa có ảnh kết quả. Sau khi Google Flow tạo xong, hệ thống sẽ tự động tải lên và hiển thị ở đây.
              </div>
            ) : (
              <div className="ai-result-grid">
                {aiResultImages.slice().reverse().map((mediaUrl, index) => {
                  const isVideo = mediaUrl.endsWith('.mp4') || mediaUrl.includes('/video/');
                  return (
                  <div key={`${mediaUrl}-${index}`} className="ai-result-card" style={{ position: 'relative' }}>
                    <button
                       className="ai-result-delete-btn"
                       title={isVideo ? "Xóa video này" : "Xóa ảnh này"}
                       style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}
                       onClick={async () => {
                          const newResults = (selectedProject.aiResults || []).filter((r: string) => r !== mediaUrl);
                          try {
                             const updated = await onUpdateProject(selectedProject.id, { aiResults: newResults });
                             setSelectedProject(updated);
                          } catch {
                             setActionFeedback("Lỗi khi xóa.");
                          }
                       }}
                    >
                       <X size={14} />
                    </button>
                    {isVideo ? (
                      <video src={mediaUrl} controls style={{ width: '100%', borderRadius: '8px' }} />
                    ) : (
                      <img decoding="async" loading="lazy" src={mediaUrl} alt={`AI Generation ${index + 1}`} />
                    )}
                    <div className="ai-result-actions">
                      <button className="btn-link-inline" onClick={() => window.open(mediaUrl, '_blank')}><ExternalLink size={16} /> {isVideo ? 'Xem video' : 'Xem ảnh'}</button>
                      <button className="btn-link-inline" onClick={() => copyText(mediaUrl, isVideo ? 'Đã copy link video.' : 'Đã copy link ảnh AI.')}><Copy size={16} /> Link</button>
                      {isVideo && (
                        <a href={mediaUrl} download style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                          <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Tải về
                        </a>
                      )}
                    </div>
                  </div>
                  );
                })}
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
                  const items: { id: string, cat: 'HO' | 'HO_HIEN_DAI' | 'TUONG_DA' | 'TUONG_CAY' | 'FARM' | 'CAFE' | 'HO_BOI' }[] = [];
                  if (selectedProject.selections.ho) items.push({ id: selectedProject.selections.ho, cat: 'HO' });
                  if (selectedProject.selections.ho_hien_dai) items.push({ id: selectedProject.selections.ho_hien_dai, cat: 'HO_HIEN_DAI' });
                  if (selectedProject.selections.tuong_da) items.push({ id: selectedProject.selections.tuong_da, cat: 'TUONG_DA' });
                  if (selectedProject.selections.tuong_cay) items.push({ id: selectedProject.selections.tuong_cay, cat: 'TUONG_CAY' });
                  if (selectedProject.selections.farm) items.push({ id: selectedProject.selections.farm, cat: 'FARM' });
                  if (selectedProject.selections.cafe) items.push({ id: selectedProject.selections.cafe, cat: 'CAFE' });
                  if (selectedProject.selections.ho_boi) items.push({ id: selectedProject.selections.ho_boi, cat: 'HO_BOI' });
                  if (items.length === 0) return <div className="req-tag-mini">Chưa chọn mẫu</div>;
                  return items.map((item, idx) => {
                    const info = getAssetInfo(item.id, item.cat);
                    return (
                      <div key={idx} className="req-asset-preview" title={info?.name || item.id}>
                        <div className="req-asset-thumb"><img decoding="async" loading="lazy" src={info?.url} alt={info?.name} /></div>
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
                  <div className="designer-library-thumb"><img decoding="async" loading="lazy" src={item.url} alt={item.label} /></div>
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
  const branchLabel = adminBranch === 'landscape' ? 'Cảnh quan' : adminBranch === 'architecture' ? 'Kiến trúc' : 'Nội thất';
  const fmtAbbrev = (n: number) => {
    if (!isFinite(n)) return '—';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'K';
    return String(n);
  };
  return (
    <motion.div className="view admin-view admin-shell">
      <div className="admin-content">
        {/* MASTHEAD */}
        <header className="as-masthead">
          <div className="as-brand">
            <div className="as-brand-mark">SH</div>
            <div className="as-brand-text">
              <span className="eyebrow">Sơn Hải · Atelier</span>
              <span className="name">Control Center</span>
            </div>
          </div>
          <nav className="as-tabs" aria-label="Admin sections">
            <button className={activeTab === 'projects' ? 'active' : ''} onClick={() => setActiveTab('projects')}><Folder size={13} /> Dự án</button>
            <button className={activeTab === 'resources' ? 'active' : ''} onClick={() => setActiveTab('resources')}><Layers size={13} /> Tài nguyên</button>
            <button className={activeTab === 'prompt' ? 'active' : ''} onClick={() => setActiveTab('prompt')}><Bot size={13} /> Prompt AI</button>
            <button className={activeTab === 'pass2' ? 'active' : ''} onClick={() => setActiveTab('pass2')}><Layers size={13} /> Pass 2</button>
            <button className={activeTab === 'revenue' ? 'active' : ''} onClick={() => setActiveTab('revenue')}><CircleDollarSign size={13} /> Doanh thu</button>
            <button className={activeTab === 'config' ? 'active' : ''} onClick={() => setActiveTab('config')}><Settings size={13} /> Cấu hình</button>
          </nav>
          <div className="as-meta">
            <span>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'short', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
            <button onClick={onBack} className="as-back"><ChevronLeft size={13} /> Trang chủ</button>
          </div>
        </header>

        {/* PAGE BODY */}
        <div className="as-page">

        {activeTab === 'resources' && (
          <AssetManagerView
            systemContent={systemContent}
            onSystemContentUpdate={onSystemContentUpdate}
            onSync={onSync}
            onFeedback={setActionFeedback}
            onClose={() => setActiveTab('projects')}
            adminBranch={adminBranch}
          />
        )}

        {activeTab === 'prompt' && (
          <PromptEditorView
            systemContent={systemContent}
            onSystemContentUpdate={onSystemContentUpdate}
            onSync={onSync}
            onFeedback={setActionFeedback}
            adminBranch={adminBranch}
            onBranchChange={setAdminBranch}
          />
        )}

        {activeTab === 'pass2' && (
          <Pass2ManagerView onFeedback={setActionFeedback} adminBranch={adminBranch} onBranchChange={setAdminBranch} />
        )}

        {activeTab === 'config' && (
          <>
            <div className="as-context">
              <div>
                <span className="as-eyebrow">Cấu hình giao diện</span>
                <h1 className="as-title">Theme &amp; <em>UI tokens</em></h1>
              </div>
            </div>
            <ConfigEditorTab />
          </>
        )}

        {activeTab === 'revenue' && (
          <>
            <div className="as-context">
              <div>
                <span className="as-eyebrow">Doanh thu</span>
                <h1 className="as-title">Sổ <em>Doanh thu</em> · {branchLabel}</h1>
              </div>
              <div className="as-context-meta">
                <div>VAT &amp; phí · <b>chưa tính</b></div>
                <div>Múi giờ · <b>Asia/Ho_Chi_Minh</b></div>
              </div>
            </div>
            <RevenueDashboard />
          </>
        )}

        {activeTab === 'projects' && (
          <>
            {selectedProject ? (
          <ProjectDetailFlow
            project={selectedProject}
            branchLabel={branchLabel}
            adminBranch={adminBranch}
            activeStepKey={activeStepKey}
            setActiveStepKey={setActiveStepKey}
            onBack={() => setSelectedProject(null)}
            onDelete={(e: React.MouseEvent) => handleDeleteProject(selectedProject, e)}
            deleting={deletingProjectId === selectedProject.id}
            getStatusLabel={getStatusLabel}
            renderPaymentBadge={renderPaymentBadge}
            getWorkflowShortLabel={getWorkflowShortLabel}
            formatVND={formatVND}
            copyText={copyText}
            getAssetInfo={getAssetInfo}
            getAssetName={getAssetName}
            isVideoAsset={isVideoAsset}
            projectReferenceAsset={projectReferenceAsset}
            workflowOptions={workflowOptions}
            handleWorkflowSelect={handleWorkflowSelect}
            handleUploadResult={handleUploadResult}
            fileRef={fileRef}
            paymentBusy={paymentBusy}
            paymentError={paymentError}
            handlePaymentRecheck={handlePaymentRecheck}
            handlePaymentCancel={handlePaymentCancel}
            handleMarkPaidSubmit={handleMarkPaidSubmit}
            showMarkPaidForm={showMarkPaidForm}
            setShowMarkPaidForm={setShowMarkPaidForm}
            markPaidNote={markPaidNote}
            setMarkPaidNote={setMarkPaidNote}
            markPaidPackageId={markPaidPackageId}
            setMarkPaidPackageId={setMarkPaidPackageId}
            markPaidAmount={markPaidAmount}
            setMarkPaidAmount={setMarkPaidAmount}
            videoPrompt={videoPrompt}
            setVideoPrompt={setVideoPrompt}
            selectedVideoImage={selectedVideoImage}
            setSelectedVideoImage={setSelectedVideoImage}
            isGeneratingVideo={isGeneratingVideo}
            setIsGeneratingVideo={setIsGeneratingVideo}
            setSelectedProject={setSelectedProject}
            systemContent={systemContent}
            setActionFeedback={setActionFeedback}
            selectedPass2Image={selectedPass2Image}
            setSelectedPass2Image={setSelectedPass2Image}
            pass2Width={pass2Width}
            setPass2Width={setPass2Width}
            pass2Length={pass2Length}
            setPass2Length={setPass2Length}
            isStartingPass2={isStartingPass2}
            setIsStartingPass2={setIsStartingPass2}
            setShowAIStudio={setShowAIStudio}
          />
        ) : (
          <>
            {/* CONTEXT BAR */}
            <div className="as-context">
              <div>
                <span className="as-eyebrow">Bộ phận {branchLabel}</span>
                <h1 className="as-title">Sổ ghi <em>Dự án</em> · Kiểm soát Atelier</h1>
              </div>
              <div className="as-context-meta">
                <div>Tổng · <b>{adminKpis.total}</b> · Hôm nay <b>{adminKpis.todayCount}</b></div>
                <div>Đang xử lý · <b>{adminKpis.processingCount}</b> · Đã trả <b>{adminKpis.paidCount}</b></div>
              </div>
            </div>

            {/* KPI STRIP */}
            <div className="as-kpi-strip">
              <div className="as-kpi accent">
                <div className="as-kpi-label"><span className="as-icon-orb"><Folder size={11} /></span>Tổng dự án</div>
                <div className="as-kpi-value">{adminKpis.total}<span className="unit">hồ sơ</span></div>
                <div className="as-kpi-foot">Bộ phận · {branchLabel}</div>
              </div>
              <div className="as-kpi">
                <div className="as-kpi-label"><span className="as-icon-orb"><Clock size={11} /></span>Hôm nay</div>
                <div className="as-kpi-value">{adminKpis.todayCount}<span className="unit">đơn mới</span></div>
                <div className="as-kpi-foot">{new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' })}</div>
              </div>
              <div className="as-kpi warn">
                <div className="as-kpi-label"><span className="as-icon-orb"><Loader2 size={11} /></span>Đang xử lý</div>
                <div className="as-kpi-value">{adminKpis.processingCount}<span className="unit">/ {adminKpis.total}</span></div>
                <div className="as-kpi-foot">Pipeline AI &amp; KTS</div>
              </div>
              <div className="as-kpi ok">
                <div className="as-kpi-label"><span className="as-icon-orb"><CheckCircle2 size={11} /></span>Đã thanh toán</div>
                <div className="as-kpi-value">{adminKpis.paidCount}<span className="unit">đơn</span></div>
                <div className="as-kpi-foot">Tỷ lệ {adminKpis.total > 0 ? Math.round(adminKpis.paidCount / adminKpis.total * 100) : 0}%</div>
              </div>
              <div className="as-kpi accent">
                <div className="as-kpi-label"><span className="as-icon-orb"><TrendingUp size={11} /></span>Doanh thu hôm nay</div>
                <div className="as-kpi-value">{fmtAbbrev(adminKpis.revenueToday)}<span className="unit">VND</span></div>
                <div className="as-kpi-foot">{formatVND(adminKpis.revenueToday)}</div>
              </div>
            </div>

            {/* TOOLBAR */}
            <div className="as-toolbar">
              <div className="as-segmented" role="tablist" aria-label="Chọn bộ phận">
                <button className={adminBranch === 'landscape' ? 'active' : ''} onClick={() => { setAdminBranch('landscape'); setSelectedProject(null); }}><Map size={12} /> Cảnh quan</button>
                <button className={adminBranch === 'architecture' ? 'active' : ''} onClick={() => { setAdminBranch('architecture'); setSelectedProject(null); }}><Box size={12} /> Kiến trúc</button>
                <button className={adminBranch === 'interior' ? 'active' : ''} onClick={() => { setAdminBranch('interior'); setSelectedProject(null); }}><Coffee size={12} /> Nội thất</button>
              </div>
              <div className="as-search">
                <Search size={14} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên · SĐT · ID dự án"
                  aria-label="Tìm dự án"
                />
              </div>
              <select
                className="as-select"
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
                aria-label="Lọc theo trạng thái thanh toán"
              >
                <option value="all">Tất cả TT</option>
                <option value="paid">Đã trả</option>
                <option value="pending">Đang chờ</option>
                <option value="failed">Thất bại</option>
                <option value="cancelled">Đã hủy</option>
                <option value="none">Chưa TT</option>
              </select>
              {filteredProjects.length > 0 && (
                <button
                  type="button"
                  className="as-btn danger"
                  onClick={handleDeleteAllProjects}
                  disabled={isDeletingAllProjects}
                >
                  <Trash2 size={12} />
                  {isDeletingAllProjects ? 'Đang xóa…' : 'Xóa tất cả'}
                </button>
              )}
            </div>

            {/* GRID */}
            {isLoading ? (
              <div className="as-empty">
                <div className="ico"><Loader2 size={26} className="spin" /></div>
                <div className="ttl">Đang tải sổ dự án</div>
                <div className="sub">Truy vấn cơ sở dữ liệu…</div>
              </div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className="as-empty">
                <div className="ico"><FolderOpen size={26} /></div>
                <div className="ttl">Chưa có dự án nào</div>
                <div className="sub">Hồ sơ khách hàng sẽ xuất hiện tại đây</div>
              </div>
            ) : (
              Object.keys(grouped).map(dateGroup => (
                <section key={dateGroup}>
                  <div className="as-date-stripe">
                    <span className="as-date-label">{dateGroup}</span>
                    <span className="as-date-count">[ {grouped[dateGroup].length} hồ sơ ]</span>
                  </div>
                  <div className="as-grid">
                    {grouped[dateGroup].map(project => {
                      const photoResults = (project.aiResults || []).filter((u: string) => !u.endsWith('.mp4') && !u.includes('/video/'));
                      const thumbCount = Math.max(4, photoResults.length || 4);
                      return (
                      <div
                        key={project.id}
                        role="button"
                        tabIndex={0}
                        className="as-card"
                        onClick={() => { setSelectedProject(project); setActiveStepKey('customer'); }}
                        onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProject(project); setActiveStepKey('customer'); } }}
                      >
                        <div className="as-card-row">
                          <span className="as-card-time">{new Date(project.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}</span>
                          <span className="as-card-id">#{project.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="as-card-name">{project.customerName}</div>
                          <div className="as-card-phone"><Phone size={11} /> {project.customerPhone}</div>
                        </div>
                        <div className="as-card-chips">
                          <span className={`as-chip ${project.status === 'done' ? 'ok' : project.status === 'processing' ? 'info' : 'warn'}`}>
                            <Circle size={6} fill="currentColor" /> {getStatusLabel(project.status)}
                          </span>
                          <span className="as-chip gold">{project.service}</span>
                          <span className="as-chip muted">{getWorkflowShortLabel(project.workflowBranch)}</span>
                        </div>
                        <div className="as-card-row">
                          {renderPaymentBadge(project.payment)}
                          <span className="as-card-id">{project.aiResults?.length || 0} ảnh / {project.pass2Results?.tasks?.filter(t => t.status === 'done').length || 0} pass2</span>
                        </div>
                        {project.status === 'processing' && (
                          <div className="as-card-progress">
                            <span className="generating-spinner" />
                            <span>Đang xử lý · {project.aiResults?.length || 0}/4 phương án</span>
                          </div>
                        )}
                        <div className="as-card-thumbs">
                          {Array.from({ length: thumbCount }).slice(0, 4).map((_, i) => {
                            const media = photoResults[i];
                            return (
                              <div key={i} className={`thumb${media ? '' : ' empty'}`}>
                                {media ? <img decoding="async" loading="lazy" src={media} alt={`AI ${i+1}`} /> : <span>—</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="as-card-actions">
                          <button
                            type="button"
                            className="as-btn danger sm"
                            onClick={(event) => { event.stopPropagation(); handleDeleteProject(project, event); }}
                            disabled={deletingProjectId === project.id}
                            aria-label={`Xóa dự án ${project.customerName}`}
                          >
                            <Trash2 size={11} />
                            {deletingProjectId === project.id ? 'Xóa…' : 'Xóa'}
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </>
    )}

        {actionFeedback && (
          <div className="as-feedback">{actionFeedback}</div>
        )}
        </div>
      </div>
    </motion.div>
  );
}
