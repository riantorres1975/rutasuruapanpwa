import { expect, test } from "@playwright/test";

test("el flujo móvil permite buscar un origen manual sin desbordar la pantalla", async ({ page, context }) => {
  await context.setGeolocation({ latitude: 19.4326, longitude: -99.1332 });
  await context.grantPermissions(["geolocation"]);
  await page.goto("/mapa");

  await expect(page.getByRole("heading", { name: "Mapa de rutas de transporte en Uruapan" })).toBeVisible();
  await expect(page.locator('input[aria-label="Buscar origen"]:visible')).toBeVisible();
  await expect(page.locator("p:visible").filter({ hasText: "Estás fuera de Uruapan" }).first()).toBeVisible();

  const originSearch = page.locator('input[aria-label="Buscar origen"]:visible');
  await originSearch.fill("Centro");
  await originSearch.press("Enter");
  await expect(page.locator('input[aria-label="Buscar destino"]:visible')).toBeVisible();
  await expect(page.locator("span:visible", { hasText: "Origen ajustado" }).first()).toBeVisible();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test("negar la geolocalización conserva el flujo de origen manual", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        clearWatch: () => undefined,
        watchPosition: (_success: unknown, error: (reason: unknown) => void) => {
          window.setTimeout(() => error({ code: 1, message: "Permiso denegado" }), 0);
          return 1;
        },
      },
    });
  });

  await page.goto("/mapa");
  const originSearch = page.locator('input[aria-label="Buscar origen"]:visible');
  await expect(originSearch).toBeVisible();
  await originSearch.fill("Central de Autobuses");
  await originSearch.press("Enter");
  await expect(page.locator('input[aria-label="Buscar destino"]:visible')).toBeVisible();
});

test("un enlace compartido hidrata origen y destino sin mostrar el paso inicial", async ({ page }) => {
  const routeWorker = page.waitForEvent("worker");
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");

  expect((await routeWorker).url()).toContain("urugo-route-calculation");
  await expect(page.locator('button[aria-label="Origen ajustado manualmente, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.locator('button[aria-label="Destino marcado, toca para cambiar"]:visible')).toBeVisible();
  await expect(page.getByText("PASO 1 DE 3", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver resultado de ruta" })).not.toContainText("Buscando...");
});

test("un viaje en Teleférico continúa a pie desde la estación", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.02093, latitude: 19.396299 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa?a=-102.02093,19.396299&b=-102.0375379,19.4241787");

  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).toContainText("Teleférico", { timeout: 10_000 });
  await resultButton.click({ force: true });

  const resultDialog = page.locator('[role="dialog"]:visible').filter({ hasText: "Teleférico" });
  await expect(resultDialog).toContainText("$11 tarjeta");
  await expect(resultDialog).toContainText("estación Hospital Regional");
  await expect(resultDialog).toContainText("estación Boulevard Industrial / Plaza Agora");
  await expect(resultDialog).not.toContainText("haz la parada con la mano");
  expect(await resultDialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);

  await resultDialog.locator('button[aria-label^="Iniciar viaje en"]').click({ force: true });
  const tripPanel = page.getByRole("region", { name: "Modo viaje" });
  await expect(tripPanel).toContainText("EN CAMINO");
  await expect(tripPanel).toContainText("Baja en la estación Boulevard Industrial / Plaza Agora");

  await context.setGeolocation({ longitude: -102.0375379, latitude: 19.4216787 });
  await expect(tripPanel).toContainText("ÚLTIMO TRAMO");
  await expect(tripPanel).toContainText("Camina a tu destino");

  await context.setGeolocation({ longitude: -102.0375379, latitude: 19.4241787 });
  await expect(tripPanel).toContainText("ÚLTIMO TRAMO");
  await context.setGeolocation({ longitude: -102.03745, latitude: 19.4241787 });
  await expect(tripPanel).toContainText("Llegaste");
});

test("una actualización del GPS no borra el transbordo seleccionado", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.025, latitude: 19.405 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa?b=-102.08,19.42");

  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).toContainText("con transbordo", { timeout: 10_000 });
  await resultButton.click({ force: true });

  const transferOption = page.locator('button[aria-label^="Seleccionar transbordo de"]:visible').first();
  const transferLabel = await transferOption.getAttribute("aria-label");
  expect(transferLabel).not.toBeNull();
  const [routeAName, routeBName] = transferLabel!
    .replace("Seleccionar transbordo de ", "")
    .split(" a ");
  await transferOption.click({ force: true });
  const selectedDialog = page
    .locator('[role="dialog"]:visible')
    .filter({ hasText: "TRANSBORDO SELECCIONADO" });
  await expect(selectedDialog).toBeVisible();

  await context.setGeolocation({ longitude: -102.0249, latitude: 19.405 });
  await page.waitForTimeout(1_200);

  await expect(selectedDialog).toBeVisible();
  await expect(selectedDialog).toContainText(routeAName);
  await expect(selectedDialog).toContainText(routeBName);
});

test("el modo viaje sigue el GPS sin recuperar la cámara después de un gesto manual", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.06303, latitude: 19.42101 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa?a=-102.063030,19.421010&b=-102.042340,19.426870");

  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).not.toContainText("Buscando...", { timeout: 10_000 });
  await resultButton.click({ force: true });
  await page.locator('button[aria-label^="Iniciar viaje en"]:visible').click({ force: true });

  await expect(page.getByRole("region", { name: "Modo viaje" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Centrar en mi ubicación durante el viaje" })).toBeVisible();

  const map = page.getByRole("application", { name: /Mapa interactivo/ });
  await map.dispatchEvent("pointerdown", { pointerType: "touch" });

  await expect(page.getByRole("button", { name: "Volver a seguir mi ubicación" })).toBeVisible();
  await context.setGeolocation({ longitude: -102.0615, latitude: 19.4214 });
  await page.waitForTimeout(1_000);
  await expect(page.getByRole("button", { name: "Volver a seguir mi ubicación" })).toBeVisible();
  await page.getByRole("button", { name: "Volver a seguir mi ubicación" }).click({ force: true });
  await expect(page.getByRole("button", { name: "Centrar en mi ubicación durante el viaje" })).toBeVisible();

  const tripPanel = page.getByRole("region", { name: "Modo viaje" });
  await tripPanel.getByRole("button", { name: "Finalizar viaje" }).click({ force: true });
  const stopDialog = page.getByRole("dialog", { name: "¿Finalizar el viaje?" });
  await expect(stopDialog).toBeVisible();
  await expect(stopDialog.getByRole("button", { name: "Finalizar viaje" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(stopDialog).toHaveCount(0);
  await expect(tripPanel.getByRole("button", { name: "Finalizar viaje" })).toBeFocused();

  await tripPanel.getByRole("button", { name: "Finalizar viaje" }).click({ force: true });
  await stopDialog
    .getByRole("button", { name: "Cancelar" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(stopDialog).toHaveCount(0);
  await expect(tripPanel).toBeVisible();

  await tripPanel.getByRole("button", { name: "Finalizar viaje" }).click({ force: true });
  await stopDialog
    .getByRole("button", { name: "Finalizar viaje" })
    .evaluate((button) => (button as HTMLButtonElement).click());
  await expect(tripPanel).toHaveCount(0);
});

test("el modo viaje conserva la ruta durante una pérdida temporal de GPS", async ({ page }) => {
  await page.addInitScript(() => {
    type TestFix = { longitude: number; latitude: number; accuracy: number };
    const watchers = new Map<number, PositionCallback>();
    let nextId = 1;
    const emit = ({ longitude, latitude, accuracy }: TestFix) => {
      const position = {
        coords: {
          longitude,
          latitude,
          accuracy,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition;
      for (const callback of watchers.values()) callback(position);
    };

    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        watchPosition(success: PositionCallback) {
          const id = nextId++;
          watchers.set(id, success);
          window.setTimeout(() => emit({
            longitude: -102.06303,
            latitude: 19.42101,
            accuracy: 12,
          }), 0);
          return id;
        },
        clearWatch(id: number) {
          watchers.delete(id);
        },
      },
    });

    window.addEventListener("urugo:test-geolocation", (event) => {
      emit((event as CustomEvent<TestFix>).detail);
    });
    localStorage.setItem("rutas-uru-onboarded", "1");
  });

  await page.goto("/mapa?b=-102.042340,19.426870");
  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).not.toContainText("Buscando...", { timeout: 10_000 });
  await resultButton.click({ force: true });
  await page.locator('button[aria-label^="Iniciar viaje en"]:visible').click({ force: true });

  const panel = page.getByRole("region", { name: "Modo viaje" });
  await expect(panel).toContainText("EN CAMINO");

  const sendFix = async (detail: { longitude: number; latitude: number; accuracy: number }) => {
    await page.evaluate((fix) => {
      window.dispatchEvent(new CustomEvent("urugo:test-geolocation", { detail: fix }));
    }, detail);
  };

  await sendFix({ longitude: -102.06303, latitude: 19.42101, accuracy: 1_200 });
  await expect(panel).toContainText("GPS NO DISPONIBLE");
  await expect(panel).toContainText("Conservamos tu último avance");

  await sendFix({ longitude: -99.1332, latitude: 19.4326, accuracy: 12 });
  await expect(panel).toContainText("GPS NO DISPONIBLE");

  await sendFix({ longitude: -102.05447, latitude: 19.42623, accuracy: 12 });
  await expect(panel).toContainText("EN CAMINO");
  await expect(panel).toContainText("Ruta 1 - San José");

  await sendFix({ longitude: -102.02, latitude: 19.47, accuracy: 12 });
  await sendFix({ longitude: -102.02, latitude: 19.47, accuracy: 12 });
  await expect(panel).toContainText("EN CAMINO");

  await sendFix({ longitude: -102.02, latitude: 19.47, accuracy: 12 });
  await expect(panel).toContainText("FUERA DEL RECORRIDO");

  await sendFix({ longitude: -102.05447, latitude: 19.42623, accuracy: 12 });
  await expect(panel).toContainText("EN CAMINO");

  await sendFix({ longitude: -102.042104, latitude: 19.426085, accuracy: 12 });
  await expect(panel).toContainText("ÚLTIMO TRAMO");
  await expect(panel).toContainText("Camina a tu destino");

  await sendFix({ longitude: -102.04234, latitude: 19.42687, accuracy: 12 });
  await expect(panel).toContainText("ÚLTIMO TRAMO");
  await sendFix({ longitude: -102.04225, latitude: 19.42687, accuracy: 12 });
  await expect(panel).toContainText("Llegaste");

  await sendFix({ longitude: -102.05447, latitude: 19.42623, accuracy: 12 });
  await expect(panel).toContainText("Llegaste");
  await panel.getByRole("button", { name: "Cerrar viaje completado" }).click({ force: true });
  await expect(panel).toHaveCount(0);
});

test("el modo viaje conserva un recorrido con transbordo", async ({ page, context }) => {
  await context.setGeolocation({ longitude: -102.025, latitude: 19.405 });
  await context.grantPermissions(["geolocation"]);
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa?b=-102.08,19.42");

  const resultButton = page.getByRole("button", { name: "Ver resultado de ruta" });
  await expect(resultButton).toContainText("con transbordo", { timeout: 10_000 });
  await resultButton.click({ force: true });
  const transferOption = page
    .locator('button[aria-label^="Seleccionar transbordo de"]:visible')
    .first();
  const startTripButton = page.locator('button[aria-label="Iniciar viaje con transbordo"]:visible');
  await expect(transferOption.or(startTripButton).first()).toBeVisible();
  if (!(await startTripButton.isVisible())) {
    await transferOption.click({ force: true });
  }

  await expect(startTripButton).toBeVisible();
  const routeAName = (await resultButton.innerText()).split("→")[0].trim();
  await page.evaluate(() => {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>('button[aria-label="Iniciar viaje con transbordo"]'),
    ).find((candidate) => candidate.offsetParent !== null);
    if (!button) throw new Error("No se encontró el botón para iniciar el viaje con transbordo");
    button.click();
  });
  const tripPanel = page.getByRole("region", { name: "Modo viaje" });
  await expect(tripPanel).toBeVisible();
  await expect(tripPanel).toContainText(routeAName!);

  await context.setGeolocation({ longitude: -102.0249, latitude: 19.405 });
  await page.waitForTimeout(1_000);
  await expect(tripPanel).toBeVisible();
});

test("el asistente diferido abre con un solo toque", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("rutas-uru-onboarded", "1"));
  await page.goto("/mapa");

  await page.locator('button[aria-label="Abrir asistente de rutas"]:visible').click();
  await expect(page.getByRole("dialog", { name: "Asistente UruGo" })).toBeVisible();
});

test("el API del chat rechaza cuerpos inválidos antes de llamar al proveedor", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { message: "", history: "no-es-un-arreglo" },
  });

  expect(response.status()).toBe(400);
});

test("el API del chat bloquea solicitudes cross-site y tipos simples", async ({ request }) => {
  const payload = JSON.stringify({ message: "Centro", history: [], location: null });
  const crossSite = await request.post("/api/chat", {
    data: payload,
    headers: {
      "content-type": "text/plain",
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    },
  });
  const simpleContentType = await request.post("/api/chat", {
    data: payload,
    headers: { "content-type": "text/plain" },
  });

  expect(crossSite.status()).toBe(403);
  expect(simpleContentType.status()).toBe(415);
});
