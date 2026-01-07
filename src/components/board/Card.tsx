import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Paperclip, CheckSquare, Archive, Trash2, AlertTriangle, Clock } from "lucide-react"
import CardModal from "./CardModal"
import { Button } from "@/components/ui/button"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { type Label } from "@/types"

type Props = {
  id: number | string
  title: string
  cover?: boolean
  labels?: Label[]
  dueDate?: string
  members?: string[]
  isCompleted?: boolean
  onDelete?: (id: number | string) => void
  onArchive?: (id: number | string) => void
  onUpdate?: (id: number | string, data: any) => void
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
  isOverlay?: boolean
}

export default function Card({ 
    id, 
    title, 
    cover, 
    labels = [], 
    dueDate, 
    members = [], 
    isCompleted, 
    onDelete, 
    onArchive, 
    onUpdate,
    availableLabels,
    onUpdateAvailableLabels,
    isOverlay 
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null)
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const {
      setNodeRef,
      attributes,
      listeners,
      transform,
      transition,
      isDragging
  } = useSortable({
      id,
      data: {
          type: "Card",
          card: { id, title, cover, labels, dueDate, members, isCompleted }
      },
      disabled: isOverlay
  })

  const style = {
      transition,
      transform: CSS.Transform.toString(transform),
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation() // Prevent parent context menus
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleActionClick = (action: 'archive' | 'delete') => {
    setConfirmAction(action)
    setContextMenu(null)
  }

  const handleConfirm = () => {
    if (confirmAction === 'delete' && onDelete) {
      onDelete(id)
    } else if (confirmAction === 'archive' && onArchive) {
      onArchive(id)
    }
    setConfirmAction(null)
  }

  if (isDragging) {
    return (
        <div ref={setNodeRef} style={style} className="opacity-30 rounded-md bg-[#22272b] h-24 border border-white/5" />
    )
  }

  return (
    <>
      <article 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={handleContextMenu}
        onClick={() => setIsModalOpen(true)}
        className="group relative flex flex-col rounded-md bg-card text-sm shadow-sm ring-1 ring-white/5 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer overflow-hidden bg-[#22272b]"
      >
        {/* Edge-to-Edge Cover Image */}
        {cover && <div className="h-32 w-full bg-muted/50 bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=270&auto=format&fit=crop')] bg-cover bg-center" />}
        
        <div className="p-3 flex flex-col gap-2">
          {/* Labels */}
          {labels && labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {labels.map((label, index) => (
                <span 
                  key={label.id || index} 
                  className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider shadow-sm" 
                  style={{ backgroundColor: label.color }} 
                  title={label.text}
                >
                  {label.text}
                </span>
              ))}
            </div>
          )}

          <div className="font-medium text-card-foreground leading-snug text-gray-200">{title}</div>
          
          {/* Metadata Footer */}
          {(dueDate || isCompleted || (members && members.length > 0) || cover) && (
            <div className="mt-1 flex items-center justify-between min-h-[20px]">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
               {(dueDate || isCompleted) && (
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      isCompleted 
                         ? 'bg-green-500/20 text-green-400' 
                         : (dueDate && new Date(dueDate) < new Date())
                             ? 'bg-red-500/20 text-red-400' 
                             : 'bg-zinc-700 text-zinc-300'
                  }`}>
                     {isCompleted ? <CheckSquare className="size-3" /> : <Clock className="size-3" />}
                     <span>
                        {dueDate && new Date(dueDate).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'}).replace('.', '')}
                        {isCompleted && (dueDate ? <span className="hidden sm:inline"> • CONCLUÍDO</span> : "CONCLUÍDO")}
                     </span>
                  </div>
               )}
               {cover && (
                 <Paperclip className="size-3" />
               )}
              </div>
              
              {/* Members */}
              {members && members.length > 0 ? (
                  <div className="flex -space-x-1 pl-2">
                     {members.map((m, i) => (
                        <div key={i} className="size-5 rounded-full bg-blue-600 border border-[#22272b] flex items-center justify-center text-[8px] text-white font-bold">
                            {m.substring(0, 2).toUpperCase()}
                        </div>
                     ))}
                  </div>
              ) : (
                  // Placeholder for user avatar if needed, or hidden
                  null
              )}
            </div>
          )}
        </div>
      </article>

      {isModalOpen && !isOverlay && (
        <CardModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onUpdate={(data) => onUpdate && onUpdate(id, data)}
          hasCover={cover}
          title={title}
          initialLabels={labels}
          dueDate={dueDate}
          isCompleted={isCompleted}
          availableLabels={availableLabels}
          onUpdateAvailableLabels={onUpdateAvailableLabels}
          members={members}
        />
      )}

      {/* Context Menu Portal */}
      {contextMenu && createPortal(
        <>
            <div 
                className="fixed inset-0 z-40" 
                onClick={() => setContextMenu(null)}
            />
            <div 
                ref={menuRef}
                style={{ top: contextMenu.y, left: contextMenu.x }}
                className="fixed z-50 w-48 rounded-md border border-white/10 bg-[#282e33] p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
            >
                {confirmAction ? (
                    <div className="p-2 space-y-2">
                        <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
                            <AlertTriangle className="size-3" />
                            <span>Tem certeza?</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="h-7 text-xs"
                                onClick={handleConfirm}
                            >
                                Sim
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs hover:bg-white/10"
                                onClick={() => setConfirmAction(null)}
                            >
                                Não
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={() => handleActionClick('archive')}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                            <Archive className="size-4" />
                            Arquivar
                        </button>
                        <div className="my-1 h-px bg-white/10" />
                        <button 
                            onClick={() => handleActionClick('delete')}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="size-4" />
                            Excluir
                        </button>
                    </>
                )}
            </div>
        </>,
        document.body
      )}
    </>
  )
}
