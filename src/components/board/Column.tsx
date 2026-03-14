import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MoreHorizontal, Plus, X } from 'lucide-react'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Card from '@/components/board/Card'
import { type CardData, type ColumnData, type Label, type Member } from '@/types'

const LIST_TITLE_MAX_LENGTH = 150

type Props = {
  column: ColumnData
  cards: CardData[]
  onRename: (id: string, newTitle: string) => void
  onDelete: (id: string) => void
  onAddCard: (columnId: string, title: string, placement: 'top' | 'bottom') => void
  onUpdateCard: (id: string, data: Partial<CardData>) => void
  onDeleteCard: (id: string) => void
  onArchiveCard: (id: string) => void
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
  listOptions: Array<{ id: string; title: string }>
  boardMembers: Member[]
  currentMemberId: string
  searchActive?: boolean
  isOverlay?: boolean
}

function AddCardInput({
  value,
  onChange,
  onAdd,
  onCancel
}: {
  value: string
  onChange: (value: string) => void
  onAdd: () => void
  onCancel: () => void
}) {
  return (
    <div className="px-2 pb-2 pt-1">
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Insira um titulo"
        className="h-10 border border-primary bg-[#242528] text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d]"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            onAdd()
          }
        }}
      />
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={onAdd} className="h-8 bg-primary text-white hover:bg-primary/90">
          Adicionar cartao
        </Button>
        <Button onClick={onCancel} variant="ghost" size="icon" className="size-8 text-[#d1d1d1] hover:bg-white/10 hover:text-white">
          <X className="size-5" />
        </Button>
      </div>
    </div>
  )
}

export default function Column({
  column,
  cards,
  onRename,
  onDelete,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onArchiveCard,
  availableLabels,
  onUpdateAvailableLabels,
  listOptions,
  boardMembers,
  currentMemberId,
  searchActive = false,
  isOverlay = false
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInputValue, setTitleInputValue] = useState(column.title)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const [addingCardMode, setAddingCardMode] = useState<'top' | 'bottom' | null>(null)
  const [newCardTitle, setNewCardTitle] = useState('')

  const cardsIds = useMemo(() => cards.map((card) => card.id), [cards])

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column
    },
    disabled: isEditingTitle || isOverlay
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform)
  }

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target) && buttonRef.current && !buttonRef.current.contains(target)) {
        setIsMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMenu = () => {
    if (!isMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({ top: rect.bottom + 8, left: rect.left })
    }
    setIsMenuOpen((prev) => !prev)
  }

  const closeAddCard = () => {
    setAddingCardMode(null)
    setNewCardTitle('')
  }

  const saveCard = () => {
    const title = newCardTitle.trim()
    if (!title || !addingCardMode) {
      return
    }

    onAddCard(column.id, title, addingCardMode)
    setNewCardTitle('')
  }

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-165.25 w-68.25 shrink-0 rounded-2xl border border-white/10 bg-[#101204] opacity-50" />
  }

  return (
    <section ref={setNodeRef} style={style} className="flex max-h-[calc(100vh-140px)] w-68.25 shrink-0 flex-col rounded-2xl bg-[#101204]">
      <header {...attributes} {...listeners} className="group flex cursor-grab items-center justify-between px-4 pb-3 pt-3 active:cursor-grabbing">
        {isEditingTitle ? (
          <Input
            ref={titleInputRef}
            value={titleInputValue}
            onChange={(event) => setTitleInputValue(event.target.value.slice(0, LIST_TITLE_MAX_LENGTH))}
            maxLength={LIST_TITLE_MAX_LENGTH}
            onBlur={() => {
              const nextTitle = titleInputValue.trim().slice(0, LIST_TITLE_MAX_LENGTH)
              if (nextTitle && nextTitle !== column.title) {
                onRename(column.id, nextTitle)
              }
              setIsEditingTitle(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const nextTitle = titleInputValue.trim().slice(0, LIST_TITLE_MAX_LENGTH)
                if (nextTitle) {
                  onRename(column.id, nextTitle)
                }
                setIsEditingTitle(false)
              }
            }}
            className="h-8 border border-white/20 bg-[#242528] px-2 py-1 text-[16px] font-semibold text-white"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              if (isOverlay) {
                return
              }
              setTitleInputValue(column.title)
              setIsEditingTitle(true)
            }}
            className="flex-1 truncate text-left text-[16px] font-semibold text-white"
          >
            {column.title}
          </button>
        )}

        {!isOverlay && (
          <button ref={buttonRef} onClick={toggleMenu} className="rounded p-1 text-[#d1d1d1] hover:bg-white/10 hover:text-white" aria-label="Abrir menu da lista">
            <MoreHorizontal className="size-4" />
          </button>
        )}
      </header>

      {isMenuOpen &&
        createPortal(
          <div ref={menuRef} style={{ top: menuPosition.top, left: menuPosition.left }} className="fixed z-50 w-60 rounded-lg border border-white/10 bg-[#282e33] py-2 shadow-xl">
            <button
              onClick={() => {
                setAddingCardMode('top')
                setIsMenuOpen(false)
              }}
              className="w-full px-4 py-1.5 text-left text-sm text-gray-300 hover:bg-white/10"
            >
              Adicionar cartao no topo
            </button>
            <button
              onClick={() => {
                setAddingCardMode('bottom')
                setIsMenuOpen(false)
              }}
              className="w-full px-4 py-1.5 text-left text-sm text-gray-300 hover:bg-white/10"
            >
              Adicionar cartao no fim
            </button>
            <div className="my-1 border-t border-white/10" />
            <button
              onClick={() => {
                onDelete(column.id)
                setIsMenuOpen(false)
              }}
              className="w-full px-4 py-1.5 text-left text-sm text-red-400 hover:bg-red-500/10"
            >
              Excluir lista
            </button>
          </div>,
          document.body
        )}

      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        {addingCardMode === 'top' && <AddCardInput value={newCardTitle} onChange={setNewCardTitle} onAdd={saveCard} onCancel={closeAddCard} />}

        <SortableContext items={cardsIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              listTitle={column.title}
              listOptions={listOptions}
              availableLabels={availableLabels}
              onUpdateAvailableLabels={onUpdateAvailableLabels}
              boardMembers={boardMembers}
              currentMemberId={currentMemberId}
              onUpdate={onUpdateCard}
              onDelete={onDeleteCard}
              onArchive={onArchiveCard}
              isOverlay={isOverlay}
              disableModal={isOverlay}
            />
          ))}
        </SortableContext>

        {!isOverlay && cards.length === 0 && searchActive && (
          <div className="rounded-md border border-dashed border-white/20 p-3 text-xs text-[#d1d1d1]">Nenhum card corresponde ao filtro.</div>
        )}

        {addingCardMode === 'bottom' && <AddCardInput value={newCardTitle} onChange={setNewCardTitle} onAdd={saveCard} onCancel={closeAddCard} />}
      </div>

      {!addingCardMode && !isOverlay && (
        <footer className="px-4 pb-4 pt-2">
          <Button onClick={() => setAddingCardMode('bottom')} variant="ghost" className="h-5.5 w-full justify-start p-0 text-[14px] font-medium text-[#d1d1d1] hover:bg-transparent hover:text-white">
            <Plus className="mr-2 size-4" />
            Adicionar um cartao
          </Button>
        </footer>
      )}
    </section>
  )
}
