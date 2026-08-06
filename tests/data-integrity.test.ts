import { describe, expect, it } from "vitest";
import routes from "@/data/rutas_produccion_final.json";
import { haversineMeters } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

type RouteRecord = {
  id: number;
  name: string;
  original_name: string;
  path: Coordinates[];
};

const routeData = routes as unknown as RouteRecord[];

describe("integridad de rutas de producción", () => {
  it("mantiene IDs y nombres de dirección únicos", () => {
    expect(new Set(routeData.map((route) => route.id)).size).toBe(routeData.length);
    expect(new Set(routeData.map((route) => route.original_name)).size).toBe(routeData.length);
  });

  it("solo contiene coordenadas válidas dentro de la región", () => {
    for (const route of routeData) {
      expect(route.path.length, route.original_name).toBeGreaterThan(1);
      for (const [lng, lat] of route.path) {
        expect(Number.isFinite(lng) && Number.isFinite(lat), route.original_name).toBe(true);
        expect(lng).toBeGreaterThanOrEqual(-102.2);
        expect(lng).toBeLessThanOrEqual(-101.9);
        expect(lat).toBeGreaterThanOrEqual(19.3);
        expect(lat).toBeLessThanOrEqual(19.55);
      }
    }
  });

  it("detecta saltos sospechosos entre puntos consecutivos", () => {
    for (const route of routeData.filter((item) => item.name !== "Teleférico Uruapan")) {
      for (let index = 1; index < route.path.length; index += 1) {
        const gap = haversineMeters(route.path[index - 1], route.path[index]);
        expect(gap, `${route.original_name}, segmento ${index}`).toBeLessThan(4_000);
      }
    }
  });

  it("incluye ida y vuelta para cada ruta de camión", () => {
    const directionCount = new Map<string, number>();
    for (const route of routeData) {
      directionCount.set(route.name, (directionCount.get(route.name) ?? 0) + 1);
    }

    for (const [name, count] of directionCount) {
      expect(count, name).toBe(name === "Teleférico Uruapan" ? 1 : 2);
    }
  });
});
