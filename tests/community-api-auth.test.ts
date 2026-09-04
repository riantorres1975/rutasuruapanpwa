import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  authenticateCommunityApiRequest,
  hashCommunityApiKey,
} from "@/lib/community-api-auth";

const validKey = `urugo_sk_${"a".repeat(43)}`;

function request(key = validKey) {
  return new Request("https://www.urugo.app/api/v1/community/reports", {
    headers: { authorization: `Bearer ${key}` },
  });
}

function authClient(result: { data: unknown; error: { message: string } | null }) {
  const maybeSingle = vi.fn(async () => result);
  const selectBuilder: Record<string, unknown> = {};
  selectBuilder.eq = vi.fn(() => selectBuilder);
  selectBuilder.is = vi.fn(() => selectBuilder);
  selectBuilder.maybeSingle = maybeSingle;
  const updateEq = vi.fn(async () => ({ error: null }));
  const from = vi.fn()
    .mockReturnValueOnce({ select: vi.fn(() => selectBuilder) })
    .mockReturnValueOnce({ update: vi.fn(() => ({ eq: updateEq })) });

  return { client: { from } as unknown as SupabaseClient, from, maybeSingle, updateEq };
}

describe("autenticación de integraciones comunitarias", () => {
  it("rechaza credenciales ausentes o con formato incorrecto sin consultar la base", async () => {
    const { client, from } = authClient({ data: null, error: null });

    await expect(authenticateCommunityApiRequest(new Request("https://example.com"), client))
      .resolves.toEqual({ status: "invalid" });
    await expect(authenticateCommunityApiRequest(request("corta"), client))
      .resolves.toEqual({ status: "invalid" });
    expect(from).not.toHaveBeenCalled();
  });

  it("autoriza un cliente activo usando únicamente el hash de la clave", async () => {
    const { client, from, updateEq } = authClient({
      data: { hourly_limit: 30, id: "client-1", name: "Integración de prueba" },
      error: null,
    });

    await expect(authenticateCommunityApiRequest(request(), client)).resolves.toMatchObject({
      client: { hourlyLimit: 30, id: "client-1", name: "Integración de prueba" },
      status: "authorized",
    });

    const selectBuilder = from.mock.results[0].value.select.mock.results[0].value;
    expect(selectBuilder.eq).toHaveBeenCalledWith("key_hash", hashCommunityApiKey(validKey));
    expect(selectBuilder.eq).toHaveBeenCalledWith("active", true);
    expect(selectBuilder.is).toHaveBeenCalledWith("revoked_at", null);
    expect(updateEq).toHaveBeenCalledWith("id", "client-1");
  });

  it("no confunde una falla de Supabase con una clave inválida", async () => {
    const { client } = authClient({ data: null, error: { message: "database unavailable" } });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(authenticateCommunityApiRequest(request(), client))
      .resolves.toEqual({ status: "unavailable" });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
