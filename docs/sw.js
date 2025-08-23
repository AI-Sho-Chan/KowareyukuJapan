const CACHE_NAME = 'kj-archives-v1';
const ASSETS = [
  '/KowareyukuJapan/index.html',
  '/KowareyukuJapan/styles.css',
  '/KowareyukuJapan/app.js',
  '/KowareyukuJapan/compose.html',
  '/KowareyukuJapan/post.html',
  '/KowareyukuJapan/search.html',
  '/KowareyukuJapan/settings.html',
  '/KowareyukuJapan/special.html'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/KowareyukuJapan/')) {
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request).then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
        return resp;
      }).catch(() => caches.match('/KowareyukuJapan/index.html')))
    );
  }
});


