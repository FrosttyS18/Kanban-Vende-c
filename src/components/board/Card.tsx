import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Check, Circle, Clock3, Paperclip, Trash2, User } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import CardModal from './CardModal'
import { type CardData, type Label, type Member } from '@/types'

type CardProps = {
  card: CardData
  listTitle: string
  listOptions: Array<{ id: string; title: string }>
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
  boardMembers: Member[]
  currentMemberId: string
  onDelete?: (id: string) => void
  onArchive?: (id: string) => void
  onUpdate?: (id: string, data: Partial<CardData>) => void
  isOverlay?: boolean
  disableModal?: boolean
}

type DueBadge = {
  className: string
  textClassName: string
  iconClassName: string
  showBackground: boolean
}

function formatDueDate(value: string): string {
  const date = new Date(value)
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')
}

function getDueBadge(dueDate?: string, isCompleted?: boolean): DueBadge | null {
  if (!dueDate) {
    return null
  }

  if (isCompleted) {
    return {
      className: 'bg-[#00ff73]',
      textClassName: 'text-[#242528]',
      iconClassName: 'text-[#242528]',
      showBackground: true
    }
  }

  const target = new Date(dueDate)
  const now = new Date()

  if (target.getTime() <= now.getTime()) {
    return {
      className: 'bg-[#820002]',
      textClassName: 'text-[#da7e77]',
      iconClassName: 'text-[#da7e77]',
      showBackground: true
    }
  }

  const hoursUntilDue = (target.getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilDue <= 24) {
    return {
      className: 'bg-[#ffff00]',
      textClassName: 'text-[#242528]',
      iconClassName: 'text-[#242528]',
      showBackground: true
    }
  }

  return {
    className: 'bg-transparent',
    textClassName: 'text-[#d1d1d1]',
    iconClassName: 'text-[#d1d1d1]',
    showBackground: false
  }
}

function labelTextClass(color: string): string {
  const value = color.replace('#', '')
  if (value.length !== 6) {
    return 'text-[#242528]'
  }

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? 'text-[#242528]' : 'text-white'
}

export default function Card({
  card,
  listTitle,
  listOptions,
  availableLabels,
  onUpdateAvailableLabels,
  boardMembers,
  currentMemberId,
  onDelete,
  onArchive,
  onUpdate,
  isOverlay = false,
  disableModal = false
}: CardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: {
      type: 'Card',
      card
    },
    disabled: isOverlay
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform)
  }

  const dueBadge = useMemo(() => getDueBadge(card.dueDate, card.isCompleted), [card.dueDate, card.isCompleted])

  const assignedMembers = useMemo(
    () => boardMembers.filter((member) => card.memberIds.includes(member.id)),
    [boardMembers, card.memberIds]
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        setContextMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (isDragging) {
    return <div ref={setNodeRef} style={style} className="h-[129px] rounded-[9px] bg-[#242528]/50" />
  }

  return (
    <>
      <article
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={(event) => {
          if (isOverlay) {
            return
          }
          event.preventDefault()
          setContextMenu({ x: event.clientX, y: event.clientY })
        }}
        onClick={() => {
          if (disableModal || isOverlay) {
            return
          }
          setIsModalOpen(true)
        }}
        className="group mx-2 cursor-pointer rounded-[9px] bg-[#242528] px-2 py-2"
      >
        {card.labels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <span key={label.id} className={`rounded-[4px] px-2 py-1 text-[12px] font-semibold ${labelTextClass(label.color)}`} style={{ backgroundColor: label.color }}>
                {label.text}
              </span>
            ))}
          </div>
        )}

        <div className="mb-2 flex items-start gap-2">
          <span className="mt-0.5 text-[#d1d1d1]">
            {card.isCompleted ? <Check className="size-4" /> : <Circle className="size-4" />}
          </span>
          <h4 className="line-clamp-2 text-[15px] font-semibold leading-[1.15] text-white">{card.title}</h4>
        </div>

        <div className="mt-1 flex items-center justify-between">
          {dueBadge && card.dueDate ? (
            <div className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 ${dueBadge.showBackground ? dueBadge.className : ''}`}>
              <Clock3 className={`size-[14px] ${dueBadge.iconClassName}`} />
              <span className={`text-[14px] font-semibold ${dueBadge.textClassName}`}>{formatDueDate(card.dueDate)}</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 text-white">
            {assignedMembers.length > 0 && (
              <div className="flex -space-x-1">
                {assignedMembers.slice(0, 2).map((member) => (
                  <span key={member.id} className="flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ backgroundColor: member.color }}>
                    {member.initials}
                  </span>
                ))}
              </div>
            )}
            <span className="inline-flex items-center gap-1 text-[12px]">
              <Paperclip className="size-[14px]" />
              {card.links.length}
            </span>
          </div>
        </div>
      </article>

      {isModalOpen && !isOverlay && !disableModal && (
        <CardModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          card={card}
          listTitle={listTitle}
          listOptions={listOptions}
          availableLabels={availableLabels}
          onUpdateAvailableLabels={onUpdateAvailableLabels}
          members={boardMembers}
          currentMemberId={currentMemberId}
          onMoveToList={(listId) => onUpdate?.(card.id, { listId })}
          onUpdate={(updates) => onUpdate?.(card.id, updates)}
          onDelete={onDelete ? () => onDelete(card.id) : undefined}
          onArchive={onArchive ? () => onArchive(card.id) : undefined}
        />
      )}

      {contextMenu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
            <div ref={menuRef} style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-50 w-48 rounded-md border border-white/10 bg-[#282e33] p-1 shadow-xl">
              {onArchive && (
                <button
                  onClick={() => {
                    onArchive(card.id)
                    setContextMenu(null)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  <Archive className="size-4" />
                  Arquivar
                </button>
              )}

              {onArchive && onDelete && <div className="my-1 h-px bg-white/10" />}

              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(card.id)
                    setContextMenu(null)
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              )}

              {!onDelete && !onArchive && (
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
                  <User className="size-3" />
                  Sem acoes disponiveis
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  )
}
