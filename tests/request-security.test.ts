import { describe, expect, it } from "vitest";
import { hasJsonContentType, isSameOriginRequest } from "@/lib/request-security";

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
});
