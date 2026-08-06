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
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");

  await expect(page.locator('button[aria-label="Origen ajustado manualmente, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.locator('button[aria-label="Destino marcado, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.getByText("PASO 1 DE 3", { exact: true })).toHaveCount(0);
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
