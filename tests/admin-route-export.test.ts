import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminAccess: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({ getAdminAccess: mocks.getAdminAccess }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseAdminClient: mocks.createSupabaseAdminClient }));

import { GET } from "@/app/api/admin/routes/export/route";

function queryResult(data: unknown[]) {
  const result = { data, error: null };
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(result)),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe("respaldo administrativo de rutas", () => {
  beforeEach(() => {
    mocks.getAdminAccess.mockReset();
    mocks.createSupabaseAdminClient.mockReset();
  });

  it("rechaza descargas sin sesión", async () => {
    mocks.getAdminAccess.mockResolvedValue({ status: "anonymous" });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("exporta rutas y revisiones sin tablas comunitarias", async () => {
    mocks.getAdminAccess.mockResolvedValue({ status: "admin", userId: "user-1", email: "admin@example.com" });
    const routeRows = [{ id: 1, name: "Ruta 1", path: [[-102, 19.4]] }];
    const revisionRows = [{ id: "revision-1", route_id: 1, version: 1 }];
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn((table: string) => queryResult(table === "routes" ? routeRows : revisionRows)),
    });

    const response = await GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="urugo-rutas-/);
    expect(body).toMatchObject({
      schemaVersion: 1,
      scope: "routes-and-revisions",
      counts: { routes: 1, revisions: 1 },
      routes: routeRows,
      revisions: revisionRows,
    });
    expect(JSON.stringify(body)).not.toContain("community_reports");
    expect(JSON.stringify(body)).not.toContain("submitted_by_hash");
  });
});
