import { beforeEach, describe, expect, it } from "vitest";
import { addRecentPlace, getRecentPlaces } from "@/lib/recent-places";
import type { PlaceResult } from "@/lib/geocode";

// Stub mínimo de window.localStorage para entorno node.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  },
};

function place(label: string, lng = -102.05, lat = 19.42): PlaceResult {
  return { label, center: [lng, lat], source: "local" };
}

describe("recent-places", () => {
  beforeEach(() => store.clear());

  it("empieza vacío", () => {
    expect(getRecentPlaces()).toEqual([]);
  });

  it("guarda el más reciente primero", () => {
    addRecentPlace(place("Centro"));
    addRecentPlace(place("Hospital Regional"));
    const recents = getRecentPlaces();
    expect(recents.map((p) => p.label)).toEqual(["Hospital Regional", "Centro"]);
  });

  it("deduplica por label ignorando mayúsculas y acentos", () => {
    addRecentPlace(place("Centro Histórico"));
    addRecentPlace(place("centro historico"));
    expect(getRecentPlaces()).toHaveLength(1);
  });

  it("conserva máximo 5 lugares", () => {
    for (let i = 1; i <= 7; i += 1) {
      addRecentPlace(place(`Lugar ${i}`));
    }
    const recents = getRecentPlaces();
    expect(recents).toHaveLength(5);
    expect(recents[0].label).toBe("Lugar 7");
  });

  it("ignora datos corruptos en storage", () => {
    store.set("urugo-recent-places", "{esto no es json");
    expect(getRecentPlaces()).toEqual([]);
    store.set("urugo-recent-places", JSON.stringify([{ malo: true }, place("Centro")]));
    expect(getRecentPlaces().map((p) => p.label)).toEqual(["Centro"]);
  });
});
