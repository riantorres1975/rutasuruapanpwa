import { describe, expect, it } from "vitest";
import {
  calculateTripProgress,
  getTripJourneyKey,
  getTripMilestone,
  type DirectTripJourney,
  type TransferTripJourney,
} from "@/lib/trip-mode";

const direct: DirectTripJourney = {
  kind: "direct",
  routeId: 25,
  routeName: "Ruta 25",
  segment: [
    [-102.08, 19.42],
    [-102.07, 19.42],
    [-102.06, 19.42],
  ],
};

const transfer: TransferTripJourney = {
  kind: "transfer",
  routeAId: 25,
  routeBId: 14,
  routeAName: "Ruta 25",
  routeBName: "Ruta 14",
  routeAStartIndex: 0,
  routeATransferIndex: 2,
  routeBTransferIndex: 0,
  routeBEndIndex: 2,
  segmentA: [
    [-102.08, 19.42],
    [-102.07, 19.42],
    [-102.06, 19.42],
  ],
  segmentB: [
    [-102.0595, 19.42],
    [-102.05, 19.42],
    [-102.04, 19.42],
  ],
  transferPoint: [-102.06, 19.42],
  walkMeters: 55,
};

describe("trip mode", () => {
  it("calcula el avance y el destino de una ruta directa", () => {
    const progress = calculateTripProgress(direct, [-102.07, 19.42]);

    expect(progress.phase).toBe("riding-direct");
    expect(progress.progressRatio).toBeGreaterThan(0.45);
    expect(progress.progressRatio).toBeLessThan(0.55);
    expect(progress.currentRouteName).toBe("Ruta 25");
  });

  it("detecta cuando el usuario se aleja del recorrido directo", () => {
    const progress = calculateTripProgress(direct, [-102.07, 19.43], "riding-direct");

    expect(progress.phase).toBe("off-route");
  });

  it("avanza en orden por los tramos de un transbordo", () => {
    const first = calculateTripProgress(transfer, [-102.07, 19.42]);
    const walking = calculateTripProgress(transfer, [-102.06, 19.42], first.phase);
    const second = calculateTripProgress(transfer, [-102.05, 19.42], walking.phase);

    expect(first.phase).toBe("riding-first");
    expect(walking.phase).toBe("walking-transfer");
    expect(walking.nextRouteName).toBe("Ruta 14");
    expect(second.phase).toBe("riding-second");
    expect(second.progressRatio).toBeGreaterThan(walking.progressRatio);
  });

  it("marca llegada y genera una clave estable para la sesión", () => {
    const progress = calculateTripProgress(transfer, [-102.04, 19.42], "riding-second");

    expect(progress.phase).toBe("arrived");
    expect(getTripMilestone(progress)).toBe("arrived");
    expect(getTripJourneyKey(direct, [-102.06, 19.42])).toBe(
      "direct:25:-102.060000,19.420000",
    );
  });

  it("avisa al acercarse al transbordo y al destino", () => {
    const nearTransfer = calculateTripProgress(transfer, [-102.063, 19.42], "riding-first");
    const nearDestination = calculateTripProgress(direct, [-102.063, 19.42], "riding-direct");

    expect(getTripMilestone(nearTransfer)).toBe("transfer-near");
    expect(getTripMilestone(nearDestination)).toBe("destination-near");
  });
});
