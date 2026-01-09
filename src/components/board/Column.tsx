import { createPortal } from "react-dom"
import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, X } from "lucide-react"
import Card from "@/components/board/Card"
import { Input } from "@/components/ui/input"
import { type ColumnData, type CardData, type Label } from "@/types"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type Props = {
  column: ColumnData
  cards: CardData[]
  onRename: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
  onAddCard: (columnId: string, title: string) => void
  onUpdateCard: (id: number | string, data: Partial<CardData>) => void
  onDeleteCard: (id: number | string) => void
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
}

// Helper component extracted to avoid re-mounting issues
const AddCardInput = ({ 
    value, 
    onChange, 
    onAdd, 
    onCancel 
}: { 
    value: string, 
    onChange: (val: string) => void, 
    onAdd: () => void, 
    onCancel: () => void 
}) => (
    <div className="p-2">
        <div className="bg-[#242528] p-2 rounded-md border-2 border-primary mb-2 shadow-sm">
           <textarea 
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Insira um título ou cole um link"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none h-14"
              onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      onAdd()
                  }
              }}
           />
        </div>
        <div className="flex items-center gap-2">
            <Button 
              onClick={onAdd}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
            >
                Adicionar Cartão
            </Button>
            <Button 
              onClick={onCancel}
              variant="ghost" 
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
                <X className="size-5" />
            </Button>
        </div>
    </div>
)

export default function Column({ 
    column, 
    cards, 
    onRename, 
    onDelete, 
    onAddCard, 
    onUpdateCard, 
    onDeleteCard, 
    availableLabels,
    onUpdateAvailableLabels
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInputValue, setTitleInputValue] = useState(column.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Add Card State
  const [addingCardMode, setAddingCardMode] = useState<'top' | 'bottom' | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")

  const cardsIds = useMemo(() => cards.map(c => c.id), [cards])

    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging
    } = useSortable({
      id: column.id,
      data: {
          type: "Column",
          column
      },
      disabled: isEditingTitle // Disable drag when editing title
  })

  const style = {
      transition,
      transform: CSS.Transform.toString(transform),
  }

  useEffect(() => {
    setTitleInputValue(column.title)
  }, [column.title])

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus()
        titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return
    onAddCard(column.id, newCardTitle)
    setNewCardTitle("")
    // If we want to keep adding mode open:
    // setAddingCardMode(addingCardMode) 
    // Usually we close it or keep it open. Trello keeps it open.
    // But for now let's keep it open to match previous behavior? 
    // Previous behavior didn't keep it open explicitly shown in code but usually yes.
    // Let's close it for simplicity or keep it if user wants bulk add.
    // I'll close it to match standard single add flow for now, user didn't specify.
    // Actually, Trello keeps it open. Let's keep it open.
  }

  const handleCloseAddCard = () => {
      setAddingCardMode(null)
      setNewCardTitle("")
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const toggleMenu = () => {
    if (!isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
    setIsMenuOpen(!isMenuOpen)
  }

  if (isDragging) {
      return (
          <div ref={setNodeRef} style={style} className="w-72 shrink-0 bg-[#161a1d] rounded-lg border border-white/10 h-[500px] opacity-50" />
      )
  }

  return (
    <div ref={setNodeRef} style={style} className="w-72 shrink-0 bg-[#101204] rounded-lg border border-white/5 flex flex-col max-h-full">
      {/* Header */}
      <div 
        {...attributes}
        {...listeners}
        className="p-3 flex items-center justify-between group cursor-grab active:cursor-grabbing"
      >
        {isEditingTitle ? (
            <Input
                ref={titleInputRef}
                value={titleInputValue}
                onChange={(e) => setTitleInputValue(e.target.value)}
                onBlur={() => {
                    if (titleInputValue.trim() && titleInputValue !== column.title) {
                        onRename(column.id, titleInputValue)
                    }
                    setIsEditingTitle(false)
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        if (titleInputValue.trim()) onRename(column.id, titleInputValue)
                        setIsEditingTitle(false)
                    }
                }}
                className="h-7 bg-[#22272b] border-blue-500 text-sm font-semibold px-2 py-1"
            />
        ) : (
            <div 
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-semibold text-gray-200 px-2 py-1 rounded hover:bg-white/10 cursor-pointer flex-1 truncate"
            >
                {column.title}
            </div>
        )}
        
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
                ref={buttonRef}
                onClick={toggleMenu}
                className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded"
            >
                <MoreHorizontal className="size-4" />
            </button>
        </div>

        {/* Column Menu Portal */}
        {isMenuOpen && createPortal(
            <div 
                ref={menuRef}
                style={{ top: menuPosition.top, left: menuPosition.left }}
                className="fixed w-60 bg-[#282e33] rounded-lg shadow-xl border border-white/10 z-50 py-2 animate-in fade-in zoom-in-95 duration-200"
            >
                <div className="px-3 pb-2 mb-2 border-b border-white/10 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-300">Ações da Lista</span>
                    <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-white">
                        <X className="size-4" />
                    </button>
                </div>
                
                <button 
                    onClick={() => {
                        setAddingCardMode('top')
                        setIsMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-300 hover:bg-white/10"
                >
                    Adicionar cartão no topo
                </button>
                <button 
                    onClick={() => {
                        setAddingCardMode('bottom')
                        setIsMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-sm text-gray-300 hover:bg-white/10"
                >
                    Adicionar cartão no fim
                </button>
                
                <div className="my-1 border-t border-white/10" />
                
                <button 
                    onClick={() => {
                        onDelete(column.id)
                        setIsMenuOpen(false)
                    }}
                    className="w-full text-left px-4 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                    Arquivar esta lista
                </button>
            </div>,
            document.body
        )}
      </div>

      {/* Cards Container */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-2 custom-scrollbar min-h-[50px]">
         {addingCardMode === 'top' && (
             <AddCardInput 
                value={newCardTitle}
                onChange={setNewCardTitle}
                onAdd={handleAddCard}
                onCancel={handleCloseAddCard}
             />
         )}

         <SortableContext items={cardsIds} strategy={verticalListSortingStrategy}>
            {cards.map(card => (
                <Card 
                    key={card.id}
                    id={card.id}
                    title={card.title}
                    cover={card.cover}
                    labels={card.labels}
                    dueDate={card.dueDate}
                    members={card.members}
                    isCompleted={card.isCompleted}
                    attachments={card.attachments}
                    onUpdate={onUpdateCard}
                    onDelete={onDeleteCard}
                    availableLabels={availableLabels}
                    onUpdateAvailableLabels={onUpdateAvailableLabels}
                />
            ))}
         </SortableContext>

         {addingCardMode === 'bottom' && (
             <AddCardInput 
                value={newCardTitle}
                onChange={setNewCardTitle}
                onAdd={handleAddCard}
                onCancel={handleCloseAddCard}
             />
         )}
      </div>

      {/* Footer Add Button */}
      {!addingCardMode && (
          <div className="p-2">
              <Button 
                onClick={() => setAddingCardMode('bottom')}
                variant="ghost" 
                className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-white/10 h-9"
              >
                  <Plus className="size-4" />
                  Adicionar um cartão
              </Button>
          </div>
      )}
    </div>
  )
}
