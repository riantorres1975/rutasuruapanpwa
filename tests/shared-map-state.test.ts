import { describe, expect, it } from "vitest";
import {
  buildMapShareUrl,
  getSharedTransferIdentity,
  parseInitialMapUrl,
  parseSharedMapState,
} from "@/lib/shared-map-state";

describe("shared map state", () => {
  it("descarta coordenadas y números fuera de rango", () => {
    expect(parseSharedMapState("?a=999,19&b=-102,999&rid=-1")).toBeNull();
  });

  it("limita el destino textual y conserva cerca", () => {
    const parsed = parseInitialMapUrl(`?destino=${"x".repeat(120)}&cerca=1`);
    expect(parsed.destinationParam).toHaveLength(80);
    expect(parsed.wantsNearby).toBe(true);
  });

  it("reconstruye una ruta directa compartida", () => {
    const url = buildMapShareUrl("https://urugo.app/otra", "vuelta", {
      routeId: 7,
      routeName: "Ruta 7",
      origin: [-102.0612345, 19.4212345],
      destination: [-102.0312345, 19.4012345],
      segmentStartIndex: 8,
      segmentEndIndex: 2,
    });
    const parsed = parseSharedMapState(new URL(url).search);

    expect(parsed).toMatchObject({
      direction: "vuelta",
      routeId: 7,
      routeName: "Ruta 7",
      origin: [-102.061234, 19.421235],
      destination: [-102.031234, 19.401235],
      segmentStartIndex: 8,
      segmentEndIndex: 2,
    });
  });

  it("reconstruye la identidad completa de un transbordo", () => {
    const url = buildMapShareUrl("https://urugo.app", "ida", {
      transfer: {
        routeAId: 3,
        routeBId: 14,
        routeAName: "Ruta 3",
        routeBName: "Ruta 14",
        routeAStartIndex: 1,
        routeATransferIndex: 20,
        routeBTransferIndex: 4,
        routeBEndIndex: 30,
        transferPoint: [-102.05, 19.4],
        segmentA: [],
        segmentB: [],
        walkMeters: 80,
        score: 10,
      },
    });
    const parsed = parseSharedMapState(new URL(url).search);

    expect(parsed && getSharedTransferIdentity(parsed)).toEqual({
      routeAId: 3,
      routeBId: 14,
      routeAStartIndex: 1,
      routeATransferIndex: 20,
      routeBTransferIndex: 4,
      routeBEndIndex: 30,
    });
  });
});
