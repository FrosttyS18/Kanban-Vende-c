import { type SearchScope } from '@/types'

export const queryKeys = {
  boardCatalog: ['boardCatalog'] as const,
  boardStore: (boardId?: string) => ['boardStore', boardId?.trim() || 'default'] as const,
  globalRoleUsers: ['globalRoleUsers'] as const,
  archivedCards: ['archivedCards'] as const,
  searchCards: (input: { scope: SearchScope; boardId?: string; query: string }) =>
    ['searchCards', input.scope, input.boardId?.trim() || 'all', input.query.trim().toLowerCase()] as const
}
