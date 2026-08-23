"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Star, Trash2, Settings } from "lucide-react";

const ITEMS = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/files", label: "Arquivos", icon: FolderOpen },
  { href: "/favorites", label: "Favoritos", icon: Star },
  { href: "/trash", label: "Lixeira", icon: Trash2 },
  { href: "/settings", label: "Ajustes", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 py-2 backdrop-blur lg:hidden">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${
              active ? "text-brand-600" : "text-slate-500"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
