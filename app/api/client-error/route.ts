import { after, NextRequest } from "next/server";
import { isClientErrorReport } from "@/lib/client-error-report";
import {
  isOperationsAlertConfigured,
  notifyCriticalClientError,
} from "@/lib/operations-alert";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  hasJsonContentType,
  isSameOriginRequest,
  readJsonBodyWithLimit,
  RequestBodyError,
} from "@/lib/request-security";

const MAX_BODY_BYTES = 2_048;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return new Response(null, { status: 403 });
  }
  if (!hasJsonContentType(request)) {
    return new Response(null, { status: 415 });
  }

  const ip = getClientIp(request);
  if (!(await rateLimit(`client-error:${ip}`, 20, 60_000))) {
    return new Response(null, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithLimit(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
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
