import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type ContributorReputation = {
  accepted: number;
  rejected: number;
  pending: number;
  lastContributionAt: string | null;
};

type ContributorReputationRow = {
  contributor_hash: string;
  accepted_count: number | string;
  rejected_count: number | string;
  pending_count: number | string;
  last_contribution_at: string | null;
};

const CONTRIBUTOR_HASH_PATTERN = /^[0-9a-f]{32}$/;

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatContributorHistory(reputation: ContributorReputation): string {
  return [
    countLabel(reputation.accepted, "aceptado", "aceptados"),
    countLabel(reputation.rejected, "descartado", "descartados"),
    countLabel(reputation.pending, "pendiente", "pendientes"),
  ].join(" · ");
}

export async function getContributorReputations(
  hashes: ReadonlyArray<string | null | undefined>,
): Promise<Map<string, ContributorReputation>> {
  const validHashes = [...new Set(hashes.filter(
    (hash): hash is string => typeof hash === "string" && CONTRIBUTOR_HASH_PATTERN.test(hash),
  ))].slice(0, 100);
  if (validHashes.length === 0) return new Map();

  const supabase = createSupabaseAdminClient();
  if (!supabase) return new Map();

  const { data, error } = await supabase.rpc("get_contributor_reputation", {
    p_hashes: validHashes,
  });
  if (error) {
    console.error("[community-reputation] No se pudo cargar el historial:", error.message);
    return new Map();
  }

  return new Map(((data ?? []) as ContributorReputationRow[]).map((row) => [
    row.contributor_hash,
    {
      accepted: Number(row.accepted_count) || 0,
      rejected: Number(row.rejected_count) || 0,
      pending: Number(row.pending_count) || 0,
      lastContributionAt: row.last_contribution_at,
    },
  ]));
}
