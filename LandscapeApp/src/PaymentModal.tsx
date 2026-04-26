import { useEffect, useMemo, useState } from 'react';
import { X, Check, Copy as CopyIcon, ExternalLink, Loader2 } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

type PackageId = 'basic_4' | 'basic_8' | 'advanced' | 'kts_3d';

type Pkg = {
  id: PackageId;
  title: string;
  subtitle: string;
  bullets: string[];
  price: number | null;
  badge: string;
  color: string;
  needsArea?: boolean;
};

const PACKAGES: Pkg[] = [
  {
    id: 'basic_4',
    title: 'Gói Cơ Bản',
    subtitle: 'Tải 4 ảnh',
    bullets: ['Miễn phí lên phương án', 'Tải 4 ảnh chất lượng cao', '(Giới hạn 2 lần chỉnh sửa)'],
    price: 50000,
    badge: 'Cơ Bản',
    color: '#22c55e'
  },
  {
    id: 'basic_8',
    title: 'Gói Cơ Bản',
    subtitle: 'Tải 8 ảnh + 2 video',
    bullets: ['Tất cả phương án thiết kế', '8 ảnh + 2 video phối cảnh', '(Giới hạn 2 lần chỉnh sửa)'],
    price: 200000,
    badge: 'Cơ Bản+',
    color: '#16a34a'
  },
  {
    id: 'advanced',
    title: 'Gói Nâng Cao',
    subtitle: '500.000đ — 10 dự án',
    bullets: ['Thực hiện được 10 dự án', 'Mỗi dự án: 8 ảnh + 2 video', '(Giới hạn 4 lần chỉnh sửa)'],
    price: 500000,
    badge: 'Nâng Cao',
    color: '#2563eb'
  },
  {
    id: 'kts_3d',
    title: 'Gói 3D KTS',
    subtitle: 'Theo m²',
    bullets: ['69.000đ /m² (dự án dưới 1.000m²)', '20.000đ /m² (dự án trên 1.000m²)', '8.000đ /m² (dự án trên 1 hecta)', 'Thiết kế chuyên nghiệp với KTS', 'Không giới hạn lần chỉnh sửa'],
    price: null,
    badge: '3D KTS',
    color: '#7c3aed',
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

export type PaymentStatus = 'none' | 'pending' | 'paid' | 'failed';

type Props = {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
};

export function PaymentModal({ projectId, open, onClose, onPaid }: Props) {
  const [step, setStep] = useState<'choose' | 'pay'>('choose');
  const [picked, setPicked] = useState<PackageId | null>(null);
  const [area, setArea] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [order, setOrder] = useState<{ payUrl: string; qrCodeUrl: string; deeplink: string; amount: number; orderId: string; packageLabel: string } | null>(null);
  const [status, setStatus] = useState<PaymentStatus>('none');

  useEffect(() => {
    if (!open) {
      setStep('choose');
      setPicked(null);
      setArea('');
      setErrMsg('');
      setOrder(null);
      setStatus('none');
      setCreating(false);
    }
  }, [open]);

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
      const res = await fetch(`${API_BASE}/api/projects/${projectId}/payment/create`, {
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
        payUrl: data.payUrl,
        qrCodeUrl: data.qrCodeUrl,
        deeplink: data.deeplink,
        amount: data.amount,
        orderId: data.orderId,
        packageLabel: data.packageLabel
      });
      setStep('pay');
    } catch (e: any) {
      setErrMsg(e.message || 'Có lỗi xảy ra.');
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(8px)',
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0f172a', color: '#fff', borderRadius: '20px', maxWidth: '780px', width: '100%',
          maxHeight: '92vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900 }}>Thanh toán để tải bản vẽ</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              {step === 'choose' ? 'Chọn 1 gói phù hợp với dự án của bạn' : 'Quét QR bằng app MoMo để thanh toán'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={18} />
          </button>
        </div>

        {step === 'choose' && (
          <div style={{ padding: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {PACKAGES.map(pkg => {
                const active = picked === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setPicked(pkg.id)}
                    style={{
                      textAlign: 'left', padding: '18px', borderRadius: '16px',
                      background: active ? `${pkg.color}1f` : 'rgba(255,255,255,0.04)',
                      border: active ? `2px solid ${pkg.color}` : '2px solid rgba(255,255,255,0.08)',
                      color: '#fff', cursor: 'pointer', transition: 'all .2s', position: 'relative'
                    }}
                  >
                    <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: pkg.color, color: '#fff', fontSize: '0.72rem', fontWeight: 800, marginBottom: 10 }}>
                      {pkg.badge}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{pkg.title}</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{pkg.subtitle}</div>
                    <div style={{ marginTop: 10, fontSize: '1.4rem', fontWeight: 900, color: pkg.color }}>
                      {pkg.price !== null ? fmtVND(pkg.price) : 'Theo m²'}
                    </div>
                    <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
                      {pkg.bullets.map((b, i) => (
                        <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                          <Check size={14} style={{ color: pkg.color, marginTop: 3, flexShrink: 0 }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>

            {picked === 'kts_3d' && (
              <div style={{ marginTop: 18, padding: 14, borderRadius: 14, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.4)' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: 6 }}>Diện tích dự án (m²)</label>
                <input
                  type="number" min="1" step="1" value={area}
                  onChange={e => setArea(e.target.value)}
                  placeholder="Ví dụ: 500"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.95rem' }}
                />
                {parseFloat(area) > 0 && (
                  <div style={{ marginTop: 10, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)' }}>
                    Đơn giá: <strong style={{ color: '#a78bfa' }}>{fmtVND(calc3dKtsPrice(parseFloat(area)) / parseFloat(area))} /m²</strong> · Tổng tạm tính: <strong style={{ color: '#a78bfa' }}>{fmtVND(calc3dKtsPrice(parseFloat(area)))}</strong>
                  </div>
                )}
              </div>
            )}

            {errMsg && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#fecaca', fontSize: '0.85rem' }}>
                {errMsg}
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)' }}>
                {picked ? <>Tổng thanh toán: <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{fmtVND(computedAmount)}</strong></> : 'Chọn gói để tiếp tục'}
              </div>
              <button
                disabled={!picked || creating || (picked === 'kts_3d' && computedAmount <= 0)}
                onClick={handleCreate}
                style={{
                  padding: '12px 22px', borderRadius: 12, border: 'none',
                  background: (!picked || creating) ? 'rgba(255,255,255,0.1)' : '#a50064',
                  color: '#fff', fontWeight: 800, fontSize: '0.95rem',
                  cursor: (!picked || creating) ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                {creating ? <><Loader2 size={16} className="spin" /> Đang tạo...</> : <>Thanh toán qua MoMo</>}
              </button>
            </div>
          </div>
        )}

        {step === 'pay' && order && (
          <div style={{ padding: '22px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, alignItems: 'start' }}>
              <div style={{ background: '#fff', padding: 16, borderRadius: 16, textAlign: 'center' }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=4&data=${encodeURIComponent(order.payUrl)}`}
                  alt="QR MoMo"
                  style={{ width: '100%', maxWidth: 280, aspectRatio: '1', objectFit: 'contain' }}
                />
                <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.85rem', marginTop: 8 }}>Mở app MoMo và quét mã</div>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>Số tiền</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#a50064' }}>{fmtVND(order.amount)}</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{order.packageLabel}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
                  Mã đơn: <span style={{ fontFamily: 'monospace' }}>{order.orderId}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(order.orderId)}
                    style={{ background: 'none', border: 'none', color: '#a78bfa', marginLeft: 6, cursor: 'pointer' }}
                    title="Copy"
                  ><CopyIcon size={12} /></button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                  <a href={order.payUrl} target="_blank" rel="noopener noreferrer"
                    style={{ padding: '12px 16px', borderRadius: 12, background: '#a50064', color: '#fff', fontWeight: 800, fontSize: '0.9rem', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <ExternalLink size={16} /> Mở trang MoMo
                  </a>
                  {order.deeplink && (
                    <a href={order.deeplink}
                      style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(165,0,100,0.15)', border: '1px solid rgba(165,0,100,0.5)', color: '#f0abfc', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', textDecoration: 'none' }}>
                      Mở app MoMo trên điện thoại
                    </a>
                  )}
                </div>

                <div style={{ marginTop: 22, padding: 14, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 700 }}>
                    {status === 'paid' ? (
                      <><Check size={18} style={{ color: '#22c55e' }} /> <span style={{ color: '#22c55e' }}>Thanh toán thành công!</span></>
                    ) : status === 'failed' ? (
                      <><X size={18} style={{ color: '#ef4444' }} /> <span style={{ color: '#ef4444' }}>Thanh toán thất bại</span></>
                    ) : (
                      <><Loader2 size={16} className="spin" /> <span>Đang chờ thanh toán...</span></>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
                    {status === 'paid'
                      ? 'Đang mở khoá tải về...'
                      : 'Hệ thống tự động kiểm tra mỗi 3s. Sau khi MoMo xác nhận, ảnh sẽ được mở khoá.'}
                  </div>
                </div>

                {status !== 'paid' && (
                  <button
                    onClick={() => { setStep('choose'); setOrder(null); }}
                    style={{ marginTop: 14, width: '100%', padding: '10px', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontSize: '0.82rem' }}
                  >
                    ← Chọn gói khác
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
