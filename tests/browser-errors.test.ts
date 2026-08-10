import { describe, expect, it } from "vitest";
import { isKnownMapboxWorkerError } from "@/e2e/browser-errors";

describe("browser error filtering", () => {
  it("ignora únicamente la traza anónima del worker blob conocido", () => {
    const error = new Error("Error");
    error.stack = [
      "Error",
      "    at <unknown> (blob:http://localhost:3100/118f4a1c-0fdc-41ef-987f-ebfeb2ada49b:1:27472)",
    ].join("\n");

    expect(isKnownMapboxWorkerError(error)).toBe(true);
  });

  it.each([
    new Error("Falló la aplicación"),
    Object.assign(new Error("Error"), { stack: "Error\n    at MapPage (app/mapa/page.tsx:10:2)" }),
    Object.assign(new Error("Mapbox falló"), {
      stack: "Mapbox falló\n    at <unknown> (blob:http://localhost:3100/id:1:2)",
    }),
  ])("conserva errores reales: %s", (error) => {
    expect(isKnownMapboxWorkerError(error)).toBe(false);
  });
});
