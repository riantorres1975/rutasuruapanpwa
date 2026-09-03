import { sendAdminDigest, type AdminDigestCounts } from "@/lib/admin-digest";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function mexicoCityDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Mexico_City",
    year: "numeric",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function countRows(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  table: "community_reports" | "route_confirmations",
  status: "pending" | "reviewing",
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) throw error;
  return count ?? 0;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "Persistencia no configurada" }, { status: 503 });
  }

  try {
    const [pendingReports, reviewingReports, pendingSignals] = await Promise.all([
      countRows(supabase, "community_reports", "pending"),
      countRows(supabase, "community_reports", "reviewing"),
      countRows(supabase, "route_confirmations", "pending"),
    ]);
    const counts: AdminDigestCounts = {
      pendingReports,
      pendingSignals,
      reviewingReports,
    };
    const status = await sendAdminDigest(counts, mexicoCityDateKey());

    return Response.json(
      { counts, ok: true, status },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin-digest]", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo generar el resumen" }, { status: 502 });
  }
}
