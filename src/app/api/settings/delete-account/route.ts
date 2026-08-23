import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/services/storage";
import { logSecurityEvent } from "@/lib/services/security";

// Permanently deletes the current user's account, storage objects, and
// (via FK ON DELETE CASCADE) every row owned by them. Requires an active,
// verified session — never accepts a target user id from the request.
export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    const { data: files } = await supabase.from("files").select("storage_path").eq("user_id", user.id);
    const paths = (files ?? []).map((f) => f.storage_path);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    await logSecurityEvent({ userId: user.id, action: "account.delete_requested" });

    const admin = createAdminSupabaseClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
