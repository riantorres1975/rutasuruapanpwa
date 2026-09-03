import { getPublicRouteSignalStatus, type AcceptedRouteSignal } from "@/lib/community-route-status";
import { findRouteSeoItem } from "@/lib/route-seo";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900",
};

type Context = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { key } = await params;
  if (!findRouteSeoItem(key)) {
    return Response.json({ error: "Ruta no encontrada." }, { status: 404 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "Estado temporalmente no disponible." }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000).toISOString();
  const { data, error } = await supabase
    .from("route_confirmations")
    .select("confirmation_type,observed_at,submitted_by_hash")
    .eq("route_key", key)
    .eq("status", "accepted")
    .gte("observed_at", cutoff)
    .order("observed_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[community-status] No se pudo resumir la ruta:", error.code, error.message);
    return Response.json({ error: "Estado temporalmente no disponible." }, { status: 503 });
  }

  return Response.json(getPublicRouteSignalStatus((data ?? []) as AcceptedRouteSignal[]), {
    headers: CACHE_HEADERS,
  });
}
