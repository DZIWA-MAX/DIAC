"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DashboardPreview } from "./DashboardPreview";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Hero() {
  const { t } = useLocale();

  return (
    <section id="inicio" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Seus arquivos. Sua nuvem. Sua liberdade.
          </span>

          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate-600">{t.hero.subtitle}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                {t.hero.ctaPrimary}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/plans">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                {t.hero.ctaSecondary}
              </Button>
            </Link>
          </div>
        </div>

        <DashboardPreview />
      </div>
    </section>
  );
}
