# Status do Projeto Vende-c

Este documento serve como a fonte oficial da verdade para o estado atual do projeto, documentando o que foi feito, o que está funcionando e o que ainda precisa ser implementado.

## Atualização técnica real (14/03/2026)

- Stack em uso no código: React + TypeScript + Vite + Tailwind + shadcn/ui + dnd-kit + Supabase Auth.
- Persistência do domínio de board ainda está em `localStorage` via `boardService.ts`.
- Supabase hoje está aplicado em autenticação e RPC de rate limit de login.
- Multiusuário existente no frontend: owner por board, compartilhamento, membros em card e notificações.
- Realtime de board, modelagem relacional de cards/lists/boards e RLS de domínio ainda não estão ativos no fluxo principal.
- Fluxo de links no card está ativo; upload com Firebase permanece legado no repositório e não está conectado ao fluxo principal.
- Deploy alvo definido: Cloudflare Pages.
- Projeto padronizado para UTF-8 com `.editorconfig` e `.gitattributes`.

## 📅 Atualizado em: 14/03/2026

## 🚀 Estado Atual
O projeto passou por uma refatoração significativa para atingir um nível "Sênior" de qualidade de código e experiência do usuário (UX). A arquitetura agora utiliza bibliotecas robustas para Drag-and-Drop e gerenciamento de estado mais limpo.

### ✅ O que está funcionando (Concluído)

#### 1. Arquitetura e Qualidade de Código
- **Drag-and-Drop Profissional**: Migração completa para `@dnd-kit` (substituindo implementações manuais frágeis).
  - Movimentação suave de colunas e cartões.
  - Animações fluidas e acessibilidade aprimorada.
- **Tipagem Estrita (TypeScript)**: 
  - Adoção de `verbatimModuleSyntax` para imports mais seguros.
  - Definição clara de interfaces compartilhadas em `@/types` (`CardData`, `ColumnData`, `Label`, etc.).
  - Remoção de `any` implícitos e props não utilizadas.
- **Persistência de Dados**:
  - Dados de colunas, cartões e etiquetas agora são salvos automaticamente no `localStorage`.
  - O estado é preservado mesmo após recarregar a página (F5).

#### 2. Funcionalidades do Quadro (Board)
- **Gerenciamento de Colunas**:
  - Criar novas listas.
  - Renomear listas existentes.
  - Excluir listas (limpa também os cartões associados).
  - Reordenar colunas via arrastar e soltar.
- **Gerenciamento de Cartões**:
  - Criar cartões rapidamente (título ou link).
  - Editar cartões via Modal detalhado.
  - Excluir cartões.
  - Mover cartões entre colunas e reordenar dentro da coluna.

#### 3. Modal de Detalhes do Cartão (CardModal)
- **Edição Completa**:
  - Título e Descrição editáveis.
  - **Etiquetas**: Sistema robusto de etiquetas com cores, criação e edição dinâmica.
  - **Datas**: Seletor de data com input manual e visualização de status (atrasado/em dia).
  - **Checklist**: Status de conclusão ("Check") sincronizado visualmente entre o modal e o card no board.
- **Links**:
  - Cadastro de links Drive/Figma/URL genérica no card.
  - Extração automática de tipo do link na UI.
  - Listagem e remoção de links no modal do card.
- **Membros**:
  - Seleção de membros por board no card.
  - Etiqueta automática ao adicionar membro no card.
  - Sincronização de membros do card com compartilhamento do board.

#### 4. Colaboração e Acesso (Frontend)
- **Compartilhamento de board**:
  - Fluxo por e-mail com permissão `view`/`edit`.
  - Owner do board não pode ser removido da lista de acesso.
  - Regra de pelo menos 1 membro em acesso.
- **Notificações**:
  - Evento ao adicionar membro no card.
  - Sino no header com contagem de não lidas.
  - Navegação da notificação para o card correspondente.

#### 5. Interface e UX
- **Design Moderno**: Uso de componentes shadcn/ui e ícones Lucide.
- **Feedback Visual**: Badges coloridas para datas e etiquetas.
- **Responsividade**: Layout adaptável e menus inteligentes (popovers que detectam bordas da tela).

---

## 🚧 O que Falta (Pendências)

#### 1. Funcionalidades de Arquivamento
- [x] **Arquivar Cartões**: Lógica de arquivamento implementada e funcional. Cartões arquivados vão para a página "Arquivos" e são persistidos.
- [ ] **Restaurar Cartões Arquivados**: A lógica de arquivar existe, mas a interface para restaurar cartões da tela de "Arquivos" para o board principal precisa ser verificada/reimplementada se necessário.
- [ ] **Arquivar vs Excluir**: Clarificar na UI a diferença entre "Excluir para sempre" e "Arquivar".

#### 2. Melhorias Futuras (Backlog)
- [ ] **Backend Real**: Substituir `localStorage` por persistência relacional no Supabase com RLS.
- [ ] **Realtime**: Atualização de board/card em tempo real para múltiplos usuários.
- [ ] **Sistema de Comentários**: A UI existe, mas a lógica de adicionar/salvar comentários ainda não está totalmente persistida.
- [ ] **Deploy Cloudflare + Supabase**: consolidar variáveis de ambiente, redirects OAuth e observabilidade em produção.

---

## 🛠️ Detalhes Técnicos Recentes (Fixes)
- **Governança de acesso no frontend**: owner do board protegido contra remoção no compartilhamento.
- **Consistência de membros**: membros do card sincronizados com membros com acesso ao board.
- **Notificações locais de atribuição**: evento ao adicionar membro no card com navegação para o card.
- **Controle de histórico**: limite de atividades por card para evitar crescimento indefinido no estado local.
- **Ajustes de UX**: fechamento por clique fora em menus de perfil/notificações e melhorias de spacing no header.
- **Padronização de estado**: normalizações no `boardService.ts` para remover legados e manter store consistente.

---

**Nota para o Desenvolvedor**: Mantenha este arquivo atualizado a cada grande mudança ou finalização de sprint.
