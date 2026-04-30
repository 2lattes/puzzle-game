// ─── Mina Puzzle — Service Worker ────────────────────────────────────────────
// Stratégie :
//   • Shell (JS/CSS/pages Next.js) : Cache-First  → ultra-rapide hors-ligne
//   • Images Unsplash               : Network-First → fraîches si dispo, sinon cache
//   • puzzles.json                  : StaleWhileRevalidate → toujours quelque chose
//   • Tout le reste                 : Network-First avec fallback cache

const CACHE_SHELL   = "mina-shell-v1";
const CACHE_IMAGES  = "mina-images-v1";
const CACHE_DATA    = "mina-data-v1";

// Ressources à pré-cacher au moment de l'install (app shell)
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/puzzles.json",
];

// ─── Install : pré-cache du shell ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_SHELL)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate : nettoyage des anciens caches ──────────────────────────────────
self.addEventListener("activate", (event) => {
  const validCaches = [CACHE_SHELL, CACHE_IMAGES, CACHE_DATA];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !validCaches.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch : routing des requêtes ────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes non-GET ou les requêtes vers d'autres origines
  // (sauf Unsplash qu'on gère explicitement)
  if (request.method !== "GET") return;

  // ── Unsplash images → Network-First avec mise en cache ──────────────────────
  if (url.hostname === "images.unsplash.com") {
    event.respondWith(networkFirstWithCache(request, CACHE_IMAGES));
    return;
  }

  // ── Requêtes vers une autre origine (analytics, fonts Vercel…) → réseau ─────
  if (url.origin !== self.location.origin) {
    // On laisse passer sans interférer
    return;
  }

  // ── puzzles.json → StaleWhileRevalidate ──────────────────────────────────────
  if (url.pathname === "/puzzles.json") {
    event.respondWith(staleWhileRevalidate(request, CACHE_DATA));
    return;
  }

  // ── Next.js _next/static (JS/CSS buildés, immuables) → Cache-First ──────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, CACHE_SHELL));
    return;
  }

  // ── Images statiques du site → Cache-First ───────────────────────────────────
  if (
    url.pathname.startsWith("/puzzles/") ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|gif|ico)$/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // ── Pages HTML / API routes → Network-First ──────────────────────────────────
  event.respondWith(networkFirstWithCache(request, CACHE_SHELL));
});

// ─── Stratégies ──────────────────────────────────────────────────────────────

/** Cache-First : sert depuis le cache, sinon réseau + mise en cache */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Hors-ligne", { status: 503 });
  }
}

/** Network-First : essaie le réseau, sinon sert le cache */
async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Fallback page pour les navigations HTML
    if (request.headers.get("accept")?.includes("text/html")) {
      const fallback = await cache.match("/");
      if (fallback) return fallback;
    }
    return new Response("Hors-ligne", { status: 503 });
  }
}

/** StaleWhileRevalidate : sert le cache immédiatement, met à jour en arrière-plan */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}
