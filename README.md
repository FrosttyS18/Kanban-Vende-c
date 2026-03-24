# SocialTeam Kanban

Aplicação web interna para gestão de demandas da equipe, com boards, listas e cards em tempo real.

## Stack
- React 19
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- dnd-kit
- Supabase (Auth, Postgres, Realtime, RPC)
- TanStack Query

## Principais funcionalidades
- Login Google corporativo com domínio permitido (`@vende-c.com`)
- Rate limit de login (RPC no Supabase + identificador local)
- Boards com controle de acesso por permissão
- Criação e organização de listas e cards com drag-and-drop
- Modal de card com:
  - descrição
  - membros
  - etiquetas
  - checklists
  - links/anexos
  - data de entrega
  - comentários e atividades
- Busca de cards via FTS no Supabase (título, descrição, checklist, etiquetas e links)
- Compartilhamento por link/token e por membros
- Notificações por atribuição de membro
- Realtime por board ativo

## Execução local
1. Instale dependências:
   - `npm install`
2. Configure variáveis de ambiente em `.env.local`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALLOWED_EMAIL_DOMAIN`
3. Rode em desenvolvimento:
   - `npm run dev`

## Scripts
- `npm run dev`: ambiente local
- `npm run encoding:check`: valida encoding/mojibake no `src`
- `npm run lint`: lint + encoding check
- `npm run build`: build de produção + validações
- `npm run preview`: preview da build

## Documentação técnica
Toda a documentação técnica detalhada do projeto está em:

- `PROJECT.md`
