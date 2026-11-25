/* global self, caches, fetch, URL, Response */
/*
 * Service worker của HeroX, phục vụ ở /herox/sw.js với scope /herox/.
 * Chạy cùng origin với LingoBrain (SW scope /): SW này chỉ quản các URL trong /herox/.
 *
 * - /herox/api/*: luôn đi mạng, không cache (tiến độ, trận đấu phải là dữ liệu thật mới nhất).
 * - /herox/assets/*: file Vite đặt tên theo hash nội dung, không bao giờ cũ → cache-first.
 *   Lúc cài, đọc index.html mới nhất để precache các file hash nó tham chiếu.
 * - Trang (navigation): network-first để deploy mới thắng ngay; mất mạng → bản đã cache, chưa có → trang "Cần mạng để chơi".
 * - File tĩnh khác (fx, map không hash): network-first, mất mạng mới dùng cache.
 *
 * File này không qua bundler: đổi logic thì tăng SW_VERSION để trình duyệt cài lại SW.
 */
const SW_VERSION = '2';
const CACHE_PREFIX = 'herox-';
const PAGE_CACHE = `${CACHE_PREFIX}pages-v${SW_VERSION}`;
const ASSET_CACHE = `${CACHE_PREFIX}assets-v${SW_VERSION}`;
const STATIC_CACHE = `${CACHE_PREFIX}static-v${SW_VERSION}`;

/** Đường dẫn scope, ví dụ "/herox/"; suy từ vị trí file SW. */
const SCOPE_PATH = new URL('./', self.location.href).pathname;

const OFFLINE_HTML = `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>HeroX</title>
<style>html,body{margin:0;height:100%;background:#0b0b12;color:#e8e2d0;font-family:system-ui,sans-serif}
main{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px;box-sizing:border-box}
button{font:inherit;padding:10px 20px;border-radius:8px;border:1px solid #c8a24a;background:#1a1622;color:#e8e2d0}</style>
</head><body><main><h1>Cần mạng để chơi</h1><p>HeroX đọc tiến độ học từ máy chủ. Kết nối mạng rồi thử lại.</p>
<button type="button" onclick="location.reload()">Thử lại</button></main></body></html>`;

/**
 * Phân loại request để chọn chiến lược cache. Thuần, không đụng API trình duyệt (test được).
 * @returns {'ignore' | 'network-only' | 'hashed-asset' | 'navigation' | 'static'}
 */
function classifyRequest(method, requestUrl, mode, scopeOrigin, scopePath) {
  if (method !== 'GET') return 'ignore';
  const url = new URL(requestUrl);
  if (url.origin !== scopeOrigin || !url.pathname.startsWith(scopePath)) return 'ignore';
  const innerPath = url.pathname.slice(scopePath.length);
  if (innerPath === 'api' || innerPath.startsWith('api/')) return 'network-only';
  if (mode === 'navigate') return 'navigation';
  if (innerPath.startsWith('assets/')) return 'hashed-asset';
  return 'static';
}

/**
 * Lấy các URL /<scope>/assets/* mà index.html tham chiếu (script, modulepreload, css). Thuần, test được.
 * @returns {string[]} URL tuyệt đối, không trùng.
 */
function extractAssetUrls(html, pageUrl, scopePath) {
  const assetPrefix = `${scopePath}assets/`;
  const found = new Set();
  const attributePattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/g;
  for (const match of html.matchAll(attributePattern)) {
    const url = new URL(match[1], pageUrl);
    if (url.origin === new URL(pageUrl).origin && url.pathname.startsWith(assetPrefix)) {
      found.add(url.origin + url.pathname);
    }
  }
  return [...found];
}

/** Cache các file hash của index.html mới nhất và xoá file hash của bản deploy cũ. */
async function refreshAssetCache(html, pageUrl) {
  const assetUrls = extractAssetUrls(html, pageUrl, SCOPE_PATH);
  const cache = await caches.open(ASSET_CACHE);
  const missing = [];
  for (const assetUrl of assetUrls) {
    if (!(await cache.match(assetUrl))) missing.push(assetUrl);
  }
  if (missing.length === 0) return;
  // Chỉ thêm file hash mới của index; KHÔNG xoá file hash cũ ở đây. Map, atlas, sprite do JS nạp động
  // cũng nằm trong assets/ mà không có trong index: xoá theo danh sách index sẽ bắt tải lại chúng
  // (kể cả file của chính bản deploy mới vừa tải). Tên file theo hash nội dung nên file thừa không gây
  // lệch phiên; dọn triệt để để ở 'activate' theo version cache.
  await cache.addAll(missing);
}

/** Lưu trang (bỏ query) và đồng bộ cache asset hash theo trang đó. */
async function cachePage(pageUrl, response) {
  const html = await response.clone().text();
  const url = new URL(pageUrl);
  const pageCache = await caches.open(PAGE_CACHE);
  await pageCache.put(url.origin + url.pathname, response);
  await refreshAssetCache(html, pageUrl);
}

function scopeRootUrl() {
  return new URL(SCOPE_PATH, self.location.origin).href;
}

async function precacheShell() {
  const pageUrl = scopeRootUrl();
  const response = await fetch(pageUrl, { cache: 'reload' });
  if (response.ok) await cachePage(pageUrl, response);
}

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

async function handleNavigation(event) {
  const request = event.request;
  try {
    const response = await fetch(request);
    // Clone ngay: body của response gốc sẽ được trang đọc, clone sau đó sẽ lỗi "body already used".
    if (response.ok) event.waitUntil(cachePage(request.url, response.clone()).catch(() => undefined));
    return response;
  } catch {
    const options = { cacheName: PAGE_CACHE, ignoreSearch: true };
    const cached = (await caches.match(request.url, options)) || (await caches.match(scopeRootUrl(), options));
    return cached || offlineResponse();
  }
}

async function handleHashedAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request.url);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request.url, response.clone());
  return response;
}

async function handleStatic(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request, { cacheName: STATIC_CACHE });
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('install', event => {
  // Precache hỏng (mất mạng giữa chừng) không chặn cài SW: asset sẽ được cache dần khi tải.
  event.waitUntil(precacheShell().catch(() => undefined).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  const current = new Set([PAGE_CACHE, ASSET_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && !current.has(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const route = classifyRequest(request.method, request.url, request.mode, self.location.origin, SCOPE_PATH);
  if (route === 'navigation') event.respondWith(handleNavigation(event));
  else if (route === 'hashed-asset') event.respondWith(handleHashedAsset(request));
  else if (route === 'static') event.respondWith(handleStatic(request));
  // 'ignore' và 'network-only': không gọi respondWith, trình duyệt tự đi mạng.
});
