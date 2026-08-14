import { describe, expect, it } from "vitest";
import {
  buildPlacesSection,
  buildRelevantGroundingSection,
  buildRelevantLandmarksSection,
  findRelevantRouteNames,
  getRealRouteNames,
  getRoutePlaces,
  nearbyRoutesReal,
} from "@/lib/chat-grounding";
import { buildVerifiedChatReply } from "@/lib/chat-reply";

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

  it("usa landmarks para aterrizar consultas vagas sobre el TEC", () => {
    const section = buildRelevantLandmarksSection("Tec Uruapan");
    expect(section).toContain("Ruta 27");
    expect(section).toContain("Tec Uruapan");
  });

  it("usa el historial reciente para recuperar una referencia conocida", () => {
    const section = buildRelevantLandmarksSection("esa", ["Quiero ir al Tec Uruapan"]);
    expect(section).toContain("Ruta 27");
    expect(section).toContain("Tec Uruapan");
  });

  it("no arrastra lugares del historial a una pregunta nueva e independiente", () => {
    const section = buildRelevantLandmarksSection("¿Cuánto cuesta el camión?", ["Quiero ir al Tec Uruapan"]);
    expect(section).toBe("");
  });

  it("distingue Ruta 2 de Ruta 2A en una consulta exacta", () => {
    const routes = findRelevantRouteNames("¿Cuál es el horario de la Ruta 2?");
    expect(routes).toContain("Ruta 2");
    expect(routes).not.toContain("Ruta 2A");
  });

  it("declara cuando no encuentra evidencia exacta", () => {
    const section = buildRelevantGroundingSection("¿Qué ruta pasa por un lugar inventado?");
    expect(section).toContain("No hubo una coincidencia exacta");
  });

  it("responde tarifas sin depender del modelo", () => {
    expect(buildVerifiedChatReply("¿Cuánto cuesta el teleférico?")).toContain("$12.00");
  });

  it("pide origen antes de explicar cómo llegar a un landmark", () => {
    const reply = buildVerifiedChatReply("¿Cómo llego al Tec Uruapan?");
    expect(reply).toContain("necesito saber desde dónde sales");
    expect(reply).toContain("Ruta 27");
  });

  it("responde qué ruta pasa por un landmark con evidencia verificada", () => {
    const reply = buildVerifiedChatReply("¿Qué ruta pasa por el Tec Uruapan?");
    expect(reply).toContain("Ruta 27");
    expect(reply).toContain("Tec Uruapan");
  });

  it("distingue las rutas que entran al Centro de las que pasan a unas cuadras", () => {
    const reply = buildVerifiedChatReply("¿Qué ruta pasa por el centro?");
    expect(reply).toContain("Rutas 25, 26 y 76");
    expect(reply).toContain("entran directamente al primer cuadro");
    expect(reply).not.toContain("Ruta 1");
  });

  it("combina una estación exacta con las rutas cercanas al Hospital Regional", () => {
    const reply = buildVerifiedChatReply("¿Qué ruta me lleva al Hospital Regional?");
    expect(reply).toContain("Teleférico Uruapan");
    expect(reply).toContain("Ruta 25");
    expect(reply).toContain("necesito saber desde dónde sales");
  });
});
