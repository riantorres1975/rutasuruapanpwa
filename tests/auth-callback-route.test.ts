import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseSessionClient: vi.fn(async () => ({ auth })),
}));

import { GET } from "@/app/auth/callback/route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    auth.exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
    auth.verifyOtp.mockReset().mockResolvedValue({ error: null });
  });

  it("valida enlaces SSR con token hash", async () => {
    const response = await GET(new NextRequest(
      "http://localhost:3000/auth/callback?token_hash=hash&type=email",
    ));

    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "hash", type: "email" });
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("mantiene compatibilidad con códigos PKCE", async () => {
    const response = await GET(new NextRequest(
      "http://localhost:3000/auth/callback?code=pkce-code&next=/admin",
    ));

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("rechaza tipos de token y redirecciones externas", async () => {
    const response = await GET(new NextRequest(
      "http://localhost:3000/auth/callback?token_hash=hash&type=recovery&next=https://evil.example",
    ));

    expect(auth.verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("/admin/login?error=");
  });
});
