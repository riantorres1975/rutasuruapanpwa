export const CLIENT_ERROR_KINDS = ["boundary", "window-error", "unhandled-rejection"] as const;
export const CLIENT_ERROR_SOURCES = ["app", "mapa", "window"] as const;

export type ClientErrorKind = (typeof CLIENT_ERROR_KINDS)[number];
export type ClientErrorSource = (typeof CLIENT_ERROR_SOURCES)[number];

export type ClientErrorReport = {
  fingerprint: string;
  kind: ClientErrorKind;
  online: boolean;
  path: string;
  source: ClientErrorSource;
};

const sentFingerprints = new Set<string>();

function fingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function errorSignature(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}\n${value.message}\n${value.stack ?? ""}`.slice(0, 4_096);
  }
  return `${typeof value}:${String(value)}`.slice(0, 4_096);
}

export function sanitizeErrorPath(path: string): string {
  const cleanPath = path.split(/[?#]/, 1)[0] || "/";
  return cleanPath.startsWith("/") ? cleanPath.slice(0, 160) : "/";
}

export function createClientErrorReport(
  error: unknown,
  kind: ClientErrorKind,
  source: ClientErrorSource,
  path: string,
  online: boolean,
): ClientErrorReport {
  return {
    fingerprint: fingerprint(errorSignature(error)),
    kind,
    online,
    path: sanitizeErrorPath(path),
    source,
  };
}

export function isClientErrorReport(value: unknown): value is ClientErrorReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<ClientErrorReport>;
  const keys = Object.keys(report).sort();
  return (
    keys.join(",") === "fingerprint,kind,online,path,source" &&
    typeof report.fingerprint === "string" &&
    /^[a-f0-9]{8}$/.test(report.fingerprint) &&
    typeof report.path === "string" &&
    report.path.length > 0 &&
    report.path.length <= 160 &&
    report.path.startsWith("/") &&
    !/[?#]/.test(report.path) &&
    typeof report.online === "boolean" &&
    CLIENT_ERROR_KINDS.includes(report.kind as ClientErrorKind) &&
    CLIENT_ERROR_SOURCES.includes(report.source as ClientErrorSource)
  );
}

export function reportClientError(
  error: unknown,
  kind: ClientErrorKind,
  source: ClientErrorSource,
): void {
  if (typeof window === "undefined") return;

  const report = createClientErrorReport(
    error,
    kind,
    source,
    window.location.pathname,
    navigator.onLine,
  );
  if (sentFingerprints.has(report.fingerprint)) return;
  sentFingerprints.add(report.fingerprint);

  const body = JSON.stringify(report);
  if (navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))) {
    return;
  }

  void fetch("/api/client-error", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
    keepalive: true,
  }).catch(() => undefined);
}
