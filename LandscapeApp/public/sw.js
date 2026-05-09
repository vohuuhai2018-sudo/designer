// Service Worker: cache-first cho R2 images.
// Sau lần đầu, mọi request ảnh r2.dev → trả từ CacheStorage <5ms (không ra network).
const CACHE = 'r2-images-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Chỉ intercept ảnh từ r2.dev (giữ origin app + API bình thường).
  if (!url.hostname.endsWith('.r2.dev')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    try {
      const resp = await fetch(req);
      // Chỉ cache 200 OK
      if (resp.ok && resp.status === 200) {
        // clone vì body chỉ đọc 1 lần
        cache.put(req, resp.clone()).catch(() => {});
      }
      return resp;
    } catch (e) {
      // Offline + chưa có cache → fail thẳng
      throw e;
    }
  })());
});
