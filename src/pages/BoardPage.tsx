import { useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Board from '@/components/board/Board'
import { type BoardData, type MemberNotification } from '@/types'
import { loadBoardStore, saveBoardStore } from '@/services/boardService'

interface BoardPageProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
}

export default function BoardPage({ userEmail, onLogout, isLogoutLoading = false }: BoardPageProps) {
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

  const renameBoard = (boardId: string, title: string, color: string) => {
    const nextTitle = title.trim()
    if (!nextTitle) {
      return
    }

    const store = loadBoardStore()
    const now = new Date().toISOString()
    const nextBoards = store.boards.map((board) => (board.id === boardId ? { ...board, title: nextTitle, color, updatedAt: now } : board))
    saveBoardStore({ ...store, boards: nextBoards })
    setBoards(nextBoards)
    setBoardReloadKey((prev) => prev + 1)
  }

  const deleteBoard = (boardId: string) => {
    const store = loadBoardStore()
    if (store.boards.length <= 1) {
      return
    }
    const targetBoard = store.boards.find((board) => board.id === boardId)
    if (!targetBoard || targetBoard.ownerMemberId !== store.currentMemberId) {
      return
    }

    const nextBoards = store.boards.filter((board) => board.id !== boardId)
    const nextColumns = store.columns.filter((column) => column.boardId !== boardId)
    const nextColumnIds = new Set(nextColumns.map((column) => column.id))
    const nextCards = store.cards.filter((card) => nextColumnIds.has(card.listId))
    const nextShareByBoard = Object.fromEntries(Object.entries(store.shareByBoard).filter(([id]) => id !== boardId))
    const nextLabelsByBoard = Object.fromEntries(Object.entries(store.labelsByBoard).filter(([id]) => id !== boardId))
    const nextCurrentBoardId = store.currentBoardId === boardId ? nextBoards[0]?.id ?? store.currentBoardId : store.currentBoardId

    saveBoardStore({
      ...store,
      boards: nextBoards,
      columns: nextColumns,
      cards: nextCards,
      shareByBoard: nextShareByBoard,
      labelsByBoard: nextLabelsByBoard,
      currentBoardId: nextCurrentBoardId
    })

    setBoards(nextBoards)
    setActiveBoardId(nextCurrentBoardId)
    setBoardReloadKey((prev) => prev + 1)
  }

  const reorderBoards = (orderedBoardIds: string[]) => {
    const store = loadBoardStore()
    const orderMap = new Map(orderedBoardIds.map((id, index) => [id, index]))
    const nextBoards = [...store.boards].sort((a, b) => (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER))
    saveBoardStore({ ...store, boards: nextBoards })
    setBoards(nextBoards)
    setBoardReloadKey((prev) => prev + 1)
  }

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
            const store = loadBoardStore()
            saveBoardStore({
              ...store,
              notifications: store.notifications.map((notification) =>
                notification.memberId === currentMemberId ? { ...notification, isRead: true } : notification
              )
            })
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
