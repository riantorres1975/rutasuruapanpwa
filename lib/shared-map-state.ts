import type { TransferSelectionIdentity } from "@/lib/transfer-selection";
import type { TransferOption } from "@/lib/transfers";
import type { Coordinates, RouteDirection } from "@/lib/types";

export type SharedMapState = {
  direction: RouteDirection | null;
  routeId: number | null;
  routeName: string | null;
  transferRouteAId: number | null;
  transferRouteBId: number | null;
  transferRouteAStartIndex: number | null;
  transferRouteATransferIndex: number | null;
  transferRouteBTransferIndex: number | null;
  transferRouteBEndIndex: number | null;
  segmentStartIndex: number | null;
  segmentEndIndex: number | null;
  origin: Coordinates | null;
  destination: Coordinates | null;
  showTeleferico: boolean;
};

export type InitialMapUrlState = {
  destinationParam: string | null;
  sharedState: SharedMapState | null;
  wantsNearby: boolean;
};

export type MapShareOptions = {
  routeId?: number | null;
  routeName?: string | null;
  origin?: Coordinates | null;
  destination?: Coordinates | null;
  segmentStartIndex?: number | null;
  segmentEndIndex?: number | null;
  transfer?: TransferOption | null;
  showTeleferico?: boolean;
};

export function formatCoordinateParam(point: Coordinates) {
  return `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
}

function parseCoordinateParam(value: string | null): Coordinates | null {
  if (!value) return null;
  const [lngRaw, latRaw] = value.split(",");
  const lng = Number(lngRaw);
  const lat = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return null;
  }
  return [Number(lng.toFixed(6)), Number(lat.toFixed(6))];
}

function parsePositiveIntParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeIntParam(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function parseSharedMapState(search: string): SharedMapState | null {
  const params = new URLSearchParams(search);
  const dir = params.get("dir");
  const routeId = parsePositiveIntParam(params.get("rid"));
  const routeName = params.get("r")?.trim() || null;
  const transferRouteAId = parsePositiveIntParam(params.get("tra"));
  const transferRouteBId = parsePositiveIntParam(params.get("trb"));
  const origin = parseCoordinateParam(params.get("a"));
  const destination = parseCoordinateParam(params.get("b"));
  const showTeleferico = params.get("teleferico") === "1";

  if (!routeId && !routeName && !transferRouteAId && !transferRouteBId && !origin && !destination && !showTeleferico) {
    return null;
  }

  return {
    direction: dir === "ida" || dir === "vuelta" ? dir : null,
    routeId,
    routeName,
    transferRouteAId,
    transferRouteBId,
    transferRouteAStartIndex: parseNonNegativeIntParam(params.get("tas")),
    transferRouteATransferIndex: parseNonNegativeIntParam(params.get("tax")),
    transferRouteBTransferIndex: parseNonNegativeIntParam(params.get("tbx")),
    transferRouteBEndIndex: parseNonNegativeIntParam(params.get("tbe")),
    segmentStartIndex: parseNonNegativeIntParam(params.get("ia")),
    segmentEndIndex: parseNonNegativeIntParam(params.get("ib")),
    origin,
    destination,
    showTeleferico,
  };
}

export function parseInitialMapUrl(search: string): InitialMapUrlState {
  const params = new URLSearchParams(search);
  const destination = params.get("destino")?.trim();
  return {
    destinationParam: destination ? destination.slice(0, 80) : null,
    sharedState: parseSharedMapState(search),
    wantsNearby: params.get("cerca") === "1",
  };
}

export function getSharedTransferIdentity(
  sharedState: SharedMapState,
): TransferSelectionIdentity | null {
  const {
    transferRouteAId,
    transferRouteBId,
    transferRouteAStartIndex,
    transferRouteATransferIndex,
    transferRouteBTransferIndex,
    transferRouteBEndIndex,
  } = sharedState;
  if (
    transferRouteAId === null ||
    transferRouteBId === null ||
    transferRouteAStartIndex === null ||
    transferRouteATransferIndex === null ||
    transferRouteBTransferIndex === null ||
    transferRouteBEndIndex === null
  ) {
    return null;
  }
  return {
    routeAId: transferRouteAId,
    routeBId: transferRouteBId,
    routeAStartIndex: transferRouteAStartIndex,
    routeATransferIndex: transferRouteATransferIndex,
    routeBTransferIndex: transferRouteBTransferIndex,
    routeBEndIndex: transferRouteBEndIndex,
  };
}

export function buildMapShareUrl(
  originUrl: string,
  direction: RouteDirection,
  options: MapShareOptions,
) {
  const url = new URL("/mapa", originUrl);
  url.searchParams.set("dir", direction);
  if (options.routeId) url.searchParams.set("rid", String(options.routeId));
  if (options.routeName) url.searchParams.set("r", options.routeName);
  if (options.origin) url.searchParams.set("a", formatCoordinateParam(options.origin));
  if (options.destination) url.searchParams.set("b", formatCoordinateParam(options.destination));
  if (Number.isInteger(options.segmentStartIndex) && Number.isInteger(options.segmentEndIndex)) {
    url.searchParams.set("ia", String(options.segmentStartIndex));
    url.searchParams.set("ib", String(options.segmentEndIndex));
  }
  if (options.transfer) {
    url.searchParams.set("transfer", "1");
    url.searchParams.set("tra", String(options.transfer.routeAId));
    url.searchParams.set("trb", String(options.transfer.routeBId));
    url.searchParams.set("tas", String(options.transfer.routeAStartIndex));
    url.searchParams.set("tax", String(options.transfer.routeATransferIndex));
    url.searchParams.set("tbx", String(options.transfer.routeBTransferIndex));
    url.searchParams.set("tbe", String(options.transfer.routeBEndIndex));
  }
  if (options.showTeleferico) url.searchParams.set("teleferico", "1");
  return url.toString();
}
