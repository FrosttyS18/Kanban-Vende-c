import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Board from '@/components/board/Board'
import { type BoardCatalogItem, type BoardData, type GlobalRoleUser, type GlobalUserRole, type MemberNotification } from '@/types'
import { deleteBoardRemote, deleteNotificationByIdRemote, joinBoardViaTokenRemote, listBoardCatalogRemote, listGlobalAdminsAndMembersRemote, markNotificationReadByIdRemote, markNotificationsReadRemote, reorderBoardsRemote, setGlobalRoleByEmailRemote, updateBoardRemote } from '@/services/boardApi'

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

export default function BoardPage({ userEmail, onLogout, isLogoutLoading = false }: BoardPageProps) {
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
  const [createBoardSignal, setCreateBoardSignal] = useState(0)
  const [shareBoardSignal, setShareBoardSignal] = useState(0)
  const [boards, setBoards] = useState<BoardData[]>([])
  const [boardCatalog, setBoardCatalog] = useState<BoardCatalogItem[]>([])
  const [fallbackBoardId, setFallbackBoardId] = useState(() => (urlState.kind === 'board' ? urlState.boardId : ''))
  const [boardReloadKey, setBoardReloadKey] = useState(0)
  const [profileNotifications, setProfileNotifications] = useState<MemberNotification[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [currentMemberId, setCurrentMemberId] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState<GlobalUserRole>('member')
  const [globalRoleUsers, setGlobalRoleUsers] = useState<GlobalRoleUser[]>([])
  const [isManagingGlobalRoles, setIsManagingGlobalRoles] = useState(false)
  const [openCardRequest, setOpenCardRequest] = useState<{ boardId: string; cardId: string; token: number } | null>(null)
  const [closeCardModalSignal, setCloseCardModalSignal] = useState(0)
  const lastOpenCardKeyRef = useRef<string>('')

  const selectedBoardId = useMemo(() => {
    if (urlState.kind === 'board') {
      return urlState.boardId
    }
    return fallbackBoardId
  }, [fallbackBoardId, urlState])

  const selectedBoardCatalog = useMemo(
    () => boardCatalog.find((board) => board.id === selectedBoardId) ?? null,
    [boardCatalog, selectedBoardId]
  )

  const loadBoardCatalog = useCallback(async () => {
    try {
      const catalog = await listBoardCatalogRemote()
      setBoardCatalog(catalog)
    } catch {
      setBoardCatalog([])
    }
  }, [])

  const loadGlobalRoleUsers = useCallback(async () => {
    try {
      const users = await listGlobalAdminsAndMembersRemote()
      setGlobalRoleUsers(users)
    } catch {
      setGlobalRoleUsers([])
    }
  }, [])

  const triggerCreateBoard = () => {
    setCreateBoardSignal((prev) => prev + 1)
  }

  const handleLogout = useCallback(() => {
    setUrlState({ kind: 'root' })
    setFallbackBoardId('')
    setPendingShareToken(null)
    setShareJoinError(null)
    setOpenCardRequest(null)
    setCloseCardModalSignal((prev) => prev + 1)
    updateHistory('/', true)
    onLogout?.()
  }, [onLogout])

  const navigateToBoard = useCallback((boardId: string, options?: { cardId?: string | null; token?: string | null; replace?: boolean }) => {
    const nextState: UrlState = {
      kind: 'board',
      boardId,
      cardId: options?.cardId ?? null,
      token: options?.token?.trim() || null
    }
    setUrlState(nextState)
    updateHistory(buildBoardUrl(boardId, { cardId: nextState.cardId, token: nextState.token }), options?.replace ?? false)
  }, [])

  const handleSelectBoard = (boardId: string) => {
    if (boardId === selectedBoardId && urlState.kind === 'board' && !urlState.cardId) {
      return
    }
    setFallbackBoardId(boardId)
    setBoardReloadKey((prev) => prev + 1)
    navigateToBoard(boardId)
  }

  const renameBoard = async (boardId: string, title: string, color: string) => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      return
    }

    await updateBoardRemote(boardId, { title: nextTitle, color })
    setBoardReloadKey((prev) => prev + 1)
  }

  const deleteBoard = async (boardId: string) => {
    if (boards.length <= 1) {
      return
    }
    await deleteBoardRemote(boardId)
    const nextBoards = boards.filter((board) => board.id !== boardId)
    const nextBoardId = nextBoards[0]?.id ?? ''
    setBoards(nextBoards)
    setFallbackBoardId(nextBoardId)
    if (nextBoardId) {
      navigateToBoard(nextBoardId, { replace: true })
    } else {
      setUrlState({ kind: 'root' })
      updateHistory('/', true)
    }
    setBoardReloadKey((prev) => prev + 1)
  }

  const reorderBoards = async (orderedBoardIds: string[]) => {
    const orderMap = new Map(orderedBoardIds.map((id, index) => [id, index]))
    const nextBoards = [...boards].sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    setBoards(nextBoards)
    await reorderBoardsRemote(orderedBoardIds)
    setBoardReloadKey((prev) => prev + 1)
  }

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parseUrlState()
      setUrlState(parsed)
      if (parsed.kind === 'shared') {
        setPendingShareToken(parsed.token)
      } else if (parsed.kind === 'board' && parsed.token) {
        setPendingShareToken(parsed.token)
      } else {
        setPendingShareToken(null)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    void loadBoardCatalog()
  }, [boardReloadKey, loadBoardCatalog])

  useEffect(() => {
    const handleFocus = () => {
      void loadBoardCatalog()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [loadBoardCatalog])

  useEffect(() => {
    void loadGlobalRoleUsers()
  }, [loadGlobalRoleUsers])

  useEffect(() => {
    if (urlState.kind !== 'board') {
      if (urlState.kind === 'root') {
        updateHistory('/', true)
      }
      return
    }

    const expected = buildBoardUrl(urlState.boardId, { cardId: urlState.cardId, token: urlState.token })
    updateHistory(expected, true)
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
      setCloseCardModalSignal((prev) => prev + 1)
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
        setBoardReloadKey((prev) => prev + 1)
        navigateToBoard(boardId, { replace: true })
      } catch (error) {
        if (cancelled) {
          return
        }
        const message = error instanceof Error ? error.message : 'Não foi possível entrar no board pelo link.'
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
  }, [navigateToBoard, pendingShareToken])

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[70px_1fr] bg-[#252525] lg:grid-cols-[253px_1fr] lg:grid-rows-[70px_1fr]">
      <div className="lg:col-span-2">
        <Header
          userEmail={userEmail}
          onLogout={onLogout ? handleLogout : undefined}
          isLogoutLoading={isLogoutLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateBoard={triggerCreateBoard}
          canCreateBoard={currentUserRole === 'admin'}
          onShareBoard={() => setShareBoardSignal((prev) => prev + 1)}
          activeBoardTitle={selectedBoardCatalog?.title}
          activeBoardColor={selectedBoardCatalog?.color}
          notifications={profileNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationsRead={() => {
            if (!currentMemberId) {
              return
            }
            void markNotificationsReadRemote(currentMemberId)
            setProfileNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })))
            setUnreadNotificationsCount(0)
          }}
          onOpenNotification={(notification) => {
            if (!notification.isRead) {
              setProfileNotifications((prev) =>
                prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
              )
              setUnreadNotificationsCount((prev) => Math.max(0, prev - 1))

              if (currentMemberId) {
                void markNotificationReadByIdRemote(currentMemberId, notification.id).catch(() => {
                  setBoardReloadKey((prev) => prev + 1)
                })
              }
            }

            setFallbackBoardId(notification.boardId)
            navigateToBoard(notification.boardId, { cardId: notification.cardId || null })
          }}
          onDeleteNotification={(notification) => {
            setProfileNotifications((prev) => prev.filter((item) => item.id !== notification.id))
            if (!notification.isRead) {
              setUnreadNotificationsCount((prev) => Math.max(0, prev - 1))
            }

            if (!currentMemberId) {
              return
            }

            void deleteNotificationByIdRemote(currentMemberId, notification.id).catch(() => {
              setBoardReloadKey((prev) => prev + 1)
            })
          }}
        />
      </div>

      <Sidebar
        boards={boardCatalog}
        activeBoardId={selectedBoardId}
        canCreateBoard={currentUserRole === 'admin'}
        currentUserRole={currentUserRole}
        globalRoleUsers={globalRoleUsers}
        isManagingRoles={isManagingGlobalRoles}
        onCreateBoard={triggerCreateBoard}
        onSelectBoard={handleSelectBoard}
        onReorderBoards={reorderBoards}
        onRenameBoard={renameBoard}
        onDeleteBoard={deleteBoard}
        onRefreshGlobalRoles={() => {
          void loadGlobalRoleUsers()
        }}
        onSetGlobalRole={async (email, role) => {
          setIsManagingGlobalRoles(true)
          const result = await setGlobalRoleByEmailRemote(email, role)
          if (result.ok) {
            await Promise.all([loadGlobalRoleUsers(), loadBoardCatalog()])
            setBoardReloadKey((prev) => prev + 1)
          }
          setIsManagingGlobalRoles(false)
          return result
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
            setBoardReloadKey((prev) => prev + 1)
            navigateToBoard(boardId)
          }}
          onCardOpen={(boardId, cardId) => {
            navigateToBoard(boardId, { cardId })
          }}
          onCardClose={(boardId) => {
            navigateToBoard(boardId, { replace: true })
          }}
          onBoardMetaChange={(meta) => {
            setBoards(meta.boards)
            setFallbackBoardId(meta.currentBoardId)
            setCurrentMemberId(meta.currentMemberId)
            setCurrentUserRole(meta.currentUserRole)
            setProfileNotifications(meta.notifications)
            setUnreadNotificationsCount(meta.unreadNotificationsCount)

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
          }}
        />
      </main>
    </div>
  )
}

