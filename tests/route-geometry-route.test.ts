import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/v1/routes/[key]/geometry/route";

describe("GET /api/v1/routes/[key]/geometry", () => {
  it("entrega únicamente los sentidos publicados de la ruta solicitada", async () => {
    const response = await GET(new Request("http://localhost/api/v1/routes/ruta-17-purhepechas/geometry"), {
      params: Promise.resolve({ key: "ruta-17-purhepechas" }),
    });
    const body = await response.json() as {
      routeKey: string;
      directions: Array<{ id: number; label: string; color: string; path: [number, number][] }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(body.routeKey).toBe("ruta-17-purhepechas");
    expect(body.directions.length).toBeGreaterThan(0);
    expect(body.directions.every((direction) => direction.path.length >= 2)).toBe(true);
  });

  it("no expone geometrías para claves desconocidas", async () => {
    const response = await GET(new Request("http://localhost/api/v1/routes/no-existe/geometry"), {
      params: Promise.resolve({ key: "no-existe" }),
    });

    expect(response.status).toBe(404);
  });
});
