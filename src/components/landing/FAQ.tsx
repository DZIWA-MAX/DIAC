"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const QUESTIONS = [
  {
    q: "Meus arquivos ficam mesmo privados?",
    a: "Sim. Cada usuário possui seu próprio espaço isolado por Row Level Security no banco de dados e por permissões no armazenamento — ninguém mais consegue acessar seus arquivos, nem mesmo alterando um link ou ID.",
  },
  {
    q: "Posso cancelar meu plano quando quiser?",
    a: "Sim. Ao cancelar, você mantém acesso aos recursos do plano até o fim do período já pago.",
  },
  {
    q: "Como funciona o compartilhamento de arquivos?",
    a: "Você gera um link único, podendo protegê-lo com senha e definir uma data de expiração. É possível revogar o link a qualquer momento.",
  },
  {
    q: "O que acontece quando eu excluo um arquivo?",
    a: "Ele vai para a lixeira, onde pode ser restaurado. A exclusão definitiva só ocorre quando você esvazia a lixeira ou após o período de retenção.",
  },
  {
    q: "A NuvemX é adequada para empresas?",
    a: "Sim, a arquitetura foi construída desde o início para suportar planos empresariais e revenda de armazenamento.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Perguntas frequentes
        </h2>

        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {QUESTIONS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={item.q}>
                <button
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-slate-800">{item.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && <p className="px-5 pb-4 text-sm text-slate-600">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
