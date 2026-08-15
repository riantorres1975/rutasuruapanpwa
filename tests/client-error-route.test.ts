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

function requestWithHeaders(payload: unknown, headers: HeadersInit) {
  return new NextRequest("http://localhost/api/client-error", {
    method: "POST",
    headers,
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

  it("rechaza solicitudes cross-site antes de registrar el reporte", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(requestWithHeaders(validPayload, {
      "content-type": "application/json",
      origin: "https://example.com",
      "sec-fetch-site": "cross-site",
    }));

    expect(response.status).toBe(403);
    expect(log).not.toHaveBeenCalled();
  });

  it("rechaza JSON enviado como un tipo de contenido simple", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await POST(requestWithHeaders(validPayload, {
      "content-type": "text/plain",
    }));

    expect(response.status).toBe(415);
    expect(log).not.toHaveBeenCalled();
  });

  it("corta una carga fragmentada al superar el limite", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1_024));
        controller.enqueue(new Uint8Array(2_048));
      },
    });
    const oversized = new NextRequest("http://localhost/api/client-error", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.50",
      },
      body: stream,
    });

    const response = await POST(oversized);

    expect(response.status).toBe(413);
    expect(log).not.toHaveBeenCalled();
  });
});
