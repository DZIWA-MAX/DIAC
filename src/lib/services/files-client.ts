"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileRecord, Folder } from "@/types/database";

/**
 * Browser-side data access for folders/files. These run against the
 * user's own authenticated Supabase session, so every read/write is
 * gated by Postgres Row Level Security (auth.uid() = user_id) — a
 * request can never touch another user's rows no matter what id is
 * passed in, because the database itself enforces it server-side.
 */

export async function listFolders(
  supabase: SupabaseClient,
  parentId: string | null
): Promise<Folder[]> {
  let query = supabase
    .from("folders")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function listFiles(
  supabase: SupabaseClient,
  folderId: string | null
): Promise<FileRecord[]> {
  let query = supabase
    .from("files")
    .select("*")
    .eq("status", "active")
    .order("name", { ascending: true });

  query = folderId ? query.eq("folder_id", folderId) : query.is("folder_id", null);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FileRecord[];
}

export async function getFolderPath(
  supabase: SupabaseClient,
  folderId: string | null
): Promise<Folder[]> {
  const path: Folder[] = [];
  let currentId = folderId;

  while (currentId) {
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .eq("id", currentId)
      .single<Folder>();
    if (error || !data) break;
    path.unshift(data);
    currentId = data.parent_id;
  }

  return path;
}

export async function createFolder(
  supabase: SupabaseClient,
  userId: string,
  parentId: string | null,
  name: string
) {
  const { data, error } = await supabase
    .from("folders")
    .insert({ user_id: userId, parent_id: parentId, name: name.trim() })
    .select()
    .single<Folder>();
  if (error) throw error;
  return data;
}

export async function renameFolder(supabase: SupabaseClient, id: string, name: string) {
  const { error } = await supabase.from("folders").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function moveFolder(supabase: SupabaseClient, id: string, parentId: string | null) {
  const { error } = await supabase.from("folders").update({ parent_id: parentId }).eq("id", id);
  if (error) throw error;
}

export async function toggleFolderFavorite(supabase: SupabaseClient, id: string, value: boolean) {
  const { error } = await supabase.from("folders").update({ is_favorite: value }).eq("id", id);
  if (error) throw error;
}

export async function trashFolder(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.rpc("trash_folder", { p_folder_id: id });
  if (error) throw error;
}

export async function restoreFolder(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.rpc("restore_folder", { p_folder_id: id });
  if (error) throw error;
}

export async function renameFile(supabase: SupabaseClient, id: string, name: string) {
  const { error } = await supabase.from("files").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function moveFile(supabase: SupabaseClient, id: string, folderId: string | null) {
  const { error } = await supabase.from("files").update({ folder_id: folderId }).eq("id", id);
  if (error) throw error;
}

export async function toggleFileFavorite(supabase: SupabaseClient, id: string, value: boolean) {
  const { error } = await supabase.from("files").update({ is_favorite: value }).eq("id", id);
  if (error) throw error;
}

export async function trashFile(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("files")
    .update({ status: "trashed", deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function restoreFile(supabase: SupabaseClient, id: string) {
  const { error } = await supabase
    .from("files")
    .update({ status: "active", deleted_at: null })
    .eq("id", id);
  if (error) throw error;
}

export async function listTrashedFolders(supabase: SupabaseClient): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function listTrashedFiles(supabase: SupabaseClient): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("status", "trashed")
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FileRecord[];
}

export async function listFavorites(
  supabase: SupabaseClient
): Promise<{ files: FileRecord[]; folders: Folder[] }> {
  const [filesRes, foldersRes] = await Promise.all([
    supabase.from("files").select("*").eq("status", "active").eq("is_favorite", true),
    supabase.from("folders").select("*").is("deleted_at", null).eq("is_favorite", true),
  ]);
  if (filesRes.error) throw filesRes.error;
  if (foldersRes.error) throw foldersRes.error;
  return {
    files: (filesRes.data ?? []) as FileRecord[],
    folders: (foldersRes.data ?? []) as Folder[],
  };
}

export async function listRecentFiles(supabase: SupabaseClient, limit = 30): Promise<FileRecord[]> {
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FileRecord[];
}

export async function searchAll(
  supabase: SupabaseClient,
  term: string
): Promise<{ files: FileRecord[]; folders: Folder[] }> {
  const like = `%${term.replace(/[%_]/g, "\\$&")}%`;
  const [filesRes, foldersRes] = await Promise.all([
    supabase.from("files").select("*").eq("status", "active").ilike("name", like).limit(50),
    supabase.from("folders").select("*").is("deleted_at", null).ilike("name", like).limit(50),
  ]);
  if (filesRes.error) throw filesRes.error;
  if (foldersRes.error) throw foldersRes.error;
  return {
    files: (filesRes.data ?? []) as FileRecord[],
    folders: (foldersRes.data ?? []) as Folder[],
  };
}
