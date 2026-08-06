import { NextRequest } from "next/server";
import { isClientErrorReport } from "@/lib/client-error-report";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 2_048;

export async function POST(request: NextRequest) {
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
  return new Response(null, { status: 204 });
}
