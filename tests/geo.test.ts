import { describe, expect, it } from "vitest";
import {
  haversineMeters,
  isAccurateEnoughForAutomaticOrigin,
  isWithinUruapanServiceArea,
} from "@/lib/geo";

describe("haversineMeters", () => {
  it("devuelve 0 para el mismo punto", () => {
    expect(haversineMeters([-102.06, 19.42], [-102.06, 19.42])).toBe(0);
  });

  it("un grado de latitud mide ~111 km", () => {
    const d = haversineMeters([-102.06, 19], [-102.06, 20]);
    expect(d).toBeGreaterThan(110_500);
    expect(d).toBeLessThan(111_700);
  });

  it("es simétrica", () => {
    const a: [number, number] = [-102.06303, 19.42101]; // Centro
    const b: [number, number] = [-102.02093, 19.3963]; // Hospital Regional
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it("Centro → Hospital Regional mide unos 5 km", () => {
    const d = haversineMeters([-102.06303, 19.42101], [-102.02093, 19.3963]);
    expect(d).toBeGreaterThan(4_000);
    expect(d).toBeLessThan(6_500);
  });
});

describe("isWithinUruapanServiceArea", () => {
  it("acepta puntos dentro de Uruapan y sus rutas urbanas", () => {
    expect(isWithinUruapanServiceArea([-102.06303, 19.42101])).toBe(true);
    expect(isWithinUruapanServiceArea([-102.00335, 19.47469])).toBe(true);
  });

  it("rechaza ubicaciones en otras ciudades", () => {
    expect(isWithinUruapanServiceArea([-101.19498, 19.706])).toBe(false); // Morelia
    expect(isWithinUruapanServiceArea([-99.1332, 19.4326])).toBe(false); // Ciudad de Mexico
  });
});

describe("isAccurateEnoughForAutomaticOrigin", () => {
  it("acepta precisión urbana y rechaza lecturas demasiado amplias", () => {
    expect(isAccurateEnoughForAutomaticOrigin(35)).toBe(true);
    expect(isAccurateEnoughForAutomaticOrigin(251)).toBe(false);
    expect(isAccurateEnoughForAutomaticOrigin(Number.NaN)).toBe(false);
  });
});
