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
