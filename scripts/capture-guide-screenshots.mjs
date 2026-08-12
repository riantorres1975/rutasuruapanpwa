import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const outputDir = join(process.cwd(), "public", "guide");
const manifestScreenshotDir = join(process.cwd(), "public", "screenshots");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  geolocation: { longitude: -102.06303, latitude: 19.42101 },
  permissions: ["geolocation"],
  colorScheme: "dark",
});
await context.addInitScript(() => {
  localStorage.setItem("rutas-uru-onboarded", "1");
  localStorage.setItem("voy-pwa-banner-dismissed", "1");
  localStorage.setItem("voy-pwa-ios-hint-dismissed", "1");
});

const page = await context.newPage();
const capture = (directory, name) => page.screenshot({
  path: join(directory, name),
  animations: "disabled",
});

await page.goto(`${baseUrl}/mapa`, { waitUntil: "domcontentloaded" });
const activateMap = page.getByRole("button", { name: "Activar mapa interactivo" });
if (await activateMap.isVisible().catch(() => false)) await activateMap.click();
await page.locator(".mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(1_200);
await capture(manifestScreenshotDir, "mapa-narrow.png");

await page.locator('button[aria-label^="Rutas "]:visible').click();
await page.getByRole("dialog", { name: "Selecciona una ruta" }).waitFor({ state: "visible" });
await capture(manifestScreenshotDir, "rutas-narrow.png");

await page.goto(
  `${baseUrl}/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870`,
  { waitUntil: "domcontentloaded" },
);
const resultDialog = page.locator('[role="dialog"]:visible').filter({ hasText: "RUTA RECOMENDADA" });
await resultDialog.waitFor({ state: "visible", timeout: 15_000 });
await capture(outputDir, "resultado.png");

const startTrip = resultDialog.locator('button[aria-label^="Iniciar viaje en"]');
if (await startTrip.isVisible().catch(() => false)) {
  await startTrip.click();
  await page.getByRole("region", { name: "Modo viaje" }).waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  await capture(outputDir, "modo-viaje.png");
}

await page.goto(`${baseUrl}/horarios`, { waitUntil: "domcontentloaded" });
await page.getByRole("heading", { name: /Horarios de camiones/i }).waitFor({ state: "visible" });
await page.waitForTimeout(300);
await capture(outputDir, "horarios.png");

await page.setViewportSize({ width: 1280, height: 800 });
await page.goto(`${baseUrl}/mapa`, { waitUntil: "domcontentloaded" });
await page.locator(".mapboxgl-canvas").waitFor({ state: "visible", timeout: 15_000 });
await page.waitForTimeout(1_200);
await capture(manifestScreenshotDir, "mapa-wide.png");

await browser.close();
console.log(`[guide] Screenshots updated in ${outputDir}`);
