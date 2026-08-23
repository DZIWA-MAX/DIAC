import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { BUCKET } from "@/lib/services/storage";
import { logSecurityEvent } from "@/lib/services/security";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser();

    const { data: file, error: fetchError } = await supabase
      .from("files")
      .select("id, storage_path, status, user_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }
    if (file.status !== "trashed") {
      return NextResponse.json(
        { error: "Mova o arquivo para a lixeira antes de excluir permanentemente." },
        { status: 400 }
      );
    }

    await supabase.storage.from(BUCKET).remove([file.storage_path]);
    const { error: deleteError } = await supabase.from("files").delete().eq("id", file.id);
    if (deleteError) throw deleteError;

    await logSecurityEvent({ userId: user.id, action: "file.permanent_delete", metadata: { fileId: file.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
