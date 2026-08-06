import { describe, expect, it } from "vitest";
import {
  buildRouteCalculationPerformance,
  getRouteCalculationDurationBucket,
} from "@/lib/route-performance";
import type { RouteCalculationResult } from "@/lib/route-calculation";

const emptyResult: RouteCalculationResult = {
  suggestions: [],
  alternativeRouteIds: [],
  transfers: [],
};

describe("route performance metrics", () => {
  it.each([
    [0, "lt_50"],
    [49, "lt_50"],
    [50, "50_99"],
    [100, "100_249"],
    [250, "250_499"],
    [500, "500_999"],
    [1_000, "gte_1000"],
    [Number.NaN, "unknown"],
  ] as const)("agrupa %s ms en %s", (duration, bucket) => {
    expect(getRouteCalculationDurationBucket(duration)).toBe(bucket);
  });

  it("solo expone datos técnicos agregados", () => {
    const metrics = buildRouteCalculationPerformance(
      {
        ...emptyResult,
        suggestions: [
          {
            routeId: 7,
            ruta: "Ruta privada para la prueba",
            direccion: "ida",
            distanciaA: 20,
            distanciaB: 40,
            indexA: 1,
            indexB: 2,
            segment: [[-102.06, 19.42]],
            rideMinutes: 5,
            expectedWaitMinutes: 4,
            estimatedMinutes: 10,
            score: 10,
          },
        ],
      },
      84,
      "worker",
    );

    expect(metrics).toEqual({
      duration_bucket: "50_99",
      engine: "worker",
      result_type: "direct",
      option_count: 1,
    });
    expect(JSON.stringify(metrics)).not.toContain("Ruta privada");
    expect(JSON.stringify(metrics)).not.toContain("-102.06");
  });

  it("distingue transbordos y limita la cardinalidad", () => {
    const metrics = buildRouteCalculationPerformance(
      {
        ...emptyResult,
        transfers: Array.from({ length: 8 }, (_, index) => ({
          routeAId: index,
          routeBId: index + 1,
          routeAName: "A",
          routeBName: "B",
          routeAStartIndex: 0,
          routeATransferIndex: 1,
          routeBTransferIndex: 0,
          routeBEndIndex: 1,
          transferPoint: [0, 0],
          segmentA: [[0, 0]],
          segmentB: [[0, 0]],
          walkMeters: 10,
          score: 20,
        })),
      },
      1_200,
      "fallback",
    );

    expect(metrics).toMatchObject({
      duration_bucket: "gte_1000",
      engine: "fallback",
      result_type: "transfer",
      option_count: 5,
    });
  });
});
