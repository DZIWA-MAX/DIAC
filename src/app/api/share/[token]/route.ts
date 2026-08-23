import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/services/storage";
import { logSecurityEvent } from "@/lib/services/security";
import { getClientIp, rateLimit } from "@/lib/api-utils";

const SIGNED_URL_TTL_SECONDS = 60 * 5;

async function loadShare(token: string) {
  const admin = createAdminSupabaseClient();
  const { data: share } = await admin
    .from("shares")
    .select("id, file_id, user_id, password_hash, allow_download, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!share) return { error: "Link não encontrado.", status: 404 } as const;
  if (share.revoked_at) return { error: "Este link foi revogado.", status: 410 } as const;
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return { error: "Este link expirou.", status: 410 } as const;
  }

  const { data: file } = await admin
    .from("files")
    .select("id, name, size, mime_type, status")
    .eq("id", share.file_id)
    .maybeSingle();

  if (!file || file.status !== "active") {
    return { error: "Arquivo não está mais disponível.", status: 404 } as const;
  }

  return { share, file } as const;
}

// Public metadata (no password revealed, no file content) — lets the
// share page render its "protected link" UI before a password is typed.
export async function GET(_request: Request, { params }: { params: { token: string } }) {
  const result = await loadShare(params.token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({
    file: { name: result.file.name, size: result.file.size, mimeType: result.file.mime_type },
    requiresPassword: !!result.share.password_hash,
    allowDownload: result.share.allow_download,
  });
}

// Verifies the password (if any) and returns a short-lived signed URL.
// The storage path itself is never exposed to the client — only Supabase
// Storage's signed URL, which expires automatically.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const ip = getClientIp(request);
  if (!rateLimit(`share:${params.token}:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde um instante." }, { status: 429 });
  }

  const result = await loadShare(params.token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { share, file } = result;
  const body = await request.json().catch(() => ({}));
  const password = (body?.password as string | undefined) ?? "";

  if (share.password_hash) {
    const matches = await bcrypt.compare(password, share.password_hash);
    if (!matches) {
      await logSecurityEvent({
        userId: share.user_id,
        action: "share.access_denied",
        metadata: { shareId: share.id, reason: "wrong_password" },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent"),
      });
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }
  }

  const admin = createAdminSupabaseClient();

  const { data: fileRow } = await admin.from("files").select("storage_path").eq("id", file.id).single();
  if (!fileRow) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(fileRow.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: share.allow_download ? file.name : undefined,
    });

  if (signError || !signed) {
    return NextResponse.json({ error: "Não foi possível gerar o link de acesso." }, { status: 500 });
  }

  const { data: currentShare } = await admin
    .from("shares")
    .select("view_count")
    .eq("id", share.id)
    .single();
  await admin
    .from("shares")
    .update({ view_count: (currentShare?.view_count ?? 0) + 1 })
    .eq("id", share.id);

  return NextResponse.json({
    url: signed.signedUrl,
    file: { name: file.name, size: file.size, mimeType: file.mime_type },
    allowDownload: share.allow_download,
  });
}
