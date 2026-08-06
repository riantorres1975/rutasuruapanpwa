import { describe, expect, it } from "vitest";
import routes from "@/data/rutas_produccion_final.json";
import { haversineMeters, isWithinUruapanServiceArea } from "@/lib/geo";
import type { Coordinates, ProductionRoute } from "@/lib/types";

const routeData = routes as unknown as ProductionRoute[];
const TELEFERICO_NAME = "Teleférico Uruapan";
const ROUTE_KEYS = ["color", "corridor_width_m", "id", "landmarks", "name", "original_name", "path", "verified"];

function routeLength(path: Coordinates[]): number {
  return path.slice(1).reduce(
    (total, point, index) => total + haversineMeters(path[index], point),
    0,
  );
}

describe("integridad de rutas de producción", () => {
  it("mantiene IDs y nombres de dirección únicos", () => {
    expect(new Set(routeData.map((route) => route.id)).size).toBe(routeData.length);
    expect(new Set(routeData.map((route) => route.original_name)).size).toBe(routeData.length);
  });

  it("cumple el esquema y los metadatos de producción", () => {
    for (const route of routeData) {
      expect(Object.keys(route).sort(), route.original_name).toEqual(ROUTE_KEYS);
      expect(Number.isInteger(route.id) && route.id > 0, route.original_name).toBe(true);
      expect(route.name.trim().length, route.original_name).toBeGreaterThan(0);
      expect(route.original_name.trim().length, route.original_name).toBeGreaterThan(0);
      expect(route.color, route.original_name).toMatch(/^#[0-9A-F]{6}$/);
      expect(route.corridor_width_m, route.original_name).toBeGreaterThanOrEqual(100);
      expect(route.corridor_width_m, route.original_name).toBeLessThanOrEqual(1_000);
      expect(route.verified, route.original_name).toBe(true);
    }
  });

  it("solo contiene trayectos válidos dentro del área de servicio", () => {
    for (const route of routeData) {
      expect(route.path.length, route.original_name).toBeGreaterThan(1);
      expect(routeLength(route.path), route.original_name).toBeGreaterThan(1_000);
      expect(routeLength(route.path), route.original_name).toBeLessThan(30_000);

      for (const point of route.path) {
        const [lng, lat] = point;
        expect(Number.isFinite(lng) && Number.isFinite(lat), route.original_name).toBe(true);
        expect(isWithinUruapanServiceArea(point), route.original_name).toBe(true);
      }
    }
  });

  it("detecta duplicados y saltos sospechosos entre puntos consecutivos", () => {
    for (const route of routeData) {
      for (let index = 1; index < route.path.length; index += 1) {
        const gap = haversineMeters(route.path[index - 1], route.path[index]);
        expect(gap, `${route.original_name}, segmento ${index}`).toBeGreaterThan(1);
        expect(gap, `${route.original_name}, segmento ${index}`).toBeLessThan(4_000);
      }
    }
  });

  it("incluye exactamente ida y vuelta con metadatos consistentes", () => {
    const routesByName = new Map<string, ProductionRoute[]>();
    for (const route of routeData) {
      routesByName.set(route.name, [...(routesByName.get(route.name) ?? []), route]);
    }

    for (const [name, directions] of routesByName) {
      if (name === TELEFERICO_NAME) {
        expect(directions.map((route) => route.original_name)).toEqual([
          `${TELEFERICO_NAME} (Servicio continuo)`,
        ]);
        continue;
      }

      expect(directions.map((route) => route.original_name).sort(), name).toEqual([
        `${name} (Ida)`,
        `${name} (Vuelta)`,
      ]);
      expect(new Set(directions.map((route) => route.color)).size, name).toBe(1);
      expect(new Set(directions.map((route) => route.corridor_width_m)).size, name).toBe(1);
    }
  });

  it("mantiene puntos de interés válidos y cercanos al recorrido", () => {
    for (const route of routeData) {
      const names = new Set<string>();
      for (const landmark of route.landmarks) {
        expect(Object.keys(landmark).sort(), `${route.original_name}: ${landmark.name}`).toEqual([
          "name",
          "point",
        ]);
        expect(landmark.name.trim().length, route.original_name).toBeGreaterThan(0);
        expect(names.has(landmark.name), `${route.original_name}: ${landmark.name}`).toBe(false);
        expect(isWithinUruapanServiceArea(landmark.point), landmark.name).toBe(true);

        const nearestPoint = Math.min(
          ...route.path.map((point) => haversineMeters(landmark.point, point)),
        );
        expect(nearestPoint, `${route.original_name}: ${landmark.name}`).toBeLessThanOrEqual(
          route.corridor_width_m,
        );
        names.add(landmark.name);
      }
    }
  });
});
