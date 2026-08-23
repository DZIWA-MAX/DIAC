"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Clock,
  Star,
  Share2,
  Trash2,
  Settings,
  ArrowUpCircle,
  Shield,
} from "lucide-react";
import { formatBytes } from "@/lib/storage-shared";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/files", label: "Meus arquivos", icon: FolderOpen },
  { href: "/recent", label: "Recentes", icon: Clock },
  { href: "/favorites", label: "Favoritos", icon: Star },
  { href: "/shared", label: "Compartilhados", icon: Share2 },
  { href: "/trash", label: "Lixeira", icon: Trash2 },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
  );
}

export function StorageWidget({
  planName,
  usedBytes,
  quotaBytes,
}: {
  planName: string;
  usedBytes: number;
  quotaBytes: number;
}) {
  const pct = Math.min(100, Math.round((usedBytes / Math.max(quotaBytes, 1)) * 100));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium text-slate-700">Armazenamento</span>
        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-brand-700">{planName}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-brand-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {formatBytes(usedBytes)} de {formatBytes(quotaBytes)} usados
      </p>
      <Link
        href="/plans"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white hover:bg-brand-700"
      >
        <ArrowUpCircle className="h-3.5 w-3.5" />
        Aumentar armazenamento
      </Link>
    </div>
  );
}

export function AdminLink({ profile }: { profile: Profile }) {
  if (profile.role !== "admin") return null;
  return (
    <Link
      href="/admin"
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
    >
      <Shield className="h-4.5 w-4.5" size={18} />
      Painel administrativo
    </Link>
  );
}
