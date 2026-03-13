import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { SortableContext, arrayMove, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Column from '@/components/board/Column'
import Card from '@/components/board/Card'
import ShareBoardModal from '@/components/board/ShareBoardModal'
import { type BoardData, type BoardShareSettings, type BoardStore, type CardData, type Label } from '@/types'
import { createId, loadBoardStore, saveBoardStore } from '@/services/boardService'

type BoardProps = {
  searchQuery: string
  createBoardSignal: number
  shareBoardSignal: number
  selectedBoardId?: string
  userEmail?: string
  onBoardMetaChange?: (meta: { boards: BoardData[]; currentBoardId: string }) => void
}

export default function Board({ searchQuery, createBoardSignal, shareBoardSignal, selectedBoardId, userEmail, onBoardMetaChange }: BoardProps) {
  const [store, setStore] = useState<BoardStore>(() => loadBoardStore(userEmail))
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [dismissedCreateSignal, setDismissedCreateSignal] = useState(createBoardSignal)
  const [dismissedShareSignal, setDismissedShareSignal] = useState(shareBoardSignal)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    })
  )

  const activeBoardId = useMemo(() => {
    if (selectedBoardId && store.boards.some((board) => board.id === selectedBoardId)) {
      return selectedBoardId
    }

    return store.currentBoardId
  }, [selectedBoardId, store.boards, store.currentBoardId])

  const isCreateBoardOpen = createBoardSignal > dismissedCreateSignal
  const isShareBoardOpen = shareBoardSignal > dismissedShareSignal

  useEffect(() => {
    const storeToSave = {
      ...store,
      currentBoardId: activeBoardId
    }

    saveBoardStore(storeToSave)
  }, [activeBoardId, store])

  useEffect(() => {
    if (!selectedBoardId) {
      onBoardMetaChange?.({ boards: store.boards, currentBoardId: activeBoardId })
    }
  }, [activeBoardId, onBoardMetaChange, selectedBoardId, store.boards])

  const currentBoard = useMemo(
    () => store.boards.find((board) => board.id === activeBoardId) ?? null,
    [store.boards, activeBoardId]
  )

  const currentColumns = useMemo(
    () =>
      store.columns
        .filter((column) => column.boardId === activeBoardId)
        .sort((a, b) => a.position - b.position),
    [store.columns, activeBoardId]
  )

  const currentColumnIds = useMemo(() => currentColumns.map((column) => column.id), [currentColumns])

  const currentBoardCardListIds = useMemo(() => new Set(currentColumns.map((column) => column.id)), [currentColumns])

  const currentCards = useMemo(
    () => store.cards.filter((card) => currentBoardCardListIds.has(card.listId)),
    [store.cards, currentBoardCardListIds]
  )

  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return currentCards.filter((card) => {
      if (!query) {
        return true
      }

      const inTitle = card.title.toLowerCase().includes(query)
      const inDescription = card.description.toLowerCase().includes(query)
      const inLinks = card.links.some((link) => link.title.toLowerCase().includes(query) || link.url.toLowerCase().includes(query))
      const inLabels = card.labels.some((label) => label.text.toLowerCase().includes(query))

      return inTitle || inDescription || inLinks || inLabels
    })
  }, [currentCards, searchQuery])

  const cardsByList = useMemo(() => {
    const map = new Map<string, CardData[]>()

    currentColumns.forEach((column) => {
      map.set(column.id, [])
    })

    filteredCards.forEach((card) => {
      const listCards = map.get(card.listId)
      if (listCards) {
        listCards.push(card)
      }
    })

    return map
  }, [currentColumns, filteredCards])

  const availableLabels = store.labelsByBoard[activeBoardId] ?? []
  const shareSettings = store.shareByBoard[activeBoardId]

  const listOptions = currentColumns.map((column) => ({ id: column.id, title: column.title }))

  const activeCard = activeCardId ? store.cards.find((card) => card.id === activeCardId) ?? null : null
  const activeColumn = activeColumnId ? store.columns.find((column) => column.id === activeColumnId) ?? null : null

  const updateCardInStore = (cardId: string, updates: Partial<CardData>) => {
    if (updates.dueDate) {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      if (new Date(updates.dueDate) < startOfToday) {
        return
      }
    }

    setStore((prev) => ({
      ...prev,
      cards: prev.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              ...updates,
              updatedAt: new Date().toISOString()
            }
          : card
      )
    }))
  }

  const addCardToList = (listId: string, title: string, placement: 'top' | 'bottom') => {
    const now = new Date().toISOString()

    const newCard: CardData = {
      id: createId('card'),
      listId,
      title,
      description: '',
      labels: [],
      memberIds: [],
      isCompleted: false,
      checklists: [],
      links: [],
      activities: [],
      createdAt: now,
      updatedAt: now
    }

    setStore((prev) => {
      if (placement === 'bottom') {
        return {
          ...prev,
          cards: [...prev.cards, newCard]
        }
      }

      const insertIndex = prev.cards.findIndex((card) => card.listId === listId)
      if (insertIndex === -1) {
        return {
          ...prev,
          cards: [...prev.cards, newCard]
        }
      }

      const nextCards = [...prev.cards]
      nextCards.splice(insertIndex, 0, newCard)

      return {
        ...prev,
        cards: nextCards
      }
    })
  }

  const deleteCard = (cardId: string) => {
    setStore((prev) => ({
      ...prev,
      cards: prev.cards.filter((card) => card.id !== cardId)
    }))
  }

  const archiveCard = (cardId: string) => {
    setStore((prev) => {
      const card = prev.cards.find((item) => item.id === cardId)
      if (!card) {
        return prev
      }

      const list = prev.columns.find((column) => column.id === card.listId)
      const board = prev.boards.find((item) => item.id === activeBoardId)

      return {
        ...prev,
        cards: prev.cards.filter((item) => item.id !== cardId),
        archivedCards: [
          {
            id: card.id,
            boardId: activeBoardId,
            boardTitle: board?.title ?? 'Board',
            listId: card.listId,
            listTitle: list?.title ?? 'Lista',
            title: card.title,
            labels: card.labels,
            archivedAt: new Date().toISOString()
          },
          ...prev.archivedCards
        ]
      }
    })
  }

  const addList = () => {
    const title = newListTitle.trim()
    if (!title) {
      return
    }

    setStore((prev) => {
      const boardColumns = prev.columns.filter((column) => column.boardId === activeBoardId)
      const nextPosition = boardColumns.length

      return {
        ...prev,
        columns: [
          ...prev.columns,
          {
            id: createId('list'),
            boardId: activeBoardId,
            title,
            position: nextPosition
          }
        ]
      }
    })

    setNewListTitle('')
    setIsAddingList(false)
  }

  const renameColumn = (columnId: string, title: string) => {
    setStore((prev) => ({
      ...prev,
      columns: prev.columns.map((column) => (column.id === columnId ? { ...column, title } : column))
    }))
  }

  const deleteColumn = (columnId: string) => {
    setStore((prev) => {
      const remainingColumns = prev.columns.filter((column) => column.id !== columnId)
      const normalizedColumns = remainingColumns.map((column) => {
        if (column.boardId !== activeBoardId) {
          return column
        }

        const position = remainingColumns
          .filter((item) => item.boardId === activeBoardId)
          .sort((a, b) => a.position - b.position)
          .findIndex((item) => item.id === column.id)

        return { ...column, position }
      })

      return {
        ...prev,
        columns: normalizedColumns,
        cards: prev.cards.filter((card) => card.listId !== columnId)
      }
    })
  }

  const updateAvailableLabels = (labels: Label[]) => {
    setStore((prev) => ({
      ...prev,
      labelsByBoard: {
        ...prev.labelsByBoard,
        [activeBoardId]: labels
      }
    }))
  }

  const updateShareSettings = (nextSettings: BoardShareSettings) => {
    setStore((prev) => ({
      ...prev,
      shareByBoard: {
        ...prev.shareByBoard,
        [activeBoardId]: nextSettings
      }
    }))
  }

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Column') {
      setActiveColumnId(String(event.active.id))
      return
    }

    if (event.active.data.current?.type === 'Card') {
      setActiveCardId(String(event.active.id))
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeId === overId) {
      return
    }

    const isActiveCard = active.data.current?.type === 'Card'
    if (!isActiveCard) {
      return
    }

    const overIsCard = over.data.current?.type === 'Card'
    const overIsColumn = over.data.current?.type === 'Column'

    if (overIsCard) {
      setStore((prev) => {
        const activeIndex = prev.cards.findIndex((card) => card.id === activeId)
        const overIndex = prev.cards.findIndex((card) => card.id === overId)

        if (activeIndex === -1 || overIndex === -1) {
          return prev
        }

        const activeCardValue = prev.cards[activeIndex]
        const overCardValue = prev.cards[overIndex]

        if (!currentBoardCardListIds.has(activeCardValue.listId) || !currentBoardCardListIds.has(overCardValue.listId)) {
          return prev
        }

        const draft = [...prev.cards]
        draft[activeIndex] = {
          ...draft[activeIndex],
          listId: overCardValue.listId,
          updatedAt: new Date().toISOString()
        }

        return {
          ...prev,
          cards: arrayMove(draft, activeIndex, overIndex)
        }
      })
    }

    if (overIsColumn) {
      setStore((prev) => {
        const activeIndex = prev.cards.findIndex((card) => card.id === activeId)
        if (activeIndex === -1) {
          return prev
        }

        const activeCardValue = prev.cards[activeIndex]
        if (!currentBoardCardListIds.has(activeCardValue.listId) || !currentBoardCardListIds.has(overId)) {
          return prev
        }

        const draft = [...prev.cards]
        const [card] = draft.splice(activeIndex, 1)
        const updatedCard: CardData = {
          ...card,
          listId: overId,
          updatedAt: new Date().toISOString()
        }

        draft.push(updatedCard)

        return {
          ...prev,
          cards: draft
        }
      })
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null)
    setActiveColumnId(null)

    const { active, over } = event
    if (!over) {
      return
    }

    if (active.id === over.id) {
      return
    }

    const isActiveColumn = active.data.current?.type === 'Column'
    if (!isActiveColumn) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)

    setStore((prev) => {
      const boardColumns = prev.columns
        .filter((column) => column.boardId === activeBoardId)
        .sort((a, b) => a.position - b.position)

      const activeIndex = boardColumns.findIndex((column) => column.id === activeId)
      const overIndex = boardColumns.findIndex((column) => column.id === overId)

      if (activeIndex === -1 || overIndex === -1) {
        return prev
      }

      const movedColumns = arrayMove(boardColumns, activeIndex, overIndex).map((column, index) => ({
        ...column,
        position: index
      }))

      const otherColumns = prev.columns.filter((column) => column.boardId !== activeBoardId)

      return {
        ...prev,
        columns: [...otherColumns, ...movedColumns]
      }
    })
  }

  const createBoard = () => {
    const title = newBoardTitle.trim()
    if (!title) {
      return
    }

    const now = new Date().toISOString()
    const boardId = createId('board')

    const nextBoards = [
      ...store.boards,
      {
        id: boardId,
        title,
        createdAt: now,
        updatedAt: now
      }
    ]

    setStore((prev) => ({
      ...prev,
      boards: nextBoards,
      columns: [
        ...prev.columns,
        {
          id: createId('list'),
          boardId,
          title: 'IDEIAS',
          position: 0
        }
      ],
      labelsByBoard: {
        ...prev.labelsByBoard,
        [boardId]: []
      },
      shareByBoard: {
        ...prev.shareByBoard,
        [boardId]: {
          boardId,
          linkToken: createId('share').replace('share_', ''),
          allowLinkAccess: true,
          members: [{ memberId: prev.currentMemberId, permission: 'edit' }]
        }
      },
      currentBoardId: boardId
    }))

    onBoardMetaChange?.({ boards: nextBoards, currentBoardId: boardId })

    setNewBoardTitle('')
    setDismissedCreateSignal(createBoardSignal)
  }

  if (!currentBoard || !shareSettings) {
    return null
  }

  return (
    <div className="h-full w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="h-full w-full overflow-x-auto">
          <div className="flex min-w-max items-start gap-4 px-6 py-6">
            <SortableContext items={currentColumnIds} strategy={horizontalListSortingStrategy}>
              {currentColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={cardsByList.get(column.id) ?? []}
                  onRename={renameColumn}
                  onDelete={deleteColumn}
                  onAddCard={addCardToList}
                  onUpdateCard={updateCardInStore}
                  onDeleteCard={deleteCard}
                  onArchiveCard={archiveCard}
                  availableLabels={availableLabels}
                  onUpdateAvailableLabels={updateAvailableLabels}
                  listOptions={listOptions}
                  boardMembers={store.members}
                  currentMemberId={store.currentMemberId}
                  searchActive={searchQuery.trim().length > 0}
                />
              ))}
            </SortableContext>

            <div className="w-[273px] shrink-0">
              {!isAddingList ? (
                <Button
                  onClick={() => setIsAddingList(true)}
                  variant="ghost"
                  className="h-[44px] w-full justify-start rounded-[12px] bg-[#3f3f3f] px-4 text-[14px] font-medium text-[#d1d1d1] hover:bg-[#4a4a4a]"
                >
                  <Plus className="mr-2 size-4" />
                  Adicionar um cartão
                </Button>
              ) : (
                <div className="space-y-2 rounded-[12px] border border-white/10 bg-[#101204] p-3">
                  <Input
                    autoFocus
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value)}
                    placeholder="Titulo da lista"
                    className="h-10 border-white/20 bg-[#242528] text-sm text-[#d1d1d1] placeholder:text-[#a3a3a3]"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        addList()
                      }
                      if (event.key === 'Escape') {
                        setIsAddingList(false)
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button onClick={addList} className="h-9 bg-primary text-white hover:bg-primary/90">
                      Adicionar
                    </Button>
                    <Button
                      onClick={() => {
                        setIsAddingList(false)
                        setNewListTitle('')
                      }}
                      variant="ghost"
                      size="icon"
                      className="text-[#d1d1d1] hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <Column
                column={activeColumn}
                cards={currentCards.filter((card) => card.listId === activeColumn.id)}
                onRename={() => undefined}
                onDelete={() => undefined}
                onAddCard={() => undefined}
                onUpdateCard={() => undefined}
                onDeleteCard={() => undefined}
                onArchiveCard={() => undefined}
                availableLabels={availableLabels}
                onUpdateAvailableLabels={() => undefined}
                listOptions={listOptions}
                boardMembers={store.members}
                currentMemberId={store.currentMemberId}
                isOverlay
              />
            )}
            {activeCard && (
              <Card
                card={activeCard}
                listTitle={currentColumns.find((column) => column.id === activeCard.listId)?.title ?? 'Lista'}
                listOptions={listOptions}
                availableLabels={availableLabels}
                onUpdateAvailableLabels={updateAvailableLabels}
                boardMembers={store.members}
                currentMemberId={store.currentMemberId}
                onUpdate={updateCardInStore}
                onDelete={deleteCard}
                onArchive={archiveCard}
                isOverlay
                disableModal
              />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {isCreateBoardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Criar novo board">
          <div className="w-full max-w-[565px] rounded-[12px] border border-white/10 bg-[#141414] p-6">
            <h2 className="text-[34px] font-bold leading-[1.05] text-white">Criar novo board</h2>
            <p className="mt-2 text-[24px] text-[#d1d1d1]">Defina um nome para o board.</p>
            <Input
              value={newBoardTitle}
              onChange={(event) => setNewBoardTitle(event.target.value)}
              className="mt-6 h-[50px] border border-primary bg-black px-4 text-[24px] font-semibold text-white placeholder:text-[#7d7d7d]"
              placeholder="Ex.: Campanha Abril"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  createBoard()
                }
              }}
            />
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                className="h-[50px] px-7 text-[24px] font-semibold text-[#d1d1d1] hover:bg-white/10"
                onClick={() => {
                  setDismissedCreateSignal(createBoardSignal)
                  setNewBoardTitle('')
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createBoard} className="h-[50px] rounded-[8px] bg-primary px-7 text-[24px] font-semibold text-white hover:bg-primary/90">
                Criar board
              </Button>
            </div>
          </div>
        </div>
      )}

      {isShareBoardOpen && (
        <ShareBoardModal
          isOpen={isShareBoardOpen}
          board={currentBoard}
          members={store.members}
          shareSettings={shareSettings}
          onClose={() => setDismissedShareSignal(shareBoardSignal)}
          onChange={updateShareSettings}
        />
      )}
    </div>
  )
}
