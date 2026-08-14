import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-08-20T12:00:00-06:00"));
});

test("muestra la tarifa y recuerda el cierre en la portada", async ({ page }) => {
  await page.goto("/");

  const notice = page.getByRole("dialog", { name: /nueva tarifa/i });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("Camión urbano");
  await expect(notice).toContainText("Teleférico Uruapan");
  await expect(notice).toHaveCSS("background-color", "rgb(12, 17, 10)");
  await expect(page.getByTestId("fare-update-amount")).toHaveCSS("font-family", /DM Sans/);

  const fitsViewport = await notice.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left >= 0 && bounds.right <= window.innerWidth && bounds.height <= window.innerHeight;
  });
  expect(fitsViewport).toBe(true);

  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(notice).toBeHidden();

  await page.reload();
  await expect(notice).toBeHidden();
});

test("aparece en el mapa cuando el onboarding ya terminó", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
  });
  await page.goto("/mapa");

  await expect(page.getByRole("dialog", { name: /nueva tarifa/i })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Bienvenida a UruGo" })).toBeHidden();
});
