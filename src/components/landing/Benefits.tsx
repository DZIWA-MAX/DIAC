"use client";

import { ShieldCheck, Globe2, Share2, FolderOpen, Lock, TrendingUp } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Benefits() {
  const { t } = useLocale();

  const items = [
    { icon: ShieldCheck, title: t.benefits.secureTitle, desc: t.benefits.secureDesc },
    { icon: Globe2, title: t.benefits.anywhereTitle, desc: t.benefits.anywhereDesc },
    { icon: Share2, title: t.benefits.shareTitle, desc: t.benefits.shareDesc },
    { icon: FolderOpen, title: t.benefits.orgTitle, desc: t.benefits.orgDesc },
    { icon: Lock, title: t.benefits.privacyTitle, desc: t.benefits.privacyDesc },
    { icon: TrendingUp, title: t.benefits.scaleTitle, desc: t.benefits.scaleDesc },
  ];

  return (
    <section id="recursos" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">{t.benefits.title}</h2>
          <p className="mt-3 text-slate-600">{t.benefits.subtitle}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200 p-6 transition-shadow hover:shadow-card"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
