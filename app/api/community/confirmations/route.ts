import { NextRequest } from "next/server";
import { isDuplicateRouteConfirmationError, parseRouteConfirmation } from "@/lib/community-report";
import { getSafeSourcePath, hashSubmitter } from "@/lib/community-submission";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const MAX_BODY_BYTES = 4_000;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });

  const ip = getClientIp(request);
  if (!(await rateLimit(`route-confirmation:${ip}`, 12, 24 * 60 * 60_000))) {
    return Response.json({ error: "Ya registramos varias confirmaciones desde este dispositivo hoy." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  const confirmation = parseRouteConfirmation(raw);
  if (!confirmation) {
    return Response.json({ error: "La confirmación no es válida." }, { status: 400 });
  }
  if (confirmation.website) return Response.json({ ok: true }, { status: 201 });

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return Response.json({ error: "Las confirmaciones todavía no están configuradas." }, { status: 503 });
  }

  const { error } = await supabase.from("route_confirmations").insert({
    route_key: confirmation.routeKey,
    route_name: confirmation.routeName,
    confirmation_type: confirmation.confirmationType,
    note: confirmation.note,
    source_path: getSafeSourcePath(request, confirmation.sourcePath),
    submitted_by_hash: hashSubmitter(ip),
  });

  if (error) {
    if (isDuplicateRouteConfirmationError(error)) {
      return Response.json({ ok: true, duplicate: true }, { status: 200 });
    }
    console.error("[route-confirmation] No se pudo guardar:", error.message);
    return Response.json({ error: "No pudimos guardar la confirmación." }, { status: 502 });
  }

  return Response.json({ ok: true }, { status: 201 });
}
