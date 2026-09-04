import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/community-api-auth", () => ({
  authenticateCommunityApiRequest: mocks.authenticate,
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.50"),
  rateLimit: mocks.rateLimit,
}));

import { POST } from "@/app/api/v1/community/reports/route";

const validPayload = {
  contact: "integracion@example.com",
  description: "La ruta dejó de circular por este tramo durante la mañana.",
  evidenceUrl: "https://example.com/evidencia",
  expectedResult: "Marcar el recorrido para revisión",
  place: "Centro",
  proposedPath: null,
  reportType: "route_changed",
  routeKey: "ruta-14-llanitos",
  routeName: "Ruta 14",
  sourcePath: "/ruta/ruta-14-llanitos",
  website: "",
};

function apiRequest(payload: unknown = validPayload) {
  return new Request("https://www.urugo.app/api/v1/community/reports", {
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer urugo_sk_${"a".repeat(43)}`,
      "content-type": "application/json",
      origin: "https://partner.example",
      "user-agent": "partner-test/1.0",
      "x-forwarded-for": "127.0.0.50",
    },
    method: "POST",
  });
}

function insertClient(result = { data: { id: "report-1" }, error: null }) {
  const single = vi.fn(async () => result);
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { client: { from: vi.fn(() => ({ insert })) }, insert };
}

describe("POST /api/v1/community/reports", () => {
  beforeEach(() => {
    mocks.authenticate.mockReset();
    mocks.rateLimit.mockReset();
    mocks.rateLimit.mockResolvedValue(true);
  });

  it("acepta un reporte autenticado como pendiente sin publicarlo", async () => {
    const { client, insert } = insertClient();
    mocks.authenticate.mockResolvedValue({
      client: { hourlyLimit: 30, id: "client-1", name: "Socio local" },
      status: "authorized",
      supabase: client,
    });

    const response = await POST(apiRequest());

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ id: "report-1", status: "pending" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      api_client_id: "client-1",
      status: "pending",
      submission_source: "external_api",
      submitted_by_hash: null,
    }));
    expect(mocks.rateLimit).toHaveBeenNthCalledWith(2, "community-api-client:client-1", 30, 3_600_000);
  });

  it("rechaza una credencial inválida con un desafío Bearer", async () => {
    mocks.authenticate.mockResolvedValue({ status: "invalid" });

    const response = await POST(apiRequest());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe("Bearer");
  });

  it("distingue una caída de autenticación de una credencial inválida", async () => {
    mocks.authenticate.mockResolvedValue({ status: "unavailable" });

    const response = await POST(apiRequest());

    expect(response.status).toBe(503);
  });

  it("aplica la cuota propia de la integración", async () => {
    const { client } = insertClient();
    mocks.authenticate.mockResolvedValue({
      client: { hourlyLimit: 12, id: "client-2", name: "Socio local" },
      status: "authorized",
      supabase: client,
    });
    mocks.rateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const response = await POST(apiRequest());

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("3600");
  });

  it("rechaza cuerpos que no cumplen el contrato", async () => {
    const { client } = insertClient();
    mocks.authenticate.mockResolvedValue({
      client: { hourlyLimit: 30, id: "client-1", name: "Socio local" },
      status: "authorized",
      supabase: client,
    });

    const response = await POST(apiRequest({ ...validPayload, description: "corta" }));

    expect(response.status).toBe(400);
  });
});
