import { getConfiguredAdminEmails } from "@/lib/supabase/config";
import { SITE_URL } from "@/lib/site-url";

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RECIPIENTS = 50;

export type AdminDigestCounts = {
  pendingReports: number;
  reviewingReports: number;
  pendingSignals: number;
};

export type AdminDigestResult = "empty" | "sent" | "unconfigured";

type AdminDigestConfig = {
  apiKey: string;
  from: string;
  recipients: string[];
};

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRecipients(): string[] {
  const configured = clean(process.env.ADMIN_NOTIFICATION_EMAILS);
  const candidates = configured
    ? configured.split(",")
    : Array.from(getConfiguredAdminEmails());

  return Array.from(
    new Set(
      candidates
        .map((email) => email.trim().toLowerCase())
        .filter(isEmail),
    ),
  ).slice(0, MAX_RECIPIENTS);
}

function getAdminDigestConfig(): AdminDigestConfig | null {
  const apiKey = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.ADMIN_NOTIFICATION_FROM);
  const recipients = getRecipients();

  if (!apiKey || !from || recipients.length === 0 || /[\r\n]/.test(from)) {
    return null;
  }

  return { apiKey, from, recipients };
}

function totalPending(counts: AdminDigestCounts): number {
  return counts.pendingReports + counts.reviewingReports + counts.pendingSignals;
}

function buildText(counts: AdminDigestCounts): string {
  return [
    "Resumen diario de UruGo",
    "",
    `Reportes pendientes: ${counts.pendingReports}`,
    `Reportes en revision: ${counts.reviewingReports}`,
    `Senales pendientes: ${counts.pendingSignals}`,
    "",
    `Abrir panel: ${SITE_URL}/admin`,
  ].join("\n");
}

function buildHtml(counts: AdminDigestCounts): string {
  const adminUrl = `${SITE_URL}/admin`;

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#071007;color:#e8f2d8;font-family:Arial,sans-serif">
    <div style="max-width:560px;margin:0 auto;padding:40px 24px">
      <p style="margin:0 0 12px;color:#b7f533;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase">UruGo · Control de datos</p>
      <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">Hay información por revisar.</h1>
      <p style="margin:0 0 28px;color:#a8c888;line-height:1.6">Este es el resumen diario de la bandeja comunitaria.</p>
      <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #29451d">
        <tr><td style="padding:14px;border-bottom:1px solid #29451d">Reportes pendientes</td><td style="padding:14px;border-bottom:1px solid #29451d;text-align:right;font-weight:700">${counts.pendingReports}</td></tr>
        <tr><td style="padding:14px;border-bottom:1px solid #29451d">Reportes en revisión</td><td style="padding:14px;border-bottom:1px solid #29451d;text-align:right;font-weight:700">${counts.reviewingReports}</td></tr>
        <tr><td style="padding:14px">Señales pendientes</td><td style="padding:14px;text-align:right;font-weight:700">${counts.pendingSignals}</td></tr>
      </table>
      <p style="margin:28px 0 0"><a href="${adminUrl}" style="display:inline-block;background:#b7f533;color:#071007;padding:14px 20px;text-decoration:none;font-weight:700">Abrir panel</a></p>
    </div>
  </body>
</html>`;
}

export async function sendAdminDigest(
  counts: AdminDigestCounts,
  dateKey: string,
): Promise<AdminDigestResult> {
  if (totalPending(counts) === 0) return "empty";

  const config = getAdminDigestConfig();
  if (!config) return "unconfigured";

  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    body: JSON.stringify({
      from: config.from,
      to: config.recipients,
      subject: `UruGo: ${totalPending(counts)} elementos por revisar`,
      html: buildHtml(counts),
      text: buildText(counts),
    }),
    cache: "no-store",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `urugo-admin-digest-${dateKey}`,
      "user-agent": "UruGo/1.0",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Resend rechazo el resumen administrativo (${response.status})`);
  }

  return "sent";
}

