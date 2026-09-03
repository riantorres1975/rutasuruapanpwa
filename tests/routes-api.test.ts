import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/v1/routes/route";

describe("API pública de rutas", () => {
  it("expone lectura CORS y un validador de caché", async () => {
    const response = await GET(new Request("http://localhost/api/v1/routes"));
    const body = await response.json() as { meta: { count: number }; routes: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-expose-headers")).toContain("ETag");
    expect(response.headers.get("etag")).toBeTruthy();
    expect(body.meta.count).toBe(body.routes.length);
  });

  it("responde solicitudes preliminares sin habilitar escritura", () => {
    const response = OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
    expect(response.headers.get("access-control-allow-methods")).not.toContain("POST");
  });

  it("conserva CORS al responder 304", async () => {
    const first = await GET(new Request("http://localhost/api/v1/routes"));
    const etag = first.headers.get("etag");
    const cached = await GET(new Request("http://localhost/api/v1/routes", {
      headers: { "If-None-Match": etag ?? "" },
    }));

    expect(cached.status).toBe(304);
    expect(cached.headers.get("access-control-allow-origin")).toBe("*");
  });
});
