import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientErrorReport } from "@/lib/client-error-report";
import {
  isOperationsAlertConfigured,
  notifyCriticalClientError,
} from "@/lib/operations-alert";

const originalUrl = process.env.ERROR_ALERT_WEBHOOK_URL;
const originalToken = process.env.ERROR_ALERT_WEBHOOK_TOKEN;

function report(fingerprint: string, kind: ClientErrorReport["kind"] = "boundary") {
  return {
    fingerprint,
    kind,
    online: true,
    path: "/mapa",
    source: "mapa",
  } satisfies ClientErrorReport;
}

describe("operations alerts", () => {
  beforeEach(() => {
    delete process.env.ERROR_ALERT_WEBHOOK_URL;
    delete process.env.ERROR_ALERT_WEBHOOK_TOKEN;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalUrl === undefined) delete process.env.ERROR_ALERT_WEBHOOK_URL;
    else process.env.ERROR_ALERT_WEBHOOK_URL = originalUrl;
    if (originalToken === undefined) delete process.env.ERROR_ALERT_WEBHOOK_TOKEN;
    else process.env.ERROR_ALERT_WEBHOOK_TOKEN = originalToken;
  });

  it("permanece desactivado sin un webhook HTTPS valido", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(isOperationsAlertConfigured()).toBe(false);
    expect(await notifyCriticalClientError(report("bad00001"))).toBe("disabled");

    process.env.ERROR_ALERT_WEBHOOK_URL = "http://alerts.example.com/hook";
    expect(isOperationsAlertConfigured()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("ignora errores que no requieren una alerta operativa", async () => {
    process.env.ERROR_ALERT_WEBHOOK_URL = "https://alerts.example.com/hook";

    expect(await notifyCriticalClientError(report("bad00002", "window-error"))).toBe("ignored");
  });

  it("envia solo los campos permitidos y un token opcional", async () => {
    process.env.ERROR_ALERT_WEBHOOK_URL = "https://alerts.example.com/hook";
    process.env.ERROR_ALERT_WEBHOOK_TOKEN = "secret-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await notifyCriticalClientError(report("feed0001"))).toBe("sent");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(init.body));
    expect(url).toBe("https://alerts.example.com/hook");
    expect(init.headers).toEqual({
      authorization: "Bearer secret-token",
      "content-type": "application/json",
    });
    expect(payload.event).toEqual({
      fingerprint: "feed0001",
      online: true,
      path: "/mapa",
      source: "mapa",
      type: "client_error",
    });
    expect(JSON.stringify(payload)).not.toMatch(/message|stack|location/i);
  });

  it("deduplica la misma huella durante la ventana de alerta", async () => {
    process.env.ERROR_ALERT_WEBHOOK_URL = "https://alerts.example.com/hook";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await notifyCriticalClientError(report("feed0002"))).toBe("sent");
    expect(await notifyCriticalClientError(report("feed0002"))).toBe("deduplicated");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
