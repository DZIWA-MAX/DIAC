import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  generateKeyPairSync,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import type { VpnProfile, VpnServer } from "@/types/database";

/**
 * WireGuard keys are raw 32-byte Curve25519 values, base64-encoded —
 * exactly what `wg genkey` / `wg pubkey` produce. Node can generate the
 * same thing natively; for X25519 the raw scalar sits at the tail of
 * both DER encodings (PKCS8 is 48 bytes, SPKI 44, raw key = last 32),
 * so slicing it off gives a keypair the real `wg` tool accepts verbatim.
 */
export function generateWireGuardKeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync("x25519", {
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  const rawPrivate = Buffer.from(privateKey.subarray(privateKey.length - 32));
  const rawPublic = Buffer.from(publicKey.subarray(publicKey.length - 32));

  // Clamp so the stored bytes are byte-identical to `wg genkey` output.
  // RFC 7748 clamping is applied during scalar multiplication anyway, so
  // this does not change the derived public key — it just makes the
  // private key canonical if a user ever runs `wg pubkey` on it.
  rawPrivate[0] &= 248;
  rawPrivate[31] &= 127;
  rawPrivate[31] |= 64;

  return {
    privateKey: rawPrivate.toString("base64"),
    publicKey: rawPublic.toString("base64"),
  };
}

/** WireGuard preshared keys are 32 random bytes, base64 (`wg genpsk`). */
export function generatePresharedKey(): string {
  return randomBytes(32).toString("base64");
}

// ---------------------------------------------------------------------
// Encryption at rest for peer private keys
// ---------------------------------------------------------------------

function encryptionKey(): Buffer {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "APP_SECRET ausente ou muito curto (mínimo 32 caracteres). Necessário para cifrar as chaves da VPN."
    );
  }
  return scryptSync(secret, "nuvemx-vpn-v1", 32);
}

/** AES-256-GCM. Format: v1.<iv>.<tag>.<ciphertext>, all base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    enc.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== "v1" || !iv || !tag || !data) {
    throw new Error("Formato de segredo inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

// ---------------------------------------------------------------------
// Node sync secrets
// ---------------------------------------------------------------------

export function generateSyncSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSyncSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Constant-time compare, so a wrong secret leaks nothing via timing. */
export function verifySyncSecret(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashSyncSecret(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------
// Config rendering
// ---------------------------------------------------------------------

/**
 * Turns the node's subnet + the peer's allocated host number into the
 * client's tunnel address. '10.8.0.0/24' + index 5 -> '10.8.0.5'.
 * Kept in sync with vpn_allocate_address_index() in migration 0006.
 */
export function tunnelAddress(subnet: string, addressIndex: number): string {
  const [base] = subnet.split("/");
  const octets = base.split(".").map(Number);
  if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) {
    throw new Error("Subnet do servidor VPN inválida.");
  }
  let asInt = ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
  asInt += addressIndex;
  return [(asInt >>> 24) & 255, (asInt >>> 16) & 255, (asInt >>> 8) & 255, asInt & 255].join(".");
}

/**
 * Renders a standard wg-quick config. This is the real artifact — it
 * imports directly into the official WireGuard client on any platform.
 */
export function renderWireGuardConfig(profile: VpnProfile, server: VpnServer): string {
  const address = tunnelAddress(server.subnet, profile.address_index);

  return [
    "[Interface]",
    `PrivateKey = ${decryptSecret(profile.private_key_enc)}`,
    `Address = ${address}/32`,
    `DNS = ${server.dns}`,
    "",
    "[Peer]",
    `PublicKey = ${server.public_key}`,
    `PresharedKey = ${decryptSecret(profile.preshared_key_enc)}`,
    `AllowedIPs = ${server.allowed_ips}`,
    `Endpoint = ${server.endpoint}`,
    "PersistentKeepalive = 25",
    "",
  ].join("\n");
}

/** How long a freshly issued config URL stays usable. */
export const CONFIG_LINK_TTL_MINUTES = 15;

export function newLinkExpiry(): string {
  return new Date(Date.now() + CONFIG_LINK_TTL_MINUTES * 60_000).toISOString();
}

/**
 * Columns that are safe to hand to the browser. The private/preshared
 * keys and the raw token are deliberately absent — the config URL is
 * built once at creation and after an explicit "regenerate link".
 */
export const PUBLIC_PROFILE_COLUMNS =
  "id, name, server_id, address_index, revoked_at, last_handshake_at, rx_bytes, tx_bytes, link_expires_at, created_at";

export function sanitizeProfileName(raw: unknown): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (name.length < 1 || name.length > 60) {
    throw new Error("O nome do dispositivo deve ter entre 1 e 60 caracteres.");
  }
  // Config files are plain text keyed on newlines; keep names to a
  // single harmless line so nothing can be smuggled into the rendering.
  return name.replace(/[\r\n]/g, " ");
}
