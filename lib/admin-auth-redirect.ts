const PRODUCTION_ADMIN_CALLBACK_URL = "https://www.urugo.app/auth/callback";

function normalizeCallbackUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) return null;
    if (url.username || url.password || url.hash) return null;

    url.pathname = "/auth/callback";
    url.search = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function getAdminAuthCallbackUrl(): string {
  return normalizeCallbackUrl(process.env.ADMIN_AUTH_REDIRECT_URL)
    ?? PRODUCTION_ADMIN_CALLBACK_URL;
}
