# Política de Segurança

A segurança dos dados dos usuários é a prioridade número um do NuvemX. Agradecemos relatos
responsáveis de vulnerabilidades.

## Reportando uma vulnerabilidade

**Não abra uma issue pública para vulnerabilidades de segurança.**

Em vez disso, reporte de forma privada usando uma das opções abaixo:

1. Na aba **Security** deste repositório, use **"Report a vulnerability"** (Private vulnerability
   reporting do GitHub), se estiver habilitado; ou
2. Abra uma issue pedindo contato privado, sem detalhar a vulnerabilidade, e um mantenedor
   responderá com um canal seguro.

Ao reportar, inclua sempre que possível:

- Descrição do problema e impacto potencial (ex.: acesso a dados de outro usuário, escalonamento
  de privilégios, bypass de RLS, etc.)
- Passos para reproduzir
- Versão/commit afetado

## O que esperar

- Confirmação de recebimento em até 72 horas.
- Atualizações periódicas sobre o andamento da correção.
- Crédito no changelog/release, caso deseje, após a correção ser publicada.

## Escopo

Áreas de maior interesse para relatos de segurança:

- Row Level Security (RLS) do Postgres/Supabase — qualquer forma de ler ou escrever dados de
  outro usuário.
- Políticas do Supabase Storage — acesso a arquivos fora do próprio `user_id`.
- Links de compartilhamento (`/share/[token]`) — bypass de senha/expiração, ou enumeração de
  tokens.
- Rotas de API (`src/app/api/**`) — falta de verificação de dono do recurso, de cota ou de
  validação de upload.
- Exposição acidental de segredos (`SUPABASE_SERVICE_ROLE_KEY` ou similares) no frontend/bundle.

## Fora de escopo

- Ataques que exigem acesso físico ao dispositivo do usuário.
- Engenharia social contra mantenedores ou usuários.
- Vulnerabilidades em dependências de terceiros já publicamente conhecidas e sem uma correção
  disponível (reporte diretamente ao projeto afetado).
