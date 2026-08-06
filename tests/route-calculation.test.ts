import { describe, expect, it } from "vitest";
import { calculateRouteOptions } from "@/lib/route-calculation";
import type { PolylineRoute } from "@/lib/routeMatcher";

const directRoute: PolylineRoute = {
  id: 1,
  name: "Ruta Directa",
  color: "#22c55e",
  corridor_width_m: 200,
  direccion: "ida",
  path: [
    [-102.08, 19.4],
    [-102.07, 19.4],
    [-102.06, 19.41],
  ],
};

describe("calculateRouteOptions", () => {
  it("prioriza una ruta directa sin calcular transbordos", () => {
    const result = calculateRouteOptions(
      [directRoute],
      [-102.078, 19.4],
      [-102.062, 19.408],
    );

    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0]).toMatchObject({ routeId: 1, ruta: "Ruta Directa" });
    expect(result.transfers).toEqual([]);
  });

  it("calcula transbordos cuando no existe una ruta directa", () => {
    const routeA: PolylineRoute = {
      id: 10,
      name: "Ruta A",
      color: "#60a5fa",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0, 0],
        [0.035, 0],
        [0.035, 0.025],
      ],
    };
    const routeB: PolylineRoute = {
      id: 20,
      name: "Ruta B",
      color: "#34d399",
      corridor_width_m: 550,
      direccion: "ida",
      path: [
        [0.035, 0.025],
        [0.045, 0.025],
        [0.03, 0.01],
      ],
    };

    const result = calculateRouteOptions([routeA, routeB], [0, 0], [0.03, 0.01]);

    expect(result.suggestions).toEqual([]);
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toMatchObject({ routeAId: 10, routeBId: 20 });
  });
});
