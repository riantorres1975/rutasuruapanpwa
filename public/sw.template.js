const STATIC_CACHE_NAME = "rutas-static-__BUILD_ID__";
// Route data is compatible across app builds. Keep it until the schema changes
// so activating a new worker does not leave an offline user without routes.
const DATA_CACHE_NAME = "rutas-data-v1";
const CACHE_PREFIXES = ["rutas-static-", "rutas-data-"];

// Only shell assets are pre-cached during install.
// /api/rutas-polyline is NOT included here: if the server is cold on first install,
// addAll() would throw and block the entire SW installation.
// The data endpoint is handled lazily via network-first on first fetch.
const APP_SHELL_ASSETS = [
  "/",
  "/mapa",
  "/privacidad",
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
      // Do NOT call skipWaiting() here — let the app notify the user
      // of a pending update via the SKIP_WAITING message instead.
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              CACHE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
              ![STATIC_CACHE_NAME, DATA_CACHE_NAME].includes(key)
          )
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

function storeInBackground(event, cache, request, response) {
  event.waitUntil(
    cache.put(request, response.clone()).catch((error) => {
      console.warn("[sw] Failed to update cache:", request.url || request, error);
    })
  );
}

async function cacheFirst(request, event) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    storeInBackground(event, cache, request, response);
  }
  return response;
}

async function networkFirstData(request, cacheName, event) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      storeInBackground(event, cache, request, response);
      return response;
    }

    const cached = await cache.match(request);
    return cached || response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response("Offline", { status: 503 });
  }
}

function canonicalNavigationUrl(request) {
  const url = new URL(request.url);
  return `${url.origin}${url.pathname}`;
}

async function navigationFallback(request, cache) {
  const cacheKey = canonicalNavigationUrl(request);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const offline = await cache.match("/offline.html");
  return (
    offline ||
    new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    })
  );
}

async function networkFirstNavigation(request, event) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cacheKey = canonicalNavigationUrl(request);

  try {
    const response = await fetch(request);
    if (response.ok) {
      storeInBackground(event, cache, cacheKey, response);
      return response;
    }

    if (response.status >= 500) {
      return (await cache.match(cacheKey)) || response;
    }

    return response;
  } catch {
    return navigationFallback(request, cache);
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
    event.respondWith(networkFirstNavigation(request, event));
    return;
  }

  if (requestUrl.pathname === "/api/rutas-polyline") {
    event.respondWith(networkFirstData(request, DATA_CACHE_NAME, event));
    return;
  }

  const isStaticAsset =
    requestUrl.pathname.startsWith("/_next/static/") ||
    requestUrl.pathname.startsWith("/icons/") ||
    requestUrl.pathname === "/manifest.json" ||
    /\.(?:js|css|json|png|jpg|jpeg|svg|ico|woff2?)$/i.test(requestUrl.pathname);

  if (isStaticAsset) {
    event.respondWith(cacheFirst(request, event));
  }
});
