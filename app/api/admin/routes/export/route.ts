import { getAdminAccess } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const REVISION_PAGE_SIZE = 500;

type QueryError = { message: string };
type RevisionResult = { data: unknown[]; error: QueryError | null };

async function getAllRevisions(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
): Promise<RevisionResult> {
  const revisions: unknown[] = [];

  for (let offset = 0; ; offset += REVISION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("route_revisions")
      .select("id,route_id,version,name,original_name,color,corridor_width_m,verified,path,landmarks,operational_status,change_summary,source,created_at")
      .order("route_id", { ascending: true })
      .order("version", { ascending: true })
      .range(offset, offset + REVISION_PAGE_SIZE - 1);

    if (error) return { data: [], error };
    revisions.push(...(data ?? []));
    if (!data || data.length < REVISION_PAGE_SIZE) break;
  }

  return { data: revisions, error: null };
}

export async function GET() {
  const access = await getAdminAccess();
  if (access.status === "unconfigured") {
    return Response.json({ error: "La administración no está configurada." }, { status: 503 });
  }
  if (access.status === "anonymous") {
    return Response.json({ error: "Inicia sesión para descargar el respaldo." }, { status: 401 });
  }
  if (access.status !== "admin") {
    return Response.json({ error: "No tienes acceso a este respaldo." }, { status: 403 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "Supabase no está configurado." }, { status: 503 });
  }

  const [routesResult, revisionsResult] = await Promise.all([
    supabase
      .from("routes")
      .select("id,name,original_name,color,corridor_width_m,verified,path,landmarks,operational_status,publication_status,data_version,last_verified_at,published_at,created_at,updated_at")
      .order("id", { ascending: true }),
    getAllRevisions(supabase),
  ]);

  if (routesResult.error || revisionsResult.error) {
    console.error("[route-backup] No se pudo generar:", routesResult.error?.message ?? revisionsResult.error?.message);
    return Response.json({ error: "No se pudo generar el respaldo." }, { status: 502 });
  }

  const createdAt = new Date().toISOString();
  const routes = routesResult.data ?? [];
  const backup = {
    schemaVersion: 1,
    createdAt,
    scope: "routes-and-revisions",
    counts: { routes: routes.length, revisions: revisionsResult.data.length },
    routes,
    revisions: revisionsResult.data,
  };
  const date = createdAt.slice(0, 10);

  return new Response(JSON.stringify(backup), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="urugo-rutas-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
