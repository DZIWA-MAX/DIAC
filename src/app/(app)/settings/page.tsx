import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStorageUsed } from "@/lib/services/storage";
import { SettingsTabs } from "@/components/dashboard/SettingsTabs";
import type { Plan, Profile, Subscription } from "@/types/database";

export default async function SettingsPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single<Profile>();
  if (!profile) return null;

  let plan: Plan | null = null;
  if (profile.plan_id) {
    const { data } = await supabase.from("plans").select("*").eq("id", profile.plan_id).single<Plan>();
    plan = data;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  const usedBytes = await getStorageUsed(supabase, user.id);

  return (
    <SettingsTabs
      profile={profile}
      email={user.email ?? ""}
      plan={plan}
      subscription={subscription}
      usedBytes={usedBytes}
    />
  );
}
