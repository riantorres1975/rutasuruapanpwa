import { afterEach, describe, expect, it } from "vitest";
import { getAdminAuthCallbackUrl } from "@/lib/admin-auth-redirect";

const originalRedirect = process.env.ADMIN_AUTH_REDIRECT_URL;

afterEach(() => {
  if (originalRedirect === undefined) delete process.env.ADMIN_AUTH_REDIRECT_URL;
  else process.env.ADMIN_AUTH_REDIRECT_URL = originalRedirect;
});

describe("getAdminAuthCallbackUrl", () => {
  it("usa producción aunque la solicitud se origine durante una prueba local", () => {
    delete process.env.ADMIN_AUTH_REDIRECT_URL;

    expect(getAdminAuthCallbackUrl()).toBe("https://www.urugo.app/auth/callback");
  });

  it("permite un callback local configurado explícitamente", () => {
    process.env.ADMIN_AUTH_REDIRECT_URL = "http://localhost:3000/otra-ruta?dato=1";

    expect(getAdminAuthCallbackUrl()).toBe("http://localhost:3000/auth/callback");
  });

  it("descarta protocolos inseguros", () => {
    process.env.ADMIN_AUTH_REDIRECT_URL = "javascript:alert(1)";

    expect(getAdminAuthCallbackUrl()).toBe("https://www.urugo.app/auth/callback");
  });
});
