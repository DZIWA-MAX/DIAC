import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. BYPASSES RLS.
 *
 * This must never be imported from any file that can end up in the
 * client bundle ("server-only" enforces that at build time) and must
 * never be used to fulfil a request without first verifying, from the
 * caller's own session, who they are and what they are allowed to touch.
 *
 * Legitimate uses: admin dashboards (after confirming role === 'admin'
 * from the caller's session), quota bookkeeping, generating short-lived
 * signed URLs for public share links.
 */
let adminClient: SupabaseClient | null = null;

export function createAdminSupabaseClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL env vars."
    );
  }

  adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
