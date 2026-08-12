import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.VIDEO_BASE_URL ?? "http://localhost:3000";
const outputDir = join(process.cwd(), "video", "public", "clips");
const temporaryDir = join(outputDir, ".recording");

const formats = [
  { name: "wide", viewport: { width: 1280, height: 720 } },
  { name: "vertical", viewport: { width: 540, height: 960 } },
];
const requestedFormat = process.env.VIDEO_FORMAT;
const requestedScene = process.env.VIDEO_SCENE;

const sleep = (page, milliseconds) => page.waitForTimeout(milliseconds);

async function assertServerIsReady() {
  try {
    const response = await fetch(baseUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `No se pudo abrir ${baseUrl}. Inicia UruGo con \"npm run dev\" antes de grabar.`,
      { cause: error },
    );
  }
}

async function preparePage(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal { display: none !important; }
      #urugo-demo-cursor {
        position: fixed;
        z-index: 2147483647;
        left: 0;
        top: 0;
        width: 28px;
        height: 28px;
        pointer-events: none;
        border: 3px solid #b8e840;
        border-radius: 999px;
        background: rgba(12, 17, 10, 0.24);
        box-shadow: 0 0 0 5px rgba(184, 232, 64, 0.2), 0 5px 20px rgba(0, 0, 0, 0.4);
        transform: translate(-80px, -80px);
        transition: transform 420ms cubic-bezier(.2,.8,.2,1), background 140ms ease;
      }
      #urugo-demo-cursor[data-clicking="true"] {
        background: rgba(184, 232, 64, 0.7);
        box-shadow: 0 0 0 12px rgba(184, 232, 64, 0.12), 0 5px 20px rgba(0, 0, 0, 0.4);
      }
    `,
  });
  await page.evaluate(() => {
    if (document.querySelector("#urugo-demo-cursor")) return;
    const cursor = document.createElement("div");
    cursor.id = "urugo-demo-cursor";
    cursor.setAttribute("aria-hidden", "true");
    document.body.append(cursor);
  });
}

async function goto(page, path, waitMs = 1_200) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await preparePage(page);
  await sleep(page, waitMs);
}

async function pointAt(page, locator, { click = false, timeout = 15_000 } = {}) {
  await locator.waitFor({ state: "visible", timeout });
  const box = await locator.boundingBox({ timeout });
  if (!box) throw new Error("No se pudo ubicar el control de la demostracion");
  const x = Math.round(box.x + box.width / 2);
  const y = Math.round(box.y + box.height / 2);
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector("#urugo-demo-cursor");
    if (cursor instanceof HTMLElement) cursor.style.transform = `translate(${x - 14}px, ${y - 14}px)`;
  }, { x, y });
  await page.mouse.move(x, y, { steps: 12 });
  await sleep(page, 500);
  if (!click) return;
  await page.evaluate(() => {
    document.querySelector("#urugo-demo-cursor")?.setAttribute("data-clicking", "true");
  });
  await locator.click({ timeout });
  await sleep(page, 180);
  await page.evaluate(() => {
    document.querySelector("#urugo-demo-cursor")?.removeAttribute("data-clicking");
  });
}

async function activateMapIfNeeded(page) {
  const activate = page.getByRole("button", { name: "Activar mapa interactivo" });
  if (await activate.isVisible().catch(() => false)) {
    // En escritorio el mapa puede terminar de activarse durante el movimiento
    // del cursor; en ese caso el boton desaparece y podemos continuar.
    await pointAt(page, activate, { click: true, timeout: 1_500 }).catch(() => undefined);
  }
  await page.locator(".mapboxgl-canvas").waitFor({ state: "visible", timeout: 20_000 });
}

async function visibleRouteSearch(page) {
  const openRoutes = page.locator('button[aria-label^="Rutas "]:visible');
  if (await openRoutes.isVisible().catch(() => false)) {
    await pointAt(page, openRoutes, { click: true });
    await sleep(page, 700);
  }
  return page.getByPlaceholder(/punto de referencia/i).filter({ visible: true });
}

const scenes = [
  {
    name: "landing",
    minimumMs: 9_000,
    run: async ({ page }) => {
      await goto(page, "/", 1_700);
      const search = page.getByRole("combobox", { name: "Buscar destino" });
      await pointAt(page, search, { click: true });
      await search.fill("Hospital Regional");
      await sleep(page, 1_500);
      const suggestion = page.getByRole("option").filter({ hasText: "Hospital Regional" }).first();
      if (await suggestion.isVisible().catch(() => false)) await pointAt(page, suggestion);
      await sleep(page, 1_800);
    },
  },
  {
    name: "routes",
    minimumMs: 9_000,
    run: async ({ page }) => {
      await goto(page, "/mapa", 900);
      await activateMapIfNeeded(page);
      await sleep(page, 900);
      const search = await visibleRouteSearch(page);
      await pointAt(page, search, { click: true });
      await search.fill("Tec Uruapan");
      await sleep(page, 1_500);
      const route = page.getByText("Ruta 27", { exact: true }).filter({ visible: true }).first();
      if (await route.isVisible().catch(() => false)) await pointAt(page, route);
      await sleep(page, 1_700);
    },
  },
  {
    name: "planner",
    minimumMs: 9_000,
    run: async ({ page }) => {
      await goto(page, "/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870", 800);
      await activateMapIfNeeded(page);
      const resultLabel = page.getByText("RUTA RECOMENDADA", { exact: true }).filter({ visible: true }).first();
      await resultLabel.waitFor({ state: "visible", timeout: 20_000 });
      await sleep(page, 1_400);
      const startTrip = page.locator('button[aria-label^="Iniciar viaje en"]:visible').first();
      if (await startTrip.isVisible().catch(() => false)) await pointAt(page, startTrip);
      await sleep(page, 2_100);
    },
  },
  {
    name: "transfer",
    minimumMs: 9_000,
    run: async ({ page }) => {
      await goto(page, "/mapa?a=-102.025,19.405&b=-102.08,19.42", 800);
      await activateMapIfNeeded(page);
      const option = page.locator('button[aria-label^="Seleccionar transbordo de"]:visible').first();
      const startTrip = page.locator('button[aria-label="Iniciar viaje con transbordo"]:visible').first();
      await option.or(startTrip).first().waitFor({ state: "visible", timeout: 20_000 });
      await sleep(page, 1_000);
      if (await option.isVisible().catch(() => false)) {
        await pointAt(page, option, { click: true });
      } else {
        await pointAt(page, startTrip);
      }
      await sleep(page, 2_000);
    },
  },
  {
    name: "trip",
    minimumMs: 12_000,
    run: async ({ page, context }) => {
      await goto(page, "/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870", 700);
      await activateMapIfNeeded(page);
      const start = page.locator('button[aria-label^="Iniciar viaje en"]:visible').first();
      await pointAt(page, start, { click: true });
      await page.getByRole("region", { name: "Modo viaje" }).waitFor({ state: "visible" });
      await page.locator(".trip-map-marker--bus").waitFor({ state: "visible", timeout: 10_000 });
      await sleep(page, 1_000);
      for (const position of [
        { longitude: -102.0615, latitude: 19.4214 },
        { longitude: -102.0578, latitude: 19.4237 },
        { longitude: -102.05447, latitude: 19.42623 },
        { longitude: -102.0492, latitude: 19.4265 },
      ]) {
        await context.setGeolocation(position);
        await sleep(page, 1_250);
      }
    },
  },
  {
    name: "teleferico",
    minimumMs: 12_000,
    run: async ({ page, context }) => {
      await context.setGeolocation({ longitude: -102.02093, latitude: 19.396299 });
      await goto(page, "/mapa?a=-102.02093,19.396299&b=-102.0375379,19.4241787", 700);
      await activateMapIfNeeded(page);
      const start = page.locator('button[aria-label^="Iniciar viaje en"]:visible').first();
      await pointAt(page, start, { click: true });
      await page.locator(".trip-map-marker--teleferico").waitFor({ state: "visible", timeout: 10_000 });
      await sleep(page, 1_700);
      await context.setGeolocation({ longitude: -102.0305, latitude: 19.4105 });
      await sleep(page, 1_500);
      await context.setGeolocation({ longitude: -102.0375379, latitude: 19.4216787 });
      await page.locator(".trip-map-marker--walking").waitFor({ state: "visible", timeout: 10_000 });
      await sleep(page, 1_800);
    },
  },
  {
    name: "explore",
    minimumMs: 10_000,
    run: async ({ page }) => {
      await goto(page, "/horarios", 1_200);
      await page.getByRole("heading", { name: /Horarios de camiones/i }).waitFor({ state: "visible" });
      await page.mouse.wheel(0, 430);
      await sleep(page, 2_000);
      await goto(page, "/guia", 900);
      await page.locator("h1").first().waitFor({ state: "visible" });
      await page.mouse.wheel(0, 360);
      await sleep(page, 2_000);
    },
  },
];

const selectedFormats = requestedFormat
  ? formats.filter((format) => format.name === requestedFormat)
  : formats;
const selectedScenes = requestedScene
  ? scenes.filter((scene) => scene.name === requestedScene)
  : scenes;

if (selectedFormats.length === 0) throw new Error(`Formato desconocido: ${requestedFormat}`);
if (selectedScenes.length === 0) throw new Error(`Escena desconocida: ${requestedScene}`);

async function recordScene(browser, format, scene) {
  const startedAt = Date.now();
  const context = await browser.newContext({
    viewport: format.viewport,
    recordVideo: { dir: temporaryDir, size: format.viewport },
    geolocation: { longitude: -102.06303, latitude: 19.42101 },
    permissions: ["geolocation"],
    colorScheme: "dark",
    locale: "es-MX",
  });
  await context.addInitScript(() => {
    localStorage.setItem("rutas-uru-onboarded", "1");
    localStorage.setItem("voy-pwa-banner-dismissed", "1");
    localStorage.setItem("voy-pwa-ios-hint-dismissed", "1");
  });

  const page = await context.newPage();
  const video = page.video();
  try {
    await scene.run({ page, context });
    const remaining = scene.minimumMs - (Date.now() - startedAt);
    if (remaining > 0) await sleep(page, remaining);
  } finally {
    await context.close();
  }

  if (!video) throw new Error(`No se creo el video ${format.name}/${scene.name}`);
  const source = await video.path();
  const destination = join(outputDir, `${format.name}-${scene.name}.webm`);
  await rm(destination, { force: true });
  await rename(source, destination);
  console.log(`[video] ${format.name}/${scene.name}`);
}

await assertServerIsReady();
await rm(temporaryDir, { recursive: true, force: true });
await mkdir(temporaryDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const format of selectedFormats) {
    for (const scene of selectedScenes) {
      await recordScene(browser, format, scene);
    }
  }
} finally {
  await browser.close();
  await rm(temporaryDir, { recursive: true, force: true });
}

console.log(`[video] Clips listos en ${outputDir}`);
