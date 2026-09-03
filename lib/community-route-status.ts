import type { RouteConfirmationType } from "@/lib/community-report";

export type AcceptedRouteSignal = {
  confirmation_type: RouteConfirmationType;
  observed_at: string;
};

export type PublicRouteSignalStatus = {
  state: "recently_seen" | "review_suggested" | "no_recent_data";
  observedAt: string | null;
};

const RECENT_SEEN_MS = 45 * 24 * 60 * 60 * 1_000;
const RECENT_CONCERN_MS = 90 * 24 * 60 * 60 * 1_000;

function latestTimestamp(signals: AcceptedRouteSignal[], types: RouteConfirmationType[]): number | null {
  let latest: number | null = null;
  for (const signal of signals) {
    if (!types.includes(signal.confirmation_type)) continue;
    const timestamp = Date.parse(signal.observed_at);
    if (!Number.isFinite(timestamp)) continue;
    if (latest === null || timestamp > latest) latest = timestamp;
  }
  return latest;
}

export function getPublicRouteSignalStatus(
  signals: AcceptedRouteSignal[],
  now = new Date(),
): PublicRouteSignalStatus {
  const nowTimestamp = now.getTime();
  const latestSeen = latestTimestamp(signals, ["seen_today"]);
  const latestConcern = latestTimestamp(signals, ["changed", "not_running"]);
  const concernAge = latestConcern === null ? Number.POSITIVE_INFINITY : Math.max(0, nowTimestamp - latestConcern);
  const seenAge = latestSeen === null ? Number.POSITIVE_INFINITY : Math.max(0, nowTimestamp - latestSeen);

  if (latestConcern !== null && concernAge <= RECENT_CONCERN_MS && (latestSeen === null || latestConcern > latestSeen)) {
    return { state: "review_suggested", observedAt: new Date(latestConcern).toISOString() };
  }
  if (latestSeen !== null && seenAge <= RECENT_SEEN_MS) {
    return { state: "recently_seen", observedAt: new Date(latestSeen).toISOString() };
  }
  return { state: "no_recent_data", observedAt: null };
}
