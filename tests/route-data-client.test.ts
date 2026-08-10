import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchRouteDataResponse,
  ROUTE_DATA_SOURCE_HEADER,
} from "@/lib/route-data-client";

function cachedResponse() {
  return new Response(JSON.stringify([{ id: 40, name: "Ruta guardada" }]), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("route-data-client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("devuelve la respuesta de red cuando llega a tiempo", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 41 }]), { status: 200 }),
    ));

    const response = await fetchRouteDataResponse();

    expect(response.headers.get(ROUTE_DATA_SOURCE_HEADER)).toBeNull();
    await expect(response.json()).resolves.toEqual([{ id: 41 }]);
  });

  it("usa Cache Storage cuando la red excede tres segundos", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("caches", {
      open: vi.fn().mockResolvedValue({
        match: vi.fn().mockResolvedValue(cachedResponse()),
      }),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
      ),
    );

    const pending = fetchRouteDataResponse();
    await vi.advanceTimersByTimeAsync(3000);
    const response = await pending;

    expect(response.headers.get(ROUTE_DATA_SOURCE_HEADER)).toBe("cache");
    await expect(response.json()).resolves.toEqual([{ id: 40, name: "Ruta guardada" }]);
  });

  it("respeta la cancelacion del componente sin consultar la cache", async () => {
    const cacheOpen = vi.fn();
    vi.stubGlobal("caches", { open: cacheOpen });
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        })
      ),
    );
    const controller = new AbortController();

    const pending = fetchRouteDataResponse({ signal: controller.signal });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cacheOpen).not.toHaveBeenCalled();
  });
});
