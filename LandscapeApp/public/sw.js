// Service Worker: cache-first cho R2 images + retry 1 lần khi rate-limit.
// App-level batching ở App.tsx đã throttle prefetch (6 concurrent), không cần
// queue thêm trong SW (queue gây stuck khi 400+ requests pile up).
const CACHE = 'r2-images-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Intercept Worker proxy CDN + giữ tương thích với pub-xxx.r2.dev cũ.
  if (!(url.hostname.endsWith('.workers.dev') || url.hostname.endsWith('.r2.dev'))) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;  // <5ms từ CacheStorage.

    try {
      const resp = await fetch(req);
      if (resp.ok && resp.status === 200) {
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    } catch (e) {
      // Retry 1 lần sau 1.5s.
      try {
        await new Promise(r => setTimeout(r, 1500));
        const retry = await fetch(req);
        if (retry.ok && retry.status === 200) {
          cache.put(req, retry.clone()).catch(() => {});
        }
        return retry;
      } catch (e2) {
        return Response.error();
      }
    }
  })());
});
