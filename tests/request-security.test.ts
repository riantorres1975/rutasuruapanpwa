import { describe, expect, it } from "vitest";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";

function request(headers: HeadersInit = {}) {
  return new Request("https://www.urugo.app/api/chat", { headers });
}

describe("request security", () => {
  it("acepta JSON con parametros de codificacion", () => {
    expect(hasJsonContentType(request({ "content-type": "application/json; charset=UTF-8" }))).toBe(true);
  });

  it("rechaza tipos simples que permitirian un POST cross-site", () => {
    expect(hasJsonContentType(request({ "content-type": "text/plain" }))).toBe(false);
    expect(hasJsonContentType(request())).toBe(false);
  });

  it("acepta el mismo origen y clientes sin contexto de navegador", () => {
    expect(isSameOriginRequest(request({ origin: "https://www.urugo.app" }))).toBe(true);
    expect(isSameOriginRequest(request())).toBe(true);
  });

  it("rechaza origenes y contextos de navegacion externos", () => {
    expect(isSameOriginRequest(request({ origin: "https://example.com" }))).toBe(false);
    expect(isSameOriginRequest(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(request({ origin: "null" }))).toBe(false);
  });

  it("lee JSON valido dentro del limite", async () => {
    const body = new Request("https://www.urugo.app/api/chat", {
      method: "POST",
      body: JSON.stringify({ ok: true }),
    });

    await expect(readJsonBodyWithLimit(body, 64)).resolves.toEqual({ ok: true });
  });

  it("corta cuerpos fragmentados al superar el limite", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"data":"'));
        controller.enqueue(new Uint8Array(128));
      },
      cancel() {
        cancelled = true;
      },
    });
    const body = new Request("https://www.urugo.app/api/chat", {
      method: "POST",
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    await expect(readJsonBodyWithLimit(body, 32)).rejects.toMatchObject({
      status: 413,
    } satisfies Partial<RequestBodyError>);
    expect(cancelled).toBe(true);
  });
});
