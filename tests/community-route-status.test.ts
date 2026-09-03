import { describe, expect, it } from "vitest";
import { getPublicRouteSignalStatus } from "@/lib/community-route-status";

const now = new Date("2026-09-03T12:00:00.000Z");

describe("public community route status", () => {
  it("muestra actividad cuando dos colaboradores aceptados confirman circulación", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-09-01T12:00:00.000Z", submitted_by_hash: "persona-a" },
      { confirmation_type: "seen_today", observed_at: "2026-09-02T12:00:00.000Z", submitted_by_hash: "persona-b" },
    ], now)).toEqual({
      state: "recently_seen",
      observedAt: "2026-09-02T12:00:00.000Z",
      supportCount: 2,
      requiredCount: 2,
      evidenceType: "circulating",
    });
  });

  it("mantiene una sola aportación como verificación en curso", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "not_running", observed_at: "2026-09-01T12:00:00.000Z", submitted_by_hash: "persona-a" },
    ], now)).toMatchObject({
      state: "collecting_evidence",
      supportCount: 1,
      requiredCount: 2,
      evidenceType: "concern",
    });
  });

  it("prioriza el consenso más reciente cuando hay señales opuestas", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-08-20T12:00:00.000Z", submitted_by_hash: "persona-a" },
      { confirmation_type: "seen_today", observed_at: "2026-08-21T12:00:00.000Z", submitted_by_hash: "persona-b" },
      { confirmation_type: "not_running", observed_at: "2026-09-01T12:00:00.000Z", submitted_by_hash: "persona-c" },
      { confirmation_type: "changed", observed_at: "2026-09-02T12:00:00.000Z", submitted_by_hash: "persona-d" },
    ], now).state).toBe("review_suggested");
  });

  it("sólo cuenta la señal más reciente de cada colaborador", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-09-01T12:00:00.000Z", submitted_by_hash: "persona-a" },
      { confirmation_type: "seen_today", observed_at: "2026-09-02T12:00:00.000Z", submitted_by_hash: "persona-a" },
    ], now).state).toBe("collecting_evidence");
  });

  it("no presenta señales vencidas ni fechas inválidas", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-06-01T12:00:00.000Z", submitted_by_hash: "persona-a" },
      { confirmation_type: "changed", observed_at: "fecha-invalida", submitted_by_hash: "persona-b" },
    ], now)).toEqual({
      state: "no_recent_data",
      observedAt: null,
      supportCount: 0,
      requiredCount: 2,
      evidenceType: null,
    });
  });
});
