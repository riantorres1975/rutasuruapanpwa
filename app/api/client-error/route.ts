import { after, NextRequest } from "next/server";
import { isClientErrorReport } from "@/lib/client-error-report";
import {
  isOperationsAlertConfigured,
  notifyCriticalClientError,
} from "@/lib/operations-alert";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { hasJsonContentType, isSameOriginRequest } from "@/lib/request-security";

const MAX_BODY_BYTES = 2_048;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return new Response(null, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return new Response(null, { status: 415 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload demasiado grande" }, { status: 413 });
  }

  const ip = getClientIp(request);
  if (!(await rateLimit(`client-error:${ip}`, 20, 60_000))) {
    return new Response(null, { status: 429 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload demasiado grande" }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Payload invalido" }, { status: 400 });
  }

  if (!isClientErrorReport(payload)) {
    return Response.json({ error: "Payload invalido" }, { status: 400 });
  }

  console.error("[client-error]", JSON.stringify(payload));

  if (payload.kind === "boundary" && isOperationsAlertConfigured()) {
    after(async () => {
      const result = await notifyCriticalClientError(payload);
      if (result === "failed") {
        console.error("[client-error-alert] No se pudo entregar la alerta");
      }
    });
  }

  return new Response(null, { status: 204 });
}
