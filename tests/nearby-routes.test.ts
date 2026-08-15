import { describe, expect, it } from "vitest";
import { findNearbyRouteIds, type NearbyRoutePath } from "@/lib/nearby-routes";
import routesData from "@/data/rutas_produccion_final.json";

function route(id: number, name: string, path: NearbyRoutePath["path"]): NearbyRoutePath {
  return { id, name, path };
}

describe("findNearbyRouteIds", () => {
  it("encuentra rutas reales alrededor del Centro de Uruapan", () => {
    const routes = routesData as unknown as NearbyRoutePath[];

    expect(findNearbyRouteIds(routes, [-102.06303, 19.42101])).not.toHaveLength(0);
  });

  it("mide contra el tramo completo y no solo sus vertices", () => {
    const routes = [route(1, "Ruta 1", [[-102.07, 19.42], [-102.05, 19.42]])];

    expect(findNearbyRouteIds(routes, [-102.06, 19.4205], 100)).toEqual([1]);
  });

  it("combina ambos sentidos usando el id canonico de la ruta", () => {
    const routes = [
      route(10, "Ruta 5", [[-102.09, 19.46], [-102.08, 19.46]]),
      route(11, "Ruta 5", [[-102.061, 19.42], [-102.06, 19.42]]),
    ];

    expect(findNearbyRouteIds(routes, [-102.0605, 19.4202], 100)).toEqual([10]);
  });

  it("en el Teleferico solo considera estaciones y no el cable", () => {
    const routes = [
      route(81, "Teleférico Uruapan", [[-102.07, 19.42], [-102.05, 19.42]]),
    ];

    expect(findNearbyRouteIds(routes, [-102.06, 19.42], 400)).toEqual([]);
    expect(findNearbyRouteIds(routes, [-102.0699, 19.42], 100)).toEqual([81]);
  });
});
