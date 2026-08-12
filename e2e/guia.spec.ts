import { expect, test } from "./fixtures";

test("la guía explica las funciones y carga sus capturas reales", async ({ page }) => {
  await page.goto("/guia");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Muévete con la app");
  const sectionNavigation = page.getByRole("navigation", { name: "Secciones de la guía" });
  await expect(sectionNavigation).toBeVisible();
  await expect(sectionNavigation).toHaveCSS("scrollbar-width", "none");
  await expect(page.getByRole("heading", { name: "Planea tu viaje en cuatro pasos." })).toBeVisible();

  const screenshots = page.locator("main img");
  await expect(screenshots).toHaveCount(5);
  await screenshots.last().scrollIntoViewIfNeeded();
  await expect.poll(() => screenshots.evaluateAll(
    (images) => images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length,
  )).toBe(5);

  const accountQuestion = page.locator("details summary").first();
  await accountQuestion.click();
  await expect(page.getByText(/funciona sin registro/i)).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("el mapa ofrece acceso directo a la guía", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");

  const guideLink = page.getByRole("link", { name: "Abrir guía de uso" });
  await expect(guideLink).toBeVisible();
  await expect(guideLink).toHaveAttribute("href", "/guia");
});
