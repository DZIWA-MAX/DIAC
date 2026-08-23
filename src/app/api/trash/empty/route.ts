import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { BUCKET } from "@/lib/services/storage";
import { logSecurityEvent } from "@/lib/services/security";

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    const { data: trashedFiles, error: fetchError } = await supabase
      .from("files")
      .select("id, storage_path")
      .eq("user_id", user.id)
      .eq("status", "trashed");

    if (fetchError) throw fetchError;

    const paths = (trashedFiles ?? []).map((f) => f.storage_path);
    if (paths.length > 0) {
      await supabase.storage.from(BUCKET).remove(paths);
    }

    await supabase.from("files").delete().eq("user_id", user.id).eq("status", "trashed");
    await supabase.from("folders").delete().eq("user_id", user.id).not("deleted_at", "is", null);

    await logSecurityEvent({
      userId: user.id,
      action: "file.permanent_delete",
      metadata: { bulk: true, count: paths.length },
    });

    return NextResponse.json({ ok: true, deleted: paths.length });
  } catch (error) {
    return handleApiError(error);
  }
}
