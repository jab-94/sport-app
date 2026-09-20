// Bump this any time you replace the app's files so phones pick up the update
// instead of serving a stale cached copy forever.
const CACHE_VERSION = "sport-v5";
const APP_SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./videos/abdo-kneetuck.mp4", "./videos/abdo-scissors.mp4", "./videos/abdo-vup.mp4", "./videos/abdo-twist.mp4",
  "./videos/abdo-bicycle.mp4", "./videos/abdo-jackknife.mp4", "./videos/abdo-pikewalk.mp4", "./videos/abdo-walkout.mp4"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // The app page itself: try the network first (so you always get the latest version
  // when you have signal), fall back to the cached copy the moment you don't.
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (icons, manifest, Google Fonts, ...): serve from cache instantly if
  // we have it, and refresh the cache quietly in the background for next time.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
