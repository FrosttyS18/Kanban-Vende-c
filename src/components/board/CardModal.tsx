import { createPortal } from "react-dom"
import { useState, useRef, useEffect } from "react"
import { X, Plus, Paperclip, Users, CheckSquare, Clock, CreditCard, Tag, AlignLeft, Send, MoreHorizontal, Image as ImageIcon, Pencil, ChevronLeft, Trash2, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  isOpen: boolean
  onClose: () => void
  hasCover?: boolean
  title?: string
}

export type Label = {
  id: string
  text: string
  color: string
}

export type Activity = {
  id: string
  user: string
  userInitials: string
  action: string
  date: string
  type: 'comment' | 'move'
}

export type Attachment = {
  id: string
  name: string
  url: string
  date: string
  isCover: boolean
}

const GLOBAL_AVAILABLE_LABELS: Label[] = [
    { id: 'l1', text: 'DOUGLAS', color: '#5ba4cf' },
    { id: 'l2', text: 'WESLEY', color: '#7bc86c' },
    { id: 'l3', text: '⚠ ⚠ ⚠ ⚠ ⚠ ⚠', color: '#519839' },
    { id: 'l4', text: 'NÃO URGENTE', color: '#4bce97' },
    { id: 'l5', text: 'WESLEY', color: '#d29034' },
    { id: 'l6', text: 'ADRIANO', color: '#f5dd29' },
    { id: 'l7', text: 'TIKTOK/SHORTS/WATCH', color: '#ffa515' },
    { id: 'l8', text: 'FALTA COPY', color: '#b04632' },
    { id: 'l9', text: 'URGENTE MESMO', color: '#89609e' },
    { id: 'l10', text: '⚠ ⚠ AJUSTAR ⚠ ⚠', color: '#cd5a91' },
]

const LABEL_COLORS = [
    '#164b35', '#533f04', '#592e08', '#5c1209', '#422446',
    '#216e4e', '#7f5f01', '#a54800', '#ae2e24', '#5e4db2',
    '#4bce97', '#f5dd29', '#ffa515', '#f87168', '#9f8fef',
    '#227d9b', '#0c66e4', '#6cc3e0', '#6e5dc6', '#505f79',
    '#60c6d2', '#6cd8fa', '#94c748', '#e774bb', '#8590a2'
]

export const INITIAL_LABELS: Label[] = [
  { id: 'l2', text: 'WESLEY', color: '#7bc86c' }
]

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: '1',
    user: 'Social Media',
    userInitials: 'SM',
    action: 'moveu este cartão de EM APROVAÇÃO para APROVADOS',
    date: '18 de dez. de 2025, 14:41',
    type: 'move'
  },
  {
    id: '2',
    user: 'Design OFFI-C',
    userInitials: 'DO',
    action: 'moveu este cartão de NA FILA para EM APROVAÇÃO',
    date: '16 de dez. de 2025, 15:09',
    type: 'move'
  }
]

export default function CardModal({ 
    isOpen, 
    onClose, 
    hasCover, 
    title,
    initialDescription = "",
    initialLabels = [],
    initialActivities = [],
    initialDate,
    initialAttachments = []
}: Props & {
    initialDescription?: string
    initialLabels?: Label[]
    initialActivities?: Activity[]
    initialDate?: string
    initialAttachments?: Attachment[]
}) {
  const [description, setDescription] = useState(initialDescription)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(title || "")
  const [commentText, setCommentText] = useState("")
  const [labels, setLabels] = useState<Label[]>(initialLabels)
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [date, setDate] = useState(initialDate)
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments)

  
  // Label Menu state
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false)
  const [labelMenuMode, setLabelMenuMode] = useState<'list' | 'create' | 'edit'>('list')
  const [labelSearch, setLabelSearch] = useState("")
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 })
  const [availableLabels, setAvailableLabels] = useState<Label[]>(GLOBAL_AVAILABLE_LABELS)

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
          // Here we would handle the file upload
          console.log("File selected:", e.target.files[0].name)
          setIsAttachmentMenuOpen(false)
      }
  }

  const handleCreateLabel = () => {
      if (!createLabelTitle.trim()) return

      const newLabel: Label = {
          id: Date.now().toString(),
          text: createLabelTitle.toUpperCase(),
          color: createLabelColor
      }
      
      GLOBAL_AVAILABLE_LABELS.push(newLabel)
      setAvailableLabels([...GLOBAL_AVAILABLE_LABELS])
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

      const index = GLOBAL_AVAILABLE_LABELS.findIndex(l => l.id === editingLabelId)
      if (index !== -1) {
          GLOBAL_AVAILABLE_LABELS[index] = updatedLabel
      }

      setAvailableLabels([...GLOBAL_AVAILABLE_LABELS])
      setLabels(labels.map(l => l.id === editingLabelId ? updatedLabel : l))
      setLabelMenuMode('list')
      setEditingLabelId(null)
      setCreateLabelTitle("")
  }

  const handleDeleteLabel = () => {
      if (!editingLabelId) return

      const index = GLOBAL_AVAILABLE_LABELS.findIndex(l => l.id === editingLabelId)
      if (index !== -1) {
          GLOBAL_AVAILABLE_LABELS.splice(index, 1)
      }

      setAvailableLabels([...GLOBAL_AVAILABLE_LABELS])
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

  const toggleLabel = (label: Label) => {
    const exists = labels.find(l => l.id === label.id)
    if (exists) {
        setLabels(labels.filter(l => l.id !== label.id))
    } else {
        setLabels([...labels, label])
    }
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
                    <div className="flex items-start gap-4 mb-4">
                        <CreditCard className="size-6 text-muted-foreground mt-1" />
                        <div className="flex-1">
                            {isEditingTitle ? (
                                <Input
                                    autoFocus
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') setIsEditingTitle(false)
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
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Data Entrega</h3>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded text-sm text-foreground hover:bg-white/10 cursor-pointer transition-colors">
                                    <Clock className="size-4 text-muted-foreground" />
                                    <span>6 de jan., 13:07</span>
                                    <span className="bg-[#bbf7d0] text-green-900 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">Concluído</span>
                                </div>
                            </div>
                        </div>
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
                            <div className="space-y-3">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex items-start gap-3 group">
                                        <div className="h-20 w-28 bg-white/5 rounded overflow-hidden flex-shrink-0 border border-white/10">
                                             <img src={att.url} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-foreground truncate">{att.name}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">Adicionado há {att.date} • {att.isCover && <span className="text-foreground/80">Capa</span>}</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <button className="text-xs text-foreground/80 hover:underline">Comentar</button>
                                                <button className="text-xs text-foreground/80 hover:underline">Excluir</button>
                                                <button className="text-xs text-foreground/80 hover:underline">Editar</button>
                                            </div>
                                        </div>
                                        <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-muted-foreground">
                                            <MoreHorizontal className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar (Right) - Activity & Comments */}
            <div className="w-full md:w-96 bg-[#161616] border-l border-white/10 flex flex-col">
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#161616]">
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
      </div>
    </div>,
    document.body
  )
}