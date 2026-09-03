import { describe, expect, it } from "vitest";
import { getPublicRouteSignalStatus } from "@/lib/community-route-status";

const now = new Date("2026-09-03T12:00:00.000Z");

describe("public community route status", () => {
  it("muestra actividad cuando la última señal aceptada confirma circulación", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "changed", observed_at: "2026-08-20T12:00:00.000Z" },
      { confirmation_type: "seen_today", observed_at: "2026-09-02T12:00:00.000Z" },
    ], now)).toEqual({
      state: "recently_seen",
      observedAt: "2026-09-02T12:00:00.000Z",
    });
  });

  it("prioriza una alerta aceptada que sea posterior a la última vista", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-08-20T12:00:00.000Z" },
      { confirmation_type: "not_running", observed_at: "2026-09-01T12:00:00.000Z" },
    ], now).state).toBe("review_suggested");
  });

  it("no presenta señales vencidas ni fechas inválidas", () => {
    expect(getPublicRouteSignalStatus([
      { confirmation_type: "seen_today", observed_at: "2026-06-01T12:00:00.000Z" },
      { confirmation_type: "changed", observed_at: "fecha-invalida" },
    ], now)).toEqual({ state: "no_recent_data", observedAt: null });
  });
});
