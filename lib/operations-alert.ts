import type { ClientErrorReport } from "@/lib/client-error-report";
import { rateLimit } from "@/lib/rate-limit";

const ALERT_COOLDOWN_MS = 15 * 60_000;
const ALERT_TIMEOUT_MS = 3_000;

type OperationsAlertConfig = {
  token?: string;
  url: string;
};

export type OperationsAlertResult =
  | "deduplicated"
  | "disabled"
  | "failed"
  | "ignored"
  | "sent";

function getOperationsAlertConfig(): OperationsAlertConfig | null {
  const rawUrl = process.env.ERROR_ALERT_WEBHOOK_URL?.trim();
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;

    const token = process.env.ERROR_ALERT_WEBHOOK_TOKEN?.trim();
    return { url: url.toString(), ...(token ? { token } : {}) };
  } catch {
    return null;
  }
}

export function isOperationsAlertConfigured(): boolean {
  return getOperationsAlertConfig() !== null;
}

export async function notifyCriticalClientError(
  report: ClientErrorReport,
): Promise<OperationsAlertResult> {
  if (report.kind !== "boundary") return "ignored";

  const config = getOperationsAlertConfig();
  if (!config) return "disabled";

  const allowed = await rateLimit(
    `client-error-alert:${report.source}:${report.fingerprint}`,
    1,
    ALERT_COOLDOWN_MS,
  );
  if (!allowed) return "deduplicated";

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.token) headers.authorization = `Bearer ${config.token}`;

  try {
    const response = await fetch(config.url, {
      method: "POST",
      body: JSON.stringify({
        text: `UruGo: error critico en ${report.source} (huella ${report.fingerprint})`,
        event: {
          fingerprint: report.fingerprint,
          online: report.online,
          path: report.path,
          source: report.source,
          type: "client_error",
        },
      }),
      cache: "no-store",
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });

    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
