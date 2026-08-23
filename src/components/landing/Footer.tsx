"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-slate-200 bg-white py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:px-6 lg:px-8">
        <Logo />
        <p className="text-sm text-slate-500">{t.footer.tagline}</p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link href="/plans" className="hover:text-brand-600">
            {t.nav.plans}
          </Link>
          <Link href="/terms" className="hover:text-brand-600">
            Termos de Uso
          </Link>
          <Link href="/privacy" className="hover:text-brand-600">
            Política de Privacidade
          </Link>
        </div>
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} NuvemX. {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
