import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  cleanupExpiredRateLimitBuckets,
  cleanupPrivateModerationData,
} from "@/lib/admin-maintenance";

type QueryCall = {
  column: string;
  table: string;
  type: "eq" | "in" | "lt";
  value: string | string[];
};

function maintenanceClient(rowsByTable: Record<string, number>, errorTable?: string) {
  const calls: QueryCall[] = [];

  const client = {
    from: vi.fn((table: string) => {
      const builder: Record<string, unknown> = {};
      builder.delete = vi.fn(() => builder);
      builder.eq = vi.fn((column: string, value: string) => {
        calls.push({ column, table, type: "eq", value });
        return builder;
      });
      builder.in = vi.fn((column: string, value: string[]) => {
        calls.push({ column, table, type: "in", value });
        return builder;
      });
      builder.lt = vi.fn((column: string, value: string) => {
        calls.push({ column, table, type: "lt", value });
        return builder;
      });
      builder.select = vi.fn(async () => ({
        data: Array.from({ length: rowsByTable[table] ?? 0 }, (_, index) => ({ id: `${table}-${index}` })),
        error: table === errorTable ? new Error(`${table} failed`) : null,
      }));
      return builder;
    }),
  };

  return { calls, client: client as unknown as SupabaseClient };
}

describe("mantenimiento administrativo", () => {
  it("elimina contadores técnicos solamente después de vencer", async () => {
    const { calls, client } = maintenanceClient({ rate_limit_buckets: 2 });
    const now = new Date("2026-09-04T12:00:00.000Z");

    await expect(cleanupExpiredRateLimitBuckets(client, now)).resolves.toBe(2);
    expect(calls).toContainEqual({
      column: "reset_at",
      table: "rate_limit_buckets",
      type: "lt",
      value: now.toISOString(),
    });
  });

  it("aplica plazos distintos a aportes resueltos, abiertos y auditorías", async () => {
    const { calls, client } = maintenanceClient({
      community_reports: 2,
      confirmation_moderation_audit: 1,
      moderation_audit: 3,
      route_confirmations: 4,
    });
    const now = new Date("2026-09-04T12:00:00.000Z");

    await expect(cleanupPrivateModerationData(client, now)).resolves.toEqual({
      confirmationAuditsDeleted: 1,
      confirmationsDeleted: 8,
      reportAuditsDeleted: 3,
      reportsDeleted: 4,
    });

    expect(calls).toContainEqual({
      column: "reviewed_at",
      table: "community_reports",
      type: "lt",
      value: "2026-03-08T12:00:00.000Z",
    });
    expect(calls).toContainEqual({
      column: "created_at",
      table: "route_confirmations",
      type: "lt",
      value: "2025-09-04T12:00:00.000Z",
    });
    expect(calls).toContainEqual({
      column: "created_at",
      table: "moderation_audit",
      type: "lt",
      value: "2025-09-04T12:00:00.000Z",
    });
  });

  it("propaga errores para que el cron los registre y reintente", async () => {
    const { client } = maintenanceClient({}, "community_reports");

    await expect(cleanupPrivateModerationData(client)).rejects.toThrow("community_reports failed");
  });
});
