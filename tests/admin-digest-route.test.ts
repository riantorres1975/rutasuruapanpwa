import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cleanupExpiredRateLimitBuckets: vi.fn(),
  cleanupPrivateModerationData: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  sendAdminDigest: vi.fn(),
}));

vi.mock("@/lib/admin-digest", () => ({ sendAdminDigest: mocks.sendAdminDigest }));
vi.mock("@/lib/admin-maintenance", () => ({
  cleanupExpiredRateLimitBuckets: mocks.cleanupExpiredRateLimitBuckets,
  cleanupPrivateModerationData: mocks.cleanupPrivateModerationData,
  EMPTY_PRIVATE_MODERATION_CLEANUP: {
    confirmationAuditsDeleted: 0,
    confirmationsDeleted: 0,
    reportAuditsDeleted: 0,
    reportsDeleted: 0,
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));

import { GET } from "@/app/api/cron/admin-digest/route";

const originalSecret = process.env.CRON_SECRET;

function countClient() {
  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((_column: string, status: string) => Promise.resolve({
          count: table === "route_confirmations" ? 4 : status === "pending" ? 2 : 1,
          error: null,
        })),
      })),
    })),
  };
}

describe("cron del resumen administrativo", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-test-secret";
    mocks.cleanupExpiredRateLimitBuckets.mockReset();
    mocks.cleanupExpiredRateLimitBuckets.mockResolvedValue(2);
    mocks.cleanupPrivateModerationData.mockReset();
    mocks.cleanupPrivateModerationData.mockResolvedValue({
      confirmationAuditsDeleted: 3,
      confirmationsDeleted: 4,
      reportAuditsDeleted: 5,
      reportsDeleted: 6,
    });
    mocks.createSupabaseAdminClient.mockReset();
    mocks.sendAdminDigest.mockReset();
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rechaza llamadas que no tengan el secreto del cron", async () => {
    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest"));

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("cuenta la bandeja y solicita un unico resumen diario", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(countClient());
    mocks.sendAdminDigest.mockResolvedValue("sent");

    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body).toEqual({
      counts: { pendingReports: 2, pendingSignals: 4, reviewingReports: 1 },
      maintenance: {
        expiredRateLimitBucketsDeleted: 2,
        privateModeration: {
          confirmationAuditsDeleted: 3,
          confirmationsDeleted: 4,
          reportAuditsDeleted: 5,
          reportsDeleted: 6,
        },
      },
      ok: true,
      status: "sent",
    });
    expect(mocks.sendAdminDigest).toHaveBeenCalledWith(
      { pendingReports: 2, pendingSignals: 4, reviewingReports: 1 },
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    );
  });

  it("devuelve un error temporal si Supabase no esta configurado", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(null);

    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));

    expect(response.status).toBe(503);
    expect(mocks.sendAdminDigest).not.toHaveBeenCalled();
  });

  it("no rompe el resumen si falla la limpieza técnica", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(countClient());
    mocks.cleanupExpiredRateLimitBuckets.mockRejectedValue(new Error("cleanup failed"));
    mocks.sendAdminDigest.mockResolvedValue("sent");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.maintenance.expiredRateLimitBucketsDeleted).toBe(0);
    expect(body.maintenance.privateModeration.reportsDeleted).toBe(6);
    expect(mocks.sendAdminDigest).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[admin-digest] limpieza de rate_limit_buckets falló:",
      "cleanup failed",
    );
    warn.mockRestore();
  });

  it("no rompe el resumen si falla la retención privada", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue(countClient());
    mocks.cleanupPrivateModerationData.mockRejectedValue(new Error("retention failed"));
    mocks.sendAdminDigest.mockResolvedValue("sent");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.maintenance.privateModeration).toEqual({
      confirmationAuditsDeleted: 0,
      confirmationsDeleted: 0,
      reportAuditsDeleted: 0,
      reportsDeleted: 0,
    });
    expect(mocks.sendAdminDigest).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[admin-digest] limpieza de datos privados falló:",
      "retention failed",
    );
    warn.mockRestore();
  });
});
