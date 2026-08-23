import { Folder, FileText, Image as ImageIcon, HardDrive } from "lucide-react";

export function DashboardPreview() {
  const items = [
    { icon: Folder, name: "Documentos", meta: "18 itens", color: "text-amber-500 bg-amber-50" },
    { icon: Folder, name: "Fotos", meta: "342 itens", color: "text-brand-500 bg-brand-50" },
    { icon: FileText, name: "Contrato.pdf", meta: "2,1 MB", color: "text-red-500 bg-red-50" },
    { icon: ImageIcon, name: "Logo-final.png", meta: "812 KB", color: "text-emerald-500 bg-emerald-50" },
  ];

  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/60 via-brand-100/40 to-transparent blur-2xl" />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Meus arquivos</p>
            <p className="text-xs text-slate-400">Meus arquivos / Documentos</p>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            + Enviar arquivo
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.color}`}>
                <item.icon className="h-4.5 w-4.5" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">{item.meta}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <HardDrive className="h-3.5 w-3.5" /> Armazenamento
            </span>
            <span>5 GB / 10 GB</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 rounded-full bg-brand-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
