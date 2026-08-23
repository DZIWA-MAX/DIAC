import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Handles Supabase email confirmation / magic-link / OAuth redirects.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
