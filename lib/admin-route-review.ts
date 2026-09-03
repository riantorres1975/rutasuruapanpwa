export type AdminRouteSignal = {
  confirmation_type: "seen_today" | "not_running" | "changed";
  status: "pending" | "accepted" | "dismissed";
  observed_at: string;
  submitted_by_hash: string | null;
};

export type AdminRouteReviewInput = {
  verified: boolean;
  operational_status: "active" | "under_review" | "inactive" | "historical";
  last_verified_at: string | null;
};

export type AdminRouteReviewSummary = {
  acceptedSeen: number;
  acceptedConcern: number;
  pending: number;
  staleVerification: boolean;
  needsAttention: boolean;
  priority: number;
};

const RECENT_SEEN_MS = 45 * 24 * 60 * 60 * 1_000;
const STALE_VERIFICATION_MS = 180 * 24 * 60 * 60 * 1_000;

function timestamp(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function summarizeAdminRouteReview(
  route: AdminRouteReviewInput,
  signals: ReadonlyArray<AdminRouteSignal>,
  now = new Date(),
): AdminRouteReviewSummary {
  const lastVerifiedAt = timestamp(route.last_verified_at);
  const latestAcceptedByContributor = new Map<string, { type: AdminRouteSignal["confirmation_type"]; observedAt: number }>();
  let pending = 0;

  for (const signal of signals) {
    const observedAt = timestamp(signal.observed_at);
    if (observedAt === null) continue;
    if (signal.status === "pending") {
      pending += 1;
      continue;
    }
    if (signal.status !== "accepted") continue;

    const contributor = signal.submitted_by_hash || "unidentified";
    const previous = latestAcceptedByContributor.get(contributor);
    if (!previous || observedAt > previous.observedAt) {
      latestAcceptedByContributor.set(contributor, {
        type: signal.confirmation_type,
        observedAt,
      });
    }
  }

  let acceptedSeen = 0;
  let acceptedConcern = 0;
  for (const signal of latestAcceptedByContributor.values()) {
    if (signal.type === "seen_today") {
      if (Math.max(0, now.getTime() - signal.observedAt) <= RECENT_SEEN_MS) acceptedSeen += 1;
      continue;
    }
    if (lastVerifiedAt === null || signal.observedAt > lastVerifiedAt) acceptedConcern += 1;
  }

  const hasOperationalConcern = route.operational_status !== "active";
  const staleVerification = route.verified
    && (lastVerifiedAt === null || Math.max(0, now.getTime() - lastVerifiedAt) > STALE_VERIFICATION_MS);
  const needsAttention = hasOperationalConcern || !route.verified || staleVerification || acceptedConcern > 0 || pending > 0;
  const priority = hasOperationalConcern
    ? 4
    : acceptedConcern > 0
      ? 3
      : pending > 0
        ? 2
        : !route.verified || staleVerification
          ? 1
          : 0;

  return { acceptedSeen, acceptedConcern, pending, staleVerification, needsAttention, priority };
}
