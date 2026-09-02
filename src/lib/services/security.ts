import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type SecurityAction =
  | "auth.register"
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset_requested"
  | "auth.password_changed"
  | "file.upload"
  | "file.download"
  | "file.delete"
  | "file.restore"
  | "file.permanent_delete"
  | "folder.create"
  | "folder.delete"
  | "share.create"
  | "share.revoke"
  | "share.access_denied"
  | "admin.user_blocked"
  | "admin.user_unblocked"
  | "admin.plan_changed"
  | "vpn.profile_create"
  | "vpn.profile_revoke"
  | "vpn.config_download"
  | "vpn.link_regenerate"
  | "vpn.node_sync"
  | "data.export"
  | "account.delete_requested"
  | "access.denied";

/**
 * Writes an audit trail entry. Uses the admin client because this must
 * succeed even for actions like "access denied" where the acting request
 * may not carry a normal write-capable session context. Never accepts
 * arbitrary user_id from client input — callers must pass the id they
 * resolved from the authenticated session.
 */
export async function logSecurityEvent(params: {
  userId: string | null;
  action: SecurityAction;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  try {
    const admin = createAdminSupabaseClient();
    await admin.from("security_logs").insert({
      user_id: params.userId,
      action: params.action,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch (err) {
    // Logging must never break the primary request flow.
    console.error("Failed to write security log", err);
  }
}
