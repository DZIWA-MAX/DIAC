import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, rateLimit } from "@/lib/api-utils";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logSecurityEvent } from "@/lib/services/security";
import {
  PUBLIC_PROFILE_COLUMNS,
  encryptSecret,
  generatePresharedKey,
  generateWireGuardKeyPair,
  newLinkExpiry,
  sanitizeProfileName,
  tunnelAddress,
} from "@/lib/services/vpn";
import type { Plan, VpnServer } from "@/types/database";

/**
 * The vpn_* tables are service-role-only by design (see migration 0006):
 * a profile row carries the peer's private key, and RLS cannot hide a
 * column from a SELECT. So every read here goes through the admin client
 * but is *always* filtered by the user id resolved from the session
 * cookie — never by an id supplied in the request.
 */
export async function GET() {
  try {
    const { user } = await requireUser();
    const admin = createAdminSupabaseClient();

    const { data, error } = await admin
      .from("vpn_profiles")
      .select(`${PUBLIC_PROFILE_COLUMNS}, vpn_servers ( name, subnet )`)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const profiles = (data ?? []).map((row) => {
      const { vpn_servers: server, ...profile } = row as typeof row & {
        vpn_servers: Pick<VpnServer, "name" | "subnet"> | null;
      };
      return {
        ...profile,
        server_name: server?.name ?? null,
        address: server ? tunnelAddress(server.subnet, profile.address_index) : null,
      };
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, profile } = await requireUser();

    // Key generation is cheap but not free, and each profile burns an IP
    // from the node's subnet — cap the create rate per user.
    if (!rateLimit(`vpn:create:${user.id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas criações de perfil. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const name = sanitizeProfileName((body as { name?: unknown }).name);
    const requestedServerId = (body as { serverId?: unknown }).serverId;

    const admin = createAdminSupabaseClient();

    // --- plan gating -------------------------------------------------
    let deviceLimit = 1;
    if (profile.plan_id) {
      const { data: plan } = await admin
        .from("plans")
        .select("vpn_enabled, vpn_device_limit")
        .eq("id", profile.plan_id)
        .maybeSingle<Pick<Plan, "vpn_enabled" | "vpn_device_limit">>();

      if (plan && !plan.vpn_enabled) {
        return NextResponse.json(
          { error: "Seu plano atual não inclui VPN. Faça upgrade para ativar." },
          { status: 403 }
        );
      }
      if (plan) deviceLimit = plan.vpn_device_limit;
    }

    const { count } = await admin
      .from("vpn_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if ((count ?? 0) >= deviceLimit) {
      return NextResponse.json(
        {
          error: `Seu plano permite ${deviceLimit} dispositivo(s) de VPN. Revogue um existente ou faça upgrade.`,
        },
        { status: 403 }
      );
    }

    // --- pick the node -----------------------------------------------
    let serverQuery = admin.from("vpn_servers").select("*").eq("active", true);
    if (typeof requestedServerId === "string" && requestedServerId.length > 0) {
      serverQuery = serverQuery.eq("id", requestedServerId);
    }
    const { data: server } = await serverQuery
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<VpnServer>();

    if (!server) {
      return NextResponse.json(
        {
          error:
            "Nenhum servidor VPN disponível. Um administrador precisa cadastrar um node — veja docs/VPN.md.",
        },
        { status: 503 }
      );
    }

    // --- allocate the tunnel IP --------------------------------------
    const { data: addressIndex, error: allocError } = await admin.rpc(
      "vpn_allocate_address_index",
      { p_server_id: server.id }
    );
    if (allocError) throw allocError;

    // --- real WireGuard material -------------------------------------
    const { publicKey, privateKey } = generateWireGuardKeyPair();
    const presharedKey = generatePresharedKey();

    const { data: created, error: insertError } = await admin
      .from("vpn_profiles")
      .insert({
        user_id: user.id,
        server_id: server.id,
        name,
        public_key: publicKey,
        private_key_enc: encryptSecret(privateKey),
        preshared_key_enc: encryptSecret(presharedKey),
        address_index: addressIndex,
        link_expires_at: newLinkExpiry(),
      })
      .select(`${PUBLIC_PROFILE_COLUMNS}, token`)
      .single();

    if (insertError) throw insertError;

    await logSecurityEvent({
      userId: user.id,
      action: "vpn.profile_create",
      metadata: { profileId: created.id, serverId: server.id, name },
    });

    const { token, ...safeProfile } = created as typeof created & { token: string };

    return NextResponse.json({
      profile: {
        ...safeProfile,
        server_name: server.name,
        address: tunnelAddress(server.subnet, addressIndex),
      },
      // Shown once, right after creation. The link itself expires; the
      // user can mint a new one from the VPN page at any time.
      configUrl: `/api/vpn/config/${token}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
