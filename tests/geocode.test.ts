import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  geocodeMapbox,
  searchLocalPlaces,
  searchPlaces,
  URUAPAN_BBOX,
} from "@/lib/geocode";

const originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function mapboxResponse(features: unknown[]): Response {
  return new Response(JSON.stringify({ features }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("geocode", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test";
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    if (originalToken === undefined) delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    else process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken;
  });

  it("encuentra lugares locales ignorando acentos y mayusculas", () => {
    expect(searchLocalPlaces("CENTRO HISTORICO")[0]?.label).toBe("Centro Histórico");
  });

  it("acepta resultados de Mapbox dentro de Uruapan", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mapboxResponse([
        {
          geometry: { coordinates: [-102.05, 19.42] },
          properties: { name: "Plaza Morelos" },
        },
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(geocodeMapbox("Plaza Morelos")).resolves.toEqual([
      { center: [-102.05, 19.42], label: "Plaza Morelos", source: "mapbox" },
    ]);

    const requestUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(requestUrl.searchParams.get("bbox")).toBe(URUAPAN_BBOX.join(","));
    expect(requestUrl.searchParams.get("country")).toBe("mx");
  });

  it("descarta coordenadas remotas fuera de la ciudad", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        mapboxResponse([
          {
            geometry: { coordinates: [-99.1332, 19.4326] },
            properties: { name: "Ciudad de Mexico" },
          },
        ])
      )
    );

    await expect(geocodeMapbox("Centro lejano")).resolves.toEqual([]);
  });

  it("conserva resultados locales cuando la red falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network error")));

    const results = await searchPlaces("Hospital Regional");
    expect(results[0]).toMatchObject({ label: "Hospital Regional", source: "local" });
  });

  it("cancela una consulta remota que excede seis segundos", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
      )
    );

    const pending = geocodeMapbox("Lugar sin respuesta");
    await vi.advanceTimersByTimeAsync(6000);

    await expect(pending).resolves.toEqual([]);
  });

  it("respeta la cancelacion solicitada por el consumidor", async () => {
    const controller = new AbortController();
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = geocodeMapbox("Lugar cancelado", { signal: controller.signal });
    controller.abort();

    await expect(pending).resolves.toEqual([]);
  });
});
