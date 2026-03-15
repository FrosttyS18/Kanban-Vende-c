import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Board from '@/components/board/Board'
import { type BoardData, type MemberNotification } from '@/types'
import { deleteBoardRemote, joinBoardViaTokenRemote, markNotificationsReadRemote, reorderBoardsRemote, updateBoardRemote } from '@/services/boardApi'

interface BoardPageProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
}

function getCardOpenRequestFromUrl(): { boardId: string; cardId: string; token: number } | null {
  if (typeof window === 'undefined') {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const boardId = params.get('board')?.trim() ?? ''
  const cardId = params.get('card')?.trim() ?? ''

  if (!boardId || !cardId) {
    return null
  }

  return { boardId, cardId, token: Date.now() }
}

export default function BoardPage({ userEmail, onLogout, isLogoutLoading = false }: BoardPageProps) {
  const [shareJoinError, setShareJoinError] = useState<string | null>(null)
  const [pendingShareToken, setPendingShareToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }
    const match = window.location.pathname.match(/^\/shared\/([^/]+)$/)
    return match?.[1] ? decodeURIComponent(match[1]) : null
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [createBoardSignal, setCreateBoardSignal] = useState(0)
  const [shareBoardSignal, setShareBoardSignal] = useState(0)
  const [boards, setBoards] = useState<BoardData[]>([])
  const [activeBoardId, setActiveBoardId] = useState('')
  const [boardReloadKey, setBoardReloadKey] = useState(0)
  const [profileNotifications, setProfileNotifications] = useState<MemberNotification[]>([])
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [currentMemberId, setCurrentMemberId] = useState('')
  const [openCardRequest, setOpenCardRequest] = useState<{ boardId: string; cardId: string; token: number } | null>(null)
  const [pendingCardOpenRequest, setPendingCardOpenRequest] = useState<{ boardId: string; cardId: string; token: number } | null>(() => getCardOpenRequestFromUrl())

  const triggerCreateBoard = () => {
    setCreateBoardSignal((prev) => prev + 1)
  }

  const handleSelectBoard = (boardId: string) => {
    if (boardId === activeBoardId) {
      return
    }
    setActiveBoardId(boardId)
    setBoardReloadKey((prev) => prev + 1)
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
    setBoards(nextBoards)
    setActiveBoardId((prev) => (prev === boardId ? nextBoards[0]?.id ?? '' : prev))
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
        setActiveBoardId(boardId)
        setShareJoinError(null)
        setBoardReloadKey((prev) => prev + 1)
        if (window.location.pathname.startsWith('/shared/')) {
          window.history.replaceState({}, document.title, '/')
        }
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
  }, [pendingShareToken])

  useEffect(() => {
    if (!pendingCardOpenRequest) {
      return
    }

    setActiveBoardId(pendingCardOpenRequest.boardId)
    setOpenCardRequest(pendingCardOpenRequest)
    setBoardReloadKey((prev) => prev + 1)

    const params = new URLSearchParams(window.location.search)
    params.delete('board')
    params.delete('card')
    const nextQuery = params.toString()
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}`
    window.history.replaceState({}, document.title, nextUrl)

    setPendingCardOpenRequest(null)
  }, [pendingCardOpenRequest])

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[70px_1fr] bg-[#252525] lg:grid-cols-[253px_1fr] lg:grid-rows-[70px_1fr]">
      <div className="lg:col-span-2">
        <Header
          userEmail={userEmail}
          onLogout={onLogout}
          isLogoutLoading={isLogoutLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateBoard={triggerCreateBoard}
          onShareBoard={() => setShareBoardSignal((prev) => prev + 1)}
          activeBoardTitle={boards.find((board) => board.id === activeBoardId)?.title}
          activeBoardColor={boards.find((board) => board.id === activeBoardId)?.color}
          notifications={profileNotifications}
          unreadNotificationsCount={unreadNotificationsCount}
          onMarkNotificationsRead={() => {
            if (!currentMemberId) {
              return
            }
            void markNotificationsReadRemote(currentMemberId)
            setUnreadNotificationsCount(0)
            setBoardReloadKey((prev) => prev + 1)
          }}
          onOpenNotification={(notification) => {
            setActiveBoardId(notification.boardId)
            setBoardReloadKey((prev) => prev + 1)
            setOpenCardRequest({ boardId: notification.boardId, cardId: notification.cardId, token: Date.now() })
          }}
        />
      </div>

      <Sidebar
        boards={boards}
        activeBoardId={activeBoardId}
        onCreateBoard={triggerCreateBoard}
        onSelectBoard={handleSelectBoard}
        onReorderBoards={reorderBoards}
        onRenameBoard={renameBoard}
        onDeleteBoard={deleteBoard}
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
          selectedBoardId={activeBoardId}
          onBoardMetaChange={(meta) => {
            setBoards(meta.boards)
            setActiveBoardId(meta.currentBoardId)
            setCurrentMemberId(meta.currentMemberId)
            setProfileNotifications(meta.notifications)
            setUnreadNotificationsCount(meta.unreadNotificationsCount)
          }}
        />
      </main>
    </div>
  )
}
