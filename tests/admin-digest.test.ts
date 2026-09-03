import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendAdminDigest } from "@/lib/admin-digest";

const ENVIRONMENT_KEYS = [
  "ADMIN_EMAILS",
  "ADMIN_NOTIFICATION_EMAILS",
  "ADMIN_NOTIFICATION_FROM",
  "RESEND_API_KEY",
] as const;
const originalEnvironment = Object.fromEntries(
  ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]),
);

describe("resumen administrativo", () => {
  beforeEach(() => {
    for (const key of ENVIRONMENT_KEYS) delete process.env[key];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ENVIRONMENT_KEYS) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("no envia correo cuando la bandeja esta vacia", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAdminDigest({ pendingReports: 0, pendingSignals: 0, reviewingReports: 0 }, "2026-09-03"))
      .resolves.toBe("empty");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("permanece desactivado mientras falte la configuracion", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAdminDigest({ pendingReports: 1, pendingSignals: 0, reviewingReports: 0 }, "2026-09-03"))
      .resolves.toBe("unconfigured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("envia un resumen idempotente a los administradores configurados", async () => {
    process.env.ADMIN_EMAILS = "Admin@Example.com, second@example.com, admin@example.com";
    process.env.ADMIN_NOTIFICATION_FROM = "UruGo <avisos@auth.urugo.app>";
    process.env.RESEND_API_KEY = "re_secret";
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: "email-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendAdminDigest({ pendingReports: 2, pendingSignals: 4, reviewingReports: 1 }, "2026-09-03"))
      .resolves.toBe("sent");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({
      authorization: "Bearer re_secret",
      "idempotency-key": "urugo-admin-digest-2026-09-03",
      "user-agent": "UruGo/1.0",
    });
    expect(body).toMatchObject({
      from: "UruGo <avisos@auth.urugo.app>",
      subject: "UruGo: 7 elementos por revisar",
      to: ["admin@example.com", "second@example.com"],
    });
    expect(body.text).toContain("Reportes pendientes: 2");
    expect(JSON.stringify(body)).not.toContain("re_secret");
  });

  it("informa el fallo del proveedor sin exponer su respuesta", async () => {
    process.env.ADMIN_NOTIFICATION_EMAILS = "admin@example.com";
    process.env.ADMIN_NOTIFICATION_FROM = "UruGo <avisos@auth.urugo.app>";
    process.env.RESEND_API_KEY = "re_secret";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("provider details", { status: 422 })));

    await expect(sendAdminDigest({ pendingReports: 1, pendingSignals: 0, reviewingReports: 0 }, "2026-09-03"))
      .rejects.toThrow("Resend rechazo el resumen administrativo (422)");
  });
});
