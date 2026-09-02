"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient, createSupabaseSessionClient } from "@/lib/supabase/server";

const REVIEW_STATUSES = new Set(["reviewing", "approved", "rejected"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewCommunityReport(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para moderar reportes.");

  const reportId = String(formData.get("reportId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1_000);
  if (!UUID_PATTERN.test(reportId) || !REVIEW_STATUSES.has(status)) {
    throw new Error("La acción de moderación no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { error } = await supabase
    .from("community_reports")
    .update({
      status,
      moderator_note: note || null,
      reviewed_by: access.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) throw new Error(`No se pudo actualizar el reporte: ${error.message}`);
  revalidatePath("/admin");
}

export async function signOutAdmin() {
  const supabase = await createSupabaseSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}
