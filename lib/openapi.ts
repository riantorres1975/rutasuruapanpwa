import { COMMUNITY_REPORT_TYPES } from "@/lib/community-report";
import { PROJECT } from "@/lib/project";
import { SITE_URL } from "@/lib/site-url";

const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

export function createOpenApiDocument() {
  return {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "API de rutas UruGo",
      version: "1.0.0",
      description:
        "Consulta recorridos publicados de Uruapan y envía propuestas para revisión humana. Ningún aporte externo modifica el mapa directamente.",
      contact: {
        name: "Proyecto UruGo",
        url: PROJECT.repositoryUrl,
      },
    },
    servers: [{ url: SITE_URL, description: "Producción" }],
    tags: [
      { name: "Rutas", description: "Datos públicos, activos y publicados." },
      { name: "Comunidad", description: "Evidencia agregada y propuestas moderadas." },
      { name: "Contrato", description: "Descripción legible por máquinas de esta API." },
    ],
    paths: {
      "/api/v1/routes": {
        get: {
          operationId: "listPublishedRoutes",
          summary: "Listar recorridos publicados",
          tags: ["Rutas"],
          responses: {
            "200": {
              description: "Catálogo y geometrías vigentes.",
              headers: {
                ETag: { description: "Validador de la versión publicada.", schema: { type: "string" } },
              },
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/RoutesResponse" } },
              },
            },
            "304": { description: "La versión indicada en If-None-Match sigue vigente." },
          },
        },
      },
      "/api/v1/routes/{key}/geometry": {
        get: {
          operationId: "getPublishedRouteGeometry",
          summary: "Consultar la geometría de una ruta",
          tags: ["Rutas"],
          parameters: [{ $ref: "#/components/parameters/RouteKey" }],
          responses: {
            "200": {
              description: "Sentidos publicados que pertenecen a la ruta.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/GeometryResponse" } },
              },
            },
            "404": errorResponse("La clave no corresponde a una ruta conocida."),
            "503": errorResponse("El recorrido no está disponible temporalmente."),
          },
        },
      },
      "/api/v1/routes/{key}/community-status": {
        get: {
          operationId: "getRouteCommunityStatus",
          summary: "Consultar evidencia comunitaria reciente",
          description:
            "Devuelve sólo un resumen de señales aceptadas. No expone contactos, direcciones IP ni identificadores de colaboradores.",
          tags: ["Comunidad"],
          parameters: [{ $ref: "#/components/parameters/RouteKey" }],
          responses: {
            "200": {
              description: "Estado agregado de la evidencia reciente.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/CommunityStatus" } },
              },
            },
            "404": errorResponse("La clave no corresponde a una ruta conocida."),
            "503": errorResponse("El resumen comunitario no está disponible temporalmente."),
          },
        },
      },
      "/api/v1/community/reports": {
        post: {
          operationId: "submitCommunityReport",
          summary: "Enviar una propuesta para moderación",
          description:
            "Requiere una clave emitida para una integración. La propuesta siempre se almacena como pendiente y no publica cambios.",
          tags: ["Comunidad"],
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/CommunityReportInput" } },
            },
          },
          responses: {
            "202": {
              description: "La propuesta quedó pendiente de revisión.",
              content: {
                "application/json": { schema: { $ref: "#/components/schemas/AcceptedReport" } },
              },
            },
            "400": errorResponse("El cuerpo no cumple el contrato."),
            "401": errorResponse("La credencial Bearer es inválida, fue revocada o no fue enviada."),
            "413": errorResponse("El cuerpo supera 24 KB."),
            "415": errorResponse("El contenido no es JSON."),
            "429": {
              ...errorResponse("La integración agotó su cuota por hora."),
              headers: {
                "Retry-After": { description: "Segundos antes de volver a intentar.", schema: { type: "integer" } },
              },
            },
            "502": errorResponse("No fue posible guardar la propuesta."),
            "503": errorResponse("La autenticación o la base de datos no están disponibles temporalmente."),
          },
        },
      },
      "/api/v1/openapi": {
        get: {
          operationId: "getOpenApiDocument",
          summary: "Descargar este contrato OpenAPI",
          tags: ["Contrato"],
          responses: {
            "200": {
              description: "Documento OpenAPI 3.1 en JSON.",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "urugo_sk_...",
          description: "Clave de integración entregada una sola vez por un administrador de UruGo.",
        },
      },
      parameters: {
        RouteKey: {
          name: "key",
          in: "path",
          required: true,
          description: "Identificador público de la ruta.",
          schema: { type: "string", pattern: "^[a-z0-9-]+$", maxLength: 140 },
          example: "ruta-17-purhepechas",
        },
      },
      schemas: {
        Coordinate: {
          type: "array",
          description: "Par [longitud, latitud].",
          prefixItems: [{ type: "number" }, { type: "number" }],
          minItems: 2,
          maxItems: 2,
        },
        ProposalCoordinate: {
          type: "array",
          description: "Par [longitud, latitud] dentro del área admitida para propuestas.",
          prefixItems: [
            { type: "number", minimum: -103, maximum: -101 },
            { type: "number", minimum: 18.5, maximum: 20.5 },
          ],
          minItems: 2,
          maxItems: 2,
        },
        Landmark: {
          type: "object",
          required: ["name", "point"],
          properties: {
            name: { type: "string" },
            point: { $ref: "#/components/schemas/Coordinate" },
          },
        },
        PublishedRoute: {
          type: "object",
          required: ["id", "name", "original_name", "color", "corridor_width_m", "verified", "path", "landmarks"],
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            original_name: { type: "string" },
            color: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
            corridor_width_m: { type: "number" },
            verified: { type: "boolean" },
            path: { type: "array", items: { $ref: "#/components/schemas/Coordinate" } },
            landmarks: { type: "array", items: { $ref: "#/components/schemas/Landmark" } },
          },
        },
        RoutesResponse: {
          type: "object",
          required: ["meta", "routes"],
          properties: {
            meta: {
              type: "object",
              required: ["version", "source", "count"],
              properties: {
                version: { type: "string" },
                source: { type: "string", enum: ["static", "supabase", "static-fallback"] },
                count: { type: "integer", minimum: 0 },
              },
            },
            routes: { type: "array", items: { $ref: "#/components/schemas/PublishedRoute" } },
          },
        },
        RouteDirection: {
          type: "object",
          required: ["id", "label", "color", "path"],
          properties: {
            id: { type: "integer" },
            label: { type: "string" },
            color: { type: "string" },
            path: {
              type: "array",
              minItems: 2,
              items: { $ref: "#/components/schemas/Coordinate" },
            },
          },
        },
        GeometryResponse: {
          type: "object",
          required: ["routeKey", "routeName", "directions"],
          properties: {
            routeKey: { type: "string" },
            routeName: { type: "string" },
            directions: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/RouteDirection" } },
          },
        },
        CommunityStatus: {
          type: "object",
          required: ["state", "observedAt", "supportCount", "requiredCount", "evidenceType"],
          properties: {
            state: {
              type: "string",
              enum: ["recently_seen", "review_suggested", "collecting_evidence", "no_recent_data"],
            },
            observedAt: { type: ["string", "null"], format: "date-time" },
            supportCount: { type: "integer", minimum: 0 },
            requiredCount: { type: "integer", minimum: 1 },
            evidenceType: { type: ["string", "null"], enum: ["circulating", "concern", null] },
          },
        },
        CommunityReportInput: {
          type: "object",
          required: ["reportType", "description"],
          properties: {
            reportType: { type: "string", enum: COMMUNITY_REPORT_TYPES },
            routeKey: { type: ["string", "null"], pattern: "^[a-z0-9-]+$", maxLength: 140 },
            routeName: { type: ["string", "null"], maxLength: 120 },
            place: { type: ["string", "null"], maxLength: 180 },
            description: { type: "string", minLength: 10, maxLength: 2_000 },
            expectedResult: { type: ["string", "null"], maxLength: 1_500 },
            contact: { type: ["string", "null"], maxLength: 180 },
            evidenceUrl: {
              type: ["string", "null"],
              description: "URL HTTPS sin credenciales incrustadas.",
              format: "uri",
              pattern: "^[hH][tT][tT][pP][sS]://",
              maxLength: 500,
            },
            proposedPath: {
              type: ["array", "null"],
              description:
                "Trazo opcional de 2 a 120 puntos. Requiere routeKey y reportType route_incorrect o route_changed.",
              minItems: 2,
              maxItems: 120,
              items: { $ref: "#/components/schemas/ProposalCoordinate" },
            },
            sourcePath: { type: ["string", "null"], pattern: "^/(?!/)", maxLength: 300 },
          },
        },
        AcceptedReport: {
          type: "object",
          required: ["id", "status"],
          properties: {
            id: { type: "string", format: "uuid" },
            status: { type: "string", const: "pending" },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" } },
        },
      },
    },
  } as const;
}
