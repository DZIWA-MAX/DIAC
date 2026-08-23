import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/services/plans";
import { formatBytes } from "@/lib/storage-shared";
import type { Plan } from "@/types/database";
import clsx from "clsx";

export function PlanCard({ plan, highlighted = false }: { plan: Plan; highlighted?: boolean }) {
  return (
    <Card
      className={clsx(
        "flex flex-col",
        highlighted && "border-brand-500 ring-2 ring-brand-500/30"
      )}
    >
      {highlighted && (
        <span className="mb-3 inline-block w-fit rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white">
          Mais popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{formatBytes(plan.storage_limit_bytes)} de armazenamento</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{formatPrice(plan.price_cents, plan.currency)}</span>
        {plan.price_cents > 0 && <span className="text-sm text-slate-500">/mês</span>}
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            {feature}
          </li>
        ))}
      </ul>

      <Link href="/register" className="mt-6">
        <Button variant={highlighted ? "primary" : "outline"} className="w-full">
          {plan.price_cents === 0 ? "Começar grátis" : "Assinar plano"}
        </Button>
      </Link>
    </Card>
  );
}
