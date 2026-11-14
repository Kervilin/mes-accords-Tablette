/* ============================================================
   Mes accords — service worker
   - app shell en cache : fonctionne hors-ligne
   - polices Google en cache (mise en page identique hors-ligne)
   - navigation : réseau d'abord, cache en secours
   Pense à changer CACHE à chaque nouveau déploiement.
   ============================================================ */
const VERSION = "v11";
const CACHE = "mes-accords-shell-" + VERSION;
const FONTS = "mes-accords-fonts-" + VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./guide-installation.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* --- polices Google : cache d'abord --- */
  if (url.origin !== self.location.origin) {
    if (!/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return;
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === "opaque")) c.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  /* --- navigation : réseau puis cache (app shell) --- */
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() =>
          caches.match("./index.html").then((r) => r || caches.match("./") || caches.match(req)),
        ),
    );
    return;
  }

  /* --- ressources locales : cache d'abord --- */
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => hit || Response.error()),
    ),
  );
});
