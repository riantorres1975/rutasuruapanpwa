import { describe, expect, it } from "vitest";
import {
  isDuplicateRouteConfirmationError,
  parseCommunityReport,
  parseRouteConfirmation,
} from "@/lib/community-report";

describe("community report validation", () => {
  it("normaliza un reporte válido y limita la fuente a una ruta interna", () => {
    expect(parseCommunityReport({
      reportType: "route_changed",
      routeKey: "ruta-14-llanitos",
      routeName: "  Ruta 14   Llanitos ",
      place: "Centro",
      description: "  Ya no la hemos visto circular desde hace meses. ",
      expectedResult: "Marcarla en revisión",
      contact: "",
      evidenceUrl: "https://example.com/evidencia?id=26#detalle",
      proposedPath: [[-102.08, 19.41], [-102.06, 19.42]],
      sourcePath: "/ruta/ruta-14-llanitos?desde=mapa",
      website: "",
    })).toEqual({
      reportType: "route_changed",
      routeKey: "ruta-14-llanitos",
      routeName: "Ruta 14 Llanitos",
      place: "Centro",
      description: "Ya no la hemos visto circular desde hace meses.",
      expectedResult: "Marcarla en revisión",
      contact: null,
      evidenceUrl: "https://example.com/evidencia?id=26",
      proposedPath: [[-102.08, 19.41], [-102.06, 19.42]],
      sourcePath: "/ruta/ruta-14-llanitos?desde=mapa",
      website: "",
    });
  });

  it("rechaza tipos desconocidos y descripciones demasiado cortas", () => {
    expect(parseCommunityReport({ reportType: "publish_now", description: "texto suficiente" })).toBeNull();
    expect(parseCommunityReport({ reportType: "other", description: "muy corto" })).toBeNull();
  });

  it("valida confirmaciones sin permitir claves arbitrarias", () => {
    expect(parseRouteConfirmation({
      routeKey: "ruta-14-llanitos",
      routeName: "Ruta 14 - Llanitos",
      confirmationType: "seen_today",
      sourcePath: "/ruta/ruta-14-llanitos",
      website: "",
    })?.confirmationType).toBe("seen_today");

    expect(parseRouteConfirmation({
      routeKey: "../admin",
      routeName: "Ruta 14",
      confirmationType: "seen_today",
    })).toBeNull();
  });

  it("descarta una clave de ruta alterada sin rechazar el reporte", () => {
    expect(parseCommunityReport({
      reportType: "route_changed",
      routeKey: "../admin",
      description: "El recorrido cambió desde la semana pasada.",
    })?.routeKey).toBeNull();
  });

  it("rechaza evidencia insegura y propuestas sin una ruta válida", () => {
    expect(parseCommunityReport({
      reportType: "route_changed",
      description: "El recorrido cambió desde la semana pasada.",
      evidenceUrl: "javascript:alert(1)",
    })).toBeNull();

    expect(parseCommunityReport({
      reportType: "route_changed",
      routeKey: "../admin",
      description: "El recorrido cambió desde la semana pasada.",
      proposedPath: [[-102.08, 19.41], [-102.06, 19.42]],
    })).toBeNull();
  });

  it("acepta una propuesta vacía como ausente y rechaza trazos fuera de contexto o región", () => {
    expect(parseCommunityReport({
      reportType: "route_changed",
      routeKey: "ruta-14-llanitos",
      description: "El recorrido cambió desde la semana pasada.",
      proposedPath: [],
    })?.proposedPath).toBeNull();

    expect(parseCommunityReport({
      reportType: "schedule_changed",
      routeKey: "ruta-14-llanitos",
      description: "El recorrido cambió desde la semana pasada.",
      proposedPath: [[-102.08, 19.41], [-102.06, 19.42]],
    })).toBeNull();

    expect(parseCommunityReport({
      reportType: "route_changed",
      routeKey: "ruta-14-llanitos",
      description: "El recorrido cambió desde la semana pasada.",
      proposedPath: [[-110, 19.41], [-102.06, 19.42]],
    })).toBeNull();
  });

  it("reconoce únicamente conflictos de unicidad como confirmaciones repetidas", () => {
    expect(isDuplicateRouteConfirmationError({ code: "23505", message: "duplicate key" })).toBe(true);
    expect(isDuplicateRouteConfirmationError({ code: "42501" })).toBe(false);
    expect(isDuplicateRouteConfirmationError(null)).toBe(false);
  });
});
