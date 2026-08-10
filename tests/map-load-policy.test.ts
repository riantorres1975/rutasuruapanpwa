import { describe, expect, it } from "vitest";
import {
  getMapAutoLoadDelay,
  isMapConnectionConstrained,
  shouldPreloadMap,
} from "@/lib/map-load-policy";

const fastMobile = {
  connection: { downlink: 10, effectiveType: "4g", saveData: false },
  hasSharedState: false,
  isMobile: true,
  isOnline: true,
};

describe("map-load-policy", () => {
  it("precarga y monta automáticamente el mapa en conexiones rápidas", () => {
    expect(shouldPreloadMap(fastMobile)).toBe(true);
    expect(getMapAutoLoadDelay(fastMobile)).toBe(3200);
    expect(getMapAutoLoadDelay({ ...fastMobile, isMobile: false })).toBe(250);
  });

  it.each([
    { saveData: true },
    { effectiveType: "2g" },
    { effectiveType: "3g" },
    { downlink: 0.8 },
  ])("considera restringida la conexión $effectiveType", (connection) => {
    expect(isMapConnectionConstrained(connection)).toBe(true);
    expect(shouldPreloadMap({ ...fastMobile, connection })).toBe(false);
    expect(getMapAutoLoadDelay({ ...fastMobile, connection })).toBeNull();
  });

  it("espera interacción cuando el dispositivo está offline", () => {
    const offline = { ...fastMobile, isOnline: false };

    expect(shouldPreloadMap(offline)).toBe(false);
    expect(getMapAutoLoadDelay(offline)).toBeNull();
  });

  it("prioriza inmediatamente una ruta compartida", () => {
    expect(getMapAutoLoadDelay({
      ...fastMobile,
      connection: { saveData: true },
      hasSharedState: true,
      isOnline: false,
    })).toBe(0);
  });
});
