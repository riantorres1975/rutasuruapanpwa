import { expect, test } from "@playwright/test";

test("el flujo móvil permite buscar un origen manual sin desbordar la pantalla", async ({ page, context }) => {
  await context.setGeolocation({ latitude: 19.4326, longitude: -99.1332 });
  await context.grantPermissions(["geolocation"]);
  await page.goto("/mapa");

  await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();
  await expect(page.locator('input[aria-label="Buscar origen"]:visible')).toBeVisible();
  await expect(page.locator("p:visible").filter({ hasText: "Estás fuera de Uruapan" }).first()).toBeVisible();

  const originSearch = page.locator('input[aria-label="Buscar origen"]:visible');
  await originSearch.fill("Centro");
  await originSearch.press("Enter");
  await expect(page.locator('input[aria-label="Buscar destino"]:visible')).toBeVisible();
  await expect(page.locator("span:visible", { hasText: "Origen ajustado" }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("negar la geolocalización conserva el flujo de origen manual", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch: () => undefined,
        watchPosition: (_success: unknown, error: (reason: unknown) => void) => {
          window.setTimeout(() => error({ code: 1, message: "Permiso denegado" }), 0);
          return 1;
        },
      },
    });
  });

  await page.goto("/mapa");
  const originSearch = page.locator('input[aria-label="Buscar origen"]:visible');
  await expect(originSearch).toBeVisible();
  await originSearch.fill("Central de Autobuses");
  await originSearch.press("Enter");
  await expect(page.locator('input[aria-label="Buscar destino"]:visible')).toBeVisible();
});

test("un enlace compartido hidrata origen y destino sin mostrar el paso inicial", async ({ page }) => {
  const routeWorker = page.waitForEvent("worker");
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");

  expect((await routeWorker).url()).toContain("urugo-route-calculation");
  await expect(page.locator('button[aria-label="Origen ajustado manualmente, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.locator('button[aria-label="Destino marcado, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.getByText("PASO 1 DE 3", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver resultado de ruta" })).not.toContainText("Buscando...");
});

test("una actualización del GPS no borra el transbordo seleccionado", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.025, latitude: 19.405 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa?b=-102.08,19.42");

  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).toContainText("con transbordo", { timeout: 10_000 });
  await resultButton.click({ force: true });

  const transferOption = page
    .locator("button:visible")
    .filter({ hasText: "transbordo" })
    .filter({ hasText: "Ruta" })
    .first();
  await transferOption.click({ force: true });
  await expect(resultButton).not.toContainText("con transbordo");
  const selectedLabel = (await resultButton.innerText()).trim();

  await context.setGeolocation({ longitude: -102.0249, latitude: 19.405 });
  await page.waitForTimeout(1_200);

  await expect(resultButton).toHaveText(selectedLabel);
  await resultButton.click({ force: true });
  await expect(
    page.locator('[role="dialog"]:visible').filter({ hasText: "TRANSBORDO SELECCIONADO" }),
  ).toBeVisible();
});

test("el asistente diferido abre con un solo toque", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");

  await page.locator('button[aria-label="Abrir asistente de rutas"]:visible').click();
  await expect(page.getByRole("dialog", { name: "Asistente UruGo" })).toBeVisible();
});

test("el API del chat rechaza cuerpos inválidos antes de llamar al proveedor", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { message: "", history: "no-es-un-arreglo" },
  });

  expect(response.status()).toBe(400);
});

test("el API del chat bloquea solicitudes cross-site y tipos simples", async ({ request }) => {
  const payload = JSON.stringify({ message: "Centro", history: [], location: null });
  const crossSite = await request.post("/api/chat", {
    data: payload,
    headers: {
      "content-type": "text/plain",
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    },
  });
  const simpleContentType = await request.post("/api/chat", {
    data: payload,
    headers: { "content-type": "text/plain" },
  });

  expect(crossSite.status()).toBe(403);
  expect(simpleContentType.status()).toBe(415);
});
