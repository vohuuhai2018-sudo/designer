/**
 * Cloudflare Worker: R2 proxy với CORS + Cache-Control immutable.
 * URL: https://<worker>.workers.dev/<key>
 *   vd: https://landscape-cdn.thame6868.workers.dev/landscape_app/seeded_landscape/abc.webp
 *
 * Bind R2 bucket `landscape-app` qua biến môi trường `BUCKET` trong wrangler.toml.
 * Sau khi deploy, không có rate-limit như pub-xxx.r2.dev (binding native không
 * qua public subdomain).
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders() });
    }

    // Strip leading "/" để có key R2.
    const key = decodeURIComponent(url.pathname.slice(1));
    if (!key) {
      return new Response('Missing key', { status: 400, headers: corsHeaders() });
    }

    // Tận dụng Cache API: Worker Cache lưu response ở edge, cache hit không
    // phải gọi R2 binding → faster + giảm R2 read counter.
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    let resp = await cache.match(cacheKey);
    if (resp) {
      return withCors(resp);
    }

    const obj = await env.BUCKET.get(key);
    if (!obj) {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }

    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    addCors(headers);

    resp = new Response(obj.body, { headers });

    // Lưu vào edge cache (HEAD response không lưu).
    if (request.method === 'GET') {
      // ctx.waitUntil không có vì format module → dùng cache.put trực tiếp.
      // Clone response trước khi return.
      cache.put(cacheKey, resp.clone()).catch(() => {});
    }

    return resp;
  },
};

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '3600',
  };
}

function addCors(headers) {
  headers.set('access-control-allow-origin', '*');
  headers.set('access-control-allow-methods', 'GET, HEAD, OPTIONS');
  headers.set('access-control-allow-headers', '*');
  headers.set('access-control-expose-headers', 'etag, content-length, content-type');
}

function withCors(resp) {
  const h = new Headers(resp.headers);
  addCors(h);
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}
