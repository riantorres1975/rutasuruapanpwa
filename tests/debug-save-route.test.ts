import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/debug/save-route/route";

const TOKEN = "test-route-editor-token";

function request(payload: unknown, token = TOKEN) {
  return new Request("http://localhost/api/debug/save-route", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/debug/save-route", () => {
  beforeEach(() => {
    process.env.DEBUG_ROUTE_SAVE_ENABLED = "true";
    process.env.DEBUG_ROUTE_SAVE_TOKEN = TOKEN;
  });

  afterEach(() => {
    delete process.env.DEBUG_ROUTE_SAVE_ENABLED;
    delete process.env.DEBUG_ROUTE_SAVE_TOKEN;
  });

  it("exige el token configurado", async () => {
    const response = await POST(request({}, "token-incorrecto"));
    expect(response.status).toBe(403);
  });

  it("rechaza campos adicionales antes de leer el archivo", async () => {
    const response = await POST(request({
      ruta: "Ruta 1",
      direccion: "ida",
      coordenadas: [[-102.06, 19.42], [-102.05, 19.43]],
      extra: "no permitido",
    }));
    expect(response.status).toBe(400);
  });

  it("rechaza trayectos incompletos o fuera de Uruapan", async () => {
    const incomplete = await POST(request({
      ruta: "Ruta 1",
      direccion: "ida",
      coordenadas: [[-102.06, 19.42]],
    }));
    const outside = await POST(request({
      ruta: "Ruta 1",
      direccion: "ida",
      coordenadas: [[-99.13, 19.43], [-99.14, 19.44]],
    }));

    expect(incomplete.status).toBe(400);
    expect(outside.status).toBe(400);
  });
});
