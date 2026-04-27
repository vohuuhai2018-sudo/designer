import { useEffect, useMemo, useState } from 'react';
import { X, Check, Copy as CopyIcon, ExternalLink, Loader2, Sparkles, Zap, Building2, Smartphone, Clock } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

type PackageId = 'test_1k' | 'basic_4' | 'basic_8' | 'advanced' | 'kts_3d';

type Pkg = {
  id: PackageId;
  title: string;
  subtitle: string;
  bullets: string[];
  price: number | null;
  badge: string;
  color: string;
  gradient: string;
  needsArea?: boolean;
  recommended?: boolean;
  hidden?: boolean;
};

const PACKAGES: Pkg[] = [
  {
    id: 'test_1k',
    title: 'Gói Test',
    subtitle: 'Kiểm tra cổng MoMo — chỉ admin/dev',
    bullets: ['Test cổng thanh toán', 'Mở khoá như gói thật', 'Dành cho admin/dev'],
    price: 1000,
    badge: 'TEST',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    hidden: true
  },
  {
    id: 'basic_4',
    title: 'Cơ Bản',
    subtitle: 'Tải 4 ảnh phương án',
    bullets: ['Miễn phí lên phương án', '4 ảnh chất lượng cao', 'Tối đa 2 lần chỉnh sửa'],
    price: 50000,
    badge: 'STARTER',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'
  },
  {
    id: 'basic_8',
    title: 'Cơ Bản+',
    subtitle: 'Tải 8 ảnh + 2 video',
    bullets: ['Tất cả phương án thiết kế', '8 ảnh + 2 video phối cảnh', 'Tối đa 2 lần chỉnh sửa'],
    price: 200000,
    badge: 'PHỔ BIẾN',
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #166534 100%)',
    recommended: true
  },
  {
    id: 'advanced',
    title: 'Nâng Cao',
    subtitle: 'Combo 10 dự án',
    bullets: ['Thực hiện 10 dự án', 'Mỗi dự án: 8 ảnh + 2 video', 'Tối đa 4 lần chỉnh sửa'],
    price: 500000,
    badge: 'PRO',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)'
  },
  {
    id: 'kts_3d',
    title: '3D KTS',
    subtitle: 'Tính theo m² · KTS riêng',
    bullets: ['69.000đ/m² · dưới 1.000m²', '20.000đ/m² · 1.000–10.000m²', '8.000đ/m² · trên 1 hecta', 'KTS chuyên nghiệp', 'Không giới hạn chỉnh sửa'],
    price: null,
    badge: 'PREMIUM',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)',
    needsArea: true
  }
];

function calc3dKtsPrice(area: number): number {
  if (!Number.isFinite(area) || area <= 0) return 0;
  let unit;
  if (area >= 10000) unit = 8000;
  else if (area > 1000) unit = 20000;
  else unit = 69000;
  return Math.round(area * unit);
}

const fmtVND = (v: number) => v.toLocaleString('vi-VN') + 'đ';

function BankRow({
  label, value, field, copy, copied, mono, highlight
}: {
  label: string; value: string; field: string;
  copy: (txt: string, field: string) => void; copied: string;
  mono?: boolean; highlight?: boolean;
}) {
  const isCopied = copied === field;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '10px 0',
      borderBottom: '1px solid rgba(212,163,115,0.18)'
    }}>
      <div style={{ fontSize: '0.78rem', color: '#7c5c2e', flexShrink: 0, fontWeight: 600 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: highlight ? '0.98rem' : '0.9rem',
          fontWeight: highlight ? 900 : 700,
          color: highlight ? '#b45309' : '#1a1a1a',
          fontFamily: mono ? 'ui-monospace, monospace' : 'inherit',
          letterSpacing: mono ? '0.02em' : 'normal',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{value}</span>
        <button
          onClick={() => copy(value, field)}
          style={{
            background: isCopied ? 'rgba(34,197,94,0.15)' : 'rgba(212,163,115,0.12)',
            border: isCopied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(212,163,115,0.3)',
            borderRadius: 8, padding: '6px 10px',
            color: isCopied ? '#16a34a' : '#7c5c2e',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', fontWeight: 700,
            transition: 'all .15s'
          }}
          title="Copy"
        >
          {isCopied ? <><Check size={12} /> Đã copy</> : <><CopyIcon size={12} /></>}
        </button>
      </div>
    </div>
  );
}

export type PaymentStatus = 'none' | 'pending' | 'paid' | 'failed';
export type PayMethod = 'momo' | 'bank_transfer';

type BankInfo = {
  bin: string;
  accountNo: string;
  accountName: string;
  bankName?: string;
  transferContent: string;
  qrImageUrl: string;
};

type OrderState = {
  method: PayMethod;
  amount: number;
  orderId: string;
  packageLabel: string;
  // momo
  payUrl?: string;
  qrCodeUrl?: string;
  deeplink?: string;
  // bank
  bankInfo?: BankInfo;
};

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
  presetPackageId?: PackageId;
};

export function PaymentModal({ projectId, open, onClose, onPaid, presetPackageId }: Props) {
  const [step, setStep] = useState<'choose' | 'pay'>('choose');
  const [picked, setPicked] = useState<PackageId | null>(null);
  const [method, setMethod] = useState<PayMethod>('bank_transfer');
  const [area, setArea] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [order, setOrder] = useState<OrderState | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('none');
  const [copiedField, setCopiedField] = useState<string>('');

  useEffect(() => {
    if (!open) {
      setStep('choose');
      setPicked(null);
      setMethod('bank_transfer');
      setArea('');
      setErrMsg('');
      setOrder(null);
      setStatus('none');
      setCreating(false);
      setCopiedField('');
    } else if (presetPackageId) {
      setPicked(presetPackageId);
    }
  }, [open, presetPackageId]);

  useEffect(() => {
    if (step !== 'pay' || !order) return;
    let active = true;
    const tick = async () => {
      try {
        const r = await fetch(`${API_BASE}/api/projects/${projectId}/payment/status`);
        const d = await r.json();
        if (!active) return;
        if (d.status === 'paid') {
          setStatus('paid');
          setTimeout(() => { onPaid(); }, 1200);
        } else if (d.status === 'failed') {
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } catch { /* ignore */ }
    };
    tick();
    const itv = setInterval(tick, 3000);
    return () => { active = false; clearInterval(itv); };
  }, [step, order, projectId, onPaid]);

  const computedAmount = useMemo(() => {
    if (!picked) return 0;
    if (picked === 'kts_3d') return calc3dKtsPrice(parseFloat(area) || 0);
    return PACKAGES.find(p => p.id === picked)?.price || 0;
  }, [picked, area]);

  const handleCreate = async () => {
    if (!picked || creating) return;
    if (picked === 'kts_3d' && (!area || parseFloat(area) <= 0)) {
      setErrMsg('Vui lòng nhập diện tích (m²) để tính giá.');
      return;
    }
    setCreating(true);
    setErrMsg('');
    try {
      const endpoint = method === 'bank_transfer'
        ? `${API_BASE}/api/projects/${projectId}/payment/create-bank-transfer`
        : `${API_BASE}/api/projects/${projectId}/payment/create`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: picked, area: picked === 'kts_3d' ? parseFloat(area) : undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không tạo được đơn thanh toán.');
      if (data.alreadyPaid) {
        onPaid();
        return;
      }
      setOrder({
        method,
        amount: data.amount,
        orderId: data.orderId,
        packageLabel: data.packageLabel,
        payUrl: data.payUrl,
        qrCodeUrl: data.qrCodeUrl,
        deeplink: data.deeplink,
        bankInfo: data.bankInfo
      });
      setStep('pay');
    } catch (e: any) {
      setErrMsg(e.message || 'Có lỗi xảy ra.');
    } finally {
      setCreating(false);
    }
  };

  const copy = (txt: string, field: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 1500);
  };

  if (!open) return null;

  const visiblePackages = PACKAGES.filter(p => !p.hidden);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(28, 20, 12, 0.55)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px',
        animation: 'pmFadeIn .25s ease'
      }}
    >
      <style>{`
        @keyframes pmFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes pmSlideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .pm-card { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease, background .2s ease; }
        .pm-card:hover:not(.pm-card-active) { transform: translateY(-4px); border-color: #d4a373 !important; box-shadow: 0 18px 40px rgba(212,163,115,0.18) !important; }
        .pm-method:hover:not(.pm-method-active) { background: rgba(212,163,115,0.1) !important; border-color: rgba(212,163,115,0.45) !important; }
        .pm-cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(212,163,115,0.45); }
      `}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(180deg, #fdfaf6 0%, #f5ede0 100%)',
          color: '#1a1a1a', borderRadius: '24px',
          maxWidth: step === 'choose' ? '1140px' : '880px',
          width: '100%',
          maxHeight: '94vh', overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(58, 38, 18, 0.28), 0 0 0 1px rgba(212,163,115,0.25) inset',
          display: 'flex', flexDirection: 'column',
          animation: 'pmSlideUp .35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(212,163,115,0.2)',
          background: 'rgba(255,255,255,0.5)'
        }}>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em', color: '#1a1a1a' }}>Thanh toán để tải bản vẽ</div>
            <div style={{ fontSize: '0.875rem', color: '#7c5c2e', marginTop: 4 }}>
              {step === 'choose'
                ? 'Chọn gói phù hợp với dự án — bản vẽ sẽ mở khoá ngay sau thanh toán'
                : order?.method === 'bank_transfer'
                  ? 'Quét VietQR bằng app ngân hàng — admin sẽ xác nhận khi tiền về'
                  : 'Quét QR bằng app MoMo để thanh toán'}
            </div>
          </div>
          <button onClick={onClose} aria-label="Đóng" style={{
            background: 'rgba(212,163,115,0.12)', border: '1px solid rgba(212,163,115,0.3)',
            color: '#7c5c2e', borderRadius: 12, width: 40, height: 40, cursor: 'pointer',
            display: 'grid', placeItems: 'center', flexShrink: 0
          }}>
            <X size={20} />
          </button>
        </div>

        {step === 'choose' && (
          <>
            <div style={{ padding: '28px 32px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '18px',
                alignItems: 'stretch'
              }}>
                {visiblePackages.map(pkg => {
                  const active = picked === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => setPicked(pkg.id)}
                      className={`pm-card ${active ? 'pm-card-active' : ''}`}
                      style={{
                        textAlign: 'left',
                        padding: '22px 20px',
                        borderRadius: '18px',
                        background: active
                          ? `linear-gradient(180deg, ${pkg.color}14 0%, #ffffff 70%)`
                          : '#ffffff',
                        border: active ? `2px solid ${pkg.color}` : '1.5px solid rgba(212,163,115,0.2)',
                        boxShadow: active
                          ? `0 22px 50px ${pkg.color}30, 0 0 0 4px ${pkg.color}1f`
                          : '0 4px 14px rgba(28,20,12,0.05)',
                        color: '#1a1a1a', cursor: 'pointer', position: 'relative',
                        display: 'flex', flexDirection: 'column', gap: 14,
                        minHeight: '320px'
                      }}
                    >
                      {pkg.recommended && (
                        <div style={{
                          position: 'absolute', top: -12, right: 16,
                          padding: '5px 12px', borderRadius: 999,
                          background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                          color: '#7c2d12', fontSize: '0.7rem', fontWeight: 900,
                          letterSpacing: '0.06em',
                          boxShadow: '0 8px 24px rgba(251,191,36,0.4)',
                          display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <Sparkles size={12} /> KHUYÊN DÙNG
                        </div>
                      )}

                      <div style={{
                        display: 'inline-flex', alignSelf: 'flex-start',
                        padding: '5px 11px', borderRadius: 8,
                        background: pkg.gradient, color: '#fff',
                        fontSize: '0.68rem', fontWeight: 900, letterSpacing: '0.08em'
                      }}>
                        {pkg.badge}
                      </div>

                      <div>
                        <div style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.1, color: '#1a1a1a' }}>{pkg.title}</div>
                        <div style={{ fontSize: '0.83rem', color: '#7c5c2e', marginTop: 4 }}>{pkg.subtitle}</div>
                      </div>

                      <div style={{
                        fontSize: '1.85rem', fontWeight: 900,
                        color: pkg.color,
                        letterSpacing: '-0.02em', lineHeight: 1
                      }}>
                        {pkg.price !== null ? fmtVND(pkg.price) : 'Theo m²'}
                      </div>

                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '0.83rem', color: '#3f3a35', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                        {pkg.bullets.map((b, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <span style={{
                              flexShrink: 0, width: 18, height: 18, borderRadius: 999,
                              background: `${pkg.color}1a`, display: 'grid', placeItems: 'center', marginTop: 1
                            }}>
                              <Check size={11} style={{ color: pkg.color }} strokeWidth={3} />
                            </span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {(
                <button
                  onClick={() => setPicked('test_1k')}
                  style={{
                    marginTop: 18, width: '100%',
                    padding: '14px 18px', borderRadius: 14,
                    background: picked === 'test_1k' ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.04)',
                    border: picked === 'test_1k' ? '1.5px solid #f59e0b' : '1.5px dashed rgba(245,158,11,0.45)',
                    color: '#b45309', fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Zap size={16} /> Test thanh toán — 1.000đ (admin/dev)
                  </span>
                  <span style={{ color: '#b45309', fontWeight: 900 }}>1.000đ</span>
                </button>
              )}

              {picked === 'kts_3d' && (
                <div style={{
                  marginTop: 22, padding: '20px 22px', borderRadius: 16,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, #ffffff 100%)',
                  border: '1.5px solid rgba(124,58,237,0.35)',
                  boxShadow: '0 6px 20px rgba(124,58,237,0.08)'
                }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: 10, color: '#5b21b6' }}>
                    Diện tích dự án (m²)
                  </label>
                  <input
                    type="number" min="1" step="1" value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="Ví dụ: 500"
                    style={{
                      width: '100%', padding: '14px 16px', borderRadius: 12,
                      background: '#ffffff', border: '1.5px solid rgba(124,58,237,0.35)',
                      color: '#1a1a1a', fontSize: '1.05rem', fontWeight: 600, outline: 'none'
                    }}
                  />
                  {parseFloat(area) > 0 && (
                    <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontSize: '0.82rem', color: '#5b21b6' }}>
                        Đơn giá <strong style={{ color: '#5b21b6', fontSize: '0.9rem' }}>{fmtVND(calc3dKtsPrice(parseFloat(area)) / parseFloat(area))}/m²</strong>
                      </span>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#5b21b6' }}>
                        {fmtVND(calc3dKtsPrice(parseFloat(area)))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {picked && (
                <div style={{ marginTop: 22 }}>
                  <div style={{ fontSize: '0.78rem', color: '#7c5c2e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 10 }}>
                    Phương thức thanh toán
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setMethod('bank_transfer')}
                      className={`pm-method ${method === 'bank_transfer' ? 'pm-method-active' : ''}`}
                      style={{
                        textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                        background: method === 'bank_transfer' ? 'linear-gradient(180deg, #faedcd 0%, #ffffff 90%)' : '#ffffff',
                        border: method === 'bank_transfer' ? '2px solid #d4a373' : '1.5px solid rgba(212,163,115,0.25)',
                        boxShadow: method === 'bank_transfer' ? '0 10px 30px rgba(212,163,115,0.25)' : '0 2px 6px rgba(28,20,12,0.04)',
                        color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 14, position: 'relative'
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: method === 'bank_transfer' ? '#d4a373' : 'rgba(212,163,115,0.12)',
                        color: method === 'bank_transfer' ? '#fff' : '#b88857',
                        display: 'grid', placeItems: 'center', flexShrink: 0
                      }}>
                        <Building2 size={22} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.96rem', display: 'flex', alignItems: 'center', gap: 6, color: '#1a1a1a' }}>
                          Chuyển khoản ngân hàng
                          <span style={{ fontSize: '0.62rem', fontWeight: 900, padding: '2px 7px', borderRadius: 6, background: '#d4a373', color: '#fff', letterSpacing: '0.05em' }}>
                            ƯU TIÊN
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#9b8975', marginTop: 2 }}>VietQR · tự động xác nhận khi tiền về</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('momo')}
                      className={`pm-method ${method === 'momo' ? 'pm-method-active' : ''}`}
                      style={{
                        textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                        background: method === 'momo' ? 'linear-gradient(180deg, rgba(165,0,100,0.08) 0%, #ffffff 90%)' : '#ffffff',
                        border: method === 'momo' ? '2px solid #a50064' : '1.5px solid rgba(212,163,115,0.25)',
                        boxShadow: method === 'momo' ? '0 10px 30px rgba(165,0,100,0.18)' : '0 2px 6px rgba(28,20,12,0.04)',
                        color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: 14
                      }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: method === 'momo' ? '#a50064' : 'rgba(165,0,100,0.1)',
                        color: method === 'momo' ? '#fff' : '#a50064',
                        display: 'grid', placeItems: 'center', flexShrink: 0
                      }}>
                        <Smartphone size={22} strokeWidth={2.2} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.96rem', color: '#1a1a1a' }}>Ví MoMo</div>
                        <div style={{ fontSize: '0.78rem', color: '#9b8975', marginTop: 2 }}>Cổng thanh toán MoMo · xác nhận tức thì</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {errMsg && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.35)', color: '#b91c1c', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <X size={16} style={{ flexShrink: 0 }} /> {errMsg}
                </div>
              )}
            </div>

            {/* Sticky footer */}
            <div style={{
              padding: '20px 32px',
              borderTop: '1px solid rgba(212,163,115,0.2)',
              background: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 14
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#7c5c2e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
                  {picked ? 'Tổng thanh toán' : 'Chưa chọn gói'}
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 900, color: picked ? '#1a1a1a' : '#9b8975', letterSpacing: '-0.02em', marginTop: 2 }}>
                  {picked ? fmtVND(computedAmount) : '—'}
                </div>
              </div>
              <button
                disabled={!picked || creating || (picked === 'kts_3d' && computedAmount <= 0)}
                onClick={handleCreate}
                className="pm-cta"
                style={{
                  padding: '16px 32px', borderRadius: 14, border: 'none',
                  background: (!picked || creating || (picked === 'kts_3d' && computedAmount <= 0))
                    ? 'rgba(28,20,12,0.08)'
                    : (method === 'bank_transfer'
                        ? 'linear-gradient(135deg, #d4a373 0%, #b88857 100%)'
                        : 'linear-gradient(135deg, #a50064 0%, #d40078 100%)'),
                  color: (!picked || creating) ? '#9b8975' : '#fff',
                  fontWeight: 900, fontSize: '1rem',
                  cursor: (!picked || creating) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: (!picked || creating)
                    ? 'none'
                    : (method === 'bank_transfer'
                        ? '0 10px 30px rgba(212,163,115,0.4)'
                        : '0 10px 30px rgba(165,0,100,0.35)'),
                  transition: 'all .2s ease', minWidth: 240, justifyContent: 'center'
                }}
              >
                {creating
                  ? <><Loader2 size={18} className="spin" /> Đang tạo đơn...</>
                  : method === 'bank_transfer'
                    ? <>Tạo QR chuyển khoản →</>
                    : <>Thanh toán qua MoMo →</>}
              </button>
            </div>
          </>
        )}

        {step === 'pay' && order && order.method === 'momo' && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: 26, alignItems: 'start' }}>
              <div style={{ background: '#fff', padding: 16, borderRadius: 18, textAlign: 'center', boxShadow: '0 12px 40px rgba(28,20,12,0.1)', border: '1px solid rgba(212,163,115,0.2)' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=4&data=${encodeURIComponent(order.payUrl || '')}`}
                  alt="QR MoMo"
                  style={{ width: '100%', maxWidth: 280, aspectRatio: '1', objectFit: 'contain' }}
                />
                <div style={{ color: '#1a1a1a', fontWeight: 800, fontSize: '0.85rem', marginTop: 8 }}>Mở app MoMo và quét mã</div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: '#7c5c2e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Số tiền</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#a50064', letterSpacing: '-0.02em' }}>{fmtVND(order.amount)}</div>
                <div style={{ fontSize: '0.86rem', color: '#3f3a35', marginTop: 2 }}>{order.packageLabel}</div>
                <div style={{ fontSize: '0.78rem', color: '#9b8975', marginTop: 10 }}>
                  Mã đơn: <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>{order.orderId}</span>
                  <button
                    onClick={() => copy(order.orderId, 'orderId')}
                    style={{ background: 'none', border: 'none', color: '#b88857', marginLeft: 6, cursor: 'pointer' }}
                    title="Copy"
                  ><CopyIcon size={12} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                  {order.payUrl && (
                    <a href={order.payUrl} target="_blank" rel="noopener noreferrer"
                      style={{ padding: '13px 16px', borderRadius: 12, background: 'linear-gradient(135deg, #a50064 0%, #d40078 100%)', color: '#fff', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 8px 22px rgba(165,0,100,0.3)' }}>
                      <ExternalLink size={16} /> Mở trang MoMo
                    </a>
                  )}
                  {order.deeplink && (
                    <a href={order.deeplink}
                      style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(165,0,100,0.08)', border: '1px solid rgba(165,0,100,0.4)', color: '#a50064', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none' }}>
                      Mở app MoMo trên điện thoại
                    </a>
                  )}
                </div>

                <div style={{
                  marginTop: 18, padding: 14, borderRadius: 12,
                  background: status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
                  border: status === 'paid' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(245,158,11,0.35)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.92rem', fontWeight: 800 }}>
                    {status === 'paid' ? (
                      <><Check size={18} style={{ color: '#16a34a' }} /> <span style={{ color: '#15803d' }}>Thanh toán thành công!</span></>
                    ) : status === 'failed' ? (
                      <><X size={18} style={{ color: '#dc2626' }} /> <span style={{ color: '#b91c1c' }}>Thanh toán thất bại</span></>
                    ) : (
                      <><Loader2 size={16} className="spin" style={{ color: '#d97706' }}/> <span style={{ color: '#92400e' }}>Đang chờ thanh toán...</span></>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#7c5c2e', marginTop: 6, lineHeight: 1.6 }}>
                    {status === 'paid'
                      ? 'Đang mở khoá tải về...'
                      : 'Hệ thống tự động kiểm tra mỗi 3s. Sau khi MoMo xác nhận, ảnh sẽ được mở khoá.'}
                  </div>
                </div>

                {status !== 'paid' && (
                  <button
                    onClick={() => { setStep('choose'); setOrder(null); }}
                    style={{ marginTop: 14, width: '100%', padding: '11px', borderRadius: 10, background: 'transparent', color: '#7c5c2e', border: '1px solid rgba(212,163,115,0.4)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    ← Chọn gói/phương thức khác
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'pay' && order && order.method === 'bank_transfer' && order.bankInfo && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 28, alignItems: 'start' }}>
              <div style={{
                background: '#ffffff', padding: 16, borderRadius: 20, textAlign: 'center',
                boxShadow: '0 16px 50px rgba(28,20,12,0.12)',
                border: '1.5px solid rgba(212,163,115,0.25)'
              }}>
                <img
                  src={order.bankInfo.qrImageUrl}
                  alt="VietQR"
                  style={{ width: '100%', aspectRatio: '0.78', objectFit: 'contain' }}
                />
                <div style={{ color: '#1a1a1a', fontWeight: 800, fontSize: '0.85rem', marginTop: 8 }}>
                  Quét bằng app ngân hàng để chuyển nhanh
                </div>
                <div style={{ color: '#7c5c2e', fontWeight: 600, fontSize: '0.74rem', marginTop: 4 }}>
                  Hỗ trợ tất cả app: VCB · MB · Tech · ACB · TP …
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: '#7c5c2e', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Số tiền cần chuyển</div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#16a34a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fmtVND(order.amount)}</div>
                <div style={{ fontSize: '0.88rem', color: '#3f3a35', marginTop: 2 }}>{order.packageLabel}</div>

                <div style={{
                  marginTop: 18, padding: '16px 18px', borderRadius: 16,
                  background: '#ffffff',
                  border: '1.5px solid rgba(212,163,115,0.22)',
                  boxShadow: '0 6px 20px rgba(28,20,12,0.05)'
                }}>
                  <BankRow label="Ngân hàng" value={order.bankInfo.bankName || order.bankInfo.bin} field="bank" copy={copy} copied={copiedField} />
                  <BankRow label="Số tài khoản" value={order.bankInfo.accountNo} field="acc" copy={copy} copied={copiedField} mono />
                  <BankRow label="Chủ tài khoản" value={order.bankInfo.accountName} field="name" copy={copy} copied={copiedField} />
                  <BankRow label="Số tiền" value={String(order.amount)} field="amount" copy={copy} copied={copiedField} mono />
                  <BankRow label="Nội dung CK" value={order.bankInfo.transferContent} field="content" copy={copy} copied={copiedField} mono highlight />
                </div>

                <div style={{
                  marginTop: 16, padding: '14px 16px', borderRadius: 12,
                  background: status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
                  border: status === 'paid' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(245,158,11,0.35)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.95rem', fontWeight: 800 }}>
                    {status === 'paid' ? (
                      <><Check size={20} style={{ color: '#16a34a' }} /><span style={{ color: '#15803d' }}>Đã xác nhận thanh toán!</span></>
                    ) : (
                      <><Clock size={18} style={{ color: '#d97706' }} /><span style={{ color: '#92400e' }}>Đang chờ chuyển khoản</span></>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: status === 'paid' ? '#15803d' : '#7c5c2e', marginTop: 6, lineHeight: 1.6 }}>
                    {status === 'paid'
                      ? 'Đang mở khoá tải về...'
                      : <>Hệ thống tự động xác nhận ngay khi tiền về tài khoản (thường &lt; 30 giây). Anh/chị có thể giữ trang mở hoặc đóng và quay lại sau — đơn vẫn được lưu.</>}
                  </div>
                </div>

                <div style={{ marginTop: 12, fontSize: '0.74rem', color: '#9b8975' }}>
                  Mã đơn: <span style={{ fontFamily: 'monospace', color: '#1a1a1a' }}>{order.orderId}</span>
                </div>

                {status !== 'paid' && (
                  <button
                    onClick={() => { setStep('choose'); setOrder(null); }}
                    style={{
                      marginTop: 14, width: '100%', padding: '12px',
                      borderRadius: 10, background: 'transparent',
                      color: '#7c5c2e', border: '1px solid rgba(212,163,115,0.4)',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600
                    }}
                  >
                    ← Chọn gói/phương thức khác
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
