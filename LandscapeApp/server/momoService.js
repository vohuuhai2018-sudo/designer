const crypto = require('crypto');

const MOMO_ENV = (process.env.MOMO_ENV || 'sandbox').toLowerCase();
const MOMO_BASE = MOMO_ENV === 'production'
  ? 'https://payment.momo.vn'
  : 'https://test-payment.momo.vn';

const PARTNER_CODE = process.env.MOMO_PARTNER_CODE || 'MOMO';
const ACCESS_KEY = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
const SECRET_KEY = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL
  || (process.env.NGROK_DOMAIN ? `https://${process.env.NGROK_DOMAIN}` : `http://localhost:${process.env.PORT || 5000}`);
const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';

const PACKAGES = {
  basic_4: { id: 'basic_4', label: 'Gói Cơ Bản — Tải 4 ảnh', price: 50000 },
  basic_8: { id: 'basic_8', label: 'Gói Cơ Bản — Tải 8 ảnh + 2 video', price: 200000 },
  advanced: { id: 'advanced', label: 'Gói Nâng Cao — 10 dự án (8 ảnh + 2 video / dự án)', price: 500000 },
  kts_3d: { id: 'kts_3d', label: 'Gói 3D KTS', price: null }
};

function calc3dKtsPrice(areaM2) {
  const a = Number(areaM2);
  if (!Number.isFinite(a) || a <= 0) {
    throw new Error('areaM2 must be a positive number');
  }
  let unit;
  if (a >= 10000) unit = 8000;
  else if (a > 1000) unit = 20000;
  else unit = 69000;
  return Math.round(a * unit);
}

function resolvePrice(packageId, area) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error(`Unknown packageId: ${packageId}`);
  if (packageId === 'kts_3d') {
    const amount = calc3dKtsPrice(area);
    return { ...pkg, price: amount, area: Number(area) };
  }
  return { ...pkg };
}

function sign(rawSignature) {
  return crypto.createHmac('sha256', SECRET_KEY).update(rawSignature).digest('hex');
}

async function createPayment({ orderId, requestId, amount, orderInfo, extraData = '', redirectUrl, ipnUrl }) {
  const requestType = 'captureWallet';
  const finalRedirect = redirectUrl || `${FRONTEND_BASE_URL}/?paymentResult=1`;
  const finalIpn = ipnUrl || `${PUBLIC_BASE_URL}/api/payment/momo/ipn`;

  const rawSignature =
    `accessKey=${ACCESS_KEY}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&ipnUrl=${finalIpn}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&partnerCode=${PARTNER_CODE}` +
    `&redirectUrl=${finalRedirect}` +
    `&requestId=${requestId}` +
    `&requestType=${requestType}`;

  const signature = sign(rawSignature);

  const body = {
    partnerCode: PARTNER_CODE,
    storeName: 'Designer',
    storeId: 'DesignerStore',
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: finalRedirect,
    ipnUrl: finalIpn,
    lang: 'vi',
    extraData,
    requestType,
    autoCapture: true,
    signature
  };

  const res = await fetch(`${MOMO_BASE}/v2/gateway/api/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.resultCode !== 0) {
    const msg = data.message || data.localMessage || `MoMo create failed (resultCode=${data.resultCode})`;
    const err = new Error(msg);
    err.momoResponse = data;
    throw err;
  }
  return data;
}

async function queryPayment({ orderId, requestId }) {
  const rawSignature =
    `accessKey=${ACCESS_KEY}` +
    `&orderId=${orderId}` +
    `&partnerCode=${PARTNER_CODE}` +
    `&requestId=${requestId}`;
  const signature = sign(rawSignature);

  const body = {
    partnerCode: PARTNER_CODE,
    requestId,
    orderId,
    signature,
    lang: 'vi'
  };

  const res = await fetch(`${MOMO_BASE}/v2/gateway/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({}));
}

function verifyIpnSignature(payload) {
  const {
    accessKey: _ignored,
    partnerCode, orderId, requestId, amount, orderInfo,
    orderType, transId, resultCode, message, payType,
    responseTime, extraData, signature
  } = payload;

  const rawSignature =
    `accessKey=${ACCESS_KEY}` +
    `&amount=${amount}` +
    `&extraData=${extraData}` +
    `&message=${message}` +
    `&orderId=${orderId}` +
    `&orderInfo=${orderInfo}` +
    `&orderType=${orderType}` +
    `&partnerCode=${partnerCode}` +
    `&payType=${payType}` +
    `&requestId=${requestId}` +
    `&responseTime=${responseTime}` +
    `&resultCode=${resultCode}` +
    `&transId=${transId}`;

  const expected = sign(rawSignature);
  return expected === signature;
}

module.exports = {
  PACKAGES,
  resolvePrice,
  calc3dKtsPrice,
  createPayment,
  queryPayment,
  verifyIpnSignature,
  MOMO_ENV
};
