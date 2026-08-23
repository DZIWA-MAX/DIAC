import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function PrivacyPage() {
  return (
    <main>
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: 2026</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-4 text-slate-600">
          <p>
            A NuvemX leva sua privacidade a sério. Esta página descreve quais dados coletamos e
            como eles são protegidos.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">1. Dados que coletamos</h2>
          <p>
            Nome, email e metadados dos arquivos que você envia (nome, tamanho, tipo). O conteúdo
            dos seus arquivos é armazenado de forma privada e isolada por conta.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">2. Isolamento entre contas</h2>
          <p>
            Cada usuário só pode acessar seus próprios arquivos. Isso é garantido tecnicamente por
            controles de acesso (Row Level Security) no banco de dados e por permissões no
            armazenamento, e não apenas pela interface.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">3. Compartilhamento</h2>
          <p>
            Links de compartilhamento são gerados sob demanda, podem ser protegidos por senha,
            expiram automaticamente e podem ser revogados a qualquer momento.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">4. Seus direitos</h2>
          <p>
            Você pode exportar uma cópia dos seus dados ou excluir permanentemente sua conta a
            qualquer momento em Configurações → Privacidade.
          </p>
        </div>
      </article>
      <Footer />
    </main>
  );
}
