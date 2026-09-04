import { describe, expect, it } from "vitest";
import { parseRouteVerificationForm } from "@/lib/admin-route-verification";

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  data.set("routeId", "26");
  data.set("expectedVersion", "3");
  data.set("note", "Recorrido comprobado abordando la unidad durante la mañana.");
  for (const [key, value] of Object.entries(overrides)) data.set(key, value);
  return data;
}

describe("route field verification validation", () => {
  it("normaliza una comprobación válida", () => {
    expect(parseRouteVerificationForm(form({
      note: "  Recorrido comprobado   desde Centro hasta el hospital.  ",
    }))).toEqual({
      routeId: 26,
      expectedVersion: 3,
      note: "Recorrido comprobado desde Centro hasta el hospital.",
    });
  });

  it("rechaza rutas, versiones y notas inválidas", () => {
    expect(parseRouteVerificationForm(form({ routeId: "0" }))).toBeNull();
    expect(parseRouteVerificationForm(form({ expectedVersion: "1.5" }))).toBeNull();
    expect(parseRouteVerificationForm(form({ note: "Muy corta" }))).toBeNull();
    expect(parseRouteVerificationForm(form({ note: "x".repeat(1_001) }))).toBeNull();
  });
});
