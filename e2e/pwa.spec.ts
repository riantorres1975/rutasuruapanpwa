import { expect, test } from "@playwright/test";

const STATIC_CACHE = "rutas-static-__BUILD_ID__";
const DATA_CACHE = "rutas-data-v1";

async function installServiceWorker(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    // Register the source template so the test always exercises the current
    // worker even when a local Next dev server predates the latest build.
    await navigator.serviceWorker.register("/sw.template.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });
}

test("instala la PWA, renueva sus cachés y conserva datos de rutas sin conexión", async ({ page, context }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/");

  await page.evaluate(async () => {
    await caches.open("rutas-static-version-anterior");
    await caches.open("cache-de-otra-aplicacion");
  });

  await installServiceWorker(page);

  await expect.poll(() => page.evaluate(() => caches.keys())).toEqual(
    expect.arrayContaining([STATIC_CACHE, "cache-de-otra-aplicacion"]),
  );
  await expect.poll(() => page.evaluate(() => caches.keys())).not.toContain("rutas-static-version-anterior");

  const shellIsReady = await page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    const requiredPages = ["/", "/mapa", "/privacidad", "/offline.html"];
    const matches = await Promise.all(requiredPages.map((url) => cache.match(url)));
    return matches.every(Boolean);
  }, STATIC_CACHE);
  expect(shellIsReady).toBe(true);

  await page.goto("/mapa");
  await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();

  const routeResponse = await page.evaluate(async () => {
    const response = await fetch("/api/rutas-polyline");
    return { ok: response.ok, routes: (await response.json()).length };
  });
  expect(routeResponse.ok).toBe(true);
  expect(routeResponse.routes).toBeGreaterThan(0);

  await expect.poll(async () => page.evaluate(async (cacheName) => {
    const cache = await caches.open(cacheName);
    return Boolean(await cache.match("/api/rutas-polyline"));
  }, DATA_CACHE)).toBe(true);

  await context.setOffline(true);
  try {
    const offlineRouteResponse = await page.evaluate(async () => {
      const response = await fetch("/api/rutas-polyline");
      return { ok: response.ok, routes: (await response.json()).length };
    });
    expect(offlineRouteResponse.ok).toBe(true);
    expect(offlineRouteResponse.routes).toBe(routeResponse.routes);

    await page.goto("/mapa?origen=offline", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();

    await page.goto("/pagina-no-guardada", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
