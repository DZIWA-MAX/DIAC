# Contribuindo com o NuvemX

Obrigado por considerar contribuir! Este documento resume como propor mudanças.

## Antes de começar

- Abra uma [issue](../../issues) descrevendo o bug ou a funcionalidade antes de investir tempo
  em um PR grande, para alinhar a abordagem.
- Para vulnerabilidades de segurança, **não abra uma issue pública** — veja
  [`SECURITY.md`](SECURITY.md).

## Ambiente de desenvolvimento

1. `npm install`
2. Configure um projeto no [supabase.com](https://supabase.com) e rode as migrações em
   `supabase/migrations/` (na ordem).
3. Copie `.env.example` para `.env.local` e preencha com as chaves do seu projeto.
4. `npm run dev`

Antes de abrir um PR, rode localmente:

```bash
npm run typecheck
npm run lint
npm run build
```

## Fluxo de contribuição

1. Faça um fork do repositório e crie um branch a partir de `main`:
   `git checkout -b feature/nome-da-mudanca`.
2. Faça commits pequenos e com mensagens claras, descrevendo o "porquê" da mudança.
3. Garanta que o build, o typecheck e o lint passam (o CI roda os mesmos checks).
4. Abra o Pull Request preenchendo o template — descreva o que mudou, por quê e como testar.

## Padrões de código

- TypeScript estrito; evite `any` sem necessidade real.
- Nenhuma verificação de segurança (dono do recurso, cota, tamanho de arquivo etc.) deve depender
  apenas do frontend — o backend/RLS é sempre a fonte de verdade.
- Nunca commite segredos (`SUPABASE_SERVICE_ROLE_KEY`, `.env.local`) nem logue dados sensíveis.
- Prefira alterações pequenas e focadas a refatorações amplas não solicitadas.

## Código de conduta

Ao contribuir, você concorda em seguir o [Código de Conduta](CODE_OF_CONDUCT.md) deste projeto.
