import { type MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Settings2, SquareKanban } from 'lucide-react'
import { type BoardData } from '@/types'

type SidebarProps = {
  boards: BoardData[]
  activeBoardId: string
  onCreateBoard: () => void
  onSelectBoard: (boardId: string) => void
  onReorderBoards: (orderedBoardIds: string[]) => void
  onRenameBoard: (boardId: string, title: string, color: string) => void
  onDeleteBoard: (boardId: string) => void
}

const BOARD_TITLE_MAX_LENGTH = 150
const BOARD_COLOR_OPTIONS = [
  '#ff0068',
  '#ff2d55',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899'
]

type ContextMenuState = {
  boardId: string
  top: number
  left: number
}

type SortableBoardButtonProps = {
  board: BoardData
  active: boolean
  onSelectBoard: (boardId: string) => void
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>, boardId: string) => void
}

function SortableBoardButton({ board, active, onSelectBoard, onContextMenu }: SortableBoardButtonProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: board.id })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelectBoard(board.id)}
      onContextMenu={(event) => onContextMenu(event, board.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: board.color || '#d1d1d1',
        backgroundColor: active ? board.color || '#ff0068' : 'transparent',
        opacity: isDragging ? 0.7 : 1
      }}
      className={`flex h-8.25 w-51.25 items-center justify-center rounded-[7px] border px-2 text-center text-[14px] font-semibold text-white transition-colors ${
        active ? '' : 'hover:bg-white/5'
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="truncate">{board.title}</span>
    </button>
  )
}

export default function Sidebar({ boards, activeBoardId, onCreateBoard, onSelectBoard, onReorderBoards, onRenameBoard, onDeleteBoard }: SidebarProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [colorDraft, setColorDraft] = useState(BOARD_COLOR_OPTIONS[0])
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )

  const editingBoard = editingBoardId ? boards.find((item) => item.id === editingBoardId) ?? null : null
  const deletingBoard = deletingBoardId ? boards.find((item) => item.id === deletingBoardId) ?? null : null

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const activeIndex = boards.findIndex((item) => item.id === String(active.id))
    const overIndex = boards.findIndex((item) => item.id === String(over.id))
    if (activeIndex === -1 || overIndex === -1) {
      return
    }

    const ordered = [...boards]
    const [item] = ordered.splice(activeIndex, 1)
    ordered.splice(overIndex, 0, item)
    onReorderBoards(ordered.map((board) => board.id))
  }

  useEffect(() => {
    if (!contextMenu) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) {
        return
      }
      setContextMenu(null)
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [contextMenu])

  return (
    <aside className="hidden h-full w-63.25 border-r border-[#3d3d3d] bg-[#1e1e1e] lg:flex lg:flex-col">
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={boards.map((board) => board.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {boards.map((board) => (
                <SortableBoardButton
                  key={board.id}
                  board={board}
                  active={board.id === activeBoardId}
                  onSelectBoard={onSelectBoard}
                  onContextMenu={(event, boardId) => {
                    event.preventDefault()
                    setContextMenu({
                      boardId,
                      top: Math.min(window.innerHeight - 110, event.clientY),
                      left: Math.min(window.innerWidth - 180, event.clientX)
                    })
                  }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mt-auto border-t border-[#3d3d3d] px-8 py-5">
        <button
          type="button"
          className="flex items-center gap-2 text-[18px] font-semibold text-white transition-colors hover:text-primary"
          aria-label="Configurações"
        >
          <Settings2 className="size-4 text-[#d1d1d1]" />
          Configurações
        </button>
      </div>

      {contextMenu && (
        <div ref={menuRef} style={{ top: contextMenu.top, left: contextMenu.left }} className="fixed z-80 w-44 rounded-lg border border-white/10 bg-[#242528] p-1.5 shadow-xl">
          <button
            type="button"
            onClick={() => {
              const index = boards.findIndex((item) => item.id === contextMenu.boardId)
              if (index <= 0) {
                return
              }
              const ordered = [...boards]
              const [item] = ordered.splice(index, 1)
              ordered.splice(index - 1, 0, item)
              onReorderBoards(ordered.map((board) => board.id))
              setContextMenu(null)
            }}
            className={`w-full rounded-[6px] px-3 py-2 text-left text-sm font-semibold ${
              boards.findIndex((item) => item.id === contextMenu.boardId) <= 0 ? 'cursor-not-allowed text-[#777]' : 'text-[#d1d1d1] hover:bg-white/10'
            }`}
          >
            Mover para cima
          </button>
          <button
            type="button"
            onClick={() => {
              const index = boards.findIndex((item) => item.id === contextMenu.boardId)
              if (index === -1 || index >= boards.length - 1) {
                return
              }
              const ordered = [...boards]
              const [item] = ordered.splice(index, 1)
              ordered.splice(index + 1, 0, item)
              onReorderBoards(ordered.map((board) => board.id))
              setContextMenu(null)
            }}
            className={`mt-1 w-full rounded-[6px] px-3 py-2 text-left text-sm font-semibold ${
              boards.findIndex((item) => item.id === contextMenu.boardId) >= boards.length - 1 ? 'cursor-not-allowed text-[#777]' : 'text-[#d1d1d1] hover:bg-white/10'
            }`}
          >
            Mover para baixo
          </button>
          <button
            type="button"
            onClick={() => {
              const target = boards.find((item) => item.id === contextMenu.boardId)
              setEditingBoardId(contextMenu.boardId)
              setTitleDraft(target?.title ?? '')
              setColorDraft(target?.color || BOARD_COLOR_OPTIONS[0])
              setContextMenu(null)
            }}
            className="mt-1 w-full rounded-[6px] px-3 py-2 text-left text-sm font-semibold text-[#d1d1d1] hover:bg-white/10"
          >
            Editar título
          </button>
          <button
            type="button"
            onClick={() => {
              if (boards.length <= 1) {
                return
              }
              setDeletingBoardId(contextMenu.boardId)
              setContextMenu(null)
            }}
            className={`mt-1 w-full rounded-[6px] px-3 py-2 text-left text-sm font-semibold ${
              boards.length <= 1 ? 'cursor-not-allowed text-[#777]' : 'text-[#ff8b8b] hover:bg-[#ff0068]/10'
            }`}
          >
            Excluir board
          </button>
        </div>
      )}

      {editingBoard && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Editar título do board">
          <div className="w-full max-w-110 rounded-2xl border border-white/10 bg-[#1e1e1e] p-5">
            <h2 className="text-lg font-semibold text-white">Editar título do board</h2>
            <input
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value.slice(0, BOARD_TITLE_MAX_LENGTH))}
              maxLength={BOARD_TITLE_MAX_LENGTH}
              autoFocus
              className="mt-3 h-10 w-full rounded-[7px] border border-primary bg-[#242528] px-3 text-sm text-[#d1d1d1] outline-none"
            />
            <div className="mt-3">
              <p className="text-xs font-semibold text-[#d1d1d1]">Cor do board</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {BOARD_COLOR_OPTIONS.map((color) => {
                  const selected = color === colorDraft
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setColorDraft(color)}
                      aria-label={`Selecionar cor ${color}`}
                      className={`size-6 rounded-full border-2 ${selected ? 'border-white' : 'border-transparent hover:border-white/40'}`}
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingBoardId(null)
                  setTitleDraft('')
                }}
                className="h-9 rounded-[7px] border border-[#525252] px-4 text-sm font-semibold text-[#d1d1d1] hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextTitle = titleDraft.trim()
                  if (!nextTitle || (nextTitle === editingBoard.title && colorDraft === editingBoard.color)) {
                    setEditingBoardId(null)
                    setTitleDraft('')
                    return
                  }
                  onRenameBoard(editingBoard.id, nextTitle, colorDraft)
                  setEditingBoardId(null)
                  setTitleDraft('')
                }}
                className="h-9 rounded-[7px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingBoard && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Confirmar exclusão de board">
          <div className="w-full max-w-110 rounded-2xl border border-white/10 bg-[#1e1e1e] p-5">
            <h2 className="text-lg font-semibold text-white">Excluir board</h2>
            <p className="mt-2 text-sm text-[#d1d1d1]">Tem certeza que deseja excluir o board "{deletingBoard.title}"?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingBoardId(null)}
                className="h-9 rounded-[7px] border border-[#525252] px-4 text-sm font-semibold text-[#d1d1d1] hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteBoard(deletingBoard.id)
                  setDeletingBoardId(null)
                }}
                className="h-9 rounded-[7px] bg-[#aa003f] px-4 text-sm font-semibold text-white hover:bg-[#c2004a]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
