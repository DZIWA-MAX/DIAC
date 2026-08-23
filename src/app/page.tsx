import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Benefits } from "@/components/landing/Benefits";
import { Security } from "@/components/landing/Security";
import { PlansPreview } from "@/components/landing/PlansPreview";
import { FAQ } from "@/components/landing/FAQ";
import { Footer } from "@/components/landing/Footer";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listActivePlans } from "@/lib/services/plans";
import type { Plan } from "@/types/database";

export const revalidate = 60;

export default async function LandingPage() {
  let plans: Plan[] = [];
  try {
    const supabase = createServerSupabaseClient();
    plans = await listActivePlans(supabase);
  } catch {
    plans = [];
  }

  return (
    <main>
      <Header />
      <Hero />
      <Benefits />
      <Security />
      {plans.length > 0 && <PlansPreview plans={plans} />}
      <FAQ />
      <Footer />
    </main>
  );
}
