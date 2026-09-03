import type { RouteConfirmationType } from "@/lib/community-report";

export type AcceptedRouteSignal = {
  confirmation_type: RouteConfirmationType;
  observed_at: string;
  submitted_by_hash: string | null;
};

export type PublicRouteSignalStatus = {
  state: "recently_seen" | "review_suggested" | "collecting_evidence" | "no_recent_data";
  observedAt: string | null;
  supportCount: number;
  requiredCount: number;
  evidenceType: "circulating" | "concern" | null;
};

const RECENT_SEEN_MS = 45 * 24 * 60 * 60 * 1_000;
const RECENT_CONCERN_MS = 90 * 24 * 60 * 60 * 1_000;
export const PUBLIC_SIGNAL_CONSENSUS = 2;

type NormalizedSignal = {
  evidenceType: Exclude<PublicRouteSignalStatus["evidenceType"], null>;
  observedAt: number;
};

function latestSignalsByContributor(
  signals: AcceptedRouteSignal[],
  nowTimestamp: number,
): NormalizedSignal[] {
  const contributors = new Map<string, NormalizedSignal>();

  for (const signal of signals) {
    const timestamp = Date.parse(signal.observed_at);
    if (!Number.isFinite(timestamp)) continue;
    const evidenceType = signal.confirmation_type === "seen_today" ? "circulating" : "concern";
    const maxAge = evidenceType === "circulating" ? RECENT_SEEN_MS : RECENT_CONCERN_MS;
    if (Math.max(0, nowTimestamp - timestamp) > maxAge) continue;

    // Sin una huella no podemos demostrar independencia, así que esas señales
    // cuentan juntas como un solo colaborador conservador.
    const contributor = signal.submitted_by_hash || "unidentified";
    const previous = contributors.get(contributor);
    if (!previous || timestamp > previous.observedAt) {
      contributors.set(contributor, { evidenceType, observedAt: timestamp });
    }
  }

  return [...contributors.values()];
}

function summarizeEvidence(signals: NormalizedSignal[], evidenceType: NormalizedSignal["evidenceType"]) {
  const matching = signals.filter((signal) => signal.evidenceType === evidenceType);
  return {
    count: matching.length,
    latest: matching.reduce<number | null>(
      (latest, signal) => latest === null || signal.observedAt > latest ? signal.observedAt : latest,
      null,
    ),
  };
}

function response(
  state: PublicRouteSignalStatus["state"],
  observedAt: number | null,
  supportCount: number,
  evidenceType: PublicRouteSignalStatus["evidenceType"],
): PublicRouteSignalStatus {
  return {
    state,
    observedAt: observedAt === null ? null : new Date(observedAt).toISOString(),
    supportCount,
    requiredCount: PUBLIC_SIGNAL_CONSENSUS,
    evidenceType,
  };
}

export function getPublicRouteSignalStatus(
  signals: AcceptedRouteSignal[],
  now = new Date(),
): PublicRouteSignalStatus {
  const nowTimestamp = now.getTime();
  const recentSignals = latestSignalsByContributor(signals, nowTimestamp);
  const seen = summarizeEvidence(recentSignals, "circulating");
  const concern = summarizeEvidence(recentSignals, "concern");
  const seenHasConsensus = seen.count >= PUBLIC_SIGNAL_CONSENSUS;
  const concernHasConsensus = concern.count >= PUBLIC_SIGNAL_CONSENSUS;

  if (concernHasConsensus && (!seenHasConsensus || (concern.latest ?? 0) > (seen.latest ?? 0))) {
    return response("review_suggested", concern.latest, concern.count, "concern");
  }
  if (seenHasConsensus) {
    return response("recently_seen", seen.latest, seen.count, "circulating");
  }

  const latestType = (concern.latest ?? 0) > (seen.latest ?? 0) ? "concern" : "circulating";
  const latestEvidence = latestType === "concern" ? concern : seen;
  if (latestEvidence.latest !== null) {
    return response("collecting_evidence", latestEvidence.latest, latestEvidence.count, latestType);
  }

  return response("no_recent_data", null, 0, null);
}
