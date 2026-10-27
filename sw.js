/* Офлайн-кэш Петельки. Версию кэша при сборке ставит deploy/build.mjs. */
const CACHE = 'petelka-202610270430';
const FILES = ['./', 'index.html', 'lock.js', 'app.enc', 'vendor/three.module.min.js', 'vendor/three.core.js', 'vendor/addons/controls/OrbitControls.js', 'vendor/addons/environments/RoomEnvironment.js', 'manifest.webmanifest',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
// Страница и само приложение: сначала сеть, кэш только без интернета. Так новая версия видна сразу.
const FRESH = /\/(|index\.html|lock\.js|app\.enc|app\.js|manifest\.webmanifest)$/;
// cache: 'reload' — мимо HTTP-кэша браузера, иначе GitHub Pages 10 минут отдаёт старые файлы
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const put = res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  const cached = () => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'));
  if (req.mode === 'navigate' || FRESH.test(url.pathname)) {
    e.respondWith(fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then(put).catch(cached));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(put).catch(cached)));
});
