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

export type CommunityReportType = (typeof COMMUNITY_REPORT_TYPES)[number];
export type RouteConfirmationType = (typeof ROUTE_CONFIRMATION_TYPES)[number];

export type CommunityReportInput = {
  reportType: CommunityReportType;
  routeName: string | null;
  place: string | null;
  description: string;
  expectedResult: string | null;
  contact: string | null;
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

function includesValue<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === "string" && values.includes(value);
}

export function parseCommunityReport(value: unknown): CommunityReportInput | null {
  if (!isRecord(value) || !includesValue(COMMUNITY_REPORT_TYPES, value.reportType)) return null;
  const description = text(value.description, 2_000);
  if (!description || description.length < 10) return null;

  const website = typeof value.website === "string" ? value.website.trim().slice(0, 200) : "";
  return {
    reportType: value.reportType,
    routeName: optionalText(value.routeName, 120),
    place: optionalText(value.place, 180),
    description,
    expectedResult: optionalText(value.expectedResult, 1_500),
    contact: optionalText(value.contact, 180),
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
