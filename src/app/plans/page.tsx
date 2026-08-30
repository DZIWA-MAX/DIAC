import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { PlanCard } from "@/components/PlanCard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listActivePlans } from "@/lib/services/plans";
import type { Plan } from "@/types/database";

export default async function PlansPage() {
  let plans: Plan[] = [];
  try {
    // Creating the client is itself throwable — it rejects missing
    // Supabase credentials — so it belongs inside the guard. This page
    // is public marketing, and an unreachable database should degrade to
    // the message below, never a 500.
    plans = await listActivePlans(createServerSupabaseClient());
  } catch {
    plans = [];
  }

  return (
    <main>
      <Header />
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Escolha o plano ideal para você
          </h1>
          <p className="mt-3 text-slate-600">
            Comece grátis e faça upgrade quando precisar de mais espaço. Cancele quando quiser.
          </p>
        </div>

        {plans.length > 0 ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => (
              <PlanCard key={plan.id} plan={plan} highlighted={i === 2} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-sm text-slate-400">
            Não foi possível carregar os planos no momento. Tente novamente em instantes.
          </p>
        )}
      </section>
      <Footer />
    </main>
  );
}
