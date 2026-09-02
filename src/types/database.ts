export type PlanCode = "free" | "starter" | "pro" | "business";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "expired";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type FileStatus = "active" | "trashed";
export type UserRole = "user" | "admin";
export type UserStatus = "active" | "blocked";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  plan_id: string | null;
  storage_quota_bytes: number;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  storage_limit_bytes: number;
  price_cents: number;
  currency: string;
  billing_period: "monthly" | "yearly";
  max_upload_size_bytes: number;
  features: string[];
  active: boolean;
  sort_order: number;
  vpn_enabled: boolean;
  vpn_device_limit: number;
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  storage_path: string;
  mime_type: string;
  size: number;
  hash: string | null;
  status: FileStatus;
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: string;
  file_id: string;
  user_id: string;
  token: string;
  password_hash: string | null;
  allow_download: boolean;
  expires_at: string | null;
  revoked_at: string | null;
  view_count: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  provider: string | null;
  provider_subscription_id: string | null;
  cancel_at_period_end: boolean;
  started_at: string;
  current_period_end: string | null;
  expires_at: string | null;
  canceled_at: string | null;
}

export interface Payment {
  id: string;
  user_id: string;
  subscription_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  provider: string | null;
  provider_payment_id: string | null;
  created_at: string;
}

export interface VpnServer {
  id: string;
  name: string;
  endpoint: string;
  public_key: string;
  subnet: string;
  dns: string;
  allowed_ips: string;
  sync_secret_hash: string;
  last_sync_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VpnProfile {
  id: string;
  user_id: string;
  server_id: string;
  name: string;
  public_key: string;
  private_key_enc: string;
  preshared_key_enc: string;
  address_index: number;
  token: string;
  link_expires_at: string;
  revoked_at: string | null;
  last_handshake_at: string | null;
  rx_bytes: number;
  tx_bytes: number;
  created_at: string;
  updated_at: string;
}

/** The subset of VpnProfile the browser is allowed to see. */
export type VpnProfilePublic = Pick<
  VpnProfile,
  | "id"
  | "name"
  | "server_id"
  | "address_index"
  | "revoked_at"
  | "last_handshake_at"
  | "rx_bytes"
  | "tx_bytes"
  | "link_expires_at"
  | "created_at"
> & { address?: string; server_name?: string };

export interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
