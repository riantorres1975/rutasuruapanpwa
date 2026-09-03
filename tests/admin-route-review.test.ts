import { describe, expect, it } from "vitest";
import { summarizeAdminRouteReview, type AdminRouteSignal } from "@/lib/admin-route-review";

const route = {
  verified: true,
  operational_status: "active" as const,
  last_verified_at: "2026-08-01T12:00:00.000Z",
};
const now = new Date("2026-09-03T12:00:00.000Z");

function signal(overrides: Partial<AdminRouteSignal>): AdminRouteSignal {
  return {
    confirmation_type: "seen_today",
    status: "accepted",
    observed_at: "2026-09-01T12:00:00.000Z",
    submitted_by_hash: "persona-a",
    ...overrides,
  };
}

describe("prioridad de revisión de rutas", () => {
  it("cuenta sólo la señal aceptada más reciente de cada colaborador", () => {
    const summary = summarizeAdminRouteReview(route, [
      signal({ confirmation_type: "changed", observed_at: "2026-08-20T12:00:00.000Z" }),
      signal({ confirmation_type: "seen_today", observed_at: "2026-09-01T12:00:00.000Z" }),
    ], now);

    expect(summary).toMatchObject({ acceptedSeen: 1, acceptedConcern: 0, needsAttention: false });
  });

  it("prioriza alertas aceptadas posteriores a la última verificación", () => {
    const summary = summarizeAdminRouteReview(route, [
      signal({ confirmation_type: "not_running", submitted_by_hash: "persona-a" }),
      signal({ confirmation_type: "changed", submitted_by_hash: "persona-b" }),
    ], now);

    expect(summary).toMatchObject({ acceptedConcern: 2, needsAttention: true, priority: 3 });
  });

  it("deja de señalar una alerta resuelta por una verificación posterior", () => {
    const summary = summarizeAdminRouteReview(route, [
      signal({ confirmation_type: "changed", observed_at: "2026-07-20T12:00:00.000Z" }),
    ], now);

    expect(summary).toMatchObject({ acceptedConcern: 0, needsAttention: false, priority: 0 });
  });

  it("mantiene visibles las contribuciones pendientes de moderación", () => {
    const summary = summarizeAdminRouteReview(route, [signal({ status: "pending" })], now);
    expect(summary).toMatchObject({ pending: 1, needsAttention: true, priority: 2 });
  });

  it("marca verificaciones con más de seis meses", () => {
    const summary = summarizeAdminRouteReview({
      ...route,
      last_verified_at: "2026-01-01T12:00:00.000Z",
    }, [], now);

    expect(summary).toMatchObject({ staleVerification: true, needsAttention: true, priority: 1 });
  });
});
