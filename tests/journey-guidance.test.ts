import { describe, expect, it } from "vitest";
import {
  getJourneyFareSummary,
  getTelefericoStationName,
  isTelefericoRouteName,
} from "@/lib/journey-guidance";

describe("journey guidance", () => {
  it("identifica el Teleférico y sus estaciones", () => {
    expect(isTelefericoRouteName("Teleférico Uruapan")).toBe(true);
    expect(isTelefericoRouteName("Ruta 1")).toBe(false);
    expect(getTelefericoStationName(0)).toBe("Hospital Regional");
    expect(getTelefericoStationName(5)).toBe("Mercado Poniente");
    expect(getTelefericoStationName(6)).toBeNull();
  });

  it("indica tarjeta para un viaje directo en Teleférico", () => {
    const fare = getJourneyFareSummary(["Teleférico Uruapan"]);

    expect(fare).toMatchObject({ totalMxn: 12, badge: "$12 tarjeta" });
    expect(fare.detail).toContain("no acepta efectivo");
  });

  it("indica efectivo para un viaje directo en camión", () => {
    expect(getJourneyFareSummary(["Ruta 1"])).toMatchObject({
      totalMxn: 12,
      badge: "$12 efectivo",
    });
  });

  it("explica por separado el pago de un viaje mixto", () => {
    const fare = getJourneyFareSummary(["Ruta 1", "Teleférico Uruapan"]);

    expect(fare).toMatchObject({
      totalMxn: 24,
      badge: "$24 total (camión + Teleférico)",
    });
    expect(fare.detail).toContain("efectivo en el camión");
    expect(fare.detail).toContain("tarjeta de movilidad en el Teleférico");
  });
});
