import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const BASE_URL = "http://localhost:3200";
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const adminEmail = `admin-e2e-${runId}@example.com`;
const reportDescription = `Reporte aislado E2E ${runId}`;

let adminClient: SupabaseClient;
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

  test("inicia sesión, revisa un reporte y registra la auditoría", async ({ page }) => {
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
  });
});
