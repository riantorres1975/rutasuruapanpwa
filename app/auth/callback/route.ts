import { NextRequest, NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const next = requestedNext?.startsWith("/admin") ? requestedNext : "/admin";
  const supabase = await createSupabaseSessionClient();

  if (supabase && tokenHash && type === "email") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  } else if (supabase && code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("error", "No se pudo validar el enlace. Solicita uno nuevo.");
  return NextResponse.redirect(login);
}
