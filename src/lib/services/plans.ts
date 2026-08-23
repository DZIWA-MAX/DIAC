import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "@/types/database";

export async function listActivePlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Plan[];
}

export function formatPrice(cents: number, currency: string) {
  if (cents === 0) return "Grátis";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}
