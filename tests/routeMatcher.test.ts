import { describe, expect, it } from "vitest";
import {
  findBestRoutes,
  getRankedRoutes,
  getRouteLength,
  getRouteMetrics,
  isPointWithinRouteBounds,
  type PolylineRoute,
} from "@/lib/routeMatcher";
import type { Coordinates } from "@/lib/types";

// Ruta sintética recta de oeste a este sobre la latitud 19.42 (≈2.1 km).
function straightRoute(id: number, name: string, lat = 19.42): PolylineRoute {
  const path: Coordinates[] = [];
  for (let lng = -102.06; lng <= -102.0399; lng += 0.002) {
    path.push([Number(lng.toFixed(4)), lat]);
  }
  return { id, name, color: "#64D2FF", corridor_width_m: 550, path, direccion: "ida" };
}

describe("findBestRoutes", () => {
  const route = straightRoute(1, "Ruta Test");
  // Origen cerca del inicio, destino cerca del final (a ~100 m de la línea).
  const origin: Coordinates = [-102.059, 19.4209];
  const destination: Coordinates = [-102.041, 19.4209];

  it("encuentra una ruta que cubre el viaje A→B", () => {
    const matches = findBestRoutes(origin, destination, [route]);
    expect(matches).toHaveLength(1);
    expect(matches[0].routeName).toBe("Ruta Test");
    expect(matches[0].originDistM).toBeLessThan(550);
    expect(matches[0].destDistM).toBeLessThan(550);
    expect(matches[0].segment.length).toBeGreaterThan(2);
  });

  it("rechaza el viaje en sentido contrario a la ruta", () => {
    const matches = findBestRoutes(destination, origin, [route]);
    expect(matches).toHaveLength(0);
  });

  it("rechaza orígenes fuera del corredor de la ruta", () => {
    const farOrigin: Coordinates = [-102.059, 19.5]; // ~9 km al norte
    expect(findBestRoutes(farOrigin, destination, [route])).toHaveLength(0);
  });

  it("prefiere la ruta con menos caminata", () => {
    const nearRoute = straightRoute(1, "Ruta Cercana", 19.42);
    const farRoute = straightRoute(2, "Ruta Lejana", 19.4235); // ~390 m al norte
    const matches = findBestRoutes(origin, destination, [farRoute, nearRoute]);
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(matches[0].routeName).toBe("Ruta Cercana");
  });

  it("devuelve máximo 3 opciones ordenadas por score", () => {
    const routes = [19.42, 19.4215, 19.423, 19.4245].map((lat, i) =>
      straightRoute(i + 1, `Ruta ${i + 1}`, lat)
    );
    const matches = findBestRoutes(origin, destination, routes);
    expect(matches.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i].score).toBeGreaterThanOrEqual(matches[i - 1].score);
    }
  });

  it("conserva una sola dirección por ruta lógica aunque los IDs sean distintos", () => {
    const ida = straightRoute(101, "Ruta Doble");
    const vuelta = { ...straightRoute(202, "Ruta Doble"), direccion: "vuelta" as const };
    const matches = findBestRoutes(origin, destination, [ida, vuelta]);

    expect(matches).toHaveLength(1);
    expect(matches[0].estimatedMinutes).toBeGreaterThan(matches[0].rideMinutes);
  });
});

describe("getRouteMetrics", () => {
  it("reutiliza las longitudes acumuladas de la misma polilínea", () => {
    const path = straightRoute(1, "Ruta Métricas").path;
    const first = getRouteMetrics(path);
    const second = getRouteMetrics(path);

    expect(second).toBe(first);
    expect(first.cumulativeLengthsM).toHaveLength(path.length);
    expect(first.segmentLengthsM).toHaveLength(path.length - 1);
    expect(first.totalLengthM).toBeCloseTo(getRouteLength(path), 8);
    expect(first.bounds).toEqual({
      minLng: -102.06,
      minLat: 19.42,
      maxLng: -102.04,
      maxLat: 19.42,
    });
  });

  it("descarta puntos fuera del corredor antes de recorrer segmentos", () => {
    const metrics = getRouteMetrics(straightRoute(1, "Ruta Límites").path);

    expect(isPointWithinRouteBounds([-102.05, 19.4209], metrics, 120)).toBe(true);
    expect(isPointWithinRouteBounds([-102.05, 19.4209], metrics, 50)).toBe(false);
    expect(isPointWithinRouteBounds([-101.9, 19.6], metrics, 550)).toBe(false);
  });
});

describe("getRankedRoutes", () => {
  it("devuelve null sin coincidencias", () => {
    expect(getRankedRoutes([])).toBeNull();
  });

  it("separa la mejor opción de las alternativas", () => {
    const route = straightRoute(1, "Ruta Test");
    const matches = findBestRoutes([-102.059, 19.4209], [-102.041, 19.4209], [route]);
    const ranked = getRankedRoutes(matches);
    expect(ranked?.best.routeName).toBe("Ruta Test");
    expect(ranked?.alternatives).toHaveLength(0);
  });
});
