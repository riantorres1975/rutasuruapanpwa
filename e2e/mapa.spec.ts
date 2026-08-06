import { expect, test } from "@playwright/test";

test("el flujo móvil permite buscar un origen manual sin desbordar la pantalla", async ({ page, context }) => {
  await context.setGeolocation({ latitude: 19.4326, longitude: -99.1332 });
  await context.grantPermissions(["geolocation"]);
  await page.goto("/mapa");

  await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();
  await expect(page.locator('input[aria-label="Buscar origen"]:visible')).toBeVisible();
  await expect(page.locator("p:visible").filter({ hasText: "Estás fuera de Uruapan" }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("el API del chat rechaza cuerpos inválidos antes de llamar al proveedor", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { message: "", history: "no-es-un-arreglo" },
  });

  expect(response.status()).toBe(400);
});
