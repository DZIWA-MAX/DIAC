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

export interface SecurityLog {
  id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
