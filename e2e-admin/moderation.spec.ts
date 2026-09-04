import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:3200";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const adminEmail = `admin-e2e-${runId}@example.com`;
const reportDescription = `Reporte aislado E2E ${runId}`;
const integrationName = `Integración E2E ${runId}`;

let adminClient: SupabaseClient;
let apiClientId: string | null = null;
let adminUserId: string | null = null;
let reportId: string | null = null;
let tokenHash: string | null = null;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name}.`);
  return value;
}

async function cleanupFixture() {
  if (!adminClient) return;

  if (reportId) {
    await adminClient.from("moderation_audit").delete().eq("report_id", reportId);
    await adminClient.from("community_reports").delete().eq("id", reportId);
  }
  if (apiClientId) await adminClient.from("community_api_clients").delete().eq("id", apiClientId);
  await adminClient.from("admin_members").delete().eq("email", adminEmail);
  if (adminUserId) await adminClient.auth.admin.deleteUser(adminUserId);
}

test.describe("moderación con Supabase aislado", () => {
  test.beforeAll(async () => {
    adminClient = createClient(
      required("TEST_SUPABASE_URL"),
      required("TEST_SUPABASE_SECRET_KEY"),
      { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } },
    );

    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
    });
    if (userError || !userData.user) throw userError ?? new Error("No se creó el administrador E2E.");
    adminUserId = userData.user.id;

    const { error: memberError } = await adminClient.from("admin_members").insert({
      active: true,
      display_name: "Administrador E2E",
      email: adminEmail,
      user_id: adminUserId,
    });
    if (memberError) throw memberError;

    const { data: reportData, error: reportError } = await adminClient
      .from("community_reports")
      .insert({
        description: reportDescription,
        report_type: "route_inactive",
        route_name: "Ruta de prueba",
        source_path: "/ruta/ruta-14-llanitos",
        status: "pending",
        submitted_by_hash: "0123456789abcdef0123456789abcdef",
      })
      .select("id")
      .single();
    if (reportError || !reportData) throw reportError ?? new Error("No se creó el reporte E2E.");
    reportId = reportData.id as string;

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      email: adminEmail,
      options: { redirectTo: `${BASE_URL}/auth/callback` },
      type: "magiclink",
    });
    if (linkError || !linkData.properties?.hashed_token) {
      throw linkError ?? new Error("No se generó el enlace E2E.");
    }
    tokenHash = linkData.properties.hashed_token;
  });

  test.afterAll(cleanupFixture);

  test("modera un reporte y administra una credencial externa", async ({ page }) => {
    if (!tokenHash || !reportId || !adminUserId) throw new Error("El fixture E2E no está completo.");

    await page.goto(`/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=email`);
    await expect(page).toHaveURL(/\/admin(?:\?|$)/);
    const report = page.locator("article").filter({ hasText: reportDescription });
    await expect(report).toBeVisible();

    await report.getByTitle("Marcar en revisión").click();
    await expect(report).not.toBeVisible();

    await expect.poll(async () => {
      const { data } = await adminClient
        .from("community_reports")
        .select("status,reviewed_by")
        .eq("id", reportId)
        .single();
      return data;
    }).toEqual({ status: "reviewing", reviewed_by: adminUserId });

    await page.goto("/admin?estado=reviewing");
    await expect(page.getByText(reportDescription)).toBeVisible();

    const { data: audit, error: auditError } = await adminClient
      .from("moderation_audit")
      .select("actor_id,next_status,previous_status,report_id")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    expect(auditError).toBeNull();
    expect(audit).toEqual({
      actor_id: adminUserId,
      next_status: "reviewing",
      previous_status: "pending",
      report_id: reportId,
    });

    await page.goto("/admin/integrations");
    await expect(page.getByRole("heading", { name: "Llaves con dueño y límite." })).toBeVisible();
    await page.getByLabel("Nombre").fill(integrationName);
    await page.getByLabel("Cuota por hora").fill("7");
    await page.getByRole("button", { name: "Crear clave" }).click();
    await expect(page.getByText("Guarda esta clave ahora. No volverá a mostrarse.")).toBeVisible();
    await expect(page.getByText(/^urugo_sk_[A-Za-z0-9_-]{43}$/)).toBeVisible();

    const { data: apiClient, error: apiClientError } = await adminClient
      .from("community_api_clients")
      .select("id,active,hourly_limit,key_hash,key_prefix")
      .eq("name", integrationName)
      .single();
    if (apiClientError || !apiClient) throw apiClientError ?? new Error("No se creó la integración E2E.");
    apiClientId = apiClient.id;
    expect(apiClient).toMatchObject({ active: true, hourly_limit: 7 });
    expect(apiClient.key_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(apiClient.key_prefix).toMatch(/^urugo_sk_[A-Za-z0-9_-]{11}$/);

    const integration = page.locator("article").filter({ hasText: integrationName });
    await integration.getByLabel(`Cuota por hora de ${integrationName}`).fill("12");
    await integration.getByRole("button", { name: "Guardar" }).click();
    await expect.poll(async () => {
      const { data } = await adminClient
        .from("community_api_clients")
        .select("hourly_limit")
        .eq("id", apiClientId)
        .single();
      return data?.hourly_limit;
    }).toBe(12);

    await integration.getByRole("button", { name: `Revocar ${integrationName}` }).click();
    await expect.poll(async () => {
      const { data } = await adminClient
        .from("community_api_clients")
        .select("active,revoked_at")
        .eq("id", apiClientId)
        .single();
      return { active: data?.active, revoked: Boolean(data?.revoked_at) };
    }).toEqual({ active: false, revoked: true });
  });
});
