import { describe, expect, it } from "vitest";
import { parseRoutePath, parseRoutePublicationForm } from "@/lib/admin-route";

describe("admin route publication validation", () => {
  it("acepta matrices y GeoJSON LineString dentro de la región", () => {
    const coordinates = [[-102.08, 19.41], [-102.06, 19.42]];
    expect(parseRoutePath(JSON.stringify(coordinates))).toEqual(coordinates);
    expect(parseRoutePath(JSON.stringify({ type: "LineString", coordinates }))).toEqual(coordinates);
  });

  it("acepta un Feature GeoJSON", () => {
    const coordinates = [[-102.08, 19.41], [-102.06, 19.42]];
    expect(parseRoutePath(JSON.stringify({
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    }))).toEqual(coordinates);
  });

  it("rechaza coordenadas fuera de la región o recorridos incompletos", () => {
    expect(parseRoutePath("[[-99.1,19.4],[-99.2,19.5]]")).toBeNull();
    expect(parseRoutePath("[[-102.1,19.4]]")).toBeNull();
    expect(parseRoutePath("not-json")).toBeNull();
  });

  it("normaliza un formulario de publicación válido", () => {
    const form = new FormData();
    form.set("routeId", "26");
    form.set("expectedVersion", "3");
    form.set("name", "  Ruta 26  ");
    form.set("originalName", "Ruta 26 Ida");
    form.set("color", "#AABBCC");
    form.set("corridorWidthM", "500");
    form.set("verified", "on");
    form.set("operationalStatus", "active");
    form.set("path", "[[-102.08,19.41],[-102.06,19.42]]");
    form.set("changeSummary", "Confirmada directamente con usuarios frecuentes.");

    expect(parseRoutePublicationForm(form)).toMatchObject({
      routeId: 26,
      expectedVersion: 3,
      name: "Ruta 26",
      color: "#aabbcc",
      verified: true,
      operationalStatus: "active",
    });
  });

  it("rechaza versiones, colores y resúmenes inválidos", () => {
    const form = new FormData();
    form.set("routeId", "26");
    form.set("expectedVersion", "0");
    form.set("name", "Ruta 26");
    form.set("originalName", "Ruta 26 Ida");
    form.set("color", "green");
    form.set("corridorWidthM", "500");
    form.set("operationalStatus", "active");
    form.set("path", "[[-102.08,19.41],[-102.06,19.42]]");
    form.set("changeSummary", "corto");
    expect(parseRoutePublicationForm(form)).toBeNull();
  });
});
