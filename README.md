<div align="center">

# NuvemX

**Seus arquivos. Sua nuvem. Sua liberdade.**

Plataforma de armazenamento em nuvem — simples, rápida e segura — para pessoas e pequenas
empresas, com arquitetura pronta desde o início para revenda de espaço (SaaS multi-tenant).

</div>

---

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Supabase**: autenticação, Postgres (com Row Level Security) e Storage para os arquivos
- Nenhum conteúdo de arquivo é salvo no banco — o Postgres guarda **apenas metadados**
  (`user_id/folder_id/nome`); o binário fica em um bucket **privado** do Supabase Storage,
  sempre acessado via signed URLs de curta duração
- Interface com i18n (Português / English)

## Configuração

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Rode as migrações em `supabase/migrations/` (na ordem) via SQL editor do Supabase ou
   `supabase db push` — elas criam as tabelas, RLS, funções auxiliares, o bucket de storage
   privado (`nuvemx-files`) e os 4 planos iniciais (Free/Starter/Pro/Business).
3. Copie `.env.example` para `.env.local` e preencha com as chaves do seu projeto Supabase
   (URL, anon key e **service role key** — esta última nunca deve ir para o frontend; é usada
   apenas em rotas de API server-side, como o acesso público a links de compartilhamento).
4. `npm install`
5. `npm run dev`

## Segurança — decisões de arquitetura

- **Isolamento por usuário**: toda tabela sensível tem RLS com `user_id = auth.uid()`. Um
  usuário não consegue ler/escrever dados de outro trocando um ID na URL — a verificação
  acontece no Postgres, não na interface.
- **Storage**: os objetos ficam em `user_id/folder_id/arquivo` dentro de um bucket privado;
  as policies do Storage também exigem que o primeiro segmento do caminho seja o próprio
  `auth.uid()`.
- **Upload**: a validação de tamanho, extensão e cota de armazenamento é sempre refeita no
  backend (`/api/files/upload`), mesmo que o frontend já tenha validado — o frontend nunca é
  fonte de verdade para segurança.
- **Compartilhamento**: links usam token opaco + signed URL de poucos minutos, nunca uma URL
  pública permanente. Suportam senha (hash com bcrypt), expiração e revogação.
- **Admin**: o painel `/admin` não tem acesso de leitura a arquivos/pastas de outros usuários
  (sem policy de RLS para isso) — apenas estatísticas agregadas via uma função Postgres
  dedicada (`admin_get_platform_stats`), que nunca retorna conteúdo individual.
- **Auditoria**: ações sensíveis (login, upload, exclusão, criação/revogação de link, ações
  administrativas) são registradas em `security_logs`.

## Estrutura

```
supabase/migrations/   Schema, RLS, funções e seed dos planos
src/app/                Rotas (App Router)
src/app/(app)/          Área logada: dashboard, files, recent, favorites, shared, trash, settings
src/app/admin/          Painel administrativo (role = admin)
src/app/api/            Route handlers (upload, shares, admin, settings, trash)
src/components/         UI, landing page, dashboard, admin
src/lib/services/       Regras de negócio (storage, files, plans, security)
src/lib/supabase/       Clientes Supabase (browser / server / admin-service-role)
```

## Roadmap

Já implementado: cadastro, login, recuperação de senha, dashboard, pastas, upload real,
download real, lixeira com restauração, pesquisa, compartilhamento com senha/expiração,
controle de armazenamento por plano, RLS completa, painel administrativo, i18n PT/EN.

Preparado (schema e telas prontos, integração externa pendente): pagamentos recorrentes
(Stripe/Mercado Pago — ver `payments`/`subscriptions`/`invoices`), 2FA, login social
(Google/Apple/GitHub).

## Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).

## Contribuindo

Contribuições são bem-vindas! Veja o [guia de contribuição](CONTRIBUTING.md) e o
[código de conduta](CODE_OF_CONDUCT.md).

## Segurança

Para reportar uma vulnerabilidade, siga as instruções em [`SECURITY.md`](SECURITY.md) — não abra
uma issue pública.
