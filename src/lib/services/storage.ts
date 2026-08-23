import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

export { BUCKET, formatBytes } from "@/lib/storage-shared";

export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = Number(
  process.env.MAX_UPLOAD_SIZE_BYTES || 2 * 1024 * 1024 * 1024
);

// Extensions we refuse to store, regardless of declared MIME type — these
// are almost never legitimate personal/business documents and are the
// most common vector for abusing shared storage.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "sh", "msi", "com", "scr", "js", "jar", "vbs", "ps1", "app",
]);

export function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function assertSafeFilename(filename: string) {
  if (!filename || filename.length > 255) {
    throw new Error("Nome de arquivo inválido.");
  }
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    throw new Error("Nome de arquivo inválido.");
  }
  const ext = getExtension(filename);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error("Este tipo de arquivo não é permitido.");
  }
}

/**
 * Computes bytes currently used by a user (active files only) directly
 * from the files table via the RPC defined in the migration, so it is
 * always derived from the source of truth rather than a cached counter
 * that could drift.
 */
export async function getStorageUsed(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_storage_used", { p_user_id: userId });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function assertQuotaAvailable(
  supabase: SupabaseClient,
  profile: Profile,
  additionalBytes: number
) {
  const used = await getStorageUsed(supabase, profile.user_id);
  if (used + additionalBytes > profile.storage_quota_bytes) {
    throw new Error(
      "Você não possui espaço suficiente para enviar este arquivo."
    );
  }
}

export function buildStoragePath(userId: string, folderId: string | null, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const folderSegment = folderId ?? "root";
  return `${userId}/${folderSegment}/${unique}-${safeName}`;
}
