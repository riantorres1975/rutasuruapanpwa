type PublicSupabaseConfig = {
  url: string;
  publishableKey: string;
};

type AdminSupabaseConfig = PublicSupabaseConfig & {
  secretKey: string;
};

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      return null;
    }
  } catch {
    return null;
  }

  return { url, publishableKey };
}

export function getAdminSupabaseConfig(): AdminSupabaseConfig | null {
  const publicConfig = getPublicSupabaseConfig();
  const secretKey = clean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  return publicConfig && secretKey ? { ...publicConfig, secretKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return getAdminSupabaseConfig() !== null;
}

export function getConfiguredAdminEmails(): Set<string> {
  return new Set(
    clean(process.env.ADMIN_EMAILS)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
