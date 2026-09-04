import { authenticateCommunityApiRequest } from "@/lib/community-api-auth";
import { parseCommunityReport } from "@/lib/community-report";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { findRouteSeoItem } from "@/lib/route-seo";
import {
  hasJsonContentType,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";

const MAX_BODY_BYTES = 24_000;
const AUTH_ATTEMPT_LIMIT = 60;
const CLIENT_WINDOW_MS = 60 * 60_000;

function noStoreHeaders(extra: Record<string, string> = {}): HeadersInit {
  return { "cache-control": "no-store", ...extra };
}

export async function POST(request: Request) {
  if (!hasJsonContentType(request)) {
    return Response.json(
      { error: "Content-Type debe ser application/json." },
      { status: 415, headers: noStoreHeaders() },
    );
  }

  const ip = getClientIp(request);
  if (!(await rateLimit(`community-api-auth:${ip}`, AUTH_ATTEMPT_LIMIT, 10 * 60_000))) {
    return Response.json(
      { error: "Demasiados intentos de autenticación." },
      { status: 429, headers: noStoreHeaders({ "retry-after": "600" }) },
    );
  }

  const auth = await authenticateCommunityApiRequest(request);
  if (auth.status === "unavailable") {
    return Response.json(
      { error: "El servicio de aportes no está disponible temporalmente." },
      { status: 503, headers: noStoreHeaders() },
    );
  }
  if (auth.status === "invalid") {
    return Response.json(
      { error: "Credencial no válida." },
      { status: 401, headers: noStoreHeaders({ "www-authenticate": "Bearer" }) },
    );
  }

  if (!(await rateLimit(
    `community-api-client:${auth.client.id}`,
    auth.client.hourlyLimit,
    CLIENT_WINDOW_MS,
  ))) {
    return Response.json(
      { error: "Cuota por hora agotada." },
      { status: 429, headers: noStoreHeaders({ "retry-after": "3600" }) },
    );
  }

  let raw: unknown;
  try {
    raw = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json(
        { error: error.message },
        { status: error.status, headers: noStoreHeaders() },
      );
    }
    throw error;
  }

  const report = parseCommunityReport(raw);
  if (!report || report.website) {
    return Response.json(
      { error: "El reporte no cumple el contrato de la API." },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const linkedRoute = report.routeKey ? findRouteSeoItem(report.routeKey) : null;
  const { data, error } = await auth.supabase
    .from("community_reports")
    .insert({
      api_client_id: auth.client.id,
      contact: report.contact,
      description: report.description,
      evidence_url: report.evidenceUrl,
      expected_result: report.expectedResult,
      place: report.place,
      proposed_path: report.proposedPath,
      report_type: report.reportType,
      route_key: linkedRoute?.slug ?? null,
      route_name: linkedRoute?.name ?? report.routeName,
      source_path: report.sourcePath,
      status: "pending",
      submission_source: "external_api",
      submitted_by_hash: null,
      user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[community-api] No se pudo guardar el reporte:", error?.message ?? "Sin fila");
    return Response.json(
      { error: "No se pudo registrar el reporte." },
      { status: 502, headers: noStoreHeaders() },
    );
  }

  return Response.json(
    { id: data.id, status: "pending" },
    { status: 202, headers: noStoreHeaders() },
  );
}
