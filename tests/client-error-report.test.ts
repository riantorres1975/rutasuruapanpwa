import { describe, expect, it } from "vitest";
import {
  createClientErrorReport,
  isClientErrorReport,
  sanitizeErrorPath,
} from "@/lib/client-error-report";

describe("reporte privado de errores", () => {
  it("elimina consultas y fragmentos de la ruta", () => {
    expect(sanitizeErrorPath("/mapa?origen=19.4,-102.1#detalle")).toBe("/mapa");
    expect(sanitizeErrorPath("https://example.com/mapa")).toBe("/");
  });

  it("genera una huella estable sin incluir el contenido del error", () => {
    const error = new TypeError("dato privado 19.420,-102.060");
    const first = createClientErrorReport(error, "boundary", "mapa", "/mapa?destino=privado", true);
    const second = createClientErrorReport(error, "boundary", "mapa", "/mapa", true);

    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain("dato privado");
    expect(JSON.stringify(first)).not.toContain("19.420");
    expect(first.fingerprint).toMatch(/^[a-f0-9]{8}$/);
  });

  it("rechaza campos extraÃ±os y rutas con datos sensibles", () => {
    const valid = createClientErrorReport(new Error("fallo"), "window-error", "window", "/horarios", false);
    expect(isClientErrorReport(valid)).toBe(true);
    expect(isClientErrorReport({ ...valid, path: "/mapa?origen=secreto" })).toBe(false);
    expect(isClientErrorReport({ ...valid, fingerprint: "not-a-hash" })).toBe(false);
    expect(isClientErrorReport({ ...valid, kind: "otro" })).toBe(false);
    expect(isClientErrorReport({ ...valid, message: "dato arbitrario" })).toBe(false);
  });
});
