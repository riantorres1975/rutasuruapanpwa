import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/community/reports/route";
import { resetMemoryRateLimitsForTests } from "@/lib/rate-limit";

const validPayload = {
  reportType: "route_changed",
  routeKey: "ruta-26-rio-volga",
  routeName: "Ruta 26",
  place: "Río Volga",
  description: "La ruta ahora gira antes de llegar a la avenida.",
  expectedResult: "Revisar el recorrido",
  contact: "",
  sourcePath: "/ruta/ruta-26",
  website: "",
};

function request(payload: unknown, headers: HeadersInit = {}) {
  return new NextRequest("http://localhost/api/community/reports", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.71", ...headers },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/community/reports", () => {
  const original = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    secret: process.env.SUPABASE_SECRET_KEY,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "";
    process.env.SUPABASE_SECRET_KEY = "";
    resetMemoryRateLimitsForTests();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = original.url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = original.key;
    process.env.SUPABASE_SECRET_KEY = original.secret;
  });

  it("explica que falta configurar persistencia sin perder los respaldos", async () => {
    const response = await POST(request(validPayload));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("GitHub") });
  });

  it("rechaza solicitudes externas antes de procesarlas", async () => {
    const response = await POST(request(validPayload, { origin: "https://example.com", "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(403);
  });

  it("consume silenciosamente el honeypot", async () => {
    const response = await POST(request({ ...validPayload, website: "https://spam.example" }));
    expect(response.status).toBe(201);
  });
});
