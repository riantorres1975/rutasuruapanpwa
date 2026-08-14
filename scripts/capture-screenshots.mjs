// Captura screenshots reales para el manifest de la PWA.
// Usa el Edge instalado en el sistema vía playwright-core (sin descargar navegador).
// Uso: node scripts/capture-screenshots.mjs  (requiere `pnpm start` corriendo en :3000)
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const OUT_DIR = "public/screenshots";

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });

async function capture({ path, url, width, height, waitMs }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    locale: "es-MX",
    // Negar geolocalización para una captura determinista.
    permissions: [],
  });
  const page = await context.newPage();
  // Saltar onboarding y banners para una captura limpia del mapa.
  await context.addInitScript(() => {
    try {
      localStorage.setItem("rutas-uru-onboarded", "1");
      localStorage.setItem("voy-pwa-banner-dismissed", "1");
      localStorage.setItem("voy-pwa-ios-hint-dismissed", "1");
    } catch {}
  });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: `${OUT_DIR}/${path}` });
  await context.close();
  console.log(`OK ${OUT_DIR}/${path}`);
}

// narrow (móvil) — el mapa tiene un retraso de arranque de 3.2 s en móvil
await capture({ path: "mapa-narrow.png", url: "/mapa", width: 390, height: 844, waitMs: 14000 });
await capture({ path: "rutas-narrow.png", url: "/rutas", width: 390, height: 844, waitMs: 2500 });
// wide (escritorio)
await capture({ path: "mapa-wide.png", url: "/mapa", width: 1280, height: 800, waitMs: 10000 });

await browser.close();
console.log("Listo.");
