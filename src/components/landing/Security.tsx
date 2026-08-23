import { ShieldCheck, KeyRound, Eye, ServerCog } from "lucide-react";

const items = [
  {
    icon: KeyRound,
    title: "Autenticação segura",
    desc: "Login protegido com sessões seguras e política de senha forte.",
  },
  {
    icon: ShieldCheck,
    title: "Isolamento por usuário",
    desc: "Row Level Security garante que cada conta só acesse seus próprios dados.",
  },
  {
    icon: Eye,
    title: "Links sob controle",
    desc: "Compartilhamento com senha, expiração e revogação a qualquer momento.",
  },
  {
    icon: ServerCog,
    title: "Infraestrutura auditada",
    desc: "Logs de segurança e validação de upload no backend, nunca só no navegador.",
  },
];

export function Security() {
  return (
    <section id="seguranca" className="bg-slate-950 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Segurança em primeiro lugar</h2>
          <p className="mt-3 text-slate-300">
            Cada arquivo enviado é protegido por múltiplas camadas de segurança, do banco de dados ao
            armazenamento.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                <item.icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm text-slate-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
