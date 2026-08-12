import { describe, expect, it } from "vitest";
import { findNearestLandmark, findUpcomingLandmark } from "@/lib/landmark-guidance";
import type { Coordinates, ProductionRouteLandmark } from "@/lib/types";

const path: Coordinates[] = [
  [-102.08, 19.42],
  [-102.07, 19.42],
  [-102.06, 19.42],
];
const landmarks: ProductionRouteLandmark[] = [
  { name: "Mercado", point: [-102.075, 19.4201] },
  { name: "Hospital", point: [-102.065, 19.4201] },
];

describe("landmark guidance", () => {
  it("elige la siguiente referencia en el sentido del recorrido", () => {
    const cue = findUpcomingLandmark([-102.072, 19.42], path, landmarks);
    expect(cue?.name).toBe("Hospital");
    expect(cue?.distanceM).toBeGreaterThan(600);
  });

  it("nombra el punto cercano para orientar un transbordo", () => {
    const cue = findNearestLandmark([-102.0651, 19.42], [landmarks], 100);
    expect(cue?.name).toBe("Hospital");
  });
});
