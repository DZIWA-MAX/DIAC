import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, rateLimit } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/services/security";
import { newLinkExpiry } from "@/lib/services/vpn";

/**
 * Revoke a device. Soft-delete (revoked_at) rather than a hard delete so
 * the node's sync agent can see the peer disappear from the active list
 * and remove it with `wg set ... peer <key> remove`, and so the tunnel IP
 * is not immediately handed to someone else.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();
    const admin = createAdminSupabaseClient();

    const { data, error } = await admin
      .from("vpn_profiles")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Perfil de VPN não encontrado." }, { status: 404 });
    }

    await logSecurityEvent({
      userId: user.id,
      action: "vpn.profile_revoke",
      metadata: { profileId: params.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Mint a fresh config URL for an existing device. The token is rotated
 * (not just the expiry extended), so any previously shared link dies
 * immediately — the same reasoning behind revoking and re-issuing a
 * share link instead of extending it.
 */
export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const { user } = await requireUser();

    if (!rateLimit(`vpn:link:${user.id}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const admin = createAdminSupabaseClient();

    // Same 24 bytes of entropy the column default uses, just minted
    // application-side so we get the value back without re-reading it.
    const token = randomBytes(24).toString("base64url");

    const { data, error } = await admin
      .from("vpn_profiles")
      .update({ token, link_expires_at: newLinkExpiry() })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .select("id, link_expires_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Perfil de VPN não encontrado." }, { status: 404 });
    }

    await logSecurityEvent({
      userId: user.id,
      action: "vpn.link_regenerate",
      metadata: { profileId: params.id },
    });

    return NextResponse.json({
      configUrl: `/api/vpn/config/${token}`,
      linkExpiresAt: data.link_expires_at,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
