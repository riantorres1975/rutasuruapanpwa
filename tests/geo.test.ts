import { describe, expect, it } from "vitest";
import { haversineMeters } from "@/lib/geo";

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
