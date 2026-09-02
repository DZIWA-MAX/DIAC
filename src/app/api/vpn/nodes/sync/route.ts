import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/services/security";
import { decryptSecret, tunnelAddress, verifySyncSecret } from "@/lib/services/vpn";
import type { VpnProfile, VpnServer } from "@/types/database";

/**
 * Data-plane sync. The agent on each WireGuard VPS polls this and
 * reconciles its peer list — this is the seam that makes NuvemX the
 * control plane for a real VPN server rather than a page of inert forms.
 *
 * Auth is the node's own sync secret as a bearer token, NOT a user
 * session: the caller is a machine. The secret identifies which node is
 * asking, and a node only ever sees the peers assigned to itself.
 */
export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const presented = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!presented) {
      return NextResponse.json({ error: "Credencial de node ausente." }, { status: 401 });
    }

    const admin = createAdminSupabaseClient();
    const { data: servers } = await admin
      .from("vpn_servers")
      .select("*")
      .eq("active", true)
      .returns<VpnServer[]>();

    // Constant-time compare against each active node, so a wrong secret
    // reveals nothing — not even which node it nearly matched.
    const server = (servers ?? []).find((s) => verifySyncSecret(presented, s.sync_secret_hash));

    if (!server) {
      return NextResponse.json({ error: "Credencial de node inválida." }, { status: 401 });
    }

    const { data: profiles, error } = await admin
      .from("vpn_profiles")
      .select("id, public_key, preshared_key_enc, address_index")
      .eq("server_id", server.id)
      .is("revoked_at", null)
      .returns<Pick<VpnProfile, "id" | "public_key" | "preshared_key_enc" | "address_index">[]>();

    if (error) throw error;

    await admin
      .from("vpn_servers")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", server.id);

    await logSecurityEvent({
      userId: null,
      action: "vpn.node_sync",
      metadata: { serverId: server.id, peerCount: profiles?.length ?? 0 },
    });

    // The preshared key has to be configured on BOTH ends of the tunnel
    // or the handshake fails, so the node genuinely needs it — this is
    // the one secret that legitimately crosses this channel. It is
    // protected by HTTPS plus the node's bearer secret, and each node
    // only ever receives the PSKs of the peers assigned to it.
    return NextResponse.json({
      server: { id: server.id, name: server.name, subnet: server.subnet },
      peers: (profiles ?? []).map((p) => ({
        publicKey: p.public_key,
        presharedKey: decryptSecret(p.preshared_key_enc),
        allowedIps: `${tunnelAddress(server.subnet, p.address_index)}/32`,
      })),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
