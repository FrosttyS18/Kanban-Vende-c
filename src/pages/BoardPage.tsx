import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Board from '@/components/board/Board'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { queryKeys } from '@/lib/queryKeys'
import {
  deleteBoardRemote,
  deleteNotificationByIdRemote,
  joinBoardViaTokenRemote,
  listBoardCatalogRemote,
  listGlobalAdminsAndMembersRemote,
  markNotificationReadByIdRemote,
  markNotificationsReadRemote,
  reorderBoardsRemote,
  searchCardsFtsRemote,
  setGlobalRoleByEmailRemote,
  updateBoardRemote
} from '@/services/boardApi'
import { type BoardData, type GlobalUserRole, type MemberNotification, type SearchScope } from '@/types'

interface BoardPageProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
}

type UrlState =
  | { kind: 'root' }
  | { kind: 'shared'; token: string }
  | { kind: 'board'; boardId: string; cardId: string | null; token: string | null }

function parseUrlState(): UrlState {
  if (typeof window === 'undefined') {
    return { kind: 'root' }
  }

  const path = window.location.pathname
  const sharedMatch = path.match(/^\/shared\/([^/]+)\/?$/)
  if (sharedMatch?.[1]) {
    return { kind: 'shared', token: decodeURIComponent(sharedMatch[1]) }
  }

  const boardMatch = path.match(/^\/boards\/([^/]+)(?:\/cards\/([^/]+))?\/?$/)
  if (boardMatch?.[1]) {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')?.trim() ?? null
    return {
      kind: 'board',
      boardId: decodeURIComponent(boardMatch[1]),
      cardId: boardMatch[2] ? decodeURIComponent(boardMatch[2]) : null,
      token: token || null
    }
  }

  const params = new URLSearchParams(window.location.search)
  const legacyBoardId = params.get('board')?.trim() ?? ''
  const legacyCardId = params.get('card')?.trim() ?? ''
  if (legacyBoardId) {
    return {
      kind: 'board',
      boardId: legacyBoardId,
      cardId: legacyCardId || null,
      token: null
    }
  }

  return { kind: 'root' }
}

function buildBoardPath(boardId: string, cardId?: string | null): string {
  const encodedBoardId = encodeURIComponent(boardId)
  if (!cardId) {
    return `/boards/${encodedBoardId}`
  }
  return `/boards/${encodedBoardId}/cards/${encodeURIComponent(cardId)}`
}

function buildBoardUrl(boardId: string, options?: { cardId?: string | null; token?: string | null }): string {
  const path = buildBoardPath(boardId, options?.cardId ?? null)
  const token = options?.token?.trim()
  if (!token) {
    return path
  }
  const params = new URLSearchParams()
  params.set('token', token)
  return `${path}?${params.toString()}`
}

function updateHistory(url: string, replace: boolean): void {
  if (typeof window === 'undefined') {
    return
  }

  const current = `${window.location.pathname}${window.location.search}`
  if (current === url) {
    return
  }

  if (replace) {
    window.history.replaceState({}, document.title, url)
    return
  }

  window.history.pushState({}, document.title, url)
}

function areBoardsEquivalent(previous: BoardData[], next: BoardData[]): boolean {
  if (previous === next) {
    return true
  }

  if (previous.length !== next.length) {
    return false
  }

  for (let index = 0; index < previous.length; index += 1) {
    const previousItem = previous[index]
    const nextItem = next[index]
    if (
      previousItem.id !== nextItem.id ||
      previousItem.title !== nextItem.title ||
      previousItem.color !== nextItem.color ||
      previousItem.ownerMemberId !== nextItem.ownerMemberId ||
      previousItem.updatedAt !== nextItem.updatedAt
    ) {
      return false
    }
  }

  return true
}

function areNotificationsEquivalent(previous: MemberNotification[], next: MemberNotification[]): boolean {
  if (previous === next) {
    return true
  }

  if (previous.length !== next.length) {
    return false
  }

  for (let index = 0; index < previous.length; index += 1) {
    const previousItem = previous[index]
    const nextItem = next[index]
    if (
      previousItem.id !== nextItem.id ||
      previousItem.boardId !== nextItem.boardId ||
      previousItem.cardId !== nextItem.cardId ||
      previousItem.isRead !== nextItem.isRead ||
      previousItem.type !== nextItem.type ||
      previousItem.title !== nextItem.title ||
      previousItem.message !== nextItem.message ||
      previousItem.createdAt !== nextItem.createdAt
    ) {
      return false
    }
  }

  return true
}

export default function BoardPage({ userEmail, onLogout, isLogoutLoading = false }: BoardPageProps) {
  const queryClient = useQueryClient()
  const [urlState, setUrlState] = useState<UrlState>(() => parseUrlState())
  const [shareJoinError, setShareJoinError] = useState<string | null>(null)
  const [pendingShareToken, setPendingShareToken] = useState<string | null>(() => {
    const parsed = parseUrlState()
    if (parsed.kind === 'shared') {
      return parsed.token
    }
    if (parsed.kind === 'board') {
      return parsed.token
    }
    return null
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>('board')
  const [createBoardSignal, setCreateBoardSignal] = useState(0)
  const [shareBoardSignal, setShareBoardSignal] = useState(0)
  const [boardMetaBoards, setBoardMetaBoards] = useState<BoardData[]>([])
  const [fallbackBoardId, setFallbackBoardId] = useState(() => (urlState.kind === 'board' ? urlState.boardId : ''))
  const [boardReloadKey, setBoardReloadKey] = useState(0)
  const [profileNotifications, setProfileNotifications] = useState<MemberNotification[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [currentMemberId, setCurrentMemberId] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState<GlobalUserRole>('member')
  const [openCardRequest, setOpenCardRequest] = useState<{ boardId: string; cardId: string; token: number } | null>(null)
  const [closeCardModalSignal, setCloseCardModalSignal] = useState(0)
  const lastOpenCardKeyRef = useRef('')

  const selectedBoardId = useMemo(() => {
    if (urlState.kind === 'board') {
      return urlState.boardId
    }
    return fallbackBoardId
  }, [fallbackBoardId, urlState])

  const boardCatalogQuery = useQuery({
    queryKey: queryKeys.boardCatalog,
    queryFn: listBoardCatalogRemote,
    refetchOnWindowFocus: true
  })

  const boardCatalog = useMemo(() => boardCatalogQuery.data ?? [], [boardCatalogQuery.data])
  const selectedBoardCatalog = useMemo(
    () => boardCatalog.find((board) => board.id === selectedBoardId) ?? null,
    [boardCatalog, selectedBoardId]
  )

  const globalRoleUsersQuery = useQuery({
    queryKey: queryKeys.globalRoleUsers,
    queryFn: listGlobalAdminsAndMembersRemote
  })

  const globalRoleMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: GlobalUserRole }) => setGlobalRoleByEmailRemote(email, role),
    onSuccess: async (result) => {
      if (!result.ok) {
        return
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.globalRoleUsers }),
        queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      ])
      setBoardReloadKey((previous) => previous + 1)
    }
  })

  const normalizedSearchQuery = searchQuery.trim()
  const debouncedSearchQuery = useDebouncedValue(normalizedSearchQuery, 280)
  const searchEnabled = debouncedSearchQuery.length >= 3 && (searchScope === 'all' || Boolean(selectedBoardId))

  const searchQueryState = useQuery({
    queryKey: queryKeys.searchCards({
      scope: searchScope,
      boardId: searchScope === 'board' ? selectedBoardId : undefined,
      query: debouncedSearchQuery
    }),
    queryFn: () =>
      searchCardsFtsRemote({
        query: debouncedSearchQuery,
        scope: searchScope,
        boardId: searchScope === 'board' ? selectedBoardId : undefined,
        limit: 10
      }),
    enabled: searchEnabled
  })

  const triggerCreateBoard = () => {
    setCreateBoardSignal((previous) => previous + 1)
  }

  const navigateToBoard = useCallback(
    (boardId: string, options?: { cardId?: string | null; token?: string | null; replace?: boolean }) => {
      const nextState: UrlState = {
        kind: 'board',
        boardId,
        cardId: options?.cardId ?? null,
        token: options?.token?.trim() || null
      }
      setUrlState(nextState)
      updateHistory(buildBoardUrl(boardId, { cardId: nextState.cardId, token: nextState.token }), options?.replace ?? false)
    },
    []
  )

  const handleLogout = useCallback(() => {
    setUrlState({ kind: 'root' })
    setFallbackBoardId('')
    setPendingShareToken(null)
    setShareJoinError(null)
    setOpenCardRequest(null)
    setCloseCardModalSignal((previous) => previous + 1)
    updateHistory('/', true)
    onLogout?.()
  }, [onLogout])

  const renameBoardMutation = useMutation({
    mutationFn: ({ boardId, title, color }: { boardId: string; title: string; color: string }) =>
      updateBoardRemote(boardId, { title, color }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
    }
  })

  const deleteBoardMutation = useMutation({
    mutationFn: (boardId: string) => deleteBoardRemote(boardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      setBoardReloadKey((previous) => previous + 1)
    }
  })

  const reorderBoardsMutation = useMutation({
    mutationFn: (orderedBoardIds: string[]) => reorderBoardsRemote(orderedBoardIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
    }
  })

  const markNotificationsReadMutation = useMutation({
    mutationFn: (userId: string) => markNotificationsReadRemote(userId)
  })

  const markNotificationReadMutation = useMutation({
    mutationFn: (variables: { userId: string; notificationId: string }) =>
      markNotificationReadByIdRemote(variables.userId, variables.notificationId)
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: (variables: { userId: string; notificationId: string }) =>
      deleteNotificationByIdRemote(variables.userId, variables.notificationId)
  })

  async function runMutation<TData, TError, TVariables>(
    mutation: UseMutationResult<TData, TError, TVariables, unknown>,
    variables: TVariables,
    options?: {
      onSuccess?: (data: TData) => Promise<void> | void
      onError?: (error: TError) => void
    }
  ): Promise<{ ok: boolean; data?: TData }> {
    try {
      const data = await mutation.mutateAsync(variables)
      await options?.onSuccess?.(data)
      return { ok: true, data }
    } catch (error) {
      options?.onError?.(error as TError)
      return { ok: false }
    }
  }

  const handleSelectBoard = (boardId: string) => {
    if (boardId === selectedBoardId && urlState.kind === 'board' && !urlState.cardId) {
      return
    }
    setFallbackBoardId(boardId)
    navigateToBoard(boardId)
  }

  const renameBoard = async (boardId: string, title: string, color: string) => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      return
    }
    await runMutation(
      renameBoardMutation,
      { boardId, title: nextTitle, color },
      {
        onError: () => {
          setBoardReloadKey((previous) => previous + 1)
        }
      }
    )
  }

  const deleteBoard = async (boardId: string) => {
    if (boardMetaBoards.length <= 1) {
      return
    }

    const deleteResult = await runMutation(deleteBoardMutation, boardId, {
      onError: () => {
        setBoardReloadKey((previous) => previous + 1)
      }
    })
    if (!deleteResult.ok) {
      return
    }

    const nextBoards = boardMetaBoards.filter((board) => board.id !== boardId)
    const nextBoardId = nextBoards[0]?.id ?? ''
    setBoardMetaBoards(nextBoards)
    setFallbackBoardId(nextBoardId)

    if (nextBoardId) {
      navigateToBoard(nextBoardId, { replace: true })
      return
    }

    setUrlState({ kind: 'root' })
    updateHistory('/', true)
  }

  const reorderBoards = async (orderedBoardIds: string[]) => {
    const reorderResult = await runMutation(reorderBoardsMutation, orderedBoardIds)
    if (!reorderResult.ok) {
      return
    }
    const orderMap = new Map(orderedBoardIds.map((id, index) => [id, index]))
    const sortedCatalog = [...boardCatalog].sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    queryClient.setQueryData(queryKeys.boardCatalog, sortedCatalog)
  }

  const syncMarkNotificationsRead = () => {
    if (!currentMemberId) {
      return
    }

    void runMutation(markNotificationsReadMutation, currentMemberId, {
      onError: () => {
        setBoardReloadKey((previous) => previous + 1)
      }
    })
  }

  const syncMarkNotificationRead = (notificationId: string) => {
    if (!currentMemberId) {
      return
    }

    void runMutation(
      markNotificationReadMutation,
      {
        userId: currentMemberId,
        notificationId
      },
      {
        onError: () => {
          setBoardReloadKey((previous) => previous + 1)
        }
      }
    )
  }

  const syncDeleteNotification = (notificationId: string) => {
    if (!currentMemberId) {
      return
    }

    void runMutation(
      deleteNotificationMutation,
      {
        userId: currentMemberId,
        notificationId
      },
      {
        onError: () => {
          setBoardReloadKey((previous) => previous + 1)
        }
      }
    )
  }

  const handleBoardMetaChange = useCallback((meta: {
    boards: BoardData[]
    currentBoardId: string
    currentMemberId: string
    currentUserRole: GlobalUserRole
    notifications: MemberNotification[]
    unreadNotificationsCount: number
  }) => {
    setBoardMetaBoards((previous) => (areBoardsEquivalent(previous, meta.boards) ? previous : meta.boards))
    setFallbackBoardId((previous) => (previous === meta.currentBoardId ? previous : meta.currentBoardId))
    setCurrentMemberId((previous) => (previous === meta.currentMemberId ? previous : meta.currentMemberId))
    setCurrentUserRole((previous) => (previous === meta.currentUserRole ? previous : meta.currentUserRole))
    setProfileNotifications((previous) => (areNotificationsEquivalent(previous, meta.notifications) ? previous : meta.notifications))
    setUnreadNotificationsCount((previous) => (previous === meta.unreadNotificationsCount ? previous : meta.unreadNotificationsCount))

    if (!meta.currentBoardId) {
      return
    }

    if (urlState.kind === 'root') {
      navigateToBoard(meta.currentBoardId, { replace: true })
      return
    }

    if (urlState.kind === 'board') {
      const selectedBoardFromCatalog = boardCatalog.find((board) => board.id === urlState.boardId)
      if (selectedBoardFromCatalog && !selectedBoardFromCatalog.hasAccess) {
        return
      }

      const boardExists = meta.boards.some((board) => board.id === urlState.boardId)
      if (!boardExists && !selectedBoardFromCatalog) {
        navigateToBoard(meta.currentBoardId, { replace: true })
      }
    }
  }, [boardCatalog, navigateToBoard, urlState])

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlState()
      setUrlState(parsed)
      if (parsed.kind === 'shared') {
        setPendingShareToken(parsed.token)
        return
      }
      if (parsed.kind === 'board' && parsed.token) {
        setPendingShareToken(parsed.token)
        return
      }
      setPendingShareToken(null)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (urlState.kind !== 'board') {
      if (urlState.kind === 'root') {
        updateHistory('/', true)
      }
      return
    }

    const expectedUrl = buildBoardUrl(urlState.boardId, { cardId: urlState.cardId, token: urlState.token })
    updateHistory(expectedUrl, true)
  }, [urlState])

  useEffect(() => {
    if (urlState.kind === 'board' && urlState.cardId) {
      const nextOpenCardKey = `${urlState.boardId}:${urlState.cardId}`
      if (lastOpenCardKeyRef.current === nextOpenCardKey) {
        return
      }
      lastOpenCardKeyRef.current = nextOpenCardKey
      setOpenCardRequest({
        boardId: urlState.boardId,
        cardId: urlState.cardId,
        token: Date.now()
      })
      return
    }

    const hadOpenCard = lastOpenCardKeyRef.current !== ''
    lastOpenCardKeyRef.current = ''
    setOpenCardRequest(null)
    if (hadOpenCard) {
      setCloseCardModalSignal((previous) => previous + 1)
    }
  }, [urlState])

  useEffect(() => {
    if (!pendingShareToken) {
      return
    }

    let cancelled = false

    const joinBoardFromToken = async () => {
      try {
        const boardId = await joinBoardViaTokenRemote(pendingShareToken)
        if (cancelled) {
          return
        }
        setFallbackBoardId(boardId)
        setShareJoinError(null)
        setBoardReloadKey((previous) => previous + 1)
        navigateToBoard(boardId, { replace: true })
        await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'Nao foi possivel entrar no board pelo link.'
        setShareJoinError(message)
      } finally {
        if (!cancelled) {
          setPendingShareToken(null)
        }
      }
    }

    void joinBoardFromToken()

    return () => {
      cancelled = true
    }
  }, [navigateToBoard, pendingShareToken, queryClient])

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[70px_1fr] bg-[#252525] lg:grid-cols-[253px_1fr] lg:grid-rows-[70px_1fr]">
      <div className="lg:col-span-2">
        <Header
          userEmail={userEmail}
          onLogout={onLogout ? handleLogout : undefined}
          isLogoutLoading={isLogoutLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchScope={searchScope}
          onSearchScopeChange={setSearchScope}
          searchResults={searchEnabled ? searchQueryState.data ?? [] : []}
          searchLoading={searchEnabled && searchQueryState.isLoading}
          searchError={searchEnabled ? searchQueryState.error instanceof Error ? searchQueryState.error.message : null : null}
          onSelectSearchResult={(result) => {
            setFallbackBoardId(result.boardId)
            navigateToBoard(result.boardId, { cardId: result.cardId })
          }}
          onCreateBoard={triggerCreateBoard}
          canCreateBoard={currentUserRole === 'admin'}
          onShareBoard={() => setShareBoardSignal((previous) => previous + 1)}
          activeBoardTitle={selectedBoardCatalog?.title}
          activeBoardColor={selectedBoardCatalog?.color}
          notifications={profileNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationsRead={() => {
            if (!currentMemberId) {
              return
            }
            setProfileNotifications((previous) => previous.map((notification) => ({ ...notification, isRead: true })))
            setUnreadNotificationsCount(0)
            syncMarkNotificationsRead()
          }}
          onOpenNotification={(notification) => {
            if (!notification.isRead) {
              setProfileNotifications((previous) => previous.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)))
              setUnreadNotificationsCount((previous) => Math.max(0, previous - 1))

              syncMarkNotificationRead(notification.id)
            }

            setFallbackBoardId(notification.boardId)
            navigateToBoard(notification.boardId, { cardId: notification.cardId || null })
          }}
          onDeleteNotification={(notification) => {
            setProfileNotifications((previous) => previous.filter((item) => item.id !== notification.id))
            if (!notification.isRead) {
              setUnreadNotificationsCount((previous) => Math.max(0, previous - 1))
            }

            syncDeleteNotification(notification.id)
          }}
        />
      </div>

      <Sidebar
        boards={boardCatalog}
        activeBoardId={selectedBoardId}
        canCreateBoard={currentUserRole === 'admin'}
        currentUserRole={currentUserRole}
        globalRoleUsers={globalRoleUsersQuery.data ?? []}
        isManagingRoles={globalRoleMutation.isPending}
        onCreateBoard={triggerCreateBoard}
        onSelectBoard={handleSelectBoard}
        onReorderBoards={reorderBoards}
        onRenameBoard={renameBoard}
        onDeleteBoard={deleteBoard}
        onRefreshGlobalRoles={() => {
          void globalRoleUsersQuery.refetch()
        }}
        onSetGlobalRole={async (email, role) => {
          const mutationResult = await runMutation(globalRoleMutation, { email, role })
          return mutationResult.data ?? { ok: false, message: 'Nao foi possivel atualizar o cargo global.' }
        }}
      />

      <main className="overflow-hidden bg-[#252525]">
        {shareJoinError && (
          <div className="mx-4 mt-3 rounded-xl border border-[#820002] bg-[#820002]/20 px-3 py-2 text-sm text-[#ffb4ae]">
            {shareJoinError}
          </div>
        )}

        <Board
          key={boardReloadKey}
          searchQuery={searchQuery}
          createBoardSignal={createBoardSignal}
          shareBoardSignal={shareBoardSignal}
          openCardRequest={openCardRequest}
          closeCardModalSignal={closeCardModalSignal}
          selectedBoardId={selectedBoardId}
          selectedBoardAccess={selectedBoardCatalog?.hasAccess ?? null}
          onBoardCreated={(boardId) => {
            setFallbackBoardId(boardId)
            setBoardReloadKey((previous) => previous + 1)
            navigateToBoard(boardId)
            void queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
          }}
          onCardOpen={(boardId, cardId) => {
            navigateToBoard(boardId, { cardId })
          }}
          onCardClose={(boardId) => {
            navigateToBoard(boardId, { replace: true })
          }}
          onBoardMetaChange={handleBoardMetaChange}
        />
      </main>
    </div>
  )
}
