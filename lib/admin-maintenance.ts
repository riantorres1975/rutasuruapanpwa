import type { SupabaseClient } from "@supabase/supabase-js";

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
