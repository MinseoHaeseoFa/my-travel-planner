/* 여행 플래너 · Service Worker
   - 앱 셸을 캐시해 비행기 모드에서도 실행
   - 같은 출처 GET은 네트워크 우선, 실패하면 캐시로 응답
   - 구글 시트(Apps Script) 요청은 캐시하지 않고 그대로 통과
*/
const CACHE = 'mtp-shell-v3-20261118c';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './curation.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) =>
          hit || caches.match(req.url.split('?')[0]) || caches.match('./index.html')
        )
      )
  );
});
