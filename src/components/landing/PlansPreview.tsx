import { PlanCard } from "@/components/PlanCard";
import type { Plan } from "@/types/database";

export function PlansPreview({ plans }: { plans: Plan[] }) {
  return (
    <section id="planos-preview" className="bg-slate-50 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Planos para todos os tamanhos</h2>
          <p className="mt-3 text-slate-600">
            Comece grátis e cresça quando precisar de mais espaço.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, i) => (
            <PlanCard key={plan.id} plan={plan} highlighted={i === 2} />
          ))}
        </div>
      </div>
    </section>
  );
}
