const STATIC_CACHE_NAME = "rutas-static-__BUILD_ID__";
const DATA_CACHE_NAME = "rutas-data-__BUILD_ID__";

// Only shell assets are pre-cached during install.
// /api/rutas is NOT included here: if the server is cold on first install,
// addAll() would throw and block the entire SW installation.
// The data endpoint is handled lazily via staleWhileRevalidate on first fetch.
const APP_SHELL_ASSETS = [
  "/",
  "/manifest.json",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      // Pre-cache shell assets individually so a single failure does not
      // block the whole installation. Errors are logged but not fatal.
      await Promise.allSettled(
        APP_SHELL_ASSETS.map(async (url) => {
          try {
            await staticCache.add(url);
          } catch (err) {
            console.warn("[sw] Failed to pre-cache:", url, err);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE_NAME, DATA_CACHE_NAME].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE_NAME);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || new Response("Offline", { status: 503 });
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const root = await caches.match("/");
    if (root) {
      return root;
    }

    const offline = await caches.match("/offline.html");
    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (requestUrl.pathname === "/api/rutas") {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE_NAME));
    return;
  }

  const isStaticAsset =
    requestUrl.pathname.startsWith("/_next/static/") ||
    requestUrl.pathname.startsWith("/icons/") ||
    requestUrl.pathname === "/manifest.json" ||
    /\.(?:js|css|json|png|jpg|jpeg|svg|ico|woff2?)$/i.test(requestUrl.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
  }
});
