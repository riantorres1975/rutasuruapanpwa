import { NextRequest } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";
import { createSupabaseAdminClient, createSupabasePublicServerClient } from "@/lib/supabase/server";
import { getConfiguredAdminEmails } from "@/lib/supabase/config";
import { getAdminAuthCallbackUrl } from "@/lib/admin-auth-redirect";

const MAX_BODY_BYTES = 1_000;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new Response(null, { status: 403 });
  if (!hasJsonContentType(request)) return new Response(null, { status: 415 });

  const ip = getClientIp(request);
  if (!(await rateLimit(`admin-magic-link:${ip}`, 5, 15 * 60_000))) {
    return Response.json({ error: "Espera unos minutos antes de solicitar otro enlace." }, { status: 429 });
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

  const email = typeof raw === "object" && raw !== null && "email" in raw && typeof raw.email === "string"
    ? raw.email.trim().toLowerCase()
    : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Escribe un correo válido." }, { status: 400 });
  }

  const supabase = createSupabasePublicServerClient();
  const adminClient = createSupabaseAdminClient();
  if (!supabase || !adminClient) {
    return Response.json({ error: "Supabase todavía no está configurado." }, { status: 503 });
  }

  const configured = getConfiguredAdminEmails().has(email);
  const { data: member } = configured
    ? { data: null }
    : await adminClient.from("admin_members").select("active").eq("email", email).eq("active", true).maybeSingle();
  if (!configured && !member?.active) {
    // Respuesta indistinguible para no revelar qué correos tienen acceso.
    return Response.json({ ok: true });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAdminAuthCallbackUrl(), shouldCreateUser: true },
  });

  if (error) {
    console.error("[admin-auth] No se pudo enviar el enlace:", error.message);
    return Response.json({ error: "No pudimos enviar el enlace de acceso." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
