export const COMMUNITY_REPORT_TYPES = [
  "route_incorrect",
  "route_missing",
  "route_inactive",
  "route_changed",
  "schedule_changed",
  "landmark_changed",
  "map_error",
  "location_problem",
  "usability_problem",
  "other",
] as const;

export const ROUTE_CONFIRMATION_TYPES = ["seen_today", "not_running", "changed"] as const;
const ROUTE_PROPOSAL_REPORT_TYPES: ReadonlyArray<CommunityReportType> = ["route_incorrect", "route_changed"];

export type CommunityReportType = (typeof COMMUNITY_REPORT_TYPES)[number];
export type RouteConfirmationType = (typeof ROUTE_CONFIRMATION_TYPES)[number];

export type CommunityReportInput = {
  reportType: CommunityReportType;
  routeKey: string | null;
  routeName: string | null;
  place: string | null;
  description: string;
  expectedResult: string | null;
  contact: string | null;
  evidenceUrl: string | null;
  proposedPath: [number, number][] | null;
  sourcePath: string | null;
  website: string;
};

export type RouteConfirmationInput = {
  routeKey: string;
  routeName: string;
  confirmationType: RouteConfirmationType;
  note: string | null;
  sourcePath: string | null;
  website: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
}

function optionalText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  return text(value, maxLength);
}

function sourcePath(value: unknown): string | null {
  const normalized = optionalText(value, 300);
  if (!normalized || !normalized.startsWith("/") || normalized.startsWith("//")) return null;
  return normalized;
}

function httpsUrl(value: unknown): string | null {
  const normalized = optionalText(value, 500);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function proposedPath(value: unknown): [number, number][] | null {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return null;
  if (!Array.isArray(value) || value.length < 2 || value.length > 120) return null;

  const points: [number, number][] = [];
  for (const point of value) {
    if (!Array.isArray(point) || point.length !== 2) return null;
    const longitude = Number(point[0]);
    const latitude = Number(point[1]);
    if (
      !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
      || longitude < -103
      || longitude > -101
      || latitude < 18.5
      || latitude > 20.5
    ) return null;
    points.push([Number(longitude.toFixed(6)), Number(latitude.toFixed(6))]);
  }
  return points;
}

function includesValue<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function parseCommunityReport(value: unknown): CommunityReportInput | null {
  if (!isRecord(value) || !includesValue(COMMUNITY_REPORT_TYPES, value.reportType)) return null;
  const description = text(value.description, 2_000);
  if (!description || description.length < 10) return null;

  const routeKey = optionalText(value.routeKey, 140)?.match(/^[a-z0-9-]+$/)?.[0] ?? null;
  const evidenceUrl = httpsUrl(value.evidenceUrl);
  if (value.evidenceUrl && !evidenceUrl) return null;
  const path = proposedPath(value.proposedPath);
  const hasProposedPath = value.proposedPath !== undefined
    && value.proposedPath !== null
    && !(Array.isArray(value.proposedPath) && value.proposedPath.length === 0);
  if (hasProposedPath && !path) return null;
  if (path && !routeKey) return null;
  if (path && !ROUTE_PROPOSAL_REPORT_TYPES.includes(value.reportType)) return null;

  const website = typeof value.website === "string" ? value.website.trim().slice(0, 200) : "";
  return {
    reportType: value.reportType,
    routeKey,
    routeName: optionalText(value.routeName, 120),
    place: optionalText(value.place, 180),
    description,
    expectedResult: optionalText(value.expectedResult, 1_500),
    contact: optionalText(value.contact, 180),
    evidenceUrl,
    proposedPath: path,
    sourcePath: sourcePath(value.sourcePath),
    website,
  };
}

export function parseRouteConfirmation(value: unknown): RouteConfirmationInput | null {
  if (!isRecord(value) || !includesValue(ROUTE_CONFIRMATION_TYPES, value.confirmationType)) return null;
  const routeKey = text(value.routeKey, 140);
  const routeName = text(value.routeName, 140);
  if (!routeKey || !/^[a-z0-9-]+$/.test(routeKey) || !routeName) return null;

  return {
    routeKey,
    routeName,
    confirmationType: value.confirmationType,
    note: optionalText(value.note, 500),
    sourcePath: sourcePath(value.sourcePath),
    website: typeof value.website === "string" ? value.website.trim().slice(0, 200) : "",
  };
}

export function isDuplicateRouteConfirmationError(value: unknown): boolean {
  return isRecord(value) && value.code === "23505";
}
