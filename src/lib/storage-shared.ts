// Client-and-server-safe storage helpers — no secrets, no "server-only"
// import, safe to bundle into the browser. Server-only concerns (quota
// enforcement, filename safety checks against the database) live in
// @/lib/services/storage instead.

export const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || "nuvemx-files";

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
