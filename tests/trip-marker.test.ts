import { describe, expect, it } from "vitest";
import {
  calculateBearing,
  getTripMarkerAnimationDuration,
  getTripMarkerPresentation,
  getTripMarkerTarget,
  interpolateBearing,
} from "@/lib/trip-marker";
import type { DirectTripJourney, TransferTripJourney, TripProgress } from "@/lib/trip-mode";

const directJourney: DirectTripJourney = {
  kind: "direct",
  routeId: 27,
  routeName: "Ruta 27",
  segment: [[-102.08, 19.42], [-102.07, 19.42]],
  destination: [-102.07, 19.42],
};

const ridingProgress: TripProgress = {
  phase: "riding-direct",
  progressRatio: 0.5,
  remainingMinutes: 5,
  distanceToMilestoneM: 1_500,
  currentRouteName: "Ruta 27",
  nextRouteName: null,
};

describe("trip marker", () => {
  it("elige camión para una ruta urbana y peatón al caminar", () => {
    expect(getTripMarkerPresentation(directJourney, ridingProgress).mode).toBe("bus");
    expect(getTripMarkerPresentation(directJourney, {
      ...ridingProgress,
      phase: "walking-destination",
      currentRouteName: null,
    }).mode).toBe("walking");
  });

  it("elige cabina en el tramo del Teleférico durante un transbordo", () => {
    const transfer: TransferTripJourney = {
      kind: "transfer",
      routeAId: 27,
      routeBId: 41,
      routeAName: "Ruta 27",
      routeBName: "Teleférico Uruapan",
      routeAStartIndex: 0,
      routeATransferIndex: 1,
      routeBTransferIndex: 0,
      routeBEndIndex: 1,
      segmentA: directJourney.segment,
      segmentB: [[-102.07, 19.42], [-102.06, 19.43]],
      transferPoint: [-102.07, 19.42],
      walkMeters: 40,
      destination: [-102.06, 19.43],
    };

    expect(getTripMarkerPresentation(transfer, {
      ...ridingProgress,
      phase: "riding-second",
      currentRouteName: transfer.routeBName,
    }).mode).toBe("teleferico");
  });

  it("ajusta una lectura cercana al trazo y conserva una desviación grande", () => {
    const path: [number, number][] = [[-102.08, 19.42], [-102.07, 19.42]];
    const nearby = getTripMarkerTarget([-102.075, 19.4202], path);
    const far = getTripMarkerTarget([-102.075, 19.425], path);

    expect(nearby.snapped).toBe(true);
    expect(nearby.coordinate[1]).toBeCloseTo(19.42, 5);
    expect(nearby.bearing).toBeCloseTo(90, 1);
    expect(far.snapped).toBe(false);
    expect(far.coordinate).toEqual([-102.075, 19.425]);
  });

  it("interpola el rumbo por el giro más corto", () => {
    expect(calculateBearing([-102.08, 19.42], [-102.07, 19.42])).toBeCloseTo(90, 1);
    expect(interpolateBearing(350, 10, 0.5)).toBeCloseTo(0, 5);
  });

  it("limita la duración y respeta movimiento reducido", () => {
    expect(getTripMarkerAnimationDuration(0, false)).toBe(550);
    expect(getTripMarkerAnimationDuration(500, false)).toBe(1_400);
    expect(getTripMarkerAnimationDuration(50, true)).toBe(0);
  });
});
