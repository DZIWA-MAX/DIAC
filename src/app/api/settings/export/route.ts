import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";

// Exports the user's own data as JSON (LGPD/GDPR-style data portability).
// Every query is scoped by user_id AND protected by RLS — no cross-user
// leakage is possible even if this handler had a bug in the filter.
export async function GET() {
  try {
    const { supabase, user, profile } = await requireUser();

    const [folders, files, shares, subscriptions, payments] = await Promise.all([
      supabase.from("folders").select("id,name,parent_id,created_at").eq("user_id", user.id),
      supabase.from("files").select("id,name,folder_id,size,mime_type,created_at").eq("user_id", user.id),
      supabase.from("shares").select("id,file_id,allow_download,expires_at,created_at").eq("user_id", user.id),
      supabase.from("subscriptions").select("*").eq("user_id", user.id),
      supabase.from("payments").select("id,amount_cents,currency,status,created_at").eq("user_id", user.id),
    ]);

    await logSecurityEvent({ userId: user.id, action: "data.export" });

    const payload = {
      profile: { name: profile.name, email: user.email, created_at: profile.created_at },
      folders: folders.data ?? [],
      files: files.data ?? [],
      shares: shares.data ?? [],
      subscriptions: subscriptions.data ?? [],
      payments: payments.data ?? [],
      exported_at: new Date().toISOString(),
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=nuvemx-dados.json",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
