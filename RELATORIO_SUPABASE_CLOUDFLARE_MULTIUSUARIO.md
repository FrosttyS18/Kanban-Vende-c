# Relatório Técnico - Integração Supabase para Multiusuário + Deploy Cloudflare

Data: 14/03/2026

## 1) Resumo executivo

O frontend já possui UX de colaboração (owner, compartilhamento, membros em card e notificações), mas a fonte de verdade do domínio Kanban ainda está em `localStorage`. Para operar corretamente com múltiplos usuários reais, o projeto precisa migrar boards/lists/cards/memberships/notifications para Supabase (Postgres + RLS + Realtime) e manter Cloudflare Pages apenas como host do frontend.

## 2) O que já está ligado ao Supabase

- Supabase Auth com Google OAuth.
- Restrição de domínio corporativo no frontend.
- Sessão persistente no cliente.
- RPCs de rate limit de login:
  - `get_login_rate_limit_status`
  - `register_login_failure`
  - `clear_login_rate_limit`

## 3) O que ainda está local (não multiusuário real)

- Persistência do board store em `localStorage` (`kanban_vndc_store_v1`).
- Estruturas críticas ainda locais:
  - boards
  - columns/lists
  - cards
  - labels
  - compartilhamento por board
  - members
  - notifications
  - archived cards
- Convite por e-mail e permissões funcionam apenas no estado local do navegador.
- Owner do board e vínculos de membros não estão persistidos em backend relacional.

## 4) Riscos atuais para ambiente com vários usuários

- Cada navegador vira uma base isolada; usuários não compartilham estado real.
- Conflitos de edição não possuem resolução transacional.
- Sem RLS efetiva de board membership no backend.
- Sem trilha de auditoria persistida para movimentações e alterações.
- Sem realtime: atualizações não propagam para outros usuários ativos.

## 5) O que precisa ser ligado no backend Supabase

## 5.1 Tabelas mínimas

- `profiles` (`id` = `auth.users.id`, `email`, `full_name`, `avatar_url`, `role_global`)
- `boards` (`id`, `title`, `color`, `owner_id`, `created_at`, `updated_at`)
- `board_members` (`board_id`, `user_id`, `permission` = `view|edit`, `created_at`)
- `lists` (`id`, `board_id`, `title`, `position`, `created_at`, `updated_at`)
- `cards` (`id`, `list_id`, `title`, `description`, `due_date`, `is_completed`, `position`, `created_at`, `updated_at`, `created_by`)
- `labels` (`id`, `board_id`, `text`, `color`, `created_at`)
- `card_labels` (`card_id`, `label_id`)
- `card_members` (`card_id`, `user_id`)
- `card_links` (`id`, `card_id`, `title`, `url`, `type`, `created_at`, `created_by`)
- `checklists` (`id`, `card_id`, `title`, `created_at`)
- `checklist_items` (`id`, `checklist_id`, `content`, `is_done`, `position`, `created_at`)
- `card_activities` (`id`, `card_id`, `actor_id`, `type`, `message`, `created_at`)
- `notifications` (`id`, `user_id`, `board_id`, `card_id`, `type`, `title`, `message`, `is_read`, `created_at`)
- `archived_cards` (ou flag em `cards`) para histórico de arquivamento

## 5.2 Regras de segurança (RLS)

- Leitura de board somente para `owner` ou membro em `board_members`.
- Escrita em board/list/card condicionada à permissão `edit`.
- Remoção de board restrita ao `owner`.
- Inserção de `board_members` restrita ao `owner` (ou admin global).
- `notifications.user_id` acessível somente pelo próprio usuário autenticado.
- RPCs e ações administrativas sem service role no cliente.

## 5.3 Realtime

- Assinar mudanças por `board_id` para:
  - lists
  - cards
  - card_members
  - card_labels
  - notifications
- Estratégia recomendada:
  - aplicar optimistic update no client
  - reconciliar com payload realtime
  - fallback por refetch em conflitos

## 5.4 Migração de dados locais

- Implementar bootstrap por usuário:
  - primeira carga: criar board inicial no backend se não existir
  - opcional: migrar snapshot local para backend com confirmação explícita
- Evitar merge silencioso de dados conflitantes entre local e remoto.

## 6) Cloudflare Pages + Supabase (produção)

## 6.1 Variáveis de ambiente no Cloudflare

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALLOWED_EMAIL_DOMAIN`

Aplicar em ambientes de produção e preview.

## 6.2 Supabase Auth (Google)

- Configurar `Site URL` para domínio de produção.
- Configurar `Redirect URLs` para produção e previews usados no Cloudflare.
- Validar callback OAuth retornando para `window.location.origin`.

## 6.3 Segurança operacional

- Chave anon no frontend depende de RLS correta em todas as tabelas.
- Service role apenas em ambiente seguro (Edge Function/Worker), nunca no browser.
- Revisar CORS e política de origem conforme domínios do Cloudflare.

## 6.4 Observabilidade e estabilidade

- Habilitar logs de erro do frontend no Cloudflare.
- Métricas de falha de login, falha de RPC e falha de sincronização realtime.
- Plano de rollback para migrações SQL.

## 7) Ordem recomendada de execução

1. Modelagem SQL + migrações + RLS.
2. Persistência remota de boards/lists/cards.
3. Persistência remota de sharing/members e owner.
4. Persistência remota de notificações e atividades.
5. Realtime por board.
6. Migração de estado local para remoto.
7. Hardening para produção Cloudflare + testes E2E multiusuário.

## 8) Critério de pronto para multiusuário real

- Dois usuários distintos vendo o mesmo board com estado consistente.
- Alteração de card/list em tempo real sem refresh manual.
- Regras de owner e permissões aplicadas no backend via RLS.
- Notificações persistidas e lidas em múltiplos dispositivos.
- Deploy Cloudflare com OAuth e variáveis de ambiente validadas em produção.
