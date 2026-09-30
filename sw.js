const CACHE_NAME = 'offline-v1';
// 填入所有需要離線檢視的檔案路徑
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
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});