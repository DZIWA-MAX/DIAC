import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";

export default function TermsPage() {
  return (
    <main>
      <Header />
      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-900">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-400">Última atualização: 2026</p>

        <div className="prose prose-slate mt-8 max-w-none space-y-4 text-slate-600">
          <p>
            Ao criar uma conta na NuvemX, você concorda em usar a plataforma apenas para armazenar
            conteúdo lícito, do qual você detenha os direitos ou autorização de uso.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">1. Sua conta</h2>
          <p>
            Você é responsável por manter a confidencialidade de sua senha e por todas as
            atividades realizadas em sua conta.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">2. Armazenamento e limites</h2>
          <p>
            Cada plano possui um limite de armazenamento e de tamanho máximo por arquivo. O uso
            acima do limite contratado poderá ser bloqueado até a liberação de espaço ou upgrade
            de plano.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">3. Conteúdo proibido</h2>
          <p>
            É proibido armazenar conteúdo ilegal, malicioso ou que viole direitos de terceiros.
            Reservamo-nos o direito de suspender contas que violem estes termos.
          </p>
          <h2 className="text-lg font-semibold text-slate-900">4. Cancelamento</h2>
          <p>
            Você pode cancelar sua assinatura a qualquer momento. O acesso aos recursos do plano
            pago é mantido até o fim do período já pago.
          </p>
        </div>
      </article>
      <Footer />
    </main>
  );
}
