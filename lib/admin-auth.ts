import { getConfiguredAdminEmails, isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseAdminClient, createSupabaseSessionClient } from "@/lib/supabase/server";

export type AdminAccess =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "denied"; email: string | null }
  | { status: "admin"; userId: string; email: string };

export async function getAdminAccess(): Promise<AdminAccess> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };
  const sessionClient = await createSupabaseSessionClient();
  if (!sessionClient) return { status: "unconfigured" };

  const { data, error } = await sessionClient.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };

  const email = data.user.email?.trim().toLowerCase() ?? null;
  if (email && getConfiguredAdminEmails().has(email)) {
    return { status: "admin", userId: data.user.id, email };
  }

  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return { status: "denied", email };
  const { data: memberByUser } = await adminClient
    .from("admin_members")
    .select("active")
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (memberByUser?.active && email) return { status: "admin", userId: data.user.id, email };

  const { data: memberByEmail } = email
    ? await adminClient.from("admin_members").select("active").eq("email", email).eq("active", true).maybeSingle()
    : { data: null };

  return memberByEmail?.active && email
    ? { status: "admin", userId: data.user.id, email }
    : { status: "denied", email };
}
