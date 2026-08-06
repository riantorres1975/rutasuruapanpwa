import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/client-error/route";

const validPayload = {
  fingerprint: "a1b2c3d4",
  kind: "boundary",
  online: true,
  path: "/mapa",
  source: "mapa",
};

function request(payload: unknown) {
  return new NextRequest("http://localhost/api/client-error", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/client-error", () => {
  afterEach(() => vi.restoreAllMocks());

  it("acepta el reporte minimo y no registra datos del cliente", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(request(validPayload));

    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith("[client-error]", JSON.stringify(validPayload));
  });

  it("rechaza campos adicionales", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(request({ ...validPayload, message: "dato privado" }));

    expect(response.status).toBe(400);
    expect(log).not.toHaveBeenCalled();
  });
});
