const STATIC_CACHE_NAME = "rutas-static-__BUILD_ID__";
// Route data is compatible across app builds. Keep it until the schema changes
// so activating a new worker does not leave an offline user without routes.
const DATA_CACHE_NAME = "rutas-data-v1";
const CACHE_PREFIXES = ["rutas-static-", "rutas-data-"];
const DATA_NETWORK_WAIT_MS = 1500;
const DATA_NETWORK_TIMEOUT_MS = 8000;
const DATA_SOURCE_HEADER = "X-UruGo-Data-Source";

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

function markCachedData(response) {
  const headers = new Headers(response.headers);
  headers.set(DATA_SOURCE_HEADER, "cache");
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function fetchFreshData(request, cache) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DATA_NETWORK_TIMEOUT_MS);

  return fetch(request, { cache: "no-store", signal: controller.signal })
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone()).catch((error) => {
          console.warn("[sw] Failed to update route data:", request.url || request, error);
        });
      }
      return response;
    })
    .finally(() => clearTimeout(timeoutId));
}

async function networkFirstData(request, cacheName) {
  const cache = await caches.open(cacheName);
  // Next adds App Router headers to `Vary` even though this JSON endpoint has
  // one representation. Ignore them so reloads can reuse the same route data.
  const cached = await cache.match(request, { ignoreVary: true });
  const networkOutcome = fetchFreshData(request, cache).then(
    (response) => ({ type: "response", response }),
    () => ({ type: "error" })
  );

  if (!cached) {
    const outcome = await networkOutcome;
    return {
      response: outcome.type === "response"
        ? outcome.response
        : new Response("Offline", { status: 503 }),
      completion: Promise.resolve()
    };
  }

  let waitTimer;
  const fastOutcome = await Promise.race([
    networkOutcome,
    new Promise((resolve) => {
      waitTimer = setTimeout(() => resolve({ type: "timeout" }), DATA_NETWORK_WAIT_MS);
    })
  ]);
  clearTimeout(waitTimer);

  if (fastOutcome.type === "response" && fastOutcome.response.ok) {
    return { response: fastOutcome.response, completion: Promise.resolve() };
  }

  return {
    response: markCachedData(cached),
    completion: fastOutcome.type === "timeout"
      ? networkOutcome.then(() => undefined)
      : Promise.resolve()
  };
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
    const strategy = networkFirstData(request, DATA_CACHE_NAME);
    event.respondWith(strategy.then((result) => result.response));
    event.waitUntil(strategy.then((result) => result.completion));
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
