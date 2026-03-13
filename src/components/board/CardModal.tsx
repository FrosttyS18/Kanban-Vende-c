import { type MouseEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { type Activity, type CardData, type Checklist, type ChecklistItem, type Label, type LinkAttachment, type Member } from '@/types'
import { createId } from '@/services/boardService'
import ChecklistCreateMenu from '@/components/board/card-modal/ChecklistCreateMenu'
import ChecklistBlock from '@/components/board/card-modal/ChecklistBlock'
import DescriptionEditor from '@/components/board/card-modal/DescriptionEditor'
import LabelsPopover from '@/components/board/card-modal/LabelsPopover'
import DatePopover from '@/components/board/card-modal/DatePopover'

type CardModalProps = {
  isOpen: boolean
  onClose: () => void
  card: CardData
  listTitle: string
  listOptions: Array<{ id: string; title: string }>
  availableLabels: Label[]
  onUpdateAvailableLabels: (labels: Label[]) => void
  members: Member[]
  currentMemberId: string
  onMoveToList: (listId: string) => void
  onUpdate: (updates: Partial<CardData>) => void
  onDelete?: () => void
  onArchive?: () => void
}

type LinkDraft = {
  id?: string
  title: string
  url: string
  type: 'drive' | 'figma' | 'other'
}

const LABEL_COLOR_OPTIONS = ['#facc15', '#b700ff', '#006fff', '#00e5ff', '#ff0068', '#16a34a', '#ea580c']
const DRIVE_LOGO_URL = 'http://localhost:3845/assets/6a473b13ee231afeb36bf8951149d483553910a0.png'
const CHECKLIST_ICON_URL = 'http://localhost:3845/assets/0c04a6a95bb30c5af177f0d2a6601b30dd08486c.svg'

function formatDueDateWithTime(value?: string): string {
  if (!value) {
    return 'Sem data'
  }

  const date = new Date(value)
  const datePart = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${datePart} ${timePart}`
}

function getDueStatus(dueDate?: string, isCompleted?: boolean): { label: string; className: string } | null {
  if (!dueDate) {
    return null
  }

  if (isCompleted) {
    return { label: 'Conclu\u00eddo', className: 'bg-[#00ff73] text-[#242528]' }
  }

  const now = new Date()
  const target = new Date(dueDate)
  const diffHours = (target.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (diffHours < 0) {
    return { label: 'Atrasado', className: 'bg-[#820002] text-[#da7e77]' }
  }

  if (diffHours <= 24) {
    return { label: 'Entregar em breve', className: 'bg-[#ffff00] text-black' }
  }

  return null
}

function relativeTimeFromNow(value: string): string {
  const now = Date.now()
  const target = new Date(value).getTime()
  const diffMinutes = Math.max(0, Math.floor((now - target) / (1000 * 60)))

  if (diffMinutes < 1) {
    return 'agora'
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hora${diffHours > 1 ? 's' : ''}`
  }

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} dia${diffDays > 1 ? 's' : ''}`
}

function formatAttachmentMeta(createdAt: string): string {
  const absolute = new Date(createdAt).toLocaleString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  return `Adicionado h\u00e1 ${relativeTimeFromNow(createdAt)}; ${absolute}`
}

function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function getLabelTextClass(color: string): string {
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

function detectLinkType(url: string): LinkDraft['type'] {
  const value = url.toLowerCase()
  if (value.includes('figma.com')) {
    return 'figma'
  }
  if (value.includes('drive.google.com')) {
    return 'drive'
  }
  return 'other'
}

function LinkTypeIcon({ type }: { type: LinkDraft['type'] }) {
  if (type === 'drive') {
    return <img src={DRIVE_LOGO_URL} alt="" className="h-8 w-8 rounded-[5px] object-cover" />
  }

  if (type === 'figma') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#303134]" aria-hidden="true">
        <svg viewBox="0 0 16 24" className="h-[22px] w-[15px]">
          <path d="M5.3 24a5.3 5.3 0 1 1 0-10.6h2.6V18.7A5.3 5.3 0 0 1 5.3 24Z" fill="#0ACF83" />
          <path d="M0 18.7a5.3 5.3 0 0 1 5.3-5.3h2.6V24H5.3A5.3 5.3 0 0 1 0 18.7Z" fill="#A259FF" />
          <path d="M0 8a5.3 5.3 0 0 1 5.3-5.3h2.6v10.7H5.3A5.3 5.3 0 0 1 0 8Z" fill="#F24E1E" />
          <path d="M8 2.7h2.7a5.3 5.3 0 1 1 0 10.7H8V2.7Z" fill="#FF7262" />
          <path d="M13.3 8A5.3 5.3 0 1 1 8 2.7v10.7a5.3 5.3 0 0 1 5.3-5.4Z" fill="#1ABCFE" />
        </svg>
      </span>
    )
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[5px] bg-[#303134]" aria-hidden="true">
      <svg viewBox="0 0 15.1674 15.1674" className="size-[14px]">
        <path
          d="M13.4993 6.40195L13.6058 6.29617C14.2323 5.6678 14.5841 4.81668 14.5841 3.92937C14.5841 3.04206 14.2323 2.19094 13.6058 1.56256C12.9777 0.935521 12.1265 0.58334 11.239 0.58334C10.3515 0.58334 9.50028 0.935521 8.8722 1.56256L1.56256 8.8722C0.935521 9.50028 0.58334 10.3515 0.58334 11.239C0.58334 12.1265 0.935521 12.9777 1.56256 13.6058C2.19094 14.2323 3.04206 14.5841 3.92937 14.5841C4.81668 14.5841 5.6678 14.2323 6.29617 13.6058L11.2359 8.6622C11.4905 8.40651 11.6636 8.0812 11.7336 7.72725C11.8036 7.3733 11.7673 7.00656 11.6293 6.67322C11.4912 6.33987 11.2576 6.05485 10.9578 5.85405C10.6581 5.65325 10.3056 5.54566 9.94477 5.54483C9.4605 5.54512 8.99614 5.73758 8.65364 6.07995L3.47592 11.2569"
          stroke="#d1d1d1"
          strokeWidth="1.16668"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function CompletionIcon({ completed }: { completed: boolean }) {
  if (completed) {
    return (
      <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
        <circle cx="8" cy="8" r="8" fill="#20FF8F" />
        <path d="M4.5 8.2L7.1 10.7L11.5 5.8" fill="none" stroke="#0E1A13" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7.25" fill="none" stroke="#D1D1D1" strokeWidth="1.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 13.15 13.15" className="size-[13px]" aria-hidden="true">
      <path
        d="M6.575 7.975L1.675 12.875C1.49167 13.0583 1.25833 13.15 0.975 13.15C0.691667 13.15 0.458333 13.0583 0.275 12.875C0.0916663 12.6917 0 12.4583 0 12.175C0 11.8917 0.0916663 11.6583 0.275 11.475L5.175 6.575L0.275 1.675C0.0916663 1.49167 0 1.25833 0 0.975C0 0.691667 0.0916663 0.458333 0.275 0.275C0.458333 0.0916663 0.691667 0 0.975 0C1.25833 0 1.49167 0.0916663 1.675 0.275L6.575 5.175L11.475 0.275C11.6583 0.0916663 11.8917 0 12.175 0C12.4583 0 12.6917 0.0916663 12.875 0.275C13.0583 0.458333 13.15 0.691667 13.15 0.975C13.15 1.25833 13.0583 1.49167 12.875 1.675L7.975 6.575L12.875 11.475C13.0583 11.6583 13.15 11.8917 13.15 12.175C13.15 12.4583 13.0583 12.6917 12.875 12.875C12.6917 13.0583 12.4583 13.15 12.175 13.15C11.8917 13.15 11.6583 13.0583 11.475 12.875L6.575 7.975Z"
        fill="#d1d1d1"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 13.1009 12.1651" className="size-[13px]" aria-hidden="true">
      <path
        d="M12.1651 6.95151H7.48624V11.2962C7.48624 11.5267 7.38765 11.7477 7.21216 11.9106C7.03666 12.0736 6.79864 12.1651 6.55046 12.1651C6.30227 12.1651 6.06426 12.0736 5.88876 11.9106C5.71327 11.7477 5.61468 11.5267 5.61468 11.2962V6.95151H0.93578C0.687596 6.95151 0.449577 6.85996 0.274084 6.697C0.098591 6.53404 0 6.31303 0 6.08257C0 5.85211 0.098591 5.63109 0.274084 5.46814C0.449577 5.30518 0.687596 5.21363 0.93578 5.21363H5.61468V0.868938C5.61468 0.638482 5.71327 0.417463 5.88876 0.254506C6.06426 0.0915484 6.30227 0 6.55046 0C6.79864 0 7.03666 0.0915484 7.21216 0.254506C7.38765 0.417463 7.48624 0.638482 7.48624 0.868938V5.21363H12.1651C12.4133 5.21363 12.6513 5.30518 12.8268 5.46814C13.0023 5.63109 13.1009 5.85211 13.1009 6.08257C13.1009 6.31303 13.0023 6.53404 12.8268 6.697C12.6513 6.85996 12.4133 6.95151 12.1651 6.95151Z"
        fill="#d1d1d1"
      />
    </svg>
  )
}

function ChecklistIcon() {
  return (
    <img src={CHECKLIST_ICON_URL} alt="" className="size-[14px]" />
  )
}

function MembersIcon() {
  return (
    <svg viewBox="0 0 14 14" className="size-[14px]" aria-hidden="true">
      <path d="M7 0C7.92826 0 8.8185 0.368749 9.47487 1.02513C10.1313 1.6815 10.5 2.57174 10.5 3.5C10.5 4.42826 10.1313 5.3185 9.47487 5.97487C8.8185 6.63125 7.92826 7 7 7C6.07174 7 5.1815 6.63125 4.52513 5.97487C3.86875 5.3185 3.5 4.42826 3.5 3.5C3.5 2.57174 3.86875 1.6815 4.52513 1.02513C5.1815 0.368749 6.07174 0 7 0ZM7 8.75C10.8675 8.75 14 10.3162 14 12.25V14H0V12.25C0 10.3162 3.1325 8.75 7 8.75Z" fill="#d1d1d1" />
    </svg>
  )
}

function AttachmentIcon() {
  return (
    <svg viewBox="0 0 15.1674 15.1674" className="size-[14px]" aria-hidden="true">
      <path d="M13.4993 6.40195L13.6058 6.29617C14.2323 5.6678 14.5841 4.81668 14.5841 3.92937C14.5841 3.04206 14.2323 2.19094 13.6058 1.56256C12.9777 0.935521 12.1265 0.58334 11.239 0.58334C10.3515 0.58334 9.50028 0.935521 8.8722 1.56256L1.56256 8.8722C0.935521 9.50028 0.58334 10.3515 0.58334 11.239C0.58334 12.1265 0.935521 12.9777 1.56256 13.6058C2.19094 14.2323 3.04206 14.5841 3.92937 14.5841C4.81668 14.5841 5.6678 14.2323 6.29617 13.6058L11.2359 8.6622C11.4905 8.40651 11.6636 8.0812 11.7336 7.72725C11.8036 7.3733 11.7673 7.00656 11.6293 6.67322C11.4912 6.33987 11.2576 6.05485 10.9578 5.85405C10.6581 5.65325 10.3056 5.54566 9.94477 5.54483C9.4605 5.54512 8.99614 5.73758 8.65364 6.07995L3.47592 11.2569" stroke="#d1d1d1" strokeWidth="1.16668" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 6.00008 10.9086" className="h-[10px] w-[6px] -rotate-90" aria-hidden="true">
      <path d="M6.00008 10.017L5.10772 10.9086L0.24723 6.04975C0.168881 5.97189 0.106703 5.87931 0.0642732 5.77733C0.0218434 5.67535 0 5.56599 0 5.45554C0 5.34508 0.0218434 5.23572 0.0642732 5.13374C0.106703 5.03177 0.168881 4.93918 0.24723 4.86133L5.10772 0L5.99924 0.891524L1.43733 5.45428L6.00008 10.017Z" fill="#d1d1d1" />
    </svg>
  )
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 29 30" className="size-6" aria-hidden="true">
      <rect width="29" height="30" rx="6" fill="#303134" />
      <circle cx="6.5" cy="15" r="2" fill="#d9d9d9" />
      <circle cx="14.5" cy="15" r="2" fill="#d9d9d9" />
      <circle cx="22.5" cy="15" r="2" fill="#d9d9d9" />
    </svg>
  )
}

function ToolButton({
  label,
  icon,
  width,
  onClick,
  active
}: {
  label: string
  icon: ReactNode
  width: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[33px] items-center justify-center gap-1 rounded-[6px] border px-2 text-[13.101px] font-semibold transition-colors ${width} ${
        active ? 'border-[#ff0068] bg-[#303134] text-white' : 'border-[#d1d1d1] bg-transparent text-[#d1d1d1]'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

export default function CardModal({
  isOpen,
  onClose,
  card,
  listTitle,
  listOptions,
  availableLabels,
  onUpdateAvailableLabels,
  members,
  currentMemberId,
  onMoveToList,
  onUpdate
}: CardModalProps) {
  const [cardState, setCardState] = useState<CardData>(card)
  const [isListMenuOpen, setIsListMenuOpen] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showMembersMenu, setShowMembersMenu] = useState(false)
  const [showChecklistCreateMenu, setShowChecklistCreateMenu] = useState(false)
  const [showDatePopover, setShowDatePopover] = useState(false)
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showLabelsPopover, setShowLabelsPopover] = useState(false)
  const [openedLinkMenuId, setOpenedLinkMenuId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState(card.description)
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false)
  const [labelSearchValue, setLabelSearchValue] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLOR_OPTIONS[0])
  const [dueDateInput, setDueDateInput] = useState(() => {
    if (!card.dueDate) {
      return ''
    }
    const date = new Date(card.dueDate)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  })
  const [dueTimeInput, setDueTimeInput] = useState(() => {
    if (!card.dueDate) {
      return ''
    }
    const date = new Date(card.dueDate)
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    return `${hh}:${min}`
  })
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ title: '', url: '', type: 'other' })
  const [linkError, setLinkError] = useState('')
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [checklistDraftItems, setChecklistDraftItems] = useState<Record<string, string>>({})
  const [checklistAnchorEl, setChecklistAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [labelsAnchorEl, setLabelsAnchorEl] = useState<HTMLButtonElement | null>(null)
  const [dateAnchorEl, setDateAnchorEl] = useState<HTMLButtonElement | null>(null)

  const actor = useMemo(() => members.find((member) => member.id === currentMemberId) ?? members[0], [members, currentMemberId])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const appendActivity = (message: string, type: Activity['type'] = 'system') => {
    if (!actor) {
      return
    }

    const activity: Activity = {
      id: createId('activity'),
      type,
      actorId: actor.id,
      actorName: actor.name,
      actorInitials: actor.initials,
      message,
      createdAt: new Date().toISOString()
    }

    const next = [activity, ...cardState.activities]
    setCardState((prev) => ({ ...prev, activities: next }))
    onUpdate({ activities: next })
  }

  const updateCard = (updates: Partial<CardData>, activityMessage?: string) => {
    const nextUpdatedAt = new Date().toISOString()
    setCardState((prev) => ({ ...prev, ...updates, updatedAt: nextUpdatedAt }))
    onUpdate({ ...updates, updatedAt: nextUpdatedAt })

    if (activityMessage) {
      appendActivity(activityMessage)
    }
  }

  const startDescriptionEditing = () => {
    setDescriptionDraft(cardState.description)
    setIsDescriptionEditing(true)
  }

  const saveDescription = () => {
    if (descriptionDraft !== cardState.description) {
      updateCard({ description: descriptionDraft }, 'atualizou o briefing da demanda')
    }
    setIsDescriptionEditing(false)
  }

  const cancelDescription = () => {
    setDescriptionDraft(cardState.description)
    setIsDescriptionEditing(false)
  }

  const openLabelsPopover = (anchor: HTMLButtonElement) => {
    setLabelsAnchorEl(anchor)
    setShowLabelsPopover(true)
    setShowAddMenu(false)
  }

  const handleListChange = (listId: string) => {
    if (listId === cardState.listId) {
      setIsListMenuOpen(false)
      return
    }

    onMoveToList(listId)
    const listName = listOptions.find((option) => option.id === listId)?.title ?? 'Lista'
    updateCard({ listId }, `moveu o cart\u00e3o para ${listName}`)
    setIsListMenuOpen(false)
  }

  const toggleLabel = (label: Label) => {
    const exists = cardState.labels.some((item) => item.id === label.id)
    const nextLabels = exists ? cardState.labels.filter((item) => item.id !== label.id) : [...cardState.labels, label]
    updateCard({ labels: nextLabels })
  }

  const createLabel = () => {
    const name = newLabelName.trim()
    if (!name) {
      return
    }

    const label: Label = {
      id: createId('label'),
      text: name,
      color: newLabelColor
    }

    onUpdateAvailableLabels([...availableLabels, label])
    updateCard({ labels: [...cardState.labels, label] }, `criou a etiqueta ${name}`)
    setNewLabelName('')
    setNewLabelColor(LABEL_COLOR_OPTIONS[0])
    setLabelSearchValue('')
    setShowLabelsPopover(false)
  }

  const toggleMember = (memberId: string) => {
    const exists = cardState.memberIds.includes(memberId)
    const next = exists ? cardState.memberIds.filter((id) => id !== memberId) : [...cardState.memberIds, memberId]
    const memberName = members.find((member) => member.id === memberId)?.name ?? 'Membro'
    updateCard({ memberIds: next }, exists ? `removeu ${memberName}` : `adicionou ${memberName}`)
  }

  const syncDueInputs = (dueDate?: string) => {
    if (!dueDate) {
      setDueDateInput('')
      setDueTimeInput('')
      return
    }

    const date = new Date(dueDate)
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')

    setDueDateInput(`${yyyy}-${mm}-${dd}`)
    setDueTimeInput(`${hh}:${min}`)
  }

  const openDatePopover = (anchor: HTMLButtonElement) => {
    syncDueInputs(cardState.dueDate)
    setDateAnchorEl(anchor)
    setShowDatePopover(true)
    setShowAddMenu(false)
  }

  const closeDatePopover = () => {
    setShowDatePopover(false)
    setDateAnchorEl(null)
  }

  const saveDueDate = () => {
    if (!dueDateInput) {
      updateCard({ dueDate: undefined }, 'removeu data de entrega')
      closeDatePopover()
      return
    }

    const value = dueTimeInput ? `${dueDateInput}T${dueTimeInput}:00` : `${dueDateInput}T00:00:00`
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return
    }

    updateCard({ dueDate: parsed.toISOString() }, `definiu prazo para ${formatDueDateWithTime(parsed.toISOString())}`)
    closeDatePopover()
  }

  const removeDueDate = () => {
    if (!cardState.dueDate && !dueDateInput) {
      closeDatePopover()
      return
    }
    updateCard({ dueDate: undefined }, 'removeu data de entrega')
    closeDatePopover()
  }

  const addChecklist = () => {
    const title = newChecklistTitle.trim()
    if (!title) {
      return
    }

    const checklist = { id: createId('checklist'), title, items: [] }
    updateCard({ checklists: [...cardState.checklists, checklist] }, `criou checklist ${title}`)
    setNewChecklistTitle('')
    setShowChecklistCreateMenu(false)
    setChecklistAnchorEl(null)
  }

  const updateChecklist = (checklistId: string, updates: Partial<Checklist>) => {
    const next = cardState.checklists.map((item) => (item.id === checklistId ? { ...item, ...updates } : item))
    updateCard({ checklists: next })
  }

  const removeChecklist = (checklistId: string) => {
    const next = cardState.checklists.filter((item) => item.id !== checklistId)
    updateCard({ checklists: next }, 'removeu checklist')
    setChecklistDraftItems((prev) => {
      if (!(checklistId in prev)) {
        return prev
      }
      const nextDraft = { ...prev }
      delete nextDraft[checklistId]
      return nextDraft
    })
  }

  const addChecklistItem = (checklistId: string) => {
    const content = (checklistDraftItems[checklistId] ?? '').trim()
    if (!content) {
      return
    }

    const target = cardState.checklists.find((item) => item.id === checklistId)
    if (!target) {
      return
    }

    const item: ChecklistItem = { id: createId('checkitem'), content, isDone: false }
    updateChecklist(checklistId, { items: [...target.items, item] })
    setChecklistDraftItems((prev) => ({ ...prev, [checklistId]: '' }))
  }

  const toggleChecklistItem = (checklistId: string, itemId: string) => {
    const checklist = cardState.checklists.find((item) => item.id === checklistId)
    if (!checklist) {
      return
    }
    const nextItems = checklist.items.map((item) => (item.id === itemId ? { ...item, isDone: !item.isDone } : item))
    updateChecklist(checklistId, { items: nextItems })
  }

  const updateChecklistItem = (checklistId: string, itemId: string, content: string) => {
    const checklist = cardState.checklists.find((item) => item.id === checklistId)
    if (!checklist) {
      return
    }

    const nextItems = checklist.items.map((item) => (item.id === itemId ? { ...item, content } : item))
    updateChecklist(checklistId, { items: nextItems })
  }

  const removeChecklistItem = (checklistId: string, itemId: string) => {
    const checklist = cardState.checklists.find((item) => item.id === checklistId)
    if (!checklist) {
      return
    }

    const target = checklist.items.find((item) => item.id === itemId)
    const nextItems = checklist.items.filter((item) => item.id !== itemId)
    updateChecklist(checklistId, { items: nextItems })
    if (target) {
      appendActivity(`removeu item do checklist: ${target.content}`)
    }
  }

  const submitLink = () => {
    const title = linkDraft.title.trim()
    const url = linkDraft.url.trim()

    if (!title || !url) {
      setLinkError('Preencha t\u00edtulo e URL.')
      return
    }

    if (!validateUrl(url)) {
      setLinkError('URL inv\u00e1lida.')
      return
    }

    if (linkDraft.id) {
      const next = cardState.links.map((link) => (link.id === linkDraft.id ? { ...link, title, url, type: linkDraft.type } : link))
      updateCard({ links: next }, `editou link ${title}`)
    } else {
      const nextLink: LinkAttachment = { id: createId('link'), title, url, type: linkDraft.type, createdAt: new Date().toISOString() }
      updateCard({ links: [...cardState.links, nextLink] }, `adicionou link ${title}`)
    }

    setLinkDraft({ title: '', url: '', type: 'other' })
    setLinkError('')
    setShowLinkForm(false)
  }

  const editLink = (link: LinkAttachment) => {
    setLinkDraft({ id: link.id, title: link.title, url: link.url, type: link.type || detectLinkType(link.url) })
    setShowLinkForm(true)
    setOpenedLinkMenuId(null)
  }

  const removeLink = (id: string) => {
    const target = cardState.links.find((link) => link.id === id)
    const next = cardState.links.filter((link) => link.id !== id)
    updateCard({ links: next }, target ? `removeu link ${target.title}` : 'removeu link')
    setOpenedLinkMenuId(null)
  }

  const saveComment = () => {
    const text = commentText.trim()
    if (!text || !actor) {
      return
    }

    const activity: Activity = {
      id: createId('activity'),
      type: 'comment',
      actorId: actor.id,
      actorName: actor.name,
      actorInitials: actor.initials,
      message: text,
      createdAt: new Date().toISOString()
    }

    const next = [activity, ...cardState.activities]
    setCardState((prev) => ({ ...prev, activities: next }))
    onUpdate({ activities: next })
    setCommentText('')
  }

  const dueStatus = getDueStatus(cardState.dueDate, cardState.isCompleted)
  const currentList = listOptions.find((item) => item.id === cardState.listId)?.title ?? listTitle
  const timeline = cardState.activities.length
    ? cardState.activities
    : actor
      ? [{ id: 'default-system', type: 'system' as const, actorId: actor.id, actorName: actor.name, actorInitials: actor.initials, message: `adicionou este cart\u00e3o a ${currentList}.`, createdAt: cardState.createdAt }]
      : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5" role="dialog" aria-modal="true" aria-label={'Detalhes do cart\u00e3o'}>
      <div className="h-[657px] w-[1082px] max-h-[calc(100vh-40px)] max-w-[calc(100vw-40px)] overflow-hidden rounded-[22px] border border-[#585353] bg-[#242528]">
        <header className="flex h-[59px] items-center justify-between border-b border-[#585353] bg-[#242528] px-[26px]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsListMenuOpen((prev) => !prev)}
              className="flex h-[29px] w-[102px] items-center justify-between rounded-[6px] bg-[#4b4d51] px-3 text-[13px] font-semibold text-[#d1d1d1]"
            >
              <span className="truncate uppercase">{currentList}</span>
              <ChevronIcon />
            </button>

            {isListMenuOpen && (
              <div className="absolute left-0 top-[34px] z-20 min-w-[170px] rounded-[8px] border border-[#3f3f3f] bg-[#303134] p-1 shadow-xl">
                {listOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleListChange(option.id)}
                    className={`block w-full rounded-[6px] px-3 py-2 text-left text-sm ${
                      option.id === cardState.listId ? 'bg-[#ff0068] text-white' : 'text-[#d1d1d1] hover:bg-[#3a3b3f]'
                    }`}
                  >
                    {option.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" onClick={onClose} className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-[#d1d1d1] hover:bg-white/10" aria-label="Fechar">
            <CloseIcon />
          </button>
        </header>

        <div className="grid h-[calc(100%-59px)] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_460px]">
          <section className="custom-scrollbar overflow-y-auto px-6 py-6 lg:px-[57px] lg:py-[23px]">
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => updateCard({ isCompleted: !cardState.isCompleted }, cardState.isCompleted ? 'marcou como pendente' : 'marcou como conclu\u00eddo')}
                className="mt-1 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={cardState.isCompleted ? 'Marcar como pendente' : 'Marcar como conclu\u00eddo'}
              >
                <CompletionIcon completed={cardState.isCompleted} />
              </button>
              <h2 className="text-[24px] font-semibold leading-tight text-white">{cardState.title}</h2>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <ToolButton label="Adicionar" icon={<PlusIcon />} width="w-[102px]" onClick={() => setShowAddMenu((prev) => !prev)} active={showAddMenu} />
              <ToolButton
                label="Checklist"
                icon={<ChecklistIcon />}
                width="w-[99px]"
                onClick={(event) => {
                  setChecklistAnchorEl(event.currentTarget)
                  setShowChecklistCreateMenu((prev) => !prev)
                }}
                active={showChecklistCreateMenu}
              />
              <ToolButton label="Membros" icon={<MembersIcon />} width="w-[99px]" onClick={() => setShowMembersMenu((prev) => !prev)} active={showMembersMenu} />
              <ToolButton label="Anexos" icon={<AttachmentIcon />} width="w-[79px]" onClick={() => setShowLinkForm((prev) => !prev)} active={showLinkForm} />
            </div>

            <ChecklistCreateMenu
              isOpen={showChecklistCreateMenu}
              anchorEl={checklistAnchorEl}
              value={newChecklistTitle}
              onChange={setNewChecklistTitle}
              onCreate={addChecklist}
              onClose={() => {
                setShowChecklistCreateMenu(false)
                setChecklistAnchorEl(null)
                setNewChecklistTitle('')
              }}
            />

            <LabelsPopover
              isOpen={showLabelsPopover}
              anchorEl={labelsAnchorEl}
              availableLabels={availableLabels}
              selectedLabelIds={cardState.labels.map((label) => label.id)}
              searchValue={labelSearchValue}
              newLabelName={newLabelName}
              newLabelColor={newLabelColor}
              colorOptions={LABEL_COLOR_OPTIONS}
              onSearchChange={setLabelSearchValue}
              onNewLabelNameChange={setNewLabelName}
              onNewLabelColorChange={setNewLabelColor}
              onToggleLabel={toggleLabel}
              onCreateLabel={createLabel}
              onClose={() => setShowLabelsPopover(false)}
            />

            {showAddMenu && (
              <div className="mt-3 grid gap-2 rounded-[8px] border border-[#3f3f3f] bg-[#303134] p-3 lg:grid-cols-3">
                <button
                  type="button"
                  onClick={(event) => openLabelsPopover(event.currentTarget)}
                  className="rounded-[6px] border border-[#525252] px-3 py-2 text-left text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#3a3b3f]"
                >
                  Etiquetas
                </button>
                <button
                  type="button"
                  onClick={(event) => openDatePopover(event.currentTarget)}
                  className="rounded-[6px] border border-[#525252] px-3 py-2 text-left text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#3a3b3f]"
                >
                  Data de entrega
                </button>
                <button
                  type="button"
                  onClick={() => updateCard({ isCompleted: !cardState.isCompleted }, cardState.isCompleted ? 'marcou como pendente' : 'marcou como conclu\u00eddo')}
                  className="rounded-[6px] border border-[#525252] px-3 py-2 text-left text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#3a3b3f]"
                >
                  {cardState.isCompleted ? 'Marcar pendente' : 'Marcar conclu\u00eddo'}
                </button>
              </div>
            )}

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div>
                <h3 className="text-[13.101px] font-semibold text-[#d1d1d1]">Etiquetas</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {cardState.labels.map((label) => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label)}
                      className={`rounded-[5px] px-3 py-1.5 text-[13px] font-semibold ${getLabelTextClass(label.color)}`}
                      style={{ backgroundColor: label.color }}
                    >
                      {label.text}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={(event) => openLabelsPopover(event.currentTarget)}
                    className="flex h-[26px] w-[26px] items-center justify-center rounded-[5px] bg-[#303134] text-[#d1d1d1]"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[13.101px] font-semibold text-[#d1d1d1]">Data de Entrega</h3>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" onClick={(event) => openDatePopover(event.currentTarget)} className="flex h-[33px] w-[33px] items-center justify-center rounded-[6px] bg-[#303134] text-[#d1d1d1]">
                    <PlusIcon />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => openDatePopover(event.currentTarget)}
                    className="flex h-[33px] w-[245px] items-center gap-2 rounded-[6px] bg-[#303134] px-3 text-left"
                  >
                    <span className="text-[13.101px] font-semibold text-[#d1d1d1]">{formatDueDateWithTime(cardState.dueDate)}</span>
                    {dueStatus && <span className={`rounded-[2px] px-1 py-0.5 text-[10px] font-semibold ${dueStatus.className}`}>{dueStatus.label}</span>}
                    <span className="ml-auto">
                      <ChevronIcon />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <DatePopover
              isOpen={showDatePopover}
              anchorEl={dateAnchorEl}
              dueDate={dueDateInput}
              dueTime={dueTimeInput}
              onDateChange={setDueDateInput}
              onTimeChange={setDueTimeInput}
              onSave={saveDueDate}
              onRemove={removeDueDate}
              onClose={closeDatePopover}
            />

            {showMembersMenu && (
              <div className="mt-3 rounded-[8px] border border-[#3f3f3f] bg-[#303134] p-3">
                <div className="grid gap-2">
                  {members.map((member) => {
                    const selected = cardState.memberIds.includes(member.id)
                    return (
                      <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-[6px] border border-[#3f3f3f] px-2 py-1.5">
                        <input type="checkbox" checked={selected} onChange={() => toggleMember(member.id)} className="h-4 w-4 accent-[#ff0068]" />
                        <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold text-white" style={{ backgroundColor: member.color }}>
                          {member.initials}
                        </span>
                        <span className="text-sm text-[#d1d1d1]">{member.name}</span>
                        <span className="ml-auto text-xs text-[#8b8b8b]">{member.email}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-[13.101px] font-semibold text-[#d1d1d1]">{'Descri\u00e7\u00e3o'}</h3>
              <DescriptionEditor
                value={cardState.description}
                draftValue={descriptionDraft}
                isEditing={isDescriptionEditing}
                onStartEdit={startDescriptionEditing}
                onDraftChange={setDescriptionDraft}
                onSave={saveDescription}
                onCancel={cancelDescription}
              />
            </div>

            {cardState.checklists.length > 0 && (
              <div className="mt-4 space-y-3">
                {cardState.checklists.map((checklist) => (
                  <ChecklistBlock
                    key={checklist.id}
                    checklist={checklist}
                    draftItem={checklistDraftItems[checklist.id] ?? ''}
                    onDraftChange={(value) => setChecklistDraftItems((prev) => ({ ...prev, [checklist.id]: value }))}
                    onAddItem={() => addChecklistItem(checklist.id)}
                    onCancelDraft={() => setChecklistDraftItems((prev) => ({ ...prev, [checklist.id]: '' }))}
                    onToggleItem={(itemId) => toggleChecklistItem(checklist.id, itemId)}
                    onUpdateItem={(itemId, content) => updateChecklistItem(checklist.id, itemId, content)}
                    onRemoveItem={(itemId) => removeChecklistItem(checklist.id, itemId)}
                    onRemoveChecklist={() => removeChecklist(checklist.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <h3 className="text-[13.101px] font-semibold text-[#d1d1d1]">Anexos</h3>
              <button
                type="button"
                onClick={() => {
                  setLinkDraft({ title: '', url: '', type: 'other' })
                  setLinkError('')
                  setShowLinkForm((prev) => !prev)
                }}
                className="flex h-[33px] w-[102px] items-center justify-center gap-1 rounded-[6px] bg-[#303134] text-[13.101px] font-semibold text-[#d1d1d1]"
              >
                <PlusIcon />
                Adicionar
              </button>
            </div>

            {showLinkForm && (
              <div className="mt-3 rounded-[8px] border border-[#3f3f3f] bg-[#303134] p-3">
                <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
                  <input
                    value={linkDraft.title}
                    onChange={(event) => setLinkDraft((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder={'T\u00edtulo do link'}
                    className="h-9 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
                  />
                  <select
                    value={linkDraft.type}
                    onChange={(event) => setLinkDraft((prev) => ({ ...prev, type: event.target.value as LinkDraft['type'] }))}
                    className="h-9 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] outline-none focus:border-[#ff0068]"
                  >
                    <option value="drive">Google Drive</option>
                    <option value="figma">Figma</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <input
                  value={linkDraft.url}
                  onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))}
                  placeholder="https://..."
                  className="mt-2 h-9 w-full rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
                />
                {linkError && <p className="mt-1 text-xs text-[#da7e77]">{linkError}</p>}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={submitLink} className="h-8 rounded-[6px] bg-[#ff0068] px-3 text-xs font-semibold text-white">
                    {linkDraft.id ? 'Salvar edi\u00e7\u00e3o' : 'Salvar link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLinkForm(false)
                      setLinkDraft({ title: '', url: '', type: 'other' })
                      setLinkError('')
                    }}
                    className="h-8 rounded-[6px] border border-[#525252] px-3 text-xs font-semibold text-[#d1d1d1]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <h4 className="mt-2 text-[13.101px] font-semibold text-[#d1d1d1]">Arquivos</h4>
            <div className="mt-2 space-y-2 pb-2">
              {cardState.links.map((link) => (
                <article key={link.id} className="relative flex min-h-[49px] items-center rounded-[5px] bg-[#303134] px-3 py-2">
                  <LinkTypeIcon type={link.type || detectLinkType(link.url)} />
                  <div className="ml-3 min-w-0 flex-1">
                    <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-[16px] font-semibold leading-tight text-[#d1d1d1] hover:text-[#ff0068]">
                      {link.title}
                    </a>
                    <p className="truncate text-[12px] font-semibold text-[#d1d1d1]">{formatAttachmentMeta(link.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => setOpenedLinkMenuId((prev) => (prev === link.id ? null : link.id))} className="ml-2 rounded-[6px]">
                    <DotsIcon />
                  </button>

                  {openedLinkMenuId === link.id && (
                    <div className="absolute right-3 top-[42px] z-10 w-[120px] rounded-[8px] border border-[#3f3f3f] bg-[#303134] p-1 shadow-xl">
                      <button type="button" onClick={() => editLink(link)} className="block w-full rounded-[6px] px-3 py-2 text-left text-sm text-[#d1d1d1] hover:bg-[#3a3b3f]">
                        Editar
                      </button>
                      <button type="button" onClick={() => removeLink(link.id)} className="block w-full rounded-[6px] px-3 py-2 text-left text-sm text-[#da7e77] hover:bg-[#820002]/30">
                        Excluir
                      </button>
                    </div>
                  )}
                </article>
              ))}

              {cardState.links.length === 0 && <p className="text-sm text-[#8b8b8b]">Nenhum arquivo linkado.</p>}
            </div>
          </section>

          <aside className="custom-scrollbar overflow-y-auto border-t border-[#2f3033] bg-[#18191a] px-4 py-5 lg:border-l lg:border-t-0 lg:px-4 lg:py-[21px]">
            <h3 className="text-[16px] font-bold text-[#d1d1d1]">{'Coment\u00e1rios e atividades'}</h3>
            <div className="mt-2 rounded-[7px] bg-[#303134] px-2">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    saveComment()
                  }
                }}
                placeholder={'Escrever um coment\u00e1rio...'}
                className="h-[33px] w-full bg-transparent text-[12px] text-[#d1d1d1] placeholder:text-[#5b5858] outline-none"
              />
            </div>

            <div className="mt-4 space-y-4">
              {timeline.map((activity) => (
                <article key={activity.id} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-[31px] w-[31px] items-center justify-center rounded-full bg-[#ff0068] text-[9px] font-semibold text-white">
                    {activity.actorInitials}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[16px] leading-tight text-[#d1d1d1]">
                      <span className="font-bold">{activity.actorName}</span> {activity.message}
                    </p>
                    <p className="mt-1 text-[10px] text-[#d1d1d1]">
                      {'adicionado h\u00e1 '}<span className="text-[#ff0068]">{relativeTimeFromNow(activity.createdAt)}</span>{' atr\u00e1s.'}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

