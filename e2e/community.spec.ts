import { expect, test } from "./fixtures";

test("el reporte comunitario confirma que queda pendiente de revisión", async ({ page }) => {
  await page.route("**/api/community/reports", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));
  await page.goto("/reportar-error?ruta=Ruta%2014");

  await page.getByLabel("Tipo de reporte").selectOption("route_inactive");
  await page.getByLabel("Qué pasó").fill("Varias personas indican que esta ruta ya no circula.");
  await page.getByRole("button", { name: "Enviar a revisión" }).click();

  await expect(page.getByRole("heading", { name: "Gracias por ayudar a mejorar la ruta." })).toBeVisible();
  await expect(page.getByText(/Ningún dato cambia en el mapa/)).toBeVisible();
});

test("la página de una ruta permite enviar una confirmación rápida", async ({ page }) => {
  await page.route("**/api/community/confirmations", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  }));
  await page.goto("/ruta/ruta-17-purhepechas");

  await expect(page.getByRole("heading", { name: "¿Has visto esta ruta recientemente?" })).toBeVisible();
  await page.getByRole("button", { name: "La vi circular" }).click();
  await expect(page.getByText("Gracias. Tu confirmación quedó registrada.")).toBeVisible();
});

test("el panel administrativo no se indexa", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByText("Administración privada")).toBeVisible();
});
