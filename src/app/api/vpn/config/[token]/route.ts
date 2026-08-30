import { NextResponse } from "next/server";
import { handleApiError, getClientIp, rateLimit } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/services/security";
import { renderWireGuardConfig } from "@/lib/services/vpn";
import type { VpnProfile, VpnServer } from "@/types/database";

/**
 * The per-user "URL de VPN": hands back a ready-to-import wg-quick
 * config. Deliberately unauthenticated so the link can be opened on a
 * phone that is not logged in — which is exactly why it is also opaque,
 * short-lived and revocable, mirroring how /api/share/[token] works for
 * files. A leaked link stops working when it expires; a leaked device
 * is killed by revoking the profile.
 */
export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(request);
    if (!rateLimit(`vpn:config:${ip}`, 30, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
    }

    const admin = createAdminSupabaseClient();

    const { data: profile } = await admin
      .from("vpn_profiles")
      .select("*")
      .eq("token", params.token)
      .maybeSingle<VpnProfile>();

    // One generic message for every failure mode (unknown token, revoked
    // profile, expired link) so the endpoint cannot be used to probe
    // which tokens exist.
    const deny = () =>
      NextResponse.json(
        { error: "Link de configuração inválido ou expirado." },
        { status: 404 }
      );

    if (!profile || profile.revoked_at) return deny();
    if (new Date(profile.link_expires_at) < new Date()) return deny();

    const { data: server } = await admin
      .from("vpn_servers")
      .select("*")
      .eq("id", profile.server_id)
      .maybeSingle<VpnServer>();

    if (!server || !server.active) return deny();

    const config = renderWireGuardConfig(profile, server);

    await logSecurityEvent({
      userId: profile.user_id,
      action: "vpn.config_download",
      metadata: { profileId: profile.id, serverId: server.id },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent"),
    });

    const filename = `nuvemx-${profile.name.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 32)}.conf`;

    return new NextResponse(config, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Never let a proxy or the browser retain tunnel credentials.
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
