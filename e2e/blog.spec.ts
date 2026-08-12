import { expect, test } from "./fixtures";

test("los artículos permiten recorrer el contenido y continuar a otra guía", async ({ page }) => {
  await page.goto("/blog/como-usar-el-teleferico-uruapan");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cómo usar el Teleférico");
  const contents = page.getByRole("navigation", { name: "Contenido del artículo" });
  await expect(contents).toBeVisible();
  await expect(contents.getByRole("link", { name: "Las 6 estaciones" })).toHaveAttribute("href", "#estaciones");

  await expect(page.getByRole("heading", { name: "Más guías de UruGo" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Las rutas de camión más usadas/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver Teleférico en el mapa" })).toHaveAttribute(
    "href",
    "/mapa?destino=Teleferico%20Uruapan",
  );

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
