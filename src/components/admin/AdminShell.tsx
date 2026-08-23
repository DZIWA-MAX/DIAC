"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  HardDrive,
  FileClock,
  ArrowLeft,
  Package,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/plans", label: "Planos", icon: Package },
  { href: "/admin/subscriptions", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/payments", label: "Pagamentos", icon: Receipt },
  { href: "/admin/storage", label: "Armazenamento", icon: HardDrive },
  { href: "/admin/logs", label: "Logs", icon: FileClock },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="mb-6 px-2">
          <Logo />
          <span className="ml-9 mt-0.5 block text-xs font-medium text-slate-400">Painel administrativo</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-4.5 w-4.5" size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Voltar à conta
        </Link>
      </aside>

      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
