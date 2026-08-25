import { expect, test } from "./fixtures";

test("la página de reportes no compite con la portada en Google", async ({ page, request }) => {
  await page.goto("/reportar-error");

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="googlebot"]')).toHaveAttribute("content", /noindex/);

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).not.toContain("/reportar-error");
  expect(sitemap).toContain("/acerca-de");

  await page.goto("/");
  await expect(page).toHaveTitle(/^UruGo \| Rutas de camiones en Uruapan/);

  const structuredData = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structuredData.some((entry) => {
    const data = JSON.parse(entry) as { "@type"?: string; name?: string };
    return data["@type"] === "WebSite" && data.name === "UruGo";
  })).toBe(true);

  expect(structuredData.some((entry) => {
    const data = JSON.parse(entry) as { "@type"?: string; publishingPrinciples?: string; founder?: { name?: string } };
    return data["@type"] === "Organization"
      && data.publishingPrinciples?.endsWith("/acerca-de")
      && data.founder?.name === "Antonio Rivera";
  })).toBe(true);
});

test("la metodología y la autoría del proyecto son públicas", async ({ page }) => {
  await page.goto("/acerca-de");

  await expect(page).toHaveTitle(/Cómo se hace UruGo/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://www.urugo.app/acerca-de");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("recorriendo Uruapan");
  await expect(page.getByRole("heading", { name: "Hecho en Uruapan por Antonio Rivera." })).toBeVisible();
  await expect(page.getByRole("link", { name: "TikTok de Antonio" })).toHaveAttribute("href", "https://www.tiktok.com/@wh01s_r00t");
  await expect(page.getByRole("link", { name: "Instagram de Antonio" })).toHaveAttribute("href", "https://www.instagram.com/wh01s_r00t");
  await expect(page.getByRole("link", { name: "Reportar una corrección" })).toHaveAttribute("href", "/reportar-error");
});
