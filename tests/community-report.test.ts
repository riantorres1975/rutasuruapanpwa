import { describe, expect, it } from "vitest";
import {
  isDuplicateRouteConfirmationError,
  parseCommunityReport,
  parseRouteConfirmation,
} from "@/lib/community-report";

describe("community report validation", () => {
  it("normaliza un reporte válido y limita la fuente a una ruta interna", () => {
    expect(parseCommunityReport({
      reportType: "route_inactive",
      routeName: "  Ruta 14   Llanitos ",
      place: "Centro",
      description: "  Ya no la hemos visto circular desde hace meses. ",
      expectedResult: "Marcarla en revisión",
      contact: "",
      sourcePath: "/ruta/ruta-14-llanitos?desde=mapa",
      website: "",
    })).toEqual({
      reportType: "route_inactive",
      routeName: "Ruta 14 Llanitos",
      place: "Centro",
      description: "Ya no la hemos visto circular desde hace meses.",
      expectedResult: "Marcarla en revisión",
      contact: null,
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

  it("reconoce únicamente conflictos de unicidad como confirmaciones repetidas", () => {
    expect(isDuplicateRouteConfirmationError({ code: "23505", message: "duplicate key" })).toBe(true);
    expect(isDuplicateRouteConfirmationError({ code: "42501" })).toBe(false);
    expect(isDuplicateRouteConfirmationError(null)).toBe(false);
  });
});
