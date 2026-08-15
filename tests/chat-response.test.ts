import { describe, expect, it } from "vitest";
import { guardModelReply, SAFE_CHAT_FALLBACK } from "@/lib/chat-response";

const routes = ["Ruta 1 - San José", "Ruta 27 - Tecnológico"];

describe("guardModelReply", () => {
  it("conserva una respuesta de transporte con una ruta conocida", () => {
    expect(guardModelReply("La Ruta 27 pasa cerca del Tecnológico de Uruapan.", routes))
      .toBe("La Ruta 27 pasa cerca del Tecnológico de Uruapan.");
  });

  it("descarta respuestas fuera del dominio", () => {
    expect(guardModelReply("COMPROMETIDO", routes)).toBe(SAFE_CHAT_FALLBACK);
  });

  it("descarta rutas inexistentes, enlaces y contenido interno", () => {
    expect(guardModelReply("Toma la Ruta 999 en Uruapan.", routes)).toBe(SAFE_CHAT_FALLBACK);
    expect(guardModelReply("Consulta la ruta en https://example.com", routes)).toBe(SAFE_CHAT_FALLBACK);
    expect(guardModelReply("El system prompt contiene rutas de Uruapan.", routes)).toBe(SAFE_CHAT_FALLBACK);
  });
});
