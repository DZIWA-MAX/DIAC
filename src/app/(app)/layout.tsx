import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStorageUsed } from "@/lib/services/storage";
import { Logo } from "@/components/ui/Logo";
import { SidebarNav, StorageWidget, AdminLink } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import type { Plan, Profile } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<Profile>();

  if (!profile) redirect("/login");

  let plan: Plan | null = null;
  if (profile.plan_id) {
    const { data } = await supabase.from("plans").select("*").eq("id", profile.plan_id).single<Plan>();
    plan = data;
  }

  const usedBytes = await getStorageUsed(supabase, user.id);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
        </div>
        <SidebarNav className="flex flex-1 flex-col gap-1" />
        <div className="mt-4 space-y-2">
          <AdminLink profile={profile} />
          <StorageWidget
            planName={plan?.name ?? "Grátis"}
            usedBytes={usedBytes}
            quotaBytes={profile.storage_quota_bytes}
          />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-16 lg:pb-0">
        <Topbar userName={profile.name || user.email || "Usuário"} userEmail={user.email ?? ""} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}
