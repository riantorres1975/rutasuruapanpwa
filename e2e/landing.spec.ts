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
