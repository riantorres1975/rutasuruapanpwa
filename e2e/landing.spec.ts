import { expect, test } from "./fixtures";

test("el buscador de la portada no cubre los accesos populares", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  await page.getByRole("combobox", { name: "Buscar destino" }).focus();

  const suggestions = page.getByRole("listbox");
  const popularLabel = page.getByText("Populares", { exact: true }).first();

  await expect(suggestions).toBeVisible();
  await expect(suggestions).toContainText("Casa");
  await expect(suggestions).toContainText("Trabajo");

  const suggestionsBox = await suggestions.boundingBox();
  const popularBox = await popularLabel.boundingBox();

  expect(suggestionsBox).not.toBeNull();
  expect(popularBox).not.toBeNull();
  expect(suggestionsBox!.y + suggestionsBox!.height).toBeLessThanOrEqual(popularBox!.y);
});

test("el simulador cambia de destino y abre el recorrido seleccionado", async ({ page }) => {
  await page.goto("/");

  const simulator = page.getByTestId("landing-trip-simulator");
  await expect(simulator).toBeVisible();
  await expect(simulator).toContainText("Central de Autobuses");
  await expect(simulator).toContainText("Ruta 11");

  await page.getByRole("button", { name: "Pausar ejemplos de viaje" }).click();
  await expect(page.getByRole("button", { name: "Reproducir ejemplos de viaje" })).toBeVisible();
  await page.getByRole("button", { name: "Reproducir ejemplos de viaje" }).click();

  await page.getByRole("button", { name: "Hospital Regional", exact: true }).click();

  await expect(simulator).toContainText("Estación Presidencia");
  await expect(simulator).toContainText("Dirección Hospital Regional");
  await expect(simulator).toContainText("$24 total");
  await expect(simulator.getByRole("link", { name: "Ver recorrido completo" })).toHaveAttribute(
    "href",
    "/mapa?destino=Hospital%20Regional",
  );
  await expect(page.locator(".mapboxgl-map")).toHaveCount(0);
});

test("el simulador animado cabe en una pantalla móvil", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  await expect(page.getByTestId("landing-trip-simulator")).toBeVisible();
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test("la tarifa usa un signo de pesos legible", async ({ page }) => {
  await page.goto("/");

  const fareLabel = page.getByText("tarifa base 2026 MXN", { exact: true });
  const fareValue = fareLabel.locator("xpath=preceding-sibling::*[1]");

  await expect(fareValue).toHaveText("$12");
  await expect(fareValue.locator("span")).toHaveCSS("font-family", /DM Sans/);
});

test("el menú móvil se cierra con Escape y al tocar fuera", async ({ page }) => {
  await page.goto("/");

  const openButton = page.getByRole("button", { name: "Abrir navegación" });
  await openButton.click();
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();

  await openButton.click();
  await page.mouse.click(12, 420);
  await expect(page.getByRole("navigation", { name: "Navegación móvil" })).toBeHidden();
});

test("las tarjetas de transporte usan iconos y caben en mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  const busCard = page.getByRole("link", { name: /Camión urbano/ });
  const cableCarCard = page.getByRole("link", { name: /Teleférico Uruapan/ });

  await expect(busCard.locator(".lucide-bus-front")).toBeVisible();
  await expect(cableCarCard.locator(".lucide-cable-car")).toBeVisible();
  await expect(busCard).toContainText("$12 · Efectivo");
  await expect(cableCarCard).toContainText("$12 · Tarjeta");
  await expect(busCard).toHaveCSS("border-radius", "8px");

  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
});
