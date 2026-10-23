/* RSVTI_P.M – Service Worker: funcționare offline + actualizare automată */
const VERSIUNE = 'rsvti-pm-v18-1';
const FISIERE = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSIUNE).then((cache) => cache.addAll(FISIERE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((chei) => Promise.all(chei.filter((k) => k !== VERSIUNE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    // Doar fișierele aplicației; cererile către server (sincronizare) trec direct
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    // Pagina: întâi rețeaua (ca să primiți mereu ultima versiune), apoi copia offline
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copie = res.clone();
                    caches.open(VERSIUNE).then((c) => c.put('./index.html', copie));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Restul fișierelor: din cache, actualizate în fundal
    event.respondWith(
        caches.match(req).then((dinCache) => {
            const retea = fetch(req).then((res) => {
                if (res && res.ok) {
                    const copie = res.clone();
                    caches.open(VERSIUNE).then((c) => c.put(req, copie));
                }
                return res;
            }).catch(() => dinCache);
            return dinCache || retea;
        })
    );
});
