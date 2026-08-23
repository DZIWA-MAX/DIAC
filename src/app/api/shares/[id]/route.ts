import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";

// Revoke a share link. Owner-only — enforced both by the RLS delete
// policy (user_id = auth.uid()) and the explicit filter below.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireUser();

    const { error } = await supabase.from("shares").delete().eq("id", params.id).eq("user_id", user.id);
    if (error) throw error;

    await logSecurityEvent({ userId: user.id, action: "share.revoke", metadata: { shareId: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
