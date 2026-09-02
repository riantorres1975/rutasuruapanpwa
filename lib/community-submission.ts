import { createHmac } from "node:crypto";
import { getAdminSupabaseConfig } from "@/lib/supabase/config";

export function hashSubmitter(ip: string): string | null {
  if (ip === "unknown") return null;
  const secret = process.env.REPORTER_HASH_SECRET?.trim() || getAdminSupabaseConfig()?.secretKey;
  if (!secret) return null;

  return createHmac("sha256", secret).update(ip).digest("hex").slice(0, 32);
}

export function getSafeSourcePath(request: Request, submittedPath: string | null): string | null {
  if (!submittedPath) return null;
  try {
    return new URL(submittedPath, new URL(request.url).origin).pathname.slice(0, 300);
  } catch {
    return null;
  }
}
