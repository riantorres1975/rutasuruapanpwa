import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/v1/openapi/route";
import { COMMUNITY_REPORT_TYPES } from "@/lib/community-report";
import { SITE_URL } from "@/lib/site-url";

describe("GET /api/v1/openapi", () => {
  it("publica un contrato OpenAPI 3.1 descargable y con CORS", async () => {
    const response = GET();
    const document = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("cache-control")).toContain("max-age=3600");
    expect(response.headers.get("content-disposition")).toContain("urugo-openapi.json");
    expect(document.openapi).toBe("3.1.0");
    expect(document.servers[0].url).toBe(SITE_URL);
  });

  it("describe todos los endpoints públicos y protege la escritura", async () => {
    const document = await GET().json();

    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining([
      "/api/v1/routes",
      "/api/v1/routes/{key}/geometry",
      "/api/v1/routes/{key}/community-status",
      "/api/v1/community/reports",
      "/api/v1/openapi",
    ]));
    expect(document.paths["/api/v1/community/reports"].post.security).toEqual([{ ApiKeyAuth: [] }]);
    expect(document.components.securitySchemes.ApiKeyAuth.scheme).toBe("bearer");
  });

  it("mantiene el contrato de reportes alineado con el validador", async () => {
    const document = await GET().json();
    const schema = document.components.schemas.CommunityReportInput;

    expect(schema.required).toEqual(["reportType", "description"]);
    expect(schema.properties.reportType.enum).toEqual(COMMUNITY_REPORT_TYPES);
    expect(schema.properties.description).toMatchObject({ minLength: 10, maxLength: 2_000 });
    expect(schema.properties.proposedPath).toMatchObject({ minItems: 2, maxItems: 120 });
    expect(document.paths["/api/v1/community/reports"].post.responses["202"]).toBeDefined();
    expect(document.paths["/api/v1/community/reports"].post.responses["429"]).toBeDefined();
  });

  it("responde el preflight sin habilitar escritura", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, OPTIONS");
  });
});
