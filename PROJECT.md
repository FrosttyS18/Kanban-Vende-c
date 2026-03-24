# PROJECT

## 1. Visão geral

SocialTeam Kanban é uma aplicação interna para gestão de tarefas e operação de times, com colaboração multiusuário, autenticação corporativa, controle de acesso por board e sincronização em tempo real.

Estado documentado: **23/03/2026**.

## 2. Stack e dependências

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- dnd-kit
- TanStack Query
- lucide-react

### Backend
- Supabase Auth (Google OAuth)
- Supabase Postgres
- Supabase Realtime
- Supabase RPC (funções SQL)

## 3. Variáveis de ambiente

Arquivo local: `.env.local`

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ALLOWED_EMAIL_DOMAIN`

## 4. Scripts de projeto

- `npm run dev`: desenvolvimento local
- `npm run encoding:check`: valida encoding/mojibake no código-fonte (`src`)
- `npm run lint`: lint + encoding check
- `npm run build`: build de produção + encoding check + typecheck
- `npm run preview`: preview local da build

## 5. Estrutura técnica do frontend

## Diretórios principais (`src`)
- `assets`: logos, ícones e imagens
- `components`: UI por domínio (auth, board, layout, ui)
- `constants`: constantes de negócio (ex.: eventos de atividade permitidos)
- `hooks`: hooks de sessão, debounce e utilitários de estado
- `lib`: integração Supabase, Query Client e query keys
- `pages`: composição de páginas e orquestração de rotas
- `services`: camada de acesso a dados (Supabase/RPC)
- `types`: tipos auxiliares legados
- `utils`: utilitários de domínio/UI
- `types.ts`: tipos principais de domínio usados no app atual

## Entry point
- `src/main.tsx`: inicializa React e `QueryClientProvider`.
- `src/App.tsx`: gate de sessão (loading/login/board), com fallback de erro de bootstrap de auth.

## Página principal
- `src/pages/BoardPage.tsx`:
  - parse de rota (`/`, `/shared/:token`, `/boards/:boardId`, `/boards/:boardId/cards/:cardId`)
  - catálogo de boards
  - busca de cards
  - abertura/fechamento de card por URL
  - orquestração de notificações
  - integração entre `Header`, `Sidebar` e `Board`

## Componentes críticos
- `src/components/layout/Header.tsx`
  - busca com sugestões
  - menu de notificações
  - menu de usuário/logout
  - comportamento desktop/mobile
- `src/components/layout/Sidebar.tsx`
  - lista de boards
  - reorder de boards
  - context menu por board
  - hub de Configurações (Membros/Arquivados)
  - drawer mobile
- `src/components/board/Board.tsx`
  - CRUD de board/lista/card
  - drag-and-drop (listas/cards)
  - sincronização realtime
  - modal do card
  - confirmação para ações destrutivas
- `src/components/board/CardModal.tsx`
  - descrição, membros, etiquetas, checklist, links, datas
  - feed de comentários/atividades

## 6. Sessão e autenticação

## Fluxo
1. `useAuthSession` inicia bootstrap de sessão com timeout.
2. `authService` usa Supabase Auth (Google OAuth).
3. Email é validado por domínio corporativo (`@vende-c.com`).
4. Sessão é persistida no storage key `socialteam-kanban-auth`.

## Rate limit de login
- Serviço: `src/services/loginRateLimitService.ts`
- RPCs:
  - `get_login_rate_limit_status`
  - `register_login_failure`
  - `clear_login_rate_limit`
- Identificador local:
  - `socialteam-login-rate-limit-id`

## 7. Estado, cache e sync

## TanStack Query
- Query client global em `src/lib/queryClient.ts`.
- Chaves padronizadas em `src/lib/queryKeys.ts`:
  - `boardCatalog`
  - `boardStore(boardId)`
  - `globalRoleUsers`
  - `archivedCards`
  - `searchCards(scope, boardId, query)`

## Configuração de cache/retry
- `staleTime`: 15s
- `gcTime`: 5min
- `retry` de query: até 2 tentativas
- `retryDelay`: backoff exponencial
- `mutations`: sem retry automático

## Estratégia de sincronização
- Lazy loading por board ativo.
- Realtime escopado por board ativo.
- Invalidação seletiva de query após mutações.
- Rotas e estado de modal/card sincronizados pela URL.

## 8. Busca (Search V3)

Busca remota com FTS no Supabase.

## Características
- disparo a partir de 3 caracteres
- debounce no frontend
- escopo:
  - board atual
  - todos os boards com acesso
- ranking por `ts_rank_cd`
- abre card por rota semântica ao selecionar resultado

## RPC de busca
- `search_cards_fts`

## Indexação
- `cards.search_document` (texto consolidado)
- `cards.search_tsv` (tsvector gerado)
- função de refresh de documento de busca:
  - `refresh_card_search_document`

## 9. Feed de atividades

Política atual: feed essencial.

Eventos permitidos no frontend:
- `comment_added`
- `card_moved`

Arquivo de regra:
- `src/constants/activityEvents.ts`

Persistência:
- RPC `record_card_activity` com dedupe para movimento.

## 10. Realtime

Assinaturas por board ativo em:
- `boards`
- `lists`
- `cards`
- `labels`
- `board_members`
- `board_share_links`
- `card_labels`
- `card_members`
- `card_links`
- `checklists`
- `checklist_items`
- `card_activities`
- `notifications` (por usuário atual)

Serviço:
- `subscribeBoardRealtimeWithOptions` em `src/services/boardApi.ts`.

## 11. Supabase schema (public)

Resumo das tabelas de domínio e segurança em produção.

### `login_rate_limits`
- PK: `identifier`
- Colunas principais:
  - `failed_attempts`
  - `blocked_until`
  - `updated_at`
- Uso: controle de tentativas de login.

### `profiles`
- PK: `id` (UUID, referência a `auth.users.id`)
- Colunas principais:
  - `email` (unique)
  - `full_name`
  - `avatar_url`
  - `role_global` (`admin` | `member`)
  - `last_board_id`
  - `created_at`, `updated_at`

### `boards`
- PK: `id`
- FK: `owner_id -> profiles.id`
- Colunas principais:
  - `title`
  - `color`
  - `position`
  - `created_at`, `updated_at`

### `board_members`
- PK composta: (`board_id`, `user_id`)
- FKs:
  - `board_id -> boards.id`
  - `user_id -> profiles.id`
- Colunas:
  - `permission` (`view` | `edit`)
  - `created_at`

### `board_share_links`
- PK: `board_id`
- FK:
  - `board_id -> boards.id`
  - `created_by -> profiles.id`
- Colunas:
  - `token` (unique)
  - `is_active`
  - `created_at`, `updated_at`

### `lists`
- PK: `id`
- FK: `board_id -> boards.id`
- Colunas:
  - `title`
  - `position`
  - `created_at`, `updated_at`

### `cards`
- PK: `id`
- FK:
  - `list_id -> lists.id`
  - `created_by -> profiles.id`
- Colunas principais:
  - `title`
  - `description`
  - `due_date`
  - `is_completed`
  - `position`
  - `archived_at`
  - `search_document`
  - `search_tsv` (gerado)
  - `created_at`, `updated_at`

### `labels`
- PK: `id`
- FK: `board_id -> boards.id`
- Colunas:
  - `text`
  - `color`
  - `created_at`, `updated_at`

### `card_labels`
- PK composta: (`card_id`, `label_id`)
- FK:
  - `card_id -> cards.id`
  - `label_id -> labels.id`
- Colunas:
  - `created_at`

### `card_members`
- PK composta: (`card_id`, `user_id`)
- FK:
  - `card_id -> cards.id`
  - `user_id -> profiles.id`
- Colunas:
  - `created_at`

### `card_links`
- PK: `id`
- FK:
  - `card_id -> cards.id`
  - `created_by -> profiles.id`
- Colunas:
  - `title`
  - `url`
  - `type` (`drive` | `figma` | `other`)
  - `created_at`, `updated_at`

### `checklists`
- PK: `id`
- FK: `card_id -> cards.id`
- Colunas:
  - `title`
  - `position`
  - `created_at`, `updated_at`

### `checklist_items`
- PK: `id`
- FK: `checklist_id -> checklists.id`
- Colunas:
  - `content`
  - `is_done`
  - `position`
  - `created_at`, `updated_at`

### `card_activities`
- PK: `id`
- FK:
  - `card_id -> cards.id`
  - `actor_id -> profiles.id`
- Colunas:
  - `type` (`comment` | `system`)
  - `message`
  - `event_type`
  - `dedupe_key`
  - `created_at`

### `notifications`
- PK: `id`
- FK:
  - `user_id -> profiles.id`
  - `board_id -> boards.id`
  - `card_id -> cards.id` (nullable)
- Colunas:
  - `type`
  - `title`
  - `message`
  - `is_read`
  - `created_at`, `updated_at`

### `board_email_invites`
- PK: `id` (UUID)
- FK:
  - `board_id -> boards.id`
  - `invited_by -> profiles.id`
  - `accepted_by -> profiles.id`
- Colunas:
  - `email`
  - `permission`
  - `accepted_at`
  - `created_at`, `updated_at`

## 12. RPCs e funções relevantes (public)

## Permissão, membership e roles
- `is_global_admin`
- `board_is_member`
- `board_can_edit`
- `card_board_id`
- `list_board_catalog`
- `list_board_profiles`
- `list_global_admins_and_members`
- `set_global_role_by_email`

## Compartilhamento
- `join_board_via_token`
- `invite_board_member_by_email`
- `sync_pending_board_invites_for_current_user`

## Atividades e notificações
- `record_card_activity`
- `create_member_assignment_notifications`
- `cleanup_card_activities`

## Login/rate-limit
- `get_login_rate_limit_status`
- `register_login_failure`
- `clear_login_rate_limit`

## Busca
- `search_cards_fts`
- `refresh_card_search_document`

## Triggers utilitárias
- `touch_updated_at`
- `touch_board_updated_at_from_card_change`
- `touch_board_updated_at_from_list_change`
- funções de refresh de search por alteração em labels/links/checklists/cards

## 13. Migrações aplicadas (resumo)

Últimas migrações relevantes no projeto:
- Q1 auth/rate limit
- backend multitenant/realtime (Q2-Q6)
- `last_board_id` em profiles
- dedupe e retenção de atividades
- ajustes de compartilhamento e convites
- inclusão de tabelas de share no realtime publication
- touch de `boards.updated_at` por mudanças em listas/cards
- RPC de notificações por atribuição de membro
- catálogo global de boards e admin global
- feed essencial (`comment_added` + `card_moved`)
- Search V2/V3 com FTS e prefixo

## 14. Regras operacionais de UX e negócio (estado atual)

- Criação de board: permitida para `admin` global.
- Usuário sem acesso ao board: vê estado bloqueado.
- Configurações:
  - visível para usuários autenticados
  - gestão de cargos globais somente para admin
- Notificações:
  - leitura individual e em lote
  - exclusão individual
- Modal de card:
  - ações destrutivas com confirmação

## 15. Deploy e ambiente

## Frontend
- Cloudflare Pages (build Vite)

## Backend
- Supabase (project ref: `dhefpblsdtpfxegouzva`)

## Build
- `npm run build`
- inclui `encoding:check` antes do bundle

## 16. Observações de manutenção

- `src/types/kanban.ts` e `src/types/auth.ts` existem como tipos auxiliares/legados.
- Fonte principal de tipos de domínio em uso no app atual: `src/types.ts`.
- O projeto usa regras de encoding check no `src`; manter textos em UTF-8 para evitar regressões.
