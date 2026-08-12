import { describe, expect, it } from "vitest";
import { findPlaceSeoItem, getPlaceSeoItems, getRoutesNearPlace } from "@/lib/como-llegar";

// Estos tests usan los datos reales de data/rutas_produccion_final.json:
// protegen contra ediciones de datos que dejarían páginas /como-llegar vacías.
describe("como-llegar (datos reales)", () => {
  it("genera slugs únicos para todos los lugares", () => {
    const items = getPlaceSeoItems();
    const slugs = items.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((s) => /^[a-z0-9-]+$/.test(s))).toBe(true);
  });

  it("encuentra un lugar por slug", () => {
    const centro = findPlaceSeoItem("centro");
    expect(centro?.label).toBe("Centro");
    expect(findPlaceSeoItem("no-existe")).toBeNull();
  });

  it("el Centro tiene rutas que pasan cerca", () => {
    const centro = findPlaceSeoItem("centro");
    expect(centro).not.toBeNull();
    const routes = getRoutesNearPlace(centro!.center);
    expect(routes.length).toBeGreaterThan(0);
    // Ordenadas de más cercana a más lejana y dentro del umbral de caminata.
    for (let i = 1; i < routes.length; i++) {
      expect(routes[i].distanceM).toBeGreaterThanOrEqual(routes[i - 1].distanceM);
    }
    expect(routes.every((r) => r.distanceM <= 500)).toBe(true);
  });

  it("publica una guía del Tec Uruapan asociada a la Ruta 27", () => {
    const tec = getPlaceSeoItems().find((place) => place.label.includes("Tec Uruapan"));
    expect(tec?.slug).toContain("tec-uruapan");
    expect(getRoutesNearPlace(tec!.center).map((route) => route.name)).toContain("Ruta 27");
  });

  it("excluye el Teleférico de las rutas de camión", () => {
    for (const place of getPlaceSeoItems()) {
      const routes = getRoutesNearPlace(place.center);
      expect(routes.some((r) => r.name.toLowerCase().includes("teleférico"))).toBe(false);
    }
  });
});
