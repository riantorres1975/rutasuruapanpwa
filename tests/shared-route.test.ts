import { describe, expect, it } from "vitest";
import { buildSharedRouteSegment } from "@/lib/shared-route";
import type { Coordinates } from "@/lib/types";

const path: Coordinates[] = [
  [-102.01, 19.40],
  [-102.02, 19.41],
  [-102.03, 19.42],
  [-102.04, 19.43],
];

describe("shared route segment", () => {
  it("conserva el orden de un trayecto de ida", () => {
    expect(buildSharedRouteSegment(path, 1, 3)).toEqual(path.slice(1, 4));
  });

  it("invierte el tramo cuando el trayecto va de regreso", () => {
    expect(buildSharedRouteSegment(path, 3, 1)).toEqual([
      path[3],
      path[2],
      path[1],
    ]);
  });

  it("descarta índices inválidos o sin recorrido", () => {
    expect(buildSharedRouteSegment(path, 2, 2)).toBeNull();
    expect(buildSharedRouteSegment(path, -1, 2)).toBeNull();
    expect(buildSharedRouteSegment(path, 1, path.length)).toBeNull();
  });
});
