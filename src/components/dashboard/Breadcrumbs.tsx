import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import type { Folder } from "@/types/database";

export function Breadcrumbs({ path }: { path: Folder[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
      <Link href="/files" className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700">
        <Home className="h-3.5 w-3.5" /> Meus arquivos
      </Link>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
          <Link href={`/files/${folder.id}`} className="rounded-lg px-2 py-1 hover:bg-slate-100 hover:text-slate-700">
            {folder.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}
