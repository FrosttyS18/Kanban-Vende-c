import { useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import Board from '@/components/board/Board'
import { type BoardData } from '@/types'

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

  const triggerCreateBoard = () => {
    setCreateBoardSignal((prev) => prev + 1)
  }

  return (
    <div className="grid h-screen grid-cols-1 grid-rows-[100px_1fr] bg-[#252525] lg:grid-cols-[253px_1fr] lg:grid-rows-[100px_1fr]">
      <div className="lg:col-span-2">
        <Header
          userEmail={userEmail}
          onLogout={onLogout}
          isLogoutLoading={isLogoutLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCreateBoard={triggerCreateBoard}
          onShareBoard={() => setShareBoardSignal((prev) => prev + 1)}
        />
      </div>

      <Sidebar boards={boards} activeBoardId={activeBoardId} onCreateBoard={triggerCreateBoard} onSelectBoard={setActiveBoardId} />

      <main className="overflow-hidden bg-[#252525]">
        <Board
          userEmail={userEmail}
          searchQuery={searchQuery}
          createBoardSignal={createBoardSignal}
          shareBoardSignal={shareBoardSignal}
          selectedBoardId={activeBoardId}
          onBoardMetaChange={(meta) => {
            setBoards(meta.boards)
            setActiveBoardId(meta.currentBoardId)
          }}
        />
      </main>
    </div>
  )
}
