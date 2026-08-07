import type { Coordinates } from "@/lib/types";

export function buildSharedRouteSegment(
  path: Coordinates[],
  startIndex: number | null,
  endIndex: number | null,
): Coordinates[] | null {
  if (
    startIndex === null ||
    endIndex === null ||
    !Number.isInteger(startIndex) ||
    !Number.isInteger(endIndex) ||
    startIndex < 0 ||
    endIndex < 0 ||
    startIndex === endIndex ||
    startIndex >= path.length ||
    endIndex >= path.length
  ) {
    return null;
  }

  if (startIndex < endIndex) {
    return path.slice(startIndex, endIndex + 1);
  }

  return path.slice(endIndex, startIndex + 1).reverse();
}
