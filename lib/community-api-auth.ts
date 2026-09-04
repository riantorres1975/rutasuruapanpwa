import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const API_KEY_PATTERN = /^urugo_sk_[A-Za-z0-9_-]{40,64}$/;

export type CommunityApiClient = {
  hourlyLimit: number;
  id: string;
  name: string;
};

export type CommunityApiAuthResult =
  | { status: "authorized"; client: CommunityApiClient; supabase: SupabaseClient }
  | { status: "invalid" }
  | { status: "unavailable" };

export function hashCommunityApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer ([^\s]+)$/i);
  return match?.[1] ?? null;
}

export async function authenticateCommunityApiRequest(
  request: Request,
  supabase = createSupabaseAdminClient(),
): Promise<CommunityApiAuthResult> {
  const apiKey = bearerToken(request);
  if (!apiKey || !API_KEY_PATTERN.test(apiKey)) return { status: "invalid" };
  if (!supabase) return { status: "unavailable" };

  const { data, error } = await supabase
    .from("community_api_clients")
    .select("id,name,hourly_limit")
    .eq("key_hash", hashCommunityApiKey(apiKey))
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    console.error("[community-api-auth] No se pudo validar la integración:", error.message);
    return { status: "unavailable" };
  }
  if (!data) return { status: "invalid" };

  const hourlyLimit = Number(data.hourly_limit);
  if (!Number.isSafeInteger(hourlyLimit) || hourlyLimit < 1 || hourlyLimit > 1000) {
    return { status: "invalid" };
  }

  const { error: updateError } = await supabase
    .from("community_api_clients")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  if (updateError) {
    console.warn("[community-api-auth] No se actualizó last_used_at:", updateError.message);
  }

  return {
    status: "authorized",
    client: { hourlyLimit, id: data.id, name: data.name },
    supabase,
  };
}
