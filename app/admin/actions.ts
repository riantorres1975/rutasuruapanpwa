"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminAccess } from "@/lib/admin-auth";
import {
  type RouteActionState,
  parseRoutePublicationForm,
} from "@/lib/admin-route";
import { createSupabaseAdminClient, createSupabaseSessionClient } from "@/lib/supabase/server";

const REVIEW_STATUSES = new Set(["reviewing", "approved", "rejected"]);
const CONFIRMATION_STATUSES = new Set(["pending", "accepted", "dismissed"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function refreshRouteViews(routeId: number) {
  revalidatePath("/admin");
  revalidatePath("/admin/routes");
  revalidatePath(`/admin/routes/${routeId}`);
  revalidatePath("/api/v1/routes");
  revalidatePath("/api/rutas-polyline");
  revalidatePath("/mapa");
}

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

export async function reviewRouteConfirmation(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para moderar señales.");

  const confirmationId = String(formData.get("confirmationId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim().slice(0, 1_000);
  if (!UUID_PATTERN.test(confirmationId) || !CONFIRMATION_STATUSES.has(status)) {
    throw new Error("La acción de moderación no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const pending = status === "pending";
  const { error } = await supabase
    .from("route_confirmations")
    .update({
      status,
      moderator_note: note || null,
      reviewed_by: pending ? null : access.userId,
      reviewed_at: pending ? null : new Date().toISOString(),
    })
    .eq("id", confirmationId);

  if (error) throw new Error(`No se pudo actualizar la señal: ${error.message}`);
  revalidatePath("/admin/signals");
  revalidatePath("/admin/routes");
}

export async function signOutAdmin() {
  const supabase = await createSupabaseSessionClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function publishRouteRevision(
  _previousState: RouteActionState,
  formData: FormData,
): Promise<RouteActionState> {
  const access = await getAdminAccess();
  if (access.status !== "admin") return { status: "error", message: "Tu sesión no permite publicar rutas." };

  const input = parseRoutePublicationForm(formData);
  if (!input) {
    return { status: "error", message: "Revisa los campos, el resumen y las coordenadas antes de publicar." };
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) return { status: "error", message: "Supabase no está configurado." };

  const { data: currentRoute, error: routeError } = await supabase
    .from("routes")
    .select("landmarks")
    .eq("id", input.routeId)
    .single();

  if (routeError || !currentRoute) {
    return { status: "error", message: "No se encontró la ruta que intentas publicar." };
  }

  const { data: nextVersion, error } = await supabase.rpc("publish_route_revision", {
    p_route_id: input.routeId,
    p_expected_version: input.expectedVersion,
    p_name: input.name,
    p_original_name: input.originalName,
    p_color: input.color,
    p_corridor_width_m: input.corridorWidthM,
    p_verified: input.verified,
    p_operational_status: input.operationalStatus,
    p_path: input.path,
    p_landmarks: currentRoute.landmarks ?? [],
    p_change_summary: input.changeSummary,
    p_report_id: input.reportId,
    p_actor_id: access.userId,
  });

  if (error) {
    console.error("[admin-routes] No se pudo publicar la revisión:", error.code, error.message);
    const stale = error.code === "40001";
    return {
      status: "error",
      message: stale
        ? "Alguien publicó otra versión mientras editabas. Recarga la página y revisa los cambios."
        : "No se pudo publicar la revisión. Comprueba que el reporte esté aprobado e intenta de nuevo.",
    };
  }

  refreshRouteViews(input.routeId);
  redirect(`/admin/routes/${input.routeId}?publicada=${Number(nextVersion)}`);
}

export async function restoreRouteRevision(formData: FormData) {
  const access = await getAdminAccess();
  if (access.status !== "admin") throw new Error("No tienes permiso para restaurar rutas.");

  const routeId = Number(formData.get("routeId"));
  const expectedVersion = Number(formData.get("expectedVersion"));
  const revisionId = String(formData.get("revisionId") ?? "").trim();
  if (!Number.isSafeInteger(routeId) || routeId <= 0 || !Number.isSafeInteger(expectedVersion) || !UUID_PATTERN.test(revisionId)) {
    throw new Error("La revisión seleccionada no es válida.");
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new Error("Supabase no está configurado.");

  const { data: revision, error: revisionError } = await supabase
    .from("route_revisions")
    .select("version,name,original_name,color,corridor_width_m,verified,path,landmarks,operational_status")
    .eq("id", revisionId)
    .eq("route_id", routeId)
    .single();

  if (revisionError || !revision) throw new Error("No se encontró la revisión que intentas restaurar.");

  const { data: nextVersion, error } = await supabase.rpc("publish_route_revision", {
    p_route_id: routeId,
    p_expected_version: expectedVersion,
    p_name: revision.name,
    p_original_name: revision.original_name,
    p_color: revision.color,
    p_corridor_width_m: revision.corridor_width_m,
    p_verified: revision.verified,
    p_operational_status: revision.operational_status,
    p_path: revision.path,
    p_landmarks: revision.landmarks ?? [],
    p_change_summary: `Restauración de la versión ${revision.version}`,
    p_report_id: null,
    p_actor_id: access.userId,
  });

  if (error) {
    console.error("[admin-routes] No se pudo restaurar la revisión:", error.code, error.message);
    throw new Error("No se pudo restaurar la revisión. Recarga la página e intenta de nuevo.");
  }
  refreshRouteViews(routeId);
  redirect(`/admin/routes/${routeId}?publicada=${Number(nextVersion)}&restaurada=${revision.version}`);
}
