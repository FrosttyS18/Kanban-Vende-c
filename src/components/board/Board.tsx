import { useState, useMemo, useEffect } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Column from "@/components/board/Column"
import { 
  DndContext, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  closestCorners, 
  type DragStartEvent, 
  type DragOverEvent, 
  type DragEndEvent, 
  defaultDropAnimationSideEffects 
} from "@dnd-kit/core"
import { 
  SortableContext, 
  horizontalListSortingStrategy, 
  arrayMove 
} from "@dnd-kit/sortable"
import { createPortal } from "react-dom"
import Card from "@/components/board/Card"
import { type CardData, type ColumnData, type Label } from "@/types"

const GLOBAL_AVAILABLE_LABELS: Label[] = [
    { id: 'l1', text: 'URGENTE', color: '#b04632' },
    { id: 'l2', text: 'EM ANDAMENTO', color: '#d29034' },
    { id: 'l3', text: 'CONCLUÍDO', color: '#519839' },
]

export default function Board() {
  const [columns, setColumns] = useState<ColumnData[]>(() => {
    const saved = localStorage.getItem('board_columns')
    return saved ? JSON.parse(saved) : []
  })
  const [cards, setCards] = useState<CardData[]>(() => {
    const saved = localStorage.getItem('board_cards')
    return saved ? JSON.parse(saved) : []
  })
  const [availableLabels, setAvailableLabels] = useState<Label[]>(() => {
    const saved = localStorage.getItem('board_labels')
    return saved ? JSON.parse(saved) : GLOBAL_AVAILABLE_LABELS
  })

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('board_columns', JSON.stringify(columns))
  }, [columns])

  useEffect(() => {
    localStorage.setItem('board_cards', JSON.stringify(cards))
  }, [cards])

  useEffect(() => {
    localStorage.setItem('board_labels', JSON.stringify(availableLabels))
  }, [availableLabels])

  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null)

  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  )

  const columnsId = useMemo(() => columns.map((col) => col.id), [columns])

  const handleAddList = () => {
    if (!newListTitle.trim()) return
    
    const newColumn: ColumnData = {
      id: Date.now().toString(),
      title: newListTitle
    }
    
    setColumns([...columns, newColumn])
    setNewListTitle("")
    setIsAddingList(false)
  }

  const handleRenameColumn = (id: string, newTitle: string) => {
    setColumns(columns.map(col => col.id === id ? { ...col, title: newTitle } : col))
  }

  const handleDeleteColumn = (id: string) => {
    setColumns(columns.filter(col => col.id !== id))
    setCards(cards.filter(card => card.columnId !== id))
  }

  // Card CRUD
  const handleAddCard = (columnId: string, title: string) => {
    const newCard: CardData = {
        id: Date.now(),
        columnId,
        title,
        labels: [],
        cover: false
    }
    setCards([...cards, newCard])
  }

  const handleUpdateCard = (cardId: number | string, updates: Partial<CardData>) => {
      setCards(prev => prev.map(card => 
          card.id === cardId ? { ...card, ...updates } : card
      ))
  }

  const handleDeleteCard = (id: number | string) => {
    setCards(prev => prev.filter(card => card.id !== id))
  }

  const handleArchiveCard = (id: number | string) => {
    const cardToArchive = cards.find(c => c.id === id)
    if (!cardToArchive) return

    // Add to archived storage
    const archived = localStorage.getItem('archived_cards')
    const archivedCards = archived ? JSON.parse(archived) : []
    
    // Add metadata for when/where it was archived
    const archiveRecord = {
        ...cardToArchive,
        archivedAt: new Date().toISOString(),
        originalColumn: columns.find(c => c.id === cardToArchive.columnId)?.title || "Unknown"
    }
    
    localStorage.setItem('archived_cards', JSON.stringify([...archivedCards, archiveRecord]))
    
    // Remove from active board
    setCards(prev => prev.filter(c => c.id !== id))
  }

  // Label Management
  const handleUpdateAvailableLabels = (newLabels: Label[]) => {
      setAvailableLabels(newLabels)
  }

  // DnD Handlers
  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column)
      return
    }

    if (event.active.data.current?.type === "Card") {
      setActiveCard(event.active.data.current.card)
      return
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveACard = active.data.current?.type === "Card"
    const isOverACard = over.data.current?.type === "Card"
    const isOverAColumn = over.data.current?.type === "Column"

    if (!isActiveACard) return

    // Dropping a Card over another Card
    if (isActiveACard && isOverACard) {
      setCards((cards) => {
        const activeIndex = cards.findIndex((c) => c.id === activeId)
        const overIndex = cards.findIndex((c) => c.id === overId)

        if (cards[activeIndex].columnId !== cards[overIndex].columnId) {
          // Different column
          const newCards = [...cards]
          newCards[activeIndex].columnId = cards[overIndex].columnId
          return arrayMove(newCards, activeIndex, overIndex - 1) // visual adjustment
        }

        return arrayMove(cards, activeIndex, overIndex)
      })
    }

    // Dropping a Card over a Column
    if (isActiveACard && isOverAColumn) {
      setCards((cards) => {
        const activeIndex = cards.findIndex((c) => c.id === activeId)
        if (cards[activeIndex].columnId !== overId) {
            const newCards = [...cards]
            newCards[activeIndex].columnId = String(overId)
            return newCards // Move to end of column usually handled by sortable strategy
        }
        return cards
      })
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveColumn(null)
    setActiveCard(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveAColumn = active.data.current?.type === "Column"
    if (isActiveAColumn) {
        setColumns((columns) => {
            const activeIndex = columns.findIndex((col) => col.id === activeId)
            const overIndex = columns.findIndex((col) => col.id === overId)
            return arrayMove(columns, activeIndex, overIndex)
        })
    }
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
                <div className="flex h-full items-start gap-4 p-4 min-w-max">
                    <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                        {columns.map(col => (
                            <Column 
                                key={col.id} 
                                column={col}
                                cards={cards.filter(c => c.columnId === col.id)}
                                onRename={handleRenameColumn}
                                onDelete={handleDeleteColumn}
                                onAddCard={handleAddCard}
                                onUpdateCard={handleUpdateCard}
                                onDeleteCard={handleDeleteCard}
                                onArchiveCard={handleArchiveCard}
                                availableLabels={availableLabels}
                                onUpdateAvailableLabels={handleUpdateAvailableLabels}
                            />
                        ))}
                    </SortableContext>

                    {/* Add List Button/Form */}
                    <div className="w-72 shrink-0">
                        {!isAddingList ? (
                        <Button 
                            onClick={() => setIsAddingList(true)}
                            variant="ghost"
                            className="w-full justify-start gap-2 bg-white/5 hover:bg-white/10 text-white font-medium h-12"
                        >
                            <Plus className="size-4" />
                            Adicionar outra lista
                        </Button>
                        ) : (
                        <div className="bg-[#101204] p-3 rounded-lg border border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Input 
                            autoFocus
                            value={newListTitle}
                            onChange={(e) => setNewListTitle(e.target.value)}
                            placeholder="Digite o nome da lista..."
                            className="bg-[#22272b] border-white/20 text-white placeholder:text-muted-foreground focus-visible:ring-primary"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddList()
                                if (e.key === 'Escape') setIsAddingList(false)
                            }}
                            />
                            <div className="flex items-center gap-2">
                            <Button 
                                onClick={handleAddList}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Adicionar Lista
                            </Button>
                            <Button
                                onClick={() => setIsAddingList(false)}
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-white hover:bg-white/10"
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
                            cards={cards.filter(c => c.columnId === activeColumn.id)}
                            onRename={() => {}}
                            onDelete={() => {}}
                            onAddCard={() => {}}
                            onUpdateCard={() => {}}
                            onDeleteCard={() => {}}
                            onArchiveCard={() => {}}
                            availableLabels={availableLabels}
                            onUpdateAvailableLabels={() => {}}
                        />
                    )}
                    {activeCard && (
                         <Card
                            id={activeCard.id}
                            title={activeCard.title}
                            cover={activeCard.cover}
                            labels={activeCard.labels}
                            dueDate={activeCard.dueDate}
                            members={activeCard.members}
                            isCompleted={activeCard.isCompleted}
                            attachments={activeCard.attachments}
                            availableLabels={availableLabels}
                            onUpdateAvailableLabels={() => {}}
                            isOverlay
                         />
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    </div>
  )
}
