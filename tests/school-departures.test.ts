import { describe, expect, it } from "vitest";
import {
  formatSchoolDepartureTime,
  SCHOOL_DEPARTURE_COUNT,
  SCHOOL_DEPARTURE_GROUPS,
} from "@/lib/school-departures";

const departures = SCHOOL_DEPARTURE_GROUPS.flatMap((group) => group.departures);

describe("salidas escolares comunitarias", () => {
  it("publica las referencias de la tabla y la extensión histórica de Ruta 26", () => {
    expect(SCHOOL_DEPARTURE_COUNT).toBe(13);
    expect(departures.some((departure) => departure.regularRoute?.name === "Ruta 26")).toBe(true);
  });

  it("mantiene todas las salidas como solo ida y sin certificación oficial", () => {
    for (const departure of departures) {
      expect(departure.direction).toBe("outbound-only");
      expect(departure.status).toBe("community-report");
    }
  });

  it("usa horarios válidos de 24 horas y no modela regresos", () => {
    for (const departure of departures) {
      expect(departure).not.toHaveProperty("returnTimes");
      for (const time of departure.departures) {
        expect(time).toMatch(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
      }
    }
  });

  it("formatea las horas para lectura cotidiana", () => {
    expect(formatSchoolDepartureTime("05:50")).toBe("5:50 AM");
    expect(formatSchoolDepartureTime("12:30")).toBe("12:30 PM");
  });
});
