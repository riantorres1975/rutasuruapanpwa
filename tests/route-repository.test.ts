import { afterEach, describe, expect, it } from "vitest";
import { getPublishedRouteData } from "@/lib/route-repository";

describe("route repository", () => {
  const original = {
    routeDataSource: process.env.ROUTE_DATA_SOURCE,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY,
    legacyServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  afterEach(() => {
    restoreEnv("ROUTE_DATA_SOURCE", original.routeDataSource);
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", original.supabaseUrl);
    restoreEnv("SUPABASE_SECRET_KEY", original.serviceRoleKey);
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", original.legacyServiceRoleKey);
  });

  it("mantiene el JSON como fuente predeterminada", async () => {
    delete process.env.ROUTE_DATA_SOURCE;
    const bundle = await getPublishedRouteData();
    expect(bundle.source).toBe("static");
    expect(bundle.routes.length).toBeGreaterThan(0);
  });

  it("vuelve al JSON si Supabase todavía no está configurado", async () => {
    process.env.ROUTE_DATA_SOURCE = "supabase";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bundle = await getPublishedRouteData();
    expect(bundle.source).toBe("static-fallback");
    expect(bundle.routes.length).toBeGreaterThan(0);
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
