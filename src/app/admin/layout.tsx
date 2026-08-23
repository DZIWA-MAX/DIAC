import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

// Defense in depth: middleware already blocks non-admins from /admin, but
// this layout re-checks server-side so the route is never reachable via a
// stale cache or a client navigation that bypasses middleware.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role,status").eq("user_id", user.id).single();
  if (!profile || profile.role !== "admin") redirect("/dashboard?denied=1");
  if (profile.status === "blocked") redirect("/login?reason=blocked");

  return <AdminShell>{children}</AdminShell>;
}
