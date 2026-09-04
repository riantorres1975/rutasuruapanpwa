import type { SupabaseClient } from "@supabase/supabase-js";

const DAY_MS = 24 * 60 * 60 * 1_000;

export const PRIVATE_DATA_RETENTION_DAYS = {
  audit: 365,
  openSubmission: 365,
  resolvedSubmission: 180,
} as const;

export type PrivateModerationCleanupCounts = {
  confirmationAuditsDeleted: number;
  confirmationsDeleted: number;
  reportAuditsDeleted: number;
  reportsDeleted: number;
};

export const EMPTY_PRIVATE_MODERATION_CLEANUP: PrivateModerationCleanupCounts = {
  confirmationAuditsDeleted: 0,
  confirmationsDeleted: 0,
  reportAuditsDeleted: 0,
  reportsDeleted: 0,
};

function retentionCutoff(now: Date, days: number): string {
  return new Date(now.getTime() - days * DAY_MS).toISOString();
}

function deletedRows(data: unknown[] | null): number {
  return data?.length ?? 0;
}

export async function cleanupExpiredRateLimitBuckets(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<number> {
  const { data, error } = await supabase
    .from("rate_limit_buckets")
    .delete()
    .lt("reset_at", now.toISOString())
    .select("key_hash");

  if (error) {
    throw error;
  }

  return data?.length ?? 0;
}

export async function cleanupPrivateModerationData(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<PrivateModerationCleanupCounts> {
  const resolvedCutoff = retentionCutoff(now, PRIVATE_DATA_RETENTION_DAYS.resolvedSubmission);
  const openCutoff = retentionCutoff(now, PRIVATE_DATA_RETENTION_DAYS.openSubmission);
  const auditCutoff = retentionCutoff(now, PRIVATE_DATA_RETENTION_DAYS.audit);

  const [resolvedReports, openReports, resolvedConfirmations, openConfirmations] = await Promise.all([
    supabase
      .from("community_reports")
      .delete()
      .in("status", ["approved", "rejected"])
      .lt("reviewed_at", resolvedCutoff)
      .select("id"),
    supabase
      .from("community_reports")
      .delete()
      .in("status", ["pending", "reviewing"])
      .lt("created_at", openCutoff)
      .select("id"),
    supabase
      .from("route_confirmations")
      .delete()
      .in("status", ["accepted", "dismissed"])
      .lt("reviewed_at", resolvedCutoff)
      .select("id"),
    supabase
      .from("route_confirmations")
      .delete()
      .eq("status", "pending")
      .lt("created_at", openCutoff)
      .select("id"),
  ]);

  for (const result of [resolvedReports, openReports, resolvedConfirmations, openConfirmations]) {
    if (result.error) throw result.error;
  }

  // Las referencias ya quedaron en null por ON DELETE SET NULL; la bitácora
  // se conserva por más tiempo para auditar decisiones administrativas.
  const [reportAudits, confirmationAudits] = await Promise.all([
    supabase
      .from("moderation_audit")
      .delete()
      .lt("created_at", auditCutoff)
      .select("id"),
    supabase
      .from("confirmation_moderation_audit")
      .delete()
      .lt("created_at", auditCutoff)
      .select("id"),
  ]);

  if (reportAudits.error) throw reportAudits.error;
  if (confirmationAudits.error) throw confirmationAudits.error;

  return {
    confirmationAuditsDeleted: deletedRows(confirmationAudits.data),
    confirmationsDeleted:
      deletedRows(resolvedConfirmations.data) + deletedRows(openConfirmations.data),
    reportAuditsDeleted: deletedRows(reportAudits.data),
    reportsDeleted: deletedRows(resolvedReports.data) + deletedRows(openReports.data),
  };
}
