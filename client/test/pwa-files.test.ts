import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { APP_BASE_PATH } from '@herox/shared';
import { describe, expect, it } from 'vitest';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));
const ORIGIN = 'https://example.test';

type Route = 'ignore' | 'network-only' | 'hashed-asset' | 'navigation' | 'static';

interface ServiceWorkerScope {
  classifyRequest(method: string, requestUrl: string, mode: string, scopeOrigin: string, scopePath: string): Route;
  extractAssetUrls(html: string, pageUrl: string, scopePath: string): string[];
}

/** Chạy `sw.js` (script thường, không module) trong sandbox với `self` giả để lấy các hàm thuần và sự kiện đã đăng ký. */
function loadServiceWorker(): { scope: ServiceWorkerScope; events: string[] } {
  const events: string[] = [];
  const sandbox = {
    URL,
    self: {
      location: new URL(`${APP_BASE_PATH}sw.js`, ORIGIN),
      addEventListener: (type: string) => events.push(type),
    },
  };
  runInNewContext(readFileSync(`${PUBLIC_DIR}sw.js`, 'utf8'), sandbox);
  return { scope: sandbox as unknown as ServiceWorkerScope, events };
}

const { scope: sw, events } = loadServiceWorker();
const route = (path: string, mode = 'cors', method = 'GET', origin = ORIGIN): Route =>
  sw.classifyRequest(method, `${origin}${path}`, mode, ORIGIN, APP_BASE_PATH);

describe('service worker HeroX', () => {
  it('đăng ký install, activate, fetch', () => {
    expect(events).toEqual(['install', 'activate', 'fetch']);
  });

  it('API luôn đi mạng, kể cả GET có query', () => {
    expect(route(`${APP_BASE_PATH}api/me`)).toBe('network-only');
    expect(route(`${APP_BASE_PATH}api/battles?id=1`)).toBe('network-only');
    expect(route(`${APP_BASE_PATH}api`)).toBe('network-only');
  });

  it('không đụng URL ngoài scope, khác origin hoặc không phải GET', () => {
    expect(route('/index.html', 'navigate')).toBe('ignore');
    expect(route('/api/words')).toBe('ignore');
    expect(route(`${APP_BASE_PATH}assets/a.js`, 'cors', 'GET', 'https://cdn.example.test')).toBe('ignore');
    expect(route(`${APP_BASE_PATH}assets/a.js`, 'cors', 'POST')).toBe('ignore');
  });

  it('phân biệt trang, asset có hash và file tĩnh khác', () => {
    expect(route(APP_BASE_PATH, 'navigate')).toBe('navigation');
    expect(route(`${APP_BASE_PATH}assets/index-AbC123.js`)).toBe('hashed-asset');
    expect(route(`${APP_BASE_PATH}fx/finisher.png`, 'no-cors')).toBe('static');
    expect(route(`${APP_BASE_PATH}manifest.webmanifest`)).toBe('static');
  });

  it('lấy đúng asset hash từ index.html, bỏ trùng và bỏ file ngoài assets/', () => {
    const html = `
      <link rel="manifest" href="/herox/manifest.webmanifest">
      <script type="module" crossorigin src="/herox/assets/index-AbC123.js"></script>
      <link rel="modulepreload" crossorigin href="/herox/assets/phaser-Xy9.js">
      <link rel="stylesheet" href="./assets/index-Css1.css">
      <script src="/herox/assets/index-AbC123.js"></script>
      <script src="https://cdn.example.test/herox/assets/other.js"></script>`;
    expect(sw.extractAssetUrls(html, `${ORIGIN}${APP_BASE_PATH}`, APP_BASE_PATH)).toEqual([
      `${ORIGIN}${APP_BASE_PATH}assets/index-AbC123.js`,
      `${ORIGIN}${APP_BASE_PATH}assets/phaser-Xy9.js`,
      `${ORIGIN}${APP_BASE_PATH}assets/index-Css1.css`,
    ]);
  });
});

describe('index.html', () => {
  it('trỏ tới manifest trong public (Vite thêm base /herox/ khi build)', () => {
    const html = readFileSync(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });
});

describe('manifest.webmanifest', () => {
  const manifest = JSON.parse(readFileSync(`${PUBLIC_DIR}manifest.webmanifest`, 'utf8')) as {
    start_url: string;
    scope: string;
    id: string;
    display: string;
    orientation: string;
    icons: Array<{ sizes: string; purpose: string }>;
  };

  it('start_url, scope, id nằm đúng /herox/ để không lẫn với app LingoBrain cùng origin', () => {
    expect(manifest.start_url).toBe(APP_BASE_PATH);
    expect(manifest.scope).toBe(APP_BASE_PATH);
    expect(manifest.id).toBe(APP_BASE_PATH);
  });

  it('toàn màn hình, xoay ngang, có icon 192 và 512 cho điều kiện cài đặt', () => {
    expect(manifest.display).toBe('fullscreen');
    expect(manifest.orientation).toBe('landscape');
    const anySizes = manifest.icons.filter(icon => icon.purpose === 'any').map(icon => icon.sizes);
    expect(anySizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });
});
