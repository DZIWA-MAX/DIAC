import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { handleApiError } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { supabase, user } = await requireAdmin();
    const body = await request.json();
    const { priceCents, storageLimitBytes, active } = body as {
      priceCents?: number;
      storageLimitBytes?: number;
      active?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (typeof priceCents === "number" && priceCents >= 0) updates.price_cents = priceCents;
    if (typeof storageLimitBytes === "number" && storageLimitBytes > 0) updates.storage_limit_bytes = storageLimitBytes;
    if (typeof active === "boolean") updates.active = active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhuma alteração informada." }, { status: 400 });
    }

    const { data: plan, error } = await supabase.from("plans").update(updates).eq("id", params.id).select().single();
    if (error) throw error;

    await logSecurityEvent({ userId: user.id, action: "admin.plan_changed", metadata: { planId: params.id, updates } });

    return NextResponse.json({ plan });
  } catch (error) {
    return handleApiError(error);
  }
}
