import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";

// Admin-only user management. Uses the admin's own authenticated session
// (not the service role) — the profiles_update_admin RLS policy is what
// actually authorizes the write, so this can never be bypassed by
// forging a request without a real admin session.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user, profile: adminProfile } = await requireAdmin();
    const body = await request.json();
    const { status, planId } = body as { status?: "active" | "blocked"; planId?: string };

    if (params.id === adminProfile.id && status === "blocked") {
      return NextResponse.json({ error: "Você não pode bloquear sua própria conta." }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (status) {
      updates.status = status;
    }

    if (planId) {
      const { data: plan } = await supabase.from("plans").select("id, storage_limit_bytes").eq("id", planId).maybeSingle();
      if (!plan) {
        return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
      }
      updates.plan_id = plan.id;
      updates.storage_quota_bytes = plan.storage_limit_bytes;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
    }

    const { data: target, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single();

    if (error) throw error;

    await logSecurityEvent({
      userId: user.id,
      action: status ? (status === "blocked" ? "admin.user_blocked" : "admin.user_unblocked") : "admin.plan_changed",
      metadata: { targetUserId: target.user_id, updates },
    });

    return NextResponse.json({ profile: target });
  } catch (error) {
    return handleApiError(error);
  }
}
