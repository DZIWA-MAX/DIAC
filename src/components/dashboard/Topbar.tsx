"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, LogOut, User as UserIcon, File as FileIcon, Folder as FolderIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { searchAll } from "@/lib/services/files-client";
import { useToast } from "@/components/ui/Toast";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { FileRecord, Folder } from "@/types/database";

export function Topbar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ files: FileRecord[]; folders: Folder[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const supabase = createClient();
    const timeout = setTimeout(async () => {
      try {
        const data = await searchAll(supabase, query.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults(null);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await fetch("/api/auth/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth.logout" }),
    }).catch(() => {});
    await supabase.auth.signOut();
    notify("Você saiu da sua conta.", "info");
    router.push("/login");
    router.refresh();
  }

  const hasResults = results && (results.files.length > 0 || results.folders.length > 0);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
      <div ref={boxRef} className="relative flex-1 max-w-lg">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Pesquisar arquivos e pastas..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Limpar pesquisa"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {open && query && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-card">
            {!results ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">Buscando...</p>
            ) : !hasResults ? (
              <p className="px-3 py-4 text-center text-sm text-slate-400">Nenhum resultado encontrado.</p>
            ) : (
              <>
                {results.folders.map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/files/${folder.id}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <FolderIcon className="h-4 w-4 text-brand-500" />
                    {folder.name}
                  </Link>
                ))}
                {results.files.map((file) => (
                  <Link
                    key={file.id}
                    href={`/files${file.folder_id ? `/${file.folder_id}` : ""}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <FileIcon className="h-4 w-4 text-slate-400" />
                    {file.name}
                  </Link>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="hidden sm:block">
        <LanguageSwitcher />
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
        >
          {userName.charAt(0).toUpperCase() || "?"}
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-card">
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
              <p className="truncate text-xs text-slate-400">{userEmail}</p>
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <UserIcon className="h-4 w-4" /> Configurações
            </Link>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
