import { describe, expect, it } from "vitest";
import { buildPlacesSection, getRealRouteNames, getRoutePlaces, nearbyRoutesReal } from "@/lib/chat-grounding";

// Coordenadas del Centro (las mismas de KNOWN_PLACES en lib/geocode.ts)
const CENTRO_LAT = 19.42101;
const CENTRO_LNG = -102.06303;

// Regresión del bug reportado: el bot decía que la Ruta 2 pasa por el centro
// porque usaba paradas inventadas; el trazo real va a ~1.7 km del primer cuadro.
describe("chat-grounding (datos reales)", () => {
  it("la Ruta 2 NO aparece entre las rutas cercanas al Centro", () => {
    const nearby = nearbyRoutesReal(CENTRO_LAT, CENTRO_LNG);
    expect(nearby).not.toMatch(/Ruta 2:/);
    expect(nearby).not.toMatch(/Ruta 2A:/);
  });

  it("la Ruta 2 no aparece asociada al Centro ni al Centro Histórico", () => {
    const places = getRoutePlaces("Ruta 2").join(", ");
    expect(places).not.toContain("Centro");
  });

  it("la Ruta 25 sí pasa cerca del Centro según su trazo", () => {
    const places = getRoutePlaces("Ruta 25").join(", ");
    expect(places).toContain("Centro");
  });

  it("la sección de lugares cubre los 17 lugares conocidos", () => {
    const section = buildPlacesSection();
    expect(section).toContain("Centro:");
    expect(section).toContain("Hospital Regional:");
    expect(section.split("\n").length).toBe(17);
  });

  it("los nombres reales de ruta incluyen las 40 de camión + Teleférico", () => {
    const names = getRealRouteNames();
    expect(names.length).toBe(41);
    expect(names).toContain("Ruta 2");
    expect(names).toContain("Teleférico Uruapan");
  });
});
