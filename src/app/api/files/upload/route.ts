import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, rateLimit, getClientIp } from "@/lib/api-utils";
import {
  assertQuotaAvailable,
  assertSafeFilename,
  buildStoragePath,
  BUCKET,
  DEFAULT_MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/services/storage";
import { logSecurityEvent } from "@/lib/services/security";

export const runtime = "nodejs";

// Never trust the frontend: re-validate size, extension and MIME type here
// even though the client already checked them for UX purposes.
export async function POST(request: Request) {
  try {
    const { supabase, user, profile } = await requireUser();

    if (!rateLimit(`upload:${user.id}`, 30, 60_000)) {
      return NextResponse.json({ error: "Muitos uploads. Tente novamente em instantes." }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folderId = (formData.get("folderId") as string | null) || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
    }

    assertSafeFilename(file.name);

    const maxUploadSize = DEFAULT_MAX_UPLOAD_SIZE_BYTES;
    if (file.size <= 0) {
      return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
    }
    if (file.size > maxUploadSize) {
      return NextResponse.json(
        { error: `Arquivo excede o limite máximo de upload (${Math.round(maxUploadSize / 1024 / 1024)} MB).` },
        { status: 413 }
      );
    }

    if (folderId) {
      const { data: folder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", folderId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!folder) {
        return NextResponse.json({ error: "Pasta inválida." }, { status: 400 });
      }
    }

    await assertQuotaAvailable(supabase, profile, file.size);

    const storagePath = buildStoragePath(user.id, folderId, file.name);
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Falha ao enviar arquivo." }, { status: 500 });
    }

    const { data: record, error: insertError } = await supabase
      .from("files")
      .insert({
        user_id: user.id,
        folder_id: folderId,
        name: file.name,
        storage_path: storagePath,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Falha ao salvar metadados do arquivo." }, { status: 500 });
    }

    await logSecurityEvent({
      userId: user.id,
      action: "file.upload",
      metadata: { fileId: record.id, name: file.name, size: file.size },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ file: record });
  } catch (error) {
    return handleApiError(error);
  }
}
