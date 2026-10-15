/* 에클레시아 춘천 찬송가 — 서비스 워커
   배포할 때마다 아래 CACHE 버전 숫자를 올리세요 (예: v1 -> v2).
   버전이 바뀌면 열려 있는 앱도 화면으로 돌아올 때 자동 새로고침됩니다 (sw-register.js). */
const CACHE = 'hj-hymnal-v37';
const ASSETS = [
  './',
  './index.html',
  './hymnal.html',
  './schedule.html',
  './news.html',
  './chart.html',
  './word.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
  './logo-mark.png',
  './sw-register.js',
  './updates.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // 페이지(HTML): 항상 서버에서 최신본을 먼저 받음. 오프라인이거나 3초 넘게 걸리면 캐시로.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const network = fetch(req, { cache: 'no-cache' }).then(res => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        });
        const timeout = new Promise(r => setTimeout(r, 3000));
        const res = await Promise.race([network.catch(() => null), timeout]);
        if (res) return res;
        return (await cache.match(req, { ignoreSearch: true })) || network;
      })
    );
    return;
  }
  // 그 외(이미지 등): stale-while-revalidate — 캐시를 바로 주고, 뒤에서 새 버전 받아둠
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
