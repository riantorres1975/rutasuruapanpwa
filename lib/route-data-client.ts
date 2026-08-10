export const ROUTE_DATA_SOURCE_HEADER = "X-UruGo-Data-Source";

const ROUTE_DATA_URL = "/api/rutas-polyline";
const ROUTE_DATA_CACHE = "rutas-data-v1";
const ROUTE_DATA_TIMEOUT_MS = 3000;

function markCachedResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set(ROUTE_DATA_SOURCE_HEADER, "cache");
  return new Response(response.clone().body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function readCachedRoutes() {
  if (!("caches" in globalThis)) return null;

  try {
    const cache = await caches.open(ROUTE_DATA_CACHE);
    return await cache.match(ROUTE_DATA_URL, { ignoreVary: true });
  } catch {
    return null;
  }
}

export async function fetchRouteDataResponse(options: { signal?: AbortSignal } = {}) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) {
    abortFromCaller();
  } else {
    options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeoutId = setTimeout(() => controller.abort(), ROUTE_DATA_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(ROUTE_DATA_URL, { signal: controller.signal });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      const cached = await readCachedRoutes();
      if (!cached) throw error;
      return markCachedResponse(cached);
    }

    if (!response.ok) {
      const cached = await readCachedRoutes();
      if (cached) return markCachedResponse(cached);
    }
    return response;
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
