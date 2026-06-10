import { describe, expect, it } from "vitest";
import { getSchedule, getScheduleStatus } from "@/lib/schedules";

describe("getSchedule", () => {
  it("resuelve el nombre base de una ruta con sufijo de destino", () => {
    const schedule = getSchedule("Ruta 1 - San José");
    expect(schedule).not.toBeNull();
    expect(schedule?.first).toBe("05:30");
    expect(schedule?.last).toBe("22:30");
  });

  it("no confunde Ruta 1 con Ruta 1A", () => {
    expect(getSchedule("Ruta 1A")?.first).toBe("05:30");
    expect(getSchedule("Ruta 1")).not.toBeNull();
  });

  it("devuelve null para rutas desconocidas", () => {
    expect(getSchedule("Ruta 999")).toBeNull();
  });

  it("el Teleférico es servicio continuo", () => {
    expect(getSchedule("Teleférico Uruapan")?.continuous).toBe(true);
  });
});

describe("getScheduleStatus", () => {
  const schedule = { first: "05:30", last: "22:30", freqMin: 8, freqMax: 12 };
  const at = (h: number, m: number) => new Date(2026, 5, 10, h, m);

  it("en horario de servicio devuelve operating con próximo camión", () => {
    const status = getScheduleStatus(schedule, at(12, 0));
    expect(status.kind).toBe("operating");
    if (status.kind === "operating") {
      expect(status.nextMin).toBeGreaterThan(0);
      expect(status.nextMin).toBeLessThanOrEqual(10); // promedio de 8–12
      expect(status.freqLabel).toBe("cada 8–12 min");
    }
  });

  it("antes del primer camión devuelve off", () => {
    expect(getScheduleStatus(schedule, at(4, 0)).kind).toBe("off");
  });

  it("después del último camión devuelve off", () => {
    expect(getScheduleStatus(schedule, at(23, 0)).kind).toBe("off");
  });

  it("en los últimos 20 minutos devuelve last-service", () => {
    const status = getScheduleStatus(schedule, at(22, 20));
    expect(status.kind).toBe("last-service");
    if (status.kind === "last-service") {
      expect(status.minutesLeft).toBe(10);
    }
  });

  it("servicio continuo siempre devuelve continuous dentro de horario", () => {
    const continuous = { first: "05:00", last: "23:00", freqMin: 0, freqMax: 0, continuous: true };
    expect(getScheduleStatus(continuous, at(12, 0)).kind).toBe("continuous");
  });
});
