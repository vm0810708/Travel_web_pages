// ⚠️ 每次修改任何 HTML，務必把版本號 +1（v2 → v3 …），手機才會更新
const VERSION = 'v2';
const CACHE_NAME = 'offline-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './1003_登船日.html',
  './1004_義大利_熱拿亞.html',
  './1005_義大利_拿坡里.html',
  './1006_義大利_墨西拿.html',
  './1007_馬爾他_瓦萊塔.html',
  './1008_海上日.html',
  './1009_西班牙_巴塞隆納.html',
  './1010_法國_馬賽.html',
  // 之後若新增 manifest.json、圖示等，加在這裡
];

// 安裝：逐一快取，單一檔案失敗不會讓整個安裝失敗
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' })))
      );
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn('[SW] 快取失敗:', ASSETS[i], r.reason);
      });
    })
  );
  self.skipWaiting(); // 新版立即接手
});

// 啟用：清除舊版快取並接管所有頁面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('offline-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 網路優先（限時），逾時或離線就用快取；成功時順便更新快取
function networkFirst(request, timeoutMs) {
  return new Promise(resolve => {
    let settled = false;
    const fallback = () =>
      caches.match(request, { ignoreSearch: true })
        .then(hit => hit || caches.match('./index.html'))
        .then(res => res || new Response('離線中，且此頁尚未快取', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));

    const timer = setTimeout(() => {
      if (!settled) { settled = true; fallback().then(resolve); }
    }, timeoutMs);

    fetch(request).then(res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(request, copy));
      }
      if (!settled) { settled = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      if (!settled) { settled = true; fallback().then(resolve); }
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // 只處理同網域 GET；Google Maps 等外部資源直接放行（離線本來就不會動）
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // 頁面（HTML）：網路優先，船上網路慢時 3 秒後自動改用快取
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req, 3000));
    return;
  }

  // 其他靜態檔：先給快取、背景更新
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const update = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || update;
    })
  );
});