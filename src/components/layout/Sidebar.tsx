import { Plus, Settings2, SquareKanban } from 'lucide-react'
import { type BoardData } from '@/types'

type SidebarProps = {
  boards: BoardData[]
  activeBoardId: string
  onCreateBoard: () => void
  onSelectBoard: (boardId: string) => void
}

export default function Sidebar({ boards, activeBoardId, onCreateBoard, onSelectBoard }: SidebarProps) {
  return (
    <aside className="hidden h-full w-[253px] border-r border-[#3d3d3d] bg-[#1e1e1e] lg:flex lg:flex-col">
      <div className="px-8 pb-6 pt-7">
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-white">
            <SquareKanban className="size-4 text-[#d1d1d1]" />
            Boards
          </div>
          <button type="button" onClick={onCreateBoard} className="text-[#d1d1d1] hover:text-white" aria-label="Criar board">
            <Plus className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          {boards.map((board) => {
            const active = board.id === activeBoardId
            return (
              <button
                key={board.id}
                type="button"
                onClick={() => onSelectBoard(board.id)}
                className={`flex h-[33px] w-[205px] items-center justify-center rounded-[7px] border px-2 text-center text-[14px] font-semibold transition-colors ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-[#d1d1d1] bg-transparent text-white hover:bg-white/5'
                }`}
              >
                <span className="truncate">{board.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-auto border-t border-[#3d3d3d] px-8 py-5">
        <button
          type="button"
          className="flex items-center gap-2 text-[18px] font-semibold text-white transition-colors hover:text-primary"
          aria-label="Configuracoes"
        >
          <Settings2 className="size-4 text-[#d1d1d1]" />
          Configuracoes
        </button>
      </div>
    </aside>
  )
}
