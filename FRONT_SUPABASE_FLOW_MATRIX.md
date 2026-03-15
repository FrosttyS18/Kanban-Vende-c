# Matriz de Persistência Front -> Supabase

## Board
| Ação UI | Callback Front | Método remoto | Tabelas |
|---|---|---|---|
| Criar board | `createBoard` (`Board.tsx`) | `createBoardRemote` | `boards`, `board_members`, `board_share_links` |
| Renomear board | `renameBoard` (`BoardPage.tsx`) | `updateBoardRemote` | `boards` |
| Reordenar boards | `reorderBoards` (`BoardPage.tsx`) | `reorderBoardsRemote` | `boards.position` |
| Excluir board | `deleteBoard` (`BoardPage.tsx`) | `deleteBoardRemote` | `boards` + cascata |
| Atualizar compartilhamento | `updateShareSettings` (`Board.tsx`) | `replaceBoardShareSettingsRemote` | `board_share_links`, `board_members` |
| Convidar por e-mail | `inviteMemberByEmail` (`Board.tsx`) | `inviteMemberByEmailRemote` | `board_members` |

## Listas
| Ação UI | Callback Front | Método remoto | Tabelas |
|---|---|---|---|
| Criar lista | `addList` (`Board.tsx`) | `createListRemote` | `lists` |
| Renomear lista | `renameColumn` (`Board.tsx`) | `updateListRemote` | `lists.title` |
| Reordenar listas (drag) | `onDragEnd` (`Board.tsx`) | `reorderListsRemote` | `lists.position` |
| Excluir lista | `deleteColumn` (`Board.tsx`) | `deleteListRemote` | `lists` + cards por cascata |

## Cards
| Ação UI | Callback Front | Método remoto | Tabelas |
|---|---|---|---|
| Criar card | `addCardToList` (`Board.tsx`) | `createCardRemote` + `syncCardsOrderingRemote` | `cards` |
| Editar card (titulo, descrição, data, membros, labels, checklist, links) | `updateCardInStore` (`Board.tsx`) | `upsertCardRemote` | `cards`, `card_labels`, `card_members`, `card_links`, `checklists`, `checklist_items` |
| Mover/reordenar card (drag) | `onDragEnd` (`Board.tsx`) | `upsertCardRemote` (se mudou lista) + `syncCardsOrderingRemote` | `cards.list_id`, `cards.position` |
| Arquivar card | `archiveCard` (`Board.tsx`) | `archiveCardRemote` | `cards.archived_at` |
| Excluir card | `deleteCard` (`Board.tsx`) | `deleteCardRemote` | `cards` + cascatas relacionais |
| Restaurar arquivado | fluxo Arquivados | `restoreArchivedCardRemote` | `cards.archived_at` |

## Atividade, comentários e notificações
| Ação UI | Callback Front | Método remoto | Tabelas |
|---|---|---|---|
| Registrar atividade | `recordActivity` (`Board.tsx`/`CardModal.tsx`) | `recordCardActivityRemote` (RPC) | `card_activities` |
| Comentário no card | `saveComment` (`CardModal.tsx`) | `recordCardActivityRemote` | `card_activities` |
| Notificar membro atribuído | `updateCardInStore` (`Board.tsx`) | `insertNotificationsRemote` | `notifications` |
| Marcar notificações lidas | `Header` -> `BoardPage` | `markNotificationsReadRemote` | `notifications.is_read` |

## Realtime e carregamento
- Carregamento principal: `loadBoardStoreFromRemote(selectedBoardId)`.
- Estratégia: lista leve de boards + detalhes apenas do board ativo.
- Realtime: `subscribeBoardRealtime(boardId)` escopado ao board ativo.
- Fallback em falha de mutação: `loadStore(boardId, { forceRefresh: true, silent: true })`.

## Pontos de rollback em drag
- `onDragEnd` aplica rollback local do snapshot de drag quando falha persistência.
- Depois do rollback local, força refetch remoto para reconciliação final.
