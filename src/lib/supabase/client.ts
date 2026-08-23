"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Only ever uses the public anon key — safe to
 * ship to the client. All authorization is enforced by RLS + server-side
 * checks, never by hiding this client.
 *
 * Memoized as a module-level singleton so repeated calls across many
 * components don't spin up duplicate GoTrueClient auth listeners.
 */
let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
