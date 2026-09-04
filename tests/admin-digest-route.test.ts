import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  sendAdminDigest: vi.fn(),
}));

vi.mock("@/lib/admin-digest", () => ({ sendAdminDigest: mocks.sendAdminDigest }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));

import { GET } from "@/app/api/cron/admin-digest/route";

const originalSecret = process.env.CRON_SECRET;

function countClient(): any {
  return {
    from: vi.fn((table: string) => ({
      delete: vi.fn(() => ({
        lt: vi.fn((_column: string, _value: string) => ({
          select: vi.fn(async () => ({
            data: table === "rate_limit_buckets" ? [{ key_hash: "a" }, { key_hash: "b" }] : null,
            error: null,
          })),
        })),
      })),
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
      maintenance: { expiredRateLimitBucketsDeleted: 2 },
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
    const client: any = countClient();
    client.from.mockImplementation((table: string) => ({
      delete: vi.fn(() => ({
        lt: vi.fn((_column: string, _value: string) => ({
          select: vi.fn(async () => ({
            data: null,
            error: table === "rate_limit_buckets" ? new Error("cleanup failed") : null,
          })),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn((_column: string, status: string) => Promise.resolve({
          count: table === "route_confirmations" ? 4 : status === "pending" ? 2 : 1,
          error: null,
        })),
      })),
    }));
    mocks.createSupabaseAdminClient.mockReturnValue(client);
    mocks.sendAdminDigest.mockResolvedValue("sent");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const response = await GET(new Request("https://www.urugo.app/api/cron/admin-digest", {
      headers: { authorization: "Bearer cron-test-secret" },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.maintenance).toEqual({ expiredRateLimitBucketsDeleted: 0 });
    expect(mocks.sendAdminDigest).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      "[admin-digest] limpieza de rate_limit_buckets falló:",
      "cleanup failed",
    );
    warn.mockRestore();
  });
});
