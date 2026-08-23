import { Cloud } from "lucide-react";
import Link from "next/link";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-semibold text-slate-900 ${className ?? ""}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
        <Cloud className="h-4.5 w-4.5" size={18} aria-hidden />
      </span>
      <span className="text-lg tracking-tight">
        Nuvem<span className="text-brand-600">X</span>
      </span>
    </Link>
  );
}
