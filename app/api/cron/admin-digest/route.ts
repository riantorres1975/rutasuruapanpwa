import { sendAdminDigest, type AdminDigestCounts } from "@/lib/admin-digest";
import {
  cleanupExpiredRateLimitBuckets,
  cleanupPrivateModerationData,
  EMPTY_PRIVATE_MODERATION_CLEANUP,
} from "@/lib/admin-maintenance";
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

async function countDigestData(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
): Promise<AdminDigestCounts> {
  const [pendingReports, reviewingReports, pendingSignals] = await Promise.all([
    countRows(supabase, "community_reports", "pending"),
    countRows(supabase, "community_reports", "reviewing"),
    countRows(supabase, "route_confirmations", "pending"),
  ]);

  return {
    pendingReports,
    pendingSignals,
    reviewingReports,
  };
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
    const counts = await countDigestData(supabase);
    const status = await sendAdminDigest(counts, mexicoCityDateKey());

    let expiredRateLimitBucketsDeleted = 0;
    try {
      expiredRateLimitBucketsDeleted = await cleanupExpiredRateLimitBuckets(supabase);
    } catch (maintenanceError) {
      console.warn(
        "[admin-digest] limpieza de rate_limit_buckets falló:",
        maintenanceError instanceof Error ? maintenanceError.message : "Error desconocido",
      );
    }

    let privateModeration = EMPTY_PRIVATE_MODERATION_CLEANUP;
    try {
      privateModeration = await cleanupPrivateModerationData(supabase);
    } catch (maintenanceError) {
      console.warn(
        "[admin-digest] limpieza de datos privados falló:",
        maintenanceError instanceof Error ? maintenanceError.message : "Error desconocido",
      );
    }

    return Response.json(
      {
        counts,
        maintenance: {
          expiredRateLimitBucketsDeleted,
          privateModeration,
        },
        ok: true,
        status,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("[admin-digest]", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo generar el resumen" }, { status: 502 });
  }
}
