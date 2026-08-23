"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Header() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "#inicio", label: t.nav.home },
    { href: "#recursos", label: t.nav.features },
    { href: "#seguranca", label: t.nav.security },
    { href: "/plans", label: t.nav.plans },
    { href: "#faq", label: t.nav.faq },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              {t.nav.login}
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">
              {t.nav.register}
            </Button>
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-slate-600 hover:text-brand-600"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex items-center gap-3">
            <LanguageSwitcher />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Link href="/login">
              <Button variant="outline" className="w-full">
                {t.nav.login}
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="primary" className="w-full">
                {t.nav.register}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
