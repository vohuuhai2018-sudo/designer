// Service Worker: cache-first + concurrent-throttle cho R2 images.
// Cache hit → trả <5ms. Cache miss → queue, max 4 fetch đồng thời để tránh
// rate-limit của pub-xxx.r2.dev khi gallery fire 80+ ảnh cùng lúc.
const CACHE = 'r2-images-v1';
const MAX_CONCURRENT_FETCH = 4;

let active = 0;
const queue = [];

function pump() {
  while (active < MAX_CONCURRENT_FETCH && queue.length > 0) {
    active++;
    const task = queue.shift();
    task().finally(() => { active--; pump(); });
  }
}

function enqueue(taskFn) {
  return new Promise((resolve, reject) => {
    queue.push(() => taskFn().then(resolve, reject));
    pump();
  });
}

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
    if (cached) return cached;  // fast path — cache hit không queue.
    // Cache miss → throttle qua queue.
    return enqueue(async () => {
      try {
        const resp = await fetch(req);
        if (resp.ok && resp.status === 200) {
          cache.put(req, resp.clone()).catch(() => {});
        }
        return resp;
      } catch (e) {
        // Retry 1 lần với backoff ngắn nếu bị reject (rate-limit)
        await new Promise(r => setTimeout(r, 600));
        const retry = await fetch(req);
        if (retry.ok && retry.status === 200) {
          cache.put(req, retry.clone()).catch(() => {});
        }
        return retry;
      }
    });
  })());
});
