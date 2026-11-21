/* Spending: offline cache. Bump VERSION when you upload new files. */
const VERSION = "spending-v1";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Cache first, so the app opens with no connection. When online, refresh the cache in the background. */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req, { ignoreSearch: true }) ||
                  (req.mode === "navigate" ? await cache.match("./index.html") : undefined);
      const net = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => undefined);
      if (hit) { e.waitUntil(net); return hit; }
      const res = await net;
      return res || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    })
  );
});
