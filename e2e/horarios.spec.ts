import { expect, test } from "./fixtures";

test("permite buscar horarios por destino y filtrar el Teleférico", async ({ page }) => {
  await page.goto("/horarios");

  const search = page.getByRole("textbox", { name: "Buscar ruta o destino" });
  await search.fill("Constituyentes");
  await expect(page.getByText("Ruta 76", { exact: true })).toBeVisible();
  await expect(page.getByText("Ruta 27", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Teleférico" }).click();
  await expect(search).toHaveValue("");
  await expect(page.getByText("Teleférico Uruapan", { exact: true })).toBeVisible();
  await expect(page.getByText("1 servicio", { exact: true })).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
