import { type MouseEvent as ReactMouseEvent, useCallback, useEffect, useRef, useState } from 'react'
import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, ChevronDown, Crown, Lock, Plus, RotateCcw, Search, Settings2, Share2, SquareKanban, Trash2, X } from 'lucide-react'
import archivedIcon from '@/assets/icons/icon-arquivados.svg'
import membersIcon from '@/assets/icons/icon-membros.svg'
import { queryKeys } from '@/lib/queryKeys'
import { deleteCardRemote, loadBoardStoreFromRemote, restoreArchivedCardRemote } from '@/services/boardApi'
import { type ArchivedCardData, type BoardCatalogItem, type GlobalRoleUser, type GlobalUserRole, type SearchResultItem } from '@/types'

type SidebarProps = {
  boards: BoardCatalogItem[]
  activeBoardId: string
  canCreateBoard: boolean
  currentUserRole: GlobalUserRole
  globalRoleUsers: GlobalRoleUser[]
  isManagingRoles: boolean
  onCreateBoard: () => void
  onSelectBoard: (boardId: string) => void
  onReorderBoards: (orderedBoardIds: string[]) => void
  onRenameBoard: (boardId: string, title: string, color: string) => void
  onDeleteBoard: (boardId: string) => void
  onSetGlobalRole: (email: string, role: GlobalUserRole) => Promise<{ ok: boolean; message: string }>
  onRefreshGlobalRoles: () => void
  mobileSearchQuery?: string
  onMobileSearchChange?: (value: string) => void
  mobileSearchResults?: SearchResultItem[]
  mobileSearchLoading?: boolean
  mobileSearchError?: string | null
  onMobileSelectSearchResult?: (result: SearchResultItem) => void
  onMobileShareBoard?: () => void
  mobileOpen?: boolean
  onMobileClose?: () => void
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

type SettingsView = 'hub' | 'members' | 'archived'

type SortableBoardButtonProps = {
  board: BoardCatalogItem
  active: boolean
  onSelectBoard: (boardId: string) => void
  onContextMenu: (event: ReactMouseEvent<HTMLButtonElement>, boardId: string) => void
}

function SortableBoardButton({ board, active, onSelectBoard, onContextMenu }: SortableBoardButtonProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: board.id, disabled: !board.hasAccess })

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => onSelectBoard(board.id)}
      onContextMenu={(event) => onContextMenu(event, board.id)}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderColor: board.hasAccess ? board.color || '#d1d1d1' : '#4d4d4d',
        backgroundColor: active ? board.color || '#ff0068' : 'transparent',
        opacity: isDragging ? 0.7 : board.hasAccess ? 1 : 0.72
      }}
      className={`flex h-8.25 w-51.25 items-center justify-center gap-1.5 rounded-[7px] border px-2 text-center text-[14px] font-semibold transition-colors ${
        active ? 'text-white' : board.hasAccess ? 'text-white hover:bg-white/5' : 'text-[#9b9b9b] hover:bg-white/5'
      }`}
      {...attributes}
      {...listeners}
    >
      {!board.hasAccess && <Lock className="size-3.5 shrink-0" />}
      <span className="truncate">{board.title}</span>
    </button>
  )
}

export default function Sidebar({
  boards,
  activeBoardId,
  canCreateBoard,
  currentUserRole,
  globalRoleUsers,
  isManagingRoles,
  onCreateBoard,
  onSelectBoard,
  onReorderBoards,
  onRenameBoard,
  onDeleteBoard,
  onSetGlobalRole,
  onRefreshGlobalRoles,
  mobileSearchQuery = '',
  onMobileSearchChange,
  mobileSearchResults = [],
  mobileSearchLoading = false,
  mobileSearchError = null,
  onMobileSelectSearchResult,
  onMobileShareBoard,
  mobileOpen = false,
  onMobileClose
}: SidebarProps) {
  const queryClient = useQueryClient()
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [titleDraft, setTitleDraft] = useState('')
  const [colorDraft, setColorDraft] = useState(BOARD_COLOR_OPTIONS[0])
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsView, setSettingsView] = useState<SettingsView>('hub')
  const [roleEmailDraft, setRoleEmailDraft] = useState('')
  const [roleDraft, setRoleDraft] = useState<GlobalUserRole>('admin')
  const [settingsError, setSettingsError] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    })
  )

  const editingBoard = editingBoardId ? boards.find((item) => item.id === editingBoardId) ?? null : null
  const deletingBoard = deletingBoardId ? boards.find((item) => item.id === deletingBoardId) ?? null : null
  const isAdmin = currentUserRole === 'admin'

  const archivedCardsQuery = useQuery({
    queryKey: queryKeys.archivedCards,
    queryFn: async () => {
      const store = await loadBoardStoreFromRemote(undefined, { forceRefresh: true, bypassInFlight: true })
      return store.archivedCards
    },
    enabled: isSettingsOpen && settingsView === 'archived'
  })

  const restoreArchivedCardMutation = useMutation({
    mutationFn: (cardId: string) => restoreArchivedCardRemote(cardId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.archivedCards }),
        queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      ])
    }
  })

  const deleteArchivedCardMutation = useMutation({
    mutationFn: (cardId: string) => deleteCardRemote(cardId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.archivedCards }),
        queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      ])
    }
  })

  async function runMutation<TData, TError, TVariables>(
    mutation: UseMutationResult<TData, TError, TVariables, unknown>,
    variables: TVariables
  ): Promise<{ ok: boolean; data?: TData; error?: TError }> {
    try {
      const data = await mutation.mutateAsync(variables)
      return { ok: true, data }
    } catch (error) {
      return { ok: false, error: error as TError }
    }
  }

  const archivedCards: ArchivedCardData[] = archivedCardsQuery.data ?? []
  const isLoadingArchivedCards = archivedCardsQuery.isLoading
  const archivedCardsError = archivedCardsQuery.error instanceof Error ? archivedCardsQuery.error.message : null

  const openSettings = () => {
    setIsSettingsOpen(true)
    setSettingsView('hub')
    setSettingsError('')
    setSettingsMessage('')
    void onRefreshGlobalRoles()
  }

  const openSettingsView = (view: SettingsView) => {
    setSettingsView(view)
    if (view === 'members') {
      void onRefreshGlobalRoles()
    }
  }

  const handleRestoreArchivedCard = async (cardId: string) => {
    const result = await runMutation(restoreArchivedCardMutation, cardId)
    if (!result.ok) {
      const message = result.error instanceof Error ? result.error.message : 'Nao foi possivel restaurar o card arquivado.'
      setSettingsError(message)
    }
  }

  const handleDeleteArchivedCard = async (cardId: string) => {
    const result = await runMutation(deleteArchivedCardMutation, cardId)
    if (!result.ok) {
      const message = result.error instanceof Error ? result.error.message : 'Nao foi possivel excluir o card arquivado.'
      setSettingsError(message)
    }
  }

  const handleApplyRoleByEmail = async () => {
    if (!isAdmin) {
      setSettingsError('Somente administradores podem alterar cargos globais.')
      setSettingsMessage('')
      return
    }

    const email = roleEmailDraft.trim().toLowerCase()
    if (!email) {
      setSettingsError('Informe um e-mail corporativo.')
      setSettingsMessage('')
      return
    }

    const result = await onSetGlobalRole(email, roleDraft)
    if (!result.ok) {
      setSettingsError(result.message)
      setSettingsMessage('')
      return
    }

    setRoleEmailDraft('')
    setSettingsError('')
    setSettingsMessage(result.message)
  }

  const handleToggleGlobalRole = async (email: string, role: GlobalUserRole) => {
    if (!isAdmin) {
      setSettingsError('Somente administradores podem alterar cargos globais.')
      setSettingsMessage('')
      return
    }

    const result = await onSetGlobalRole(email, role)
    if (result.ok) {
      setSettingsError('')
      setSettingsMessage(result.message)
      return
    }

    setSettingsError(result.message)
    setSettingsMessage('')
  }

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

    const activeBoard = boards[activeIndex]
    const overBoard = boards[overIndex]
    if (!activeBoard?.hasAccess || !overBoard?.hasAccess) {
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

  const closeMobileDrawer = useCallback(() => {
    onMobileClose?.()
  }, [onMobileClose])

  useEffect(() => {
    if (!mobileOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileDrawer()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    sidebarRef.current?.focus()
    window.addEventListener('keydown', onEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onEscape)
    }
  }, [mobileOpen, closeMobileDrawer])

  const handleSelectBoard = (boardId: string) => {
    onSelectBoard(boardId)
    if (mobileOpen) {
      closeMobileDrawer()
    }
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/70 lg:hidden"
          aria-hidden="true"
          onClick={closeMobileDrawer}
        />
      )}
      <aside
        ref={sidebarRef}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={mobileOpen ? 'Menu lateral de boards' : undefined}
        tabIndex={mobileOpen ? -1 : undefined}
        className={`relative h-full border-r border-[#3d3d3d] bg-[#1e1e1e] ${
          mobileOpen ? 'fixed inset-0 z-70 flex w-full flex-col lg:static lg:z-auto lg:w-63.25' : 'hidden w-63.25 lg:flex lg:flex-col'
        }`}
      >
      <div className={`min-h-0 flex-1 ${mobileOpen ? 'px-5 pb-4 pt-5' : 'px-8 pb-6 pt-7'}`}>
        {mobileOpen && (
          <>
            <div className="mb-5 flex items-center gap-4">
              <button
                type="button"
                onClick={closeMobileDrawer}
                className="inline-flex size-9 items-center justify-center rounded-md text-[#d1d1d1] hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X className="size-7" />
              </button>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#d1d1d1]" />
                <input
                  value={mobileSearchQuery}
                  onChange={(event) => onMobileSearchChange?.(event.target.value)}
                  placeholder="Pesquisar"
                  className="h-11 w-full rounded-[8px] border border-white/10 bg-black px-4 pr-10 text-[14px] font-medium text-[#d1d1d1] outline-none focus:border-primary"
                  aria-label="Pesquisar"
                />
              </div>
            </div>

            {mobileSearchQuery.trim().length >= 3 && (
              <div className="mb-4 max-h-44 overflow-y-auto rounded-[8px] border border-white/10 bg-[#1f1f21] p-1">
                {mobileSearchLoading ? (
                  <p className="px-2 py-2 text-xs text-[#a9a9a9]">Buscando...</p>
                ) : mobileSearchError ? (
                  <p className="px-2 py-2 text-xs text-[#ffb4ae]">{mobileSearchError}</p>
                ) : mobileSearchResults.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[#a9a9a9]">Nenhum card encontrado.</p>
                ) : (
                  mobileSearchResults.map((result, index) => (
                    <button
                      key={`${result.cardId}-${result.rank}-${index}`}
                      type="button"
                      onClick={() => {
                        onMobileSelectSearchResult?.(result)
                        closeMobileDrawer()
                      }}
                      className="w-full rounded-[7px] px-2 py-2 text-left hover:bg-white/7"
                    >
                      <p className="truncate text-xs font-semibold text-white">{result.cardTitle}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#a9a9a9]">
                        {result.boardTitle} · {result.listTitle}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}

        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-white">
            <SquareKanban className="size-4 text-[#d1d1d1]" />
            Boards
          </div>
          <button
            type="button"
            onClick={() => {
              onCreateBoard()
              if (mobileOpen) {
                closeMobileDrawer()
              }
            }}
            className="text-[#d1d1d1] hover:text-white disabled:cursor-not-allowed disabled:text-[#696969]"
            aria-label="Criar board"
            disabled={!canCreateBoard}
            title={!canCreateBoard ? 'Somente administradores podem criar boards.' : undefined}
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="mb-4 border-b border-[#3d3d3d]" />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={boards.map((board) => board.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {boards.map((board) => (
                <SortableBoardButton
                  key={board.id}
                  board={board}
                  active={board.id === activeBoardId}
                  onSelectBoard={handleSelectBoard}
                  onContextMenu={(event, boardId) => {
                    const targetBoard = boards.find((item) => item.id === boardId)
                    if (!targetBoard?.hasAccess) {
                      return
                    }

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

      {mobileOpen && onMobileShareBoard && (
        <button
          type="button"
          onClick={() => {
            onMobileShareBoard()
            closeMobileDrawer()
          }}
          className="absolute bottom-20 right-5 inline-flex size-12 items-center justify-center rounded-full bg-[#ececec] text-primary shadow-lg"
          aria-label="Compartilhar board"
        >
          <Share2 className="size-5" />
        </button>
      )}

      <div className={`mt-auto border-t border-[#3d3d3d] ${mobileOpen ? 'px-5 py-4' : 'px-8 py-5'}`}>
        <button
          type="button"
          onClick={() => {
            openSettings()
            if (mobileOpen) {
              closeMobileDrawer()
            }
          }}
          className={`flex items-center gap-2 text-[18px] font-semibold text-white transition-colors hover:text-primary ${mobileOpen ? 'justify-center' : ''}`}
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

      {isSettingsOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Configurações">
          <div className="relative flex min-h-[560px] max-h-[calc(100vh-32px)] w-full max-w-180 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] p-5">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full border border-white/20 text-[#d1d1d1] hover:bg-white/10 hover:text-white"
              aria-label="Fechar configurações"
            >
              <X className="size-4" />
            </button>
            {settingsView === 'hub' && (
              <>
                <h2 className="text-lg font-semibold text-white">Configurações</h2>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => openSettingsView('archived')}
                    className="flex h-10 items-center justify-between rounded-xl bg-[#d9d9d9] px-3 text-left transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <img src={archivedIcon} alt="Ícone de arquivados" className="size-4" />
                      <span className="text-[14px] font-medium text-primary">Arquivados</span>
                    </div>
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-black text-lg leading-none text-primary">›</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openSettingsView('members')}
                    className="flex h-10 items-center justify-between rounded-xl bg-[#d9d9d9] px-3 text-left transition-transform hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <img src={membersIcon} alt="Ícone de membros" className="size-4" />
                      <span className="text-[14px] font-medium text-primary">Membros</span>
                    </div>
                    <span className="inline-flex size-6 items-center justify-center rounded-full bg-black text-lg leading-none text-primary">›</span>
                  </button>
                </div>
              </>
            )}

            {settingsView === 'members' && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsView('hub')}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-white/20 text-[#d1d1d1] hover:bg-white/10"
                    aria-label="Voltar para configurações"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">Configurações de Administração</h2>
                </div>
                <p className="mt-2 text-sm text-[#d1d1d1]">Gerencie quais usuários podem criar boards e administrar cargos globais.</p>
                {!isAdmin && (
                  <p className="mt-2 text-sm text-[#d1d1d1]">Somente administradores podem alterar cargos globais.</p>
                )}

                <div className="mt-5 rounded-xl border border-white/10 bg-[#242528] p-4">
                  <p className="text-sm font-semibold text-white">Alterar cargo por e-mail</p>
                  <div className="mt-3 flex flex-col gap-2 md:flex-row">
                    <input
                      value={roleEmailDraft}
                      onChange={(event) => {
                        setRoleEmailDraft(event.target.value)
                        if (settingsError) {
                          setSettingsError('')
                        }
                        if (settingsMessage) {
                          setSettingsMessage('')
                        }
                      }}
                      placeholder="nome@vende-c.com"
                      disabled={!isAdmin || isManagingRoles}
                      className="h-10 w-full rounded-[7px] border border-white/20 bg-black px-3 text-sm text-white outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="relative">
                      <select
                        value={roleDraft}
                        onChange={(event) => setRoleDraft(event.target.value as GlobalUserRole)}
                        disabled={!isAdmin || isManagingRoles}
                        className="h-10 w-full appearance-none rounded-[7px] border border-white/20 bg-black pl-3 pr-9 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60 md:w-28"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#d1d1d1]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleApplyRoleByEmail()}
                      disabled={!isAdmin || isManagingRoles}
                      className="h-10 rounded-[7px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Aplicar
                    </button>
                  </div>
                  {settingsError && <p className="mt-2 text-sm text-[#ff9ab8]">{settingsError}</p>}
                  {settingsMessage && <p className="mt-2 text-sm text-[#86efac]">{settingsMessage}</p>}
                </div>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#242528] p-2">
                  {globalRoleUsers.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-[#bcbcbc]">Nenhum usuário encontrado.</p>
                  ) : (
                    globalRoleUsers.map((user) => {
                      const targetRole: GlobalUserRole = user.roleGlobal === 'admin' ? 'member' : 'admin'
                      return (
                        <div key={user.id} className="flex items-center gap-3 border-b border-white/10 px-2 py-3 last:border-b-0">
                          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-white">
                            {user.fullName.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
                            <p className="truncate text-xs text-[#bcbcbc]">{user.email}</p>
                          </div>
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${user.roleGlobal === 'admin' ? 'bg-[#ff0068]/20 text-[#ff8fbf]' : 'bg-white/10 text-[#d1d1d1]'}`}>
                            {user.roleGlobal === 'admin' ? 'Admin' : 'Member'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              void handleToggleGlobalRole(user.email, targetRole)
                            }}
                            disabled={!isAdmin || isManagingRoles}
                            className="h-8 rounded-[7px] border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {targetRole === 'admin' ? (
                              <span className="inline-flex items-center gap-1"><Crown className="size-3" />Promover</span>
                            ) : (
                              'Rebaixar'
                            )}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}

            {settingsView === 'archived' && (
              <>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettingsView('hub')}
                    className="inline-flex size-8 items-center justify-center rounded-md border border-white/20 text-[#d1d1d1] hover:bg-white/10"
                    aria-label="Voltar para configurações"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <h2 className="text-lg font-semibold text-white">Arquivados</h2>
                </div>
                <p className="mt-2 text-sm text-[#d1d1d1]">Visualize, restaure ou exclua cards arquivados.</p>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#242528] p-3">
                  {isLoadingArchivedCards && (
                    <div className="flex h-40 items-center justify-center text-sm text-[#bcbcbc]">
                      Carregando cards arquivados...
                    </div>
                  )}

                  {!isLoadingArchivedCards && archivedCardsError && (
                    <div className="rounded-lg border border-white/10 bg-[#1e1e1e] px-4 py-3">
                      <p className="text-sm text-[#ff9ab8]">{archivedCardsError}</p>
                      <button
                        type="button"
                        onClick={() => void archivedCardsQuery.refetch()}
                        className="mt-3 h-8 rounded-[7px] border border-white/20 px-3 text-xs font-semibold text-white hover:bg-white/10"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {!isLoadingArchivedCards && !archivedCardsError && archivedCards.length === 0 && (
                    <div className="flex h-40 items-center justify-center text-sm text-[#bcbcbc]">
                      Nenhum card arquivado.
                    </div>
                  )}

                  {!isLoadingArchivedCards && !archivedCardsError && archivedCards.length > 0 && (
                    <div className="space-y-3">
                      {archivedCards
                        .slice()
                        .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
                        .map((card) => (
                          <article key={`${card.id}_${card.archivedAt}`} className="rounded-lg border border-white/10 bg-[#1e1e1e] p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-white">{card.title}</h3>
                                <p className="mt-1 text-xs text-[#bcbcbc]">Board: {card.boardTitle}</p>
                                <p className="text-xs text-[#bcbcbc]">Lista: {card.listTitle}</p>
                                <p className="mt-1 text-xs text-[#bcbcbc]">Arquivado em {new Date(card.archivedAt).toLocaleString('pt-BR')}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleRestoreArchivedCard(card.id)}
                                  disabled={restoreArchivedCardMutation.isPending || deleteArchivedCardMutation.isPending}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-[#1f4f7a] text-[#9fd2ff] hover:bg-[#0ea5e9]/10 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Restaurar card"
                                >
                                  <RotateCcw className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteArchivedCard(card.id)}
                                  disabled={deleteArchivedCardMutation.isPending || restoreArchivedCardMutation.isPending}
                                  className="inline-flex size-8 items-center justify-center rounded-md border border-[#743039] text-[#ff9ab8] hover:bg-[#aa003f]/20 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Excluir card arquivado"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </aside>
    </>
  )
}




