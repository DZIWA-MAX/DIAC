import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const body = await request.json();
    const { fileId, allowDownload = true, password, expiresAt } = body as {
      fileId: string;
      allowDownload?: boolean;
      password?: string;
      expiresAt?: string | null;
    };

    if (!fileId) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }

    const { data: file } = await supabase
      .from("files")
      .select("id")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    let passwordHash: string | null = null;
    if (password && password.length > 0) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { data: share, error } = await supabase
      .from("shares")
      .insert({
        file_id: fileId,
        user_id: user.id,
        allow_download: allowDownload,
        password_hash: passwordHash,
        expires_at: expiresAt || null,
      })
      .select()
      .single();

    if (error) throw error;

    await logSecurityEvent({
      userId: user.id,
      action: "share.create",
      metadata: { shareId: share.id, fileId, hasPassword: !!passwordHash, expiresAt: expiresAt || null },
    });

    return NextResponse.json({ share });
  } catch (error) {
    return handleApiError(error);
  }
}
