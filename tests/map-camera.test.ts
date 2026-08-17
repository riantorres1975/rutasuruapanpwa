import { describe, expect, it } from "vitest";
import { getInitialMapBounds } from "@/lib/map";
import type { RouteData } from "@/lib/types";

const routes: RouteData[] = [{
  id: 1,
  nombre: "Ruta extensa",
  color: "#2563eb",
  coordenadas: [
    [-102.12, 19.35],
    [-102.01, 19.47],
  ],
}];

describe("initial map camera", () => {
  it("prioriza origen y destino disponibles antes de que cargue el mapa", () => {
    const origin: [number, number] = [-102.06303, 19.42101];
    const destination: [number, number] = [-102.058, 19.425];

    expect(getInitialMapBounds({
      destination,
      hasSelectedJourney: false,
      origin,
      routes,
    })).toEqual({
      bounds: [origin, destination],
      target: "journey",
    });
  });

  it("mantiene el encuadre general cuando todavía no hay viaje", () => {
    expect(getInitialMapBounds({
      destination: null,
      hasSelectedJourney: false,
      origin: [-102.06303, 19.42101],
      routes,
    })).toEqual({
      bounds: [[-102.12, 19.35], [-102.01, 19.47]],
      target: "routes",
    });
  });
});
