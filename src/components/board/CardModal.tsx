import { createPortal } from "react-dom"
import { useState, useRef, useEffect } from "react"
import { X, Plus, Paperclip, Users, CheckSquare, Clock, AlignLeft, MoreHorizontal, Image as ImageIcon, Pencil, ChevronLeft, Trash2, Monitor, CheckCircle2, Circle, ChevronRight, GripVertical } from "lucide-react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Label, type Attachment, type Activity } from "@/types"

type Props = {
  isOpen: boolean
  onClose: () => void
  hasCover?: boolean
  title?: string
  initialDescription?: string
  initialLabels?: Label[]
  initialActivities?: Activity[]
  initialAttachments?: Attachment[]
  isCompleted?: boolean
  dueDate?: string
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
  members?: string[]
}

const LABEL_COLORS = [
    '#164b35', '#533f04', '#592e08', '#5c1209', '#422446',
    '#216e4e', '#7f5f01', '#a54800', '#ae2e24', '#5e4db2',
    '#4bce97', '#f5dd29', '#ffa515', '#f87168', '#9f8fef',
    '#227d9b', '#0c66e4', '#6cc3e0', '#6e5dc6', '#505f79',
    '#60c6d2', '#6cd8fa', '#94c748', '#e774bb', '#8590a2'
]

export const INITIAL_LABELS: Label[] = []

export const INITIAL_ACTIVITIES: Activity[] = []

// Sortable Attachment Item Component
function SortableAttachmentItem({ attachment, onDelete }: { attachment: Attachment, onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: attachment.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-start gap-3 group bg-[#161a1d] p-2 rounded border border-transparent hover:border-white/5">
            <div {...attributes} {...listeners} className="mt-8 cursor-grab text-muted-foreground hover:text-foreground">
                <GripVertical className="size-4" />
            </div>
            <div className="h-20 w-28 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
                 <img src={attachment.url} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground truncate">{attachment.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">Adicionado há {attachment.date} • {attachment.isCover && <span className="text-foreground/80">Capa</span>}</p>
                <div className="flex items-center gap-3 mt-2">
                    <button className="text-xs text-foreground/80 hover:underline">Comentar</button>
                    <button onClick={onDelete} className="text-xs text-foreground/80 hover:underline">Excluir</button>
                    <button className="text-xs text-foreground/80 hover:underline">Editar</button>
                </div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-muted-foreground">
                <MoreHorizontal className="size-4" />
            </button>
        </div>
    );
}

export default function CardModal({ 
    isOpen, 
    onClose, 
    onUpdate,
    hasCover, 
    title,
    initialDescription = "",
    initialLabels = [],
    initialActivities = [],
    initialAttachments = [],
    isCompleted: initialIsCompleted = false,
    dueDate: initialDueDate,
    availableLabels,
    onUpdateAvailableLabels
}: Props & { onUpdate?: (data: any) => void }) {
  const [description, setDescription] = useState(initialDescription)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title || "")
  const [commentText, setCommentText] = useState("")
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)
  
  // Date & Completion State
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const [dueDate, setDueDate] = useState<Date | null>(initialDueDate ? new Date(initialDueDate) : null)
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false)
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date())

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAttachments((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        if (onUpdate) onUpdate({ attachments: newItems });
        return newItems;
      });
    }
  };

  // Date Input Logic
  const [dueDateStr, setDueDateStr] = useState("")
  
  useEffect(() => {
    if (dueDate) setDueDateStr(dueDate.toLocaleDateString('pt-BR'))
    else setDueDateStr("")
  }, [dueDate])

  const handleDueDateBlur = () => {
    const parts = dueDateStr.replace(/[^0-9/]/g, '').split('/')
    if (parts.length >= 2) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        const year = parts[2] ? (parts[2].length === 2 ? 2000 + parseInt(parts[2]) : parseInt(parts[2])) : new Date().getFullYear()
        
        const newDate = new Date(year, month, day)
        if (!isNaN(newDate.getTime())) {
            setDueDate(newDate)
            setCurrentCalendarDate(newDate)
            if (onUpdate) onUpdate({ dueDate: newDate.toISOString() })
        }
    }
  }
  
  const dateButtonRef = useRef<HTMLButtonElement>(null)
  const dateDisplayRef = useRef<HTMLDivElement>(null)
  const dateMenuRef = useRef<HTMLDivElement>(null)
  
  // Label Menu state
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false)
  const [labelMenuMode, setLabelMenuMode] = useState<'list' | 'create' | 'edit'>('list')
  const [labelSearch, setLabelSearch] = useState("")
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })

  // Attachment Menu state
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false)
  const attachmentButtonRef = useRef<HTMLButtonElement>(null)
  const attachmentMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Dragging state for Label Menu
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const popoverStartRef = useRef({ top: 0, left: 0 })

  // New/Edit Label State
  const [createLabelTitle, setCreateLabelTitle] = useState("")
  const [createLabelColor, setCreateLabelColor] = useState(LABEL_COLORS[12])
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)

  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const labelMenuRef = useRef<HTMLDivElement>(null)
  const labelButtonRef = useRef<HTMLButtonElement>(null)
  const modalContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
    }
  }, [isEditingDescription])

  // Drag logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return
        const dx = e.clientX - dragStartRef.current.x
        const dy = e.clientY - dragStartRef.current.y
        setPopoverPosition({
            top: popoverStartRef.current.top + dy,
            left: popoverStartRef.current.left + dx
        })
    }
    const handleMouseUp = () => setIsDragging(false)

    if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleToggleCompleted = () => {
      const newState = !isCompleted
      setIsCompleted(newState)
      if (onUpdate) onUpdate({ isCompleted: newState })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.target instanceof Element && (e.target.closest('button') || e.target.closest('input'))) {
          return // Don't drag if clicking controls
      }
      setIsDragging(true)
      dragStartRef.current = { x: e.clientX, y: e.clientY }
      popoverStartRef.current = { top: popoverPosition.top, left: popoverPosition.left }
  }

  // Close label/attachment menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (labelMenuRef.current && !labelMenuRef.current.contains(event.target as Node) && 
          labelButtonRef.current && !labelButtonRef.current.contains(event.target as Node)) {
        setIsLabelMenuOpen(false)
      }
      
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node) && 
          attachmentButtonRef.current && !attachmentButtonRef.current.contains(event.target as Node)) {
        setIsAttachmentMenuOpen(false)
      }
    }
    
    // Close on scroll of the modal content to prevent "stuck" popover
    const handleScroll = () => {
        // Only close if not dragging and not in a state where we might want to keep it
        if (isLabelMenuOpen && !isDragging) setIsLabelMenuOpen(false)
        if (isAttachmentMenuOpen) setIsAttachmentMenuOpen(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("resize", () => {
        setIsLabelMenuOpen(false)
        setIsAttachmentMenuOpen(false)
    })
    
    const modalContent = modalContentRef.current
    if (modalContent) {
        modalContent.addEventListener("scroll", handleScroll)
    }

    return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        window.removeEventListener("resize", () => {
            setIsLabelMenuOpen(false)
            setIsAttachmentMenuOpen(false)
        })
        if (modalContent) {
            modalContent.removeEventListener("scroll", handleScroll)
        }
    }
  }, [isOpen, isLabelMenuOpen, isDragging, isAttachmentMenuOpen])

  const handleOpenLabelMenu = () => {
      if (isLabelMenuOpen) {
          setIsLabelMenuOpen(false)
          return
      }
      setIsAttachmentMenuOpen(false) // Close other menus
      
      if (labelButtonRef.current) {
          const rect = labelButtonRef.current.getBoundingClientRect()
          
          let left = rect.left
          const menuWidth = 304
          const screenWidth = window.innerWidth
          
          if (left + menuWidth > screenWidth) {
              left = screenWidth - menuWidth - 16
          }

          setPopoverPosition({
              top: rect.bottom + 8,
              left: left
          })
          setLabelMenuMode('list')
          setIsLabelMenuOpen(true)
      }
  }

  const handleOpenAttachmentMenu = () => {
      if (isAttachmentMenuOpen) {
          setIsAttachmentMenuOpen(false)
          return
      }
      setIsLabelMenuOpen(false) // Close other menus
      
      if (attachmentButtonRef.current) {
          const rect = attachmentButtonRef.current.getBoundingClientRect()
          setPopoverPosition({
              top: rect.bottom + 8,
              left: rect.left
          })
          setIsAttachmentMenuOpen(true)
      }
  }

  const handleFileSelect = () => {
      fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          const files = Array.from(e.target.files)
          
          files.forEach(file => {
              const reader = new FileReader()
              reader.onloadend = () => {
                  const base64String = reader.result as string
                  const newAttachment: Attachment = {
                      id: Date.now().toString() + Math.random().toString(),
                      name: file.name,
                      url: base64String, // Persistent Data URL
                      date: new Date().toLocaleDateString('pt-BR'),
                      isCover: false
                  }
                  
                  setAttachments(prev => {
                      const updated = [...prev, newAttachment]
                      if (onUpdate) onUpdate({ attachments: updated })
                      return updated
                  })
              }
              reader.readAsDataURL(file)
          })
          
          setIsAttachmentMenuOpen(false)
      }
  }

  const handleMakeCover = (attachmentId: string) => {
      const newAttachments = attachments.map(a => ({
          ...a,
          isCover: a.id === attachmentId ? !a.isCover : false
      }))
      
      const hasCover = newAttachments.some(a => a.isCover)
      
      setAttachments(newAttachments)
      if (onUpdate) {
          onUpdate({ 
              attachments: newAttachments,
              cover: hasCover // Update the card's cover status
          })
      }
  }

  const handleCreateLabel = () => {
      if (!createLabelTitle.trim()) return

      const newLabel: Label = {
          id: Date.now().toString(),
          text: createLabelTitle.toUpperCase(),
          color: createLabelColor
      }
      
      const newAvailableLabels = [...availableLabels, newLabel]
      onUpdateAvailableLabels(newAvailableLabels)
      
      setLabels([...labels, newLabel])
      setCreateLabelTitle("")
      setLabelMenuMode('list')
  }

  const handleEditLabel = (label: Label) => {
      setEditingLabelId(label.id)
      setCreateLabelTitle(label.text)
      setCreateLabelColor(label.color)
      setLabelMenuMode('edit')
  }

  const handleUpdateLabel = () => {
      if (!editingLabelId || !createLabelTitle.trim()) return

      const updatedLabel = {
          id: editingLabelId,
          text: createLabelTitle.toUpperCase(),
          color: createLabelColor
      }

      const newAvailableLabels = availableLabels.map(l => l.id === editingLabelId ? updatedLabel : l)
      onUpdateAvailableLabels(newAvailableLabels)

      setLabels(labels.map(l => l.id === editingLabelId ? updatedLabel : l))
      setLabelMenuMode('list')
      setEditingLabelId(null)
      setCreateLabelTitle("")
  }

  const handleDeleteLabel = () => {
      if (!editingLabelId) return

      const newAvailableLabels = availableLabels.filter(l => l.id !== editingLabelId)
      onUpdateAvailableLabels(newAvailableLabels)

      setLabels(labels.filter(l => l.id !== editingLabelId))
      setLabelMenuMode('list')
      setEditingLabelId(null)
      setCreateLabelTitle("")
  }

  if (!isOpen) return null

  const handleSaveDescription = () => {
    setIsEditingDescription(false)
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return

    const newActivity: Activity = {
      id: Date.now().toString(),
      user: 'Eu',
      userInitials: 'EV',
      action: commentText,
      date: new Date().toLocaleString('pt-BR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
      type: 'comment'
    }

    setActivities([newActivity, ...activities])
    setCommentText("")
  }

  const handleTitleSubmit = () => {
      setIsEditingTitle(false)
      if (editedTitle !== title && onUpdate) {
          onUpdate({ title: editedTitle })
      }
  }

  const handleDeleteAttachment = (attachmentId: string) => {
      const newAttachments = attachments.filter(a => a.id !== attachmentId)
      setAttachments(newAttachments)
      if (onUpdate) onUpdate({ attachments: newAttachments })
  }

  const toggleLabel = (label: Label) => {
    const exists = labels.find(l => l.id === label.id)
    let newLabels
    if (exists) {
        newLabels = labels.filter(l => l.id !== label.id)
    } else {
        newLabels = [...labels, label]
    }
    setLabels(newLabels)
    if (onUpdate) onUpdate({ labels: newLabels })
  }

  const filteredLabels = availableLabels.filter(l => 
    l.text.toLowerCase().includes(labelSearch.toLowerCase())
  )

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="fixed inset-0 z-0" 
        onClick={onClose} 
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-5xl rounded-xl bg-[#1e1e1e] shadow-2xl ring-1 ring-white/10 flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Cover Image */}
        {hasCover && (
          <div className="h-60 w-full bg-[url('https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center relative group">
             <div className="absolute top-4 right-14 flex gap-2">
                <Button variant="secondary" size="sm" className="bg-black/50 hover:bg-black/70 text-white border-none gap-2">
                    <ImageIcon className="size-4" />
                    Capa
                </Button>
             </div>
          </div>
        )}

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
            {/* Main Content (Left) */}
            <div ref={modalContentRef} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex items-start gap-3 mb-4">
                        <div 
                            onClick={handleToggleCompleted}
                            className={`mt-1 cursor-pointer transition-colors ${isCompleted ? 'text-green-500' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {isCompleted ? <CheckCircle2 className="size-5" /> : <Circle className="size-5" />}
                        </div>
                        <div className="flex-1">
                            {isEditingTitle ? (
                                <Input
                                    autoFocus
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={handleTitleSubmit}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleTitleSubmit()
                                    }}
                                    className="text-xl font-bold text-foreground mb-1 leading-tight h-auto py-1 px-2 bg-[#222] border-blue-500 rounded focus-visible:ring-0"
                                />
                            ) : (
                                <h2 
                                    onClick={() => setIsEditingTitle(true)}
                                    className="text-xl font-bold text-foreground mb-1 leading-tight cursor-text hover:bg-white/5 rounded px-2 -ml-2 py-1 transition-colors border border-transparent hover:border-white/10"
                                >
                                    {editedTitle || "Sem título"}
                                </h2>
                            )}
                            <p className="text-sm text-muted-foreground">
                                na lista <span className="underline cursor-pointer hover:text-primary">APROVADOS</span>
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions Bar */}
                    <div className="pl-10 flex flex-wrap gap-2 mb-6">
                        <Button variant="outline" size="sm" className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground gap-2 h-8">
                            <Plus className="size-4" /> Adicionar
                        </Button>
                         <Button variant="outline" size="sm" className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground gap-2 h-8">
                            <CheckSquare className="size-4" /> Checklist
                        </Button>
                        <Button 
                            ref={dateButtonRef}
                            onClick={() => {
                                if (dateButtonRef.current) {
                                    const rect = dateButtonRef.current.getBoundingClientRect()
                                    const popoverHeight = 500
                                    const windowHeight = window.innerHeight
                                    
                                    let top = rect.bottom + 8
                                    if (top + popoverHeight > windowHeight) {
                                        top = rect.top - popoverHeight - 8
                                    }
                                    setPopoverPosition({ top, left: rect.left })
                                }
                                setIsDateMenuOpen(true)
                            }}
                            variant="outline" 
                            size="sm" 
                            className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground gap-2 h-8"
                        >
                            <Clock className="size-4" /> Datas
                        </Button>
                        <Button variant="outline" size="sm" className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground gap-2 h-8">
                            <Users className="size-4" /> Membros
                        </Button>
                        <Button 
                            ref={attachmentButtonRef}
                            onClick={handleOpenAttachmentMenu}
                            variant="outline" 
                            size="sm" 
                            className="bg-transparent border-white/10 hover:bg-white/5 text-muted-foreground gap-2 h-8"
                        >
                            <Paperclip className="size-4" /> Anexo
                        </Button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Metadata Grid */}
                    <div className="pl-10 grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Etiquetas</h3>
                            <div className="flex flex-wrap gap-2 items-center relative">
                                {labels.map(label => (
                                    <div 
                                        key={label.id}
                                        className="flex items-center gap-1 px-3 py-1 rounded text-xs font-bold hover:opacity-90 cursor-pointer text-white shadow-sm"
                                        style={{ backgroundColor: label.color }}
                                    >
                                        {label.text}
                                    </div>
                                ))}
                                
                                {/* Add Label Button & Popover */}
                                <div className="relative">
                                    <button 
                                        ref={labelButtonRef}
                                        onClick={handleOpenLabelMenu}
                                        className="size-8 rounded bg-white/10 hover:bg-white/20 flex items-center justify-center text-muted-foreground transition-colors"
                                    >
                                        <Plus className="size-4" />
                                    </button>

                                    {/* Label Popover Menu - Rendered in Portal */}
                                    {isLabelMenuOpen && createPortal(
                                        <div 
                                            ref={labelMenuRef}
                                            style={{ 
                                                top: popoverPosition.top, 
                                                left: popoverPosition.left,
                                                position: 'fixed'
                                            }}
                                            className="w-[304px] bg-[#282e33] rounded-lg shadow-2xl border border-white/10 z-[10000] flex flex-col animate-in fade-in zoom-in-95 duration-200"
                                        >
                                            {/* Header - Draggable Area */}
                                            <div 
                                                onMouseDown={handleMouseDown}
                                                className="flex items-center justify-between p-3 border-b border-white/10 relative cursor-move select-none"
                                            >
                                                {labelMenuMode !== 'list' ? (
                                                    <button 
                                                        onClick={() => {
                                                            setLabelMenuMode('list')
                                                            setCreateLabelTitle("")
                                                            setEditingLabelId(null)
                                                        }}
                                                        className="size-8 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                                                    >
                                                        <ChevronLeft className="size-4" />
                                                    </button>
                                                ) : (
                                                    <div className="size-8" />
                                                )}
                                                
                                                <span className="text-sm font-semibold text-gray-300">
                                                    {labelMenuMode === 'create' ? 'Criar Etiqueta' : 
                                                     labelMenuMode === 'edit' ? 'Editar etiqueta' : 'Etiquetas'}
                                                </span>
                                                
                                                <button 
                                                    onClick={() => setIsLabelMenuOpen(false)}
                                                    className="size-8 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="p-3">
                                                {labelMenuMode === 'list' ? (
                                                    <>
                                                        <Input 
                                                            autoFocus
                                                            value={labelSearch}
                                                            onChange={(e) => setLabelSearch(e.target.value)}
                                                            placeholder="Buscar etiquetas..." 
                                                            className="bg-[#22272b] border-white/20 text-white placeholder:text-gray-500 h-9 mb-4 focus-visible:ring-offset-0 focus-visible:ring-[#85b8ff]"
                                                        />

                                                        <div className="mb-2">
                                                            <h4 className="text-xs font-semibold text-gray-400 mb-2">Etiquetas</h4>
                                                            <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                                                {filteredLabels.map(label => {
                                                                    const isSelected = labels.some(l => l.id === label.id)
                                                                    return (
                                                                        <div key={label.id} className="flex items-center gap-2 group">
                                                                            <div 
                                                                                onClick={() => toggleLabel(label)}
                                                                                className="flex-1 flex items-center gap-2 cursor-pointer"
                                                                            >
                                                                                {/* Checkbox */}
                                                                                <div className={`size-4 border-2 rounded-sm flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                                                                    {isSelected && <div className="bg-white size-2 rounded-[1px]" />}
                                                                                </div>
                                                                                
                                                                                {/* Label Bar */}
                                                                                <div 
                                                                                    className="flex-1 h-8 rounded px-3 flex items-center text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                                                                                    style={{ backgroundColor: label.color }}
                                                                                >
                                                                                    {label.text}
                                                                                </div>
                                                                            </div>
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    handleEditLabel(label)
                                                                                }}
                                                                                className="size-8 flex items-center justify-center text-gray-400 hover:bg-white/10 rounded"
                                                                            >
                                                                                <Pencil className="size-4" />
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                        
                                                        <Button 
                                                            onClick={() => {
                                                                setLabelMenuMode('create')
                                                                setCreateLabelTitle("")
                                                                setCreateLabelColor(LABEL_COLORS[12])
                                                            }}
                                                            className="w-full bg-white/10 hover:bg-white/20 text-gray-300 border-none justify-start h-9 mt-2 text-sm font-normal"
                                                        >
                                                            Criar uma nova etiqueta
                                                        </Button>
                                                        <Button className="w-full bg-transparent hover:bg-white/10 text-gray-300 border-none justify-start h-9 mt-1 text-sm font-normal">
                                                            Mostrar mais etiquetas
                                                        </Button>
                                                        
                                                        <div className="mt-3 pt-3 border-t border-white/10">
                                                            <Button className="w-full bg-white/5 hover:bg-white/10 text-gray-400 border-none h-auto py-2 px-3 text-xs font-normal whitespace-normal text-left">
                                                                Habilitar o modo compatível para usuários com daltonismo
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="space-y-4">
                                                        {/* Preview */}
                                                        <div className="flex justify-center bg-[#1c2025] rounded p-8">
                                                            <div 
                                                                className="h-8 rounded px-4 flex items-center text-sm font-bold text-white shadow-sm min-w-[120px] justify-center"
                                                                style={{ backgroundColor: createLabelColor }}
                                                            >
                                                                {createLabelTitle || "Exemplo"}
                                                            </div>
                                                        </div>

                                                        {/* Title Input */}
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 mb-1.5">Título</h4>
                                                            <Input 
                                                                autoFocus
                                                                value={createLabelTitle}
                                                                onChange={(e) => setCreateLabelTitle(e.target.value)}
                                                                className="bg-[#22272b] border-white/20 text-white placeholder:text-gray-500 h-9 focus-visible:ring-offset-0 focus-visible:ring-[#85b8ff]"
                                                            />
                                                        </div>

                                                        {/* Color Grid */}
                                                        <div>
                                                            <h4 className="text-xs font-semibold text-gray-400 mb-1.5">Selecionar uma cor</h4>
                                                            <div className="grid grid-cols-5 gap-2">
                                                                {LABEL_COLORS.map(color => (
                                                                    <div 
                                                                        key={color}
                                                                        onClick={() => setCreateLabelColor(color)}
                                                                        className={`h-8 rounded cursor-pointer transition-transform hover:scale-105 ${createLabelColor === color ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#282e33]' : ''}`}
                                                                        style={{ backgroundColor: color }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="pt-2 border-t border-white/10 space-y-2">
                                                             <Button 
                                                                variant="secondary" 
                                                                className="w-full bg-white/5 hover:bg-white/10 text-white border-none h-9"
                                                                onClick={() => setCreateLabelColor('#282e33')}
                                                            >
                                                                <X className="size-4 mr-2" /> Remover cor
                                                            </Button>
                                                            
                                                            {labelMenuMode === 'create' ? (
                                                                <Button 
                                                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
                                                                    onClick={handleCreateLabel}
                                                                    disabled={!createLabelTitle}
                                                                >
                                                                    Criar
                                                                </Button>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <Button 
                                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-9"
                                                                        onClick={handleUpdateLabel}
                                                                        disabled={!createLabelTitle}
                                                                    >
                                                                        Salvar
                                                                    </Button>
                                                                    <Button 
                                                                        className="bg-red-500/80 hover:bg-red-600 text-white h-9 px-3"
                                                                        onClick={handleDeleteLabel}
                                                                    >
                                                                        <Trash2 className="size-4" /> Excluir
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>,
                                        document.body
                                    )}

                                    {/* Attachment Popover Menu - Rendered in Portal */}
                                    {isAttachmentMenuOpen && createPortal(
                                        <div 
                                            ref={attachmentMenuRef}
                                            style={{ 
                                                top: popoverPosition.top, 
                                                left: popoverPosition.left,
                                                position: 'fixed'
                                            }}
                                            className="w-[304px] bg-[#282e33] rounded-lg shadow-2xl border border-white/10 z-[10000] flex flex-col animate-in fade-in zoom-in-95 duration-200"
                                        >
                                            {/* Header */}
                                            <div className="flex items-center justify-between p-3 border-b border-white/10">
                                                <div className="size-8" />
                                                <span className="text-sm font-semibold text-gray-300">Anexar</span>
                                                <button 
                                                    onClick={() => setIsAttachmentMenuOpen(false)}
                                                    className="size-8 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                                                >
                                                    <X className="size-4" />
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="p-3 space-y-4">
                                                <div>
                                                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Anexe um arquivo de seu computador</h4>
                                                    <p className="text-xs text-gray-500 mb-3">
                                                        Você também pode arrastar e soltar arquivos para carregá-los.
                                                    </p>
                                                    <Button 
                                                        onClick={handleFileSelect}
                                                        variant="secondary" 
                                                        className="w-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white"
                                                    >
                                                        Escolher um arquivo
                                                    </Button>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-gray-400 mb-1 block">Search or paste a link <span className="text-red-500">*</span></label>
                                                    <Input 
                                                        placeholder="Find recent links or paste a new link..." 
                                                        className="bg-[#22272b] border-white/20 text-white placeholder:text-gray-500 h-9"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold text-gray-400 mb-1 block">Display text (optional)</label>
                                                    <Input 
                                                        placeholder="Text to display" 
                                                        className="bg-[#22272b] border-white/20 text-white placeholder:text-gray-500 h-9"
                                                    />
                                                </div>

                                                <p className="text-xs text-gray-500">Give this link a title or description</p>

                                                <div>
                                                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Recently Viewed</h4>
                                                    <div className="space-y-1">
                                                        {[
                                                            { title: 'SEQ STORIES - 5 Documentários p...', subtitle: '01 VENDE-C • Viewed 6 seconds ago' },
                                                            { title: 'CAPA DE TREINAMENTO CORP - IF...', subtitle: '01 VENDE-C • Viewed 4 minutes ago' },
                                                            { title: 'CAPA TREINAMENTO CORP - DSV', subtitle: '01 VENDE-C • Viewed 10 minutes ago' },
                                                            { title: 'GROWTH', subtitle: 'Time Foda • Viewed 1 hour ago' },
                                                            { title: '03 PERFORMAN-C', subtitle: 'Time Foda • Viewed 1 hour ago' }
                                                        ].map((item, i) => (
                                                            <div key={i} className="flex items-start gap-3 p-2 rounded hover:bg-white/5 cursor-pointer">
                                                                <Monitor className="size-4 text-blue-400 mt-1 shrink-0" />
                                                                <div className="overflow-hidden">
                                                                    <div className="text-sm text-gray-300 truncate font-medium">{item.title}</div>
                                                                    <div className="text-xs text-gray-500 truncate">{item.subtitle}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex justify-end gap-2 pt-2">
                                                     <Button 
                                                        variant="ghost" 
                                                        onClick={() => setIsAttachmentMenuOpen(false)}
                                                        className="text-gray-400 hover:text-white hover:bg-white/10"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                                        Insert
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>,
                                        document.body
                                    )}
                                </div>
                            </div>
                        </div>
                        {dueDate && (
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Data Entrega</h3>
                                <div className="flex items-center gap-2">
                                    <div 
                                        ref={dateDisplayRef}
                                        onClick={() => {
                                            if (dateDisplayRef.current) {
                                                const rect = dateDisplayRef.current.getBoundingClientRect()
                                                setPopoverPosition({ top: rect.bottom + 8, left: rect.left })
                                            }
                                            setIsDateMenuOpen(true)
                                        }}
                                        className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded text-sm text-foreground hover:bg-white/10 cursor-pointer transition-colors"
                                    >
                                        <div onClick={(e) => {
                                            e.stopPropagation()
                                            setIsCompleted(!isCompleted)
                                        }} className={`size-4 border rounded-sm flex items-center justify-center mr-1 ${isCompleted ? 'bg-green-500 border-green-500 text-black' : 'border-muted-foreground hover:border-foreground'}`}>
                                            {isCompleted && <CheckSquare className="size-3" />}
                                        </div>
                                        
                                        <span>
                                            {dueDate.getDate()} de {dueDate.toLocaleString('pt-BR', { month: 'short' })}
                                            {dueDate.getHours() !== 0 && `, ${dueDate.getHours().toString().padStart(2, '0')}:${dueDate.getMinutes().toString().padStart(2, '0')}`}
                                        </span>
                                        
                                        {isCompleted ? (
                                            <span className="bg-[#bbf7d0] text-green-900 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 uppercase">Concluído</span>
                                        ) : (
                                            new Date() > dueDate ? (
                                                <span className="bg-red-900/50 text-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 uppercase">Atrasado</span>
                                            ) : (
                                                (dueDate.getTime() - new Date().getTime()) < 48 * 60 * 60 * 1000 && ( // 48h warning
                                                    <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 uppercase">Entregar em breve</span>
                                                )
                                            )
                                        )}
                                        <ChevronRight className="size-3 text-muted-foreground ml-1" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="pl-10 mb-8">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-foreground font-semibold">
                                <AlignLeft className="size-5 text-muted-foreground" />
                                <h3>Descrição</h3>
                            </div>
                            {!isEditingDescription && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setIsEditingDescription(true)}
                                    className="h-7 text-muted-foreground hover:text-foreground"
                                >
                                    Editar
                                </Button>
                            )}
                        </div>
                        <div className="pl-0">
                            {isEditingDescription ? (
                                <div className="space-y-2">
                                    <textarea
                                        ref={descriptionRef}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full min-h-[120px] bg-[#222] border border-white/10 rounded-md p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                        placeholder="Adicione uma descrição mais detalhada..."
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveDescription}>Salvar</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>Cancelar</Button>
                                    </div>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setIsEditingDescription(true)}
                                    className="bg-white/5 border border-white/10 rounded-md p-4 text-sm text-foreground/90 min-h-[80px] cursor-pointer hover:bg-white/10 transition-colors"
                                >
                                    {description ? (
                                        <p className="whitespace-pre-wrap">{description}</p>
                                    ) : (
                                        <p className="text-muted-foreground text-xs">Adicione uma descrição mais detalhada...</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attachments */}
                    {attachments.length > 0 && (
                        <div className="pl-10 mb-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-foreground font-semibold">
                                    <Paperclip className="size-5 text-muted-foreground" />
                                    <h3>Anexos</h3>
                                </div>
                                 <Button variant="ghost" size="sm" className="h-7 text-muted-foreground hover:text-foreground">Adicionar</Button>
                            </div>
                            
                            <DndContext 
                                sensors={sensors} 
                                collisionDetection={closestCenter} 
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={attachments.map(a => a.id)} 
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {attachments.map(att => (
                                            <SortableAttachmentItem 
                                                key={att.id} 
                                                attachment={att} 
                                                onDelete={() => handleDeleteAttachment(att.id)} 
                                                onMakeCover={() => handleMakeCover(att.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Right) - Activity & Comments */}
            <div className="w-full md:w-96 bg-[#161616] border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161616] pr-12">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <AlignLeft className="size-4" /> Comentários e atividade
                    </h3>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">Ocultar detalhes</Button>
                </div>
                
                {/* Activity Feed */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                    {/* Comment Input */}
                    <div className="flex gap-3 mb-6">
                        <div className="size-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">EV</div>
                        <div className="flex-1">
                            <div className="bg-[#222] border border-white/10 rounded-md p-2 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                                <input 
                                    type="text" 
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    placeholder="Escreva um comentário..." 
                                    className="w-full bg-transparent border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                                />
                                <div className="flex justify-between items-center mt-2">
                                   <div className="flex gap-1">
                                        {/* Simple mock toolbar */}
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><Paperclip className="size-3"/></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground"><ImageIcon className="size-3"/></Button>
                                   </div>
                                   <Button 
                                    size="sm" 
                                    onClick={handleAddComment}
                                    disabled={!commentText.trim()}
                                    className="h-7 text-xs"
                                   >
                                    Salvar
                                   </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activities List */}
                    {activities.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                             <div className={`size-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs ${
                                 activity.userInitials === 'EV' ? 'bg-primary' : 
                                 activity.userInitials === 'SM' ? 'bg-blue-500' : 'bg-cyan-600'
                             }`}>
                                {activity.userInitials}
                             </div>
                             <div>
                                <div className="text-sm text-foreground">
                                    <span className="font-bold">{activity.user}</span> 
                                    {activity.type === 'comment' ? (
                                        <div className="bg-[#222] border border-white/10 rounded p-2 mt-1 text-sm">
                                            {activity.action}
                                        </div>
                                    ) : (
                                        <span> {activity.action}</span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground hover:underline cursor-pointer block mt-1">{activity.date}</span>
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        {/* Date Picker Popover */}
        {isDateMenuOpen && createPortal(
            <div 
                ref={dateMenuRef}
                style={{ 
                    top: popoverPosition.top, 
                    left: popoverPosition.left,
                    position: 'fixed'
                }}
                className="w-[304px] bg-[#282e33] rounded-lg shadow-2xl border border-white/10 z-[10000] flex flex-col animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                    <div className="size-8" />
                    <span className="text-sm font-semibold text-gray-300">Datas</span>
                    <button 
                        onClick={() => setIsDateMenuOpen(false)}
                        className="size-8 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-3">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <button 
                            onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}
                            className="size-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                        >
                            <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-sm font-medium text-white capitalize">
                            {currentCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <button 
                            onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}
                            className="size-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                        >
                            <ChevronRight className="size-4" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                        {['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'].map(d => (
                            <div key={d} className="text-[10px] text-gray-500 font-medium uppercase">{d}</div>
                        ))}
                        {(() => {
                            const days = []
                            const firstDay = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 1).getDay()
                            const daysInMonth = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate()
                            const prevMonthDays = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), 0).getDate()
                            
                            // Prev Month Padding
                            for (let i = 0; i < firstDay; i++) {
                                days.push(<div key={`prev-${i}`} className="h-8 flex items-center justify-center text-sm text-gray-600">{prevMonthDays - firstDay + i + 1}</div>)
                            }
                            
                            // Current Month
                            for (let i = 1; i <= daysInMonth; i++) {
                                const date = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), i)
                                const isSelected = dueDate && date.toDateString() === dueDate.toDateString()
                                const isToday = new Date().toDateString() === date.toDateString()
                                
                                days.push(
                                    <div 
                                        key={i} 
                                        onClick={() => {
                                            setDueDate(date)
                                            if (onUpdate) onUpdate({ dueDate: date.toISOString() })
                                        }}
                                        className={`h-8 flex items-center justify-center text-sm rounded cursor-pointer hover:bg-white/10 
                                            ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-300'}
                                            ${isToday && !isSelected ? 'text-blue-400 font-bold' : ''}
                                        `}
                                    >
                                        {i}
                                    </div>
                                )
                            }
                            
                            return days
                        })()}
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-400 mb-1 block">Data de início</label>
                            <div className="flex gap-2">
                                <div className="size-4 border border-white/20 rounded mt-2.5"></div>
                                <Input 
                                    placeholder="D/M/AAAA" 
                                    className="bg-[#22272b] border-white/20 text-white placeholder:text-gray-500 h-9"
                                    disabled
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-400 mb-1 block">Data de entrega</label>
                            <div className="flex gap-2">
                                <div className="mt-2.5">
                                    <CheckSquare className="size-4 text-blue-500" />
                                </div>
                                <Input 
                                    value={dueDateStr}
                                    onChange={(e) => setDueDateStr(e.target.value)}
                                    onBlur={handleDueDateBlur}
                                    placeholder="DD/MM/AAAA"
                                    className="bg-[#22272b] border-white/20 text-white h-9 flex-1"
                                />
                                <Input 
                                    defaultValue="12:00"
                                    className="bg-[#22272b] border-white/20 text-white h-9 w-20"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-xs font-semibold text-gray-400 mb-1 block">Definir lembrete</label>
                            <select className="w-full bg-[#22272b] border border-white/20 text-white h-9 rounded px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option>1 dia antes</option>
                                <option>2 dias antes</option>
                                <option>1 hora antes</option>
                            </select>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">
                            Lembretes serão enviados a todos os membros e seguidores deste cartão.
                        </p>
                        
                        <div className="pt-2 space-y-2">
                            <Button 
                                onClick={() => setIsDateMenuOpen(false)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
                            >
                                Salvar
                            </Button>
                            <Button 
                                onClick={() => {
                                    setDueDate(null)
                                    setIsDateMenuOpen(false)
                                    if (onUpdate) onUpdate({ dueDate: null })
                                }}
                                variant="secondary" 
                                className="w-full bg-white/5 hover:bg-white/10 text-white border-none h-9"
                            >
                                Remover
                            </Button>
                        </div>
                    </div>
                </div>
            </div>,
            document.body
        )}
      </div>
    </div>,
    document.body
  )
}