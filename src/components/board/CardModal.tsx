import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, CheckSquare, Link2, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type Activity, type CardData, type Checklist, type ChecklistItem, type Label, type LinkAttachment, type Member } from '@/types'
import { createId } from '@/services/boardService'

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

const LABEL_COLOR_OPTIONS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#db2777']

function formatDateTime(dateValue?: string): string {
  if (!dateValue) {
    return 'Sem data'
  }

  const date = new Date(dateValue)
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getDateStatus(dueDate?: string, isCompleted?: boolean): { text: string; className: string } {
  if (!dueDate) {
    return { text: 'Sem data', className: 'bg-zinc-700 text-zinc-300' }
  }

  if (isCompleted) {
    return { text: 'Concluido', className: 'bg-green-500/20 text-green-300' }
  }

  const target = new Date(dueDate)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(todayStart.getDate() + 1)

  if (target < todayStart) {
    return { text: 'Atrasado', className: 'bg-red-500/20 text-red-300' }
  }

  if (target >= todayStart && target < tomorrowStart) {
    return { text: 'Vence hoje', className: 'bg-amber-500/20 text-amber-300' }
  }

  return { text: 'No prazo', className: 'bg-zinc-700 text-zinc-300' }
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
  onUpdate,
  onDelete,
  onArchive
}: CardModalProps) {
  const [cardState, setCardState] = useState<CardData>(card)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [commentText, setCommentText] = useState('')

  const [showLabelsPanel, setShowLabelsPanel] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showDatePanel, setShowDatePanel] = useState(false)
  const [showChecklistPanel, setShowChecklistPanel] = useState(false)
  const [showLinksPanel, setShowLinksPanel] = useState(false)

  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLOR_OPTIONS[0])

  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [checklistDraftItems, setChecklistDraftItems] = useState<Record<string, string>>({})

  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ title: '', url: '', type: 'other' })
  const [linkError, setLinkError] = useState('')

  const [dueDateInput, setDueDateInput] = useState('')
  const [dueTimeInput, setDueTimeInput] = useState('')

  const actor = useMemo(() => members.find((member) => member.id === currentMemberId) ?? members[0], [members, currentMemberId])

  const selectedMemberMap = useMemo(() => {
    const map = new Map<string, Member>()
    members.forEach((member) => {
      map.set(member.id, member)
    })
    return map
  }, [members])

  useEffect(() => {
    setCardState(card)
  }, [card])

  useEffect(() => {
    if (!cardState.dueDate) {
      setDueDateInput('')
      setDueTimeInput('')
      return
    }

    const due = new Date(cardState.dueDate)
    const yyyy = due.getFullYear()
    const mm = String(due.getMonth() + 1).padStart(2, '0')
    const dd = String(due.getDate()).padStart(2, '0')
    const hh = String(due.getHours()).padStart(2, '0')
    const min = String(due.getMinutes()).padStart(2, '0')

    setDueDateInput(`${yyyy}-${mm}-${dd}`)
    setDueTimeInput(`${hh}:${min}`)
  }, [cardState.dueDate])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const appendActivity = (message: string, type: Activity['type'] = 'system', explicitText?: string) => {
    if (!actor) {
      return
    }

    const activity: Activity = {
      id: createId('act'),
      type,
      actorId: actor.id,
      actorName: actor.name,
      actorInitials: actor.initials,
      message: explicitText ?? message,
      createdAt: new Date().toISOString()
    }

    const nextActivities = [activity, ...cardState.activities]
    setCardState((prev) => ({ ...prev, activities: nextActivities }))
    onUpdate({ activities: nextActivities })
  }

  const updateCard = (updates: Partial<CardData>, activityMessage?: string) => {
    const nextState = {
      ...cardState,
      ...updates,
      updatedAt: new Date().toISOString()
    }

    setCardState(nextState)
    onUpdate({ ...updates, updatedAt: nextState.updatedAt })

    if (activityMessage) {
      appendActivity(activityMessage)
    }
  }

  const handleTitleSave = (nextTitle: string) => {
    const clean = nextTitle.trim()
    if (!clean || clean === cardState.title) {
      setIsEditingTitle(false)
      return
    }

    updateCard({ title: clean }, `renomeou o cartao para "${clean}"`)
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = (nextDescription: string) => {
    if (nextDescription === cardState.description) {
      setIsEditingDescription(false)
      return
    }

    updateCard({ description: nextDescription }, 'atualizou o briefing da demanda')
    setIsEditingDescription(false)
  }

  const handleListChange = (nextListId: string) => {
    if (nextListId === cardState.listId) {
      return
    }

    const listName = listOptions.find((list) => list.id === nextListId)?.title ?? 'Lista'
    onMoveToList(nextListId)
    updateCard({ listId: nextListId }, `moveu o cartao para a lista ${listName}`)
  }

  const toggleLabel = (label: Label) => {
    const exists = cardState.labels.some((item) => item.id === label.id)
    const nextLabels = exists ? cardState.labels.filter((item) => item.id !== label.id) : [...cardState.labels, label]
    updateCard({ labels: nextLabels })
  }

  const createNewLabel = () => {
    const name = newLabelName.trim()
    if (!name) {
      return
    }

    const label: Label = {
      id: createId('label'),
      text: name,
      color: newLabelColor
    }

    const nextAvailable = [...availableLabels, label]
    onUpdateAvailableLabels(nextAvailable)
    updateCard({ labels: [...cardState.labels, label] }, `criou a etiqueta ${name}`)

    setNewLabelName('')
    setNewLabelColor(LABEL_COLOR_OPTIONS[0])
  }

  const toggleMember = (memberId: string) => {
    const exists = cardState.memberIds.includes(memberId)
    const nextMembers = exists ? cardState.memberIds.filter((id) => id !== memberId) : [...cardState.memberIds, memberId]

    const memberName = selectedMemberMap.get(memberId)?.name ?? 'Membro'
    updateCard({ memberIds: nextMembers }, exists ? `removeu ${memberName} do cartao` : `adicionou ${memberName} ao cartao`)
  }

  const handleDueDateSave = () => {
    if (!dueDateInput) {
      updateCard({ dueDate: undefined }, 'removeu a data de entrega')
      return
    }

    const value = dueTimeInput ? `${dueDateInput}T${dueTimeInput}:00` : `${dueDateInput}T00:00:00`
    const parsed = new Date(value)

    if (Number.isNaN(parsed.getTime())) {
      return
    }

    updateCard({ dueDate: parsed.toISOString() }, `definiu prazo para ${formatDateTime(parsed.toISOString())}`)
  }

  const addChecklist = () => {
    const title = newChecklistTitle.trim()
    if (!title) {
      return
    }

    const nextChecklist: Checklist = {
      id: createId('checklist'),
      title,
      items: []
    }

    updateCard({ checklists: [...cardState.checklists, nextChecklist] }, `criou checklist ${title}`)
    setNewChecklistTitle('')
  }

  const updateChecklist = (checklistId: string, updates: Partial<Checklist>) => {
    const nextChecklists = cardState.checklists.map((checklist) => (checklist.id === checklistId ? { ...checklist, ...updates } : checklist))
    updateCard({ checklists: nextChecklists })
  }

  const removeChecklist = (checklistId: string) => {
    const nextChecklists = cardState.checklists.filter((checklist) => checklist.id !== checklistId)
    updateCard({ checklists: nextChecklists }, 'removeu um checklist')
  }

  const addChecklistItem = (checklistId: string) => {
    const content = (checklistDraftItems[checklistId] ?? '').trim()
    if (!content) {
      return
    }

    const checklist = cardState.checklists.find((item) => item.id === checklistId)
    if (!checklist) {
      return
    }

    const nextItem: ChecklistItem = {
      id: createId('checkitem'),
      content,
      isDone: false
    }

    updateChecklist(checklistId, { items: [...checklist.items, nextItem] })
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

  const removeChecklistItem = (checklistId: string, itemId: string) => {
    const checklist = cardState.checklists.find((item) => item.id === checklistId)
    if (!checklist) {
      return
    }

    const nextItems = checklist.items.filter((item) => item.id !== itemId)
    updateChecklist(checklistId, { items: nextItems })
  }

  const validateUrl = (value: string): boolean => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === 'https:' || parsed.protocol === 'http:'
    } catch {
      return false
    }
  }

  const submitLink = () => {
    const title = linkDraft.title.trim()
    const url = linkDraft.url.trim()

    if (!title || !url) {
      setLinkError('Preencha titulo e URL.')
      return
    }

    if (!validateUrl(url)) {
      setLinkError('URL invalida.')
      return
    }

    setLinkError('')

    if (linkDraft.id) {
      const nextLinks = cardState.links.map((link) => (link.id === linkDraft.id ? { ...link, title, url, type: linkDraft.type } : link))
      updateCard({ links: nextLinks }, `editou link ${title}`)
    } else {
      const link: LinkAttachment = {
        id: createId('link'),
        title,
        url,
        type: linkDraft.type,
        createdAt: new Date().toISOString()
      }

      updateCard({ links: [...cardState.links, link] }, `adicionou link ${title}`)
    }

    setLinkDraft({ title: '', url: '', type: 'other' })
    setShowLinksPanel(false)
  }

  const editLink = (link: LinkAttachment) => {
    setLinkDraft({ id: link.id, title: link.title, url: link.url, type: link.type })
    setShowLinksPanel(true)
  }

  const removeLink = (linkId: string) => {
    const target = cardState.links.find((link) => link.id === linkId)
    const nextLinks = cardState.links.filter((link) => link.id !== linkId)
    updateCard({ links: nextLinks }, target ? `removeu link ${target.title}` : 'removeu link')
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

    const nextActivities = [activity, ...cardState.activities]
    setCardState((prev) => ({ ...prev, activities: nextActivities }))
    onUpdate({ activities: nextActivities })
    setCommentText('')
  }

  const dueStatus = getDateStatus(cardState.dueDate, cardState.isCompleted)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="grid h-[92vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-[#141414] md:grid-cols-[1fr_340px]">
        <section className="overflow-y-auto border-r border-white/10 p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <Input
                  defaultValue={cardState.title}
                  autoFocus
                  className="h-11 border-white/20 bg-black/50 text-3xl font-bold"
                  onBlur={(event) => handleTitleSave(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleTitleSave((event.target as HTMLInputElement).value)
                    }
                  }}
                />
              ) : (
                <button type="button" onClick={() => setIsEditingTitle(true)} className="text-left text-4xl font-bold leading-tight text-foreground hover:text-primary">
                  {cardState.title}
                </button>
              )}

              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <span>na lista</span>
                <select value={cardState.listId} onChange={(event) => handleListChange(event.target.value)} className="rounded border border-white/15 bg-black/40 px-2 py-1 text-sm text-foreground" aria-label="Selecionar lista">
                  {listOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground/70">Atual: {listTitle}</span>
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Fechar modal">
              <X className="size-5" />
            </Button>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => setShowLabelsPanel((prev) => !prev)}>
              <Plus className="mr-1 size-4" /> Etiquetas
            </Button>
            <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => setShowChecklistPanel((prev) => !prev)}>
              <CheckSquare className="mr-1 size-4" /> Checklist
            </Button>
            <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => setShowDatePanel((prev) => !prev)}>
              <CalendarDays className="mr-1 size-4" /> Datas
            </Button>
            <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => setShowMembersPanel((prev) => !prev)}>
              <Users className="mr-1 size-4" /> Membros
            </Button>
            <Button variant="outline" className="border-white/15 bg-transparent" onClick={() => setShowLinksPanel((prev) => !prev)}>
              <Link2 className="mr-1 size-4" /> Link
            </Button>
            <Button
              variant={cardState.isCompleted ? 'secondary' : 'outline'}
              className={cardState.isCompleted ? 'bg-green-700 text-white hover:bg-green-700/80' : 'border-white/15 bg-transparent'}
              onClick={() => updateCard({ isCompleted: !cardState.isCompleted }, cardState.isCompleted ? 'marcou como pendente' : 'marcou como concluido')}
            >
              <CheckCircle2 className="mr-1 size-4" />
              {cardState.isCompleted ? 'Concluido' : 'Concluir'}
            </Button>
            {onArchive && (
              <Button variant="outline" className="border-white/15 bg-transparent" onClick={onArchive}>
                Arquivar
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" className="bg-red-700 hover:bg-red-700/80" onClick={onDelete}>
                Excluir
              </Button>
            )}
          </div>

          {showLabelsPanel && (
            <section className="mb-5 rounded-lg border border-white/10 bg-black/30 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Etiquetas</h3>
              <div className="grid gap-2">
                {availableLabels.map((label) => {
                  const selected = cardState.labels.some((item) => item.id === label.id)
                  return (
                    <label key={label.id} className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-sm">
                      <input type="checkbox" checked={selected} onChange={() => toggleLabel(label)} className="accent-primary" />
                      <span className="inline-block h-3 w-8 rounded" style={{ backgroundColor: label.color }} />
                      <span>{label.text}</span>
                    </label>
                  )
                })}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto_auto]">
                <Input value={newLabelName} onChange={(event) => setNewLabelName(event.target.value)} placeholder="Nova etiqueta" />
                <select value={newLabelColor} onChange={(event) => setNewLabelColor(event.target.value)} className="rounded border border-white/15 bg-black/40 px-2">
                  {LABEL_COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
                <Button onClick={createNewLabel}>Criar</Button>
              </div>
            </section>
          )}

          {showMembersPanel && (
            <section className="mb-5 rounded-lg border border-white/10 bg-black/30 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Membros</h3>
              <div className="grid gap-2">
                {members.map((member) => {
                  const selected = cardState.memberIds.includes(member.id)
                  return (
                    <label key={member.id} className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5 text-sm">
                      <input type="checkbox" checked={selected} onChange={() => toggleMember(member.id)} className="accent-primary" />
                      <span className="flex size-6 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: member.color }}>
                        {member.initials}
                      </span>
                      <span>{member.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{member.email}</span>
                    </label>
                  )
                })}
              </div>
            </section>
          )}

          {showDatePanel && (
            <section className="mb-5 rounded-lg border border-white/10 bg-black/30 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Entrega</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Input type="date" value={dueDateInput} onChange={(event) => setDueDateInput(event.target.value)} />
                <Input type="time" value={dueTimeInput} onChange={(event) => setDueTimeInput(event.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={handleDueDateSave}>Salvar data</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDueDateInput('')
                      setDueTimeInput('')
                      updateCard({ dueDate: undefined }, 'removeu a data de entrega')
                    }}
                  >
                    Limpar
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className={`rounded px-2 py-1 text-xs font-medium ${dueStatus.className}`}>{dueStatus.text}</span>
                <span className="text-muted-foreground">{formatDateTime(cardState.dueDate)}</span>
              </div>
            </section>
          )}

          <section className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">Etiquetas ativas</h3>
            {cardState.labels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cardState.labels.map((label) => (
                  <span key={label.id} className="rounded px-2 py-1 text-xs font-semibold text-white" style={{ backgroundColor: label.color }}>
                    {label.text}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma etiqueta selecionada.</p>
            )}
          </section>

          <section className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Descricao</h3>
              {!isEditingDescription && (
                <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(true)}>
                  Editar
                </Button>
              )}
            </div>
            {isEditingDescription ? (
              <div className="space-y-2">
                <textarea defaultValue={cardState.description} className="min-h-40 w-full rounded-md border border-white/15 bg-black/30 p-3 text-sm text-foreground" onBlur={(event) => handleDescriptionSave(event.target.value)} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={(event) => {
                      const element = event.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement | null
                      handleDescriptionSave(element?.value ?? cardState.description)
                    }}
                  >
                    Salvar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditingDescription(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditingDescription(true)} className="w-full rounded-md border border-white/15 bg-black/30 p-3 text-left text-sm text-muted-foreground hover:border-primary/40">
                {cardState.description || 'Adicione o briefing da demanda aqui...'}
              </button>
            )}
          </section>

          <section className="mb-6">
            <h3 className="mb-3 text-lg font-semibold">Membros</h3>
            {cardState.memberIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {cardState.memberIds.map((memberId) => {
                  const member = selectedMemberMap.get(memberId)
                  if (!member) {
                    return null
                  }

                  return (
                    <span key={member.id} className="inline-flex items-center gap-2 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs">
                      <span className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: member.color }}>
                        {member.initials}
                      </span>
                      {member.name}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum membro atribuido.</p>
            )}
          </section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Checklists</h3>
              <Button variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={() => setShowChecklistPanel((prev) => !prev)}>
                <Plus className="mr-1 size-4" /> Novo checklist
              </Button>
            </div>

            {showChecklistPanel && (
              <div className="mb-4 flex gap-2">
                <Input value={newChecklistTitle} onChange={(event) => setNewChecklistTitle(event.target.value)} placeholder="Nome do checklist" />
                <Button onClick={addChecklist}>Criar</Button>
              </div>
            )}

            <div className="space-y-4">
              {cardState.checklists.map((checklist) => {
                const completed = checklist.items.filter((item) => item.isDone).length
                const total = checklist.items.length
                const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

                return (
                  <article key={checklist.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <Input value={checklist.title} onChange={(event) => updateChecklist(checklist.id, { title: event.target.value })} className="h-8 border-white/15 bg-black/40 text-sm" />
                      <Button variant="ghost" size="icon" onClick={() => removeChecklist(checklist.id)} aria-label="Remover checklist">
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="mb-2 text-xs text-muted-foreground">
                      Progresso: {completed}/{total} ({progress}%)
                    </div>
                    <div className="mb-3 h-2 rounded bg-zinc-800">
                      <div className="h-2 rounded bg-primary" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="space-y-2">
                      {checklist.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 rounded border border-white/10 px-2 py-1.5">
                          <input type="checkbox" checked={item.isDone} onChange={() => toggleChecklistItem(checklist.id, item.id)} className="accent-primary" />
                          <span className={`flex-1 text-sm ${item.isDone ? 'line-through text-muted-foreground' : ''}`}>{item.content}</span>
                          <button onClick={() => removeChecklistItem(checklist.id, item.id)} className="text-xs text-muted-foreground hover:text-red-400" type="button">
                            Remover
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        value={checklistDraftItems[checklist.id] ?? ''}
                        onChange={(event) => setChecklistDraftItems((prev) => ({ ...prev, [checklist.id]: event.target.value }))}
                        placeholder="Novo item"
                      />
                      <Button onClick={() => addChecklistItem(checklist.id)}>Adicionar</Button>
                    </div>
                  </article>
                )
              })}

              {cardState.checklists.length === 0 && <p className="text-sm text-muted-foreground">Nenhum checklist criado.</p>}
            </div>
          </section>

          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Links</h3>
              <Button variant="outline" size="sm" className="border-white/15 bg-transparent" onClick={() => setShowLinksPanel((prev) => !prev)}>
                <Plus className="mr-1 size-4" /> Adicionar link
              </Button>
            </div>

            {showLinksPanel && (
              <div className="mb-4 rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={linkDraft.title} onChange={(event) => setLinkDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Titulo" />
                  <select value={linkDraft.type} onChange={(event) => setLinkDraft((prev) => ({ ...prev, type: event.target.value as LinkDraft['type'] }))} className="rounded border border-white/15 bg-black/40 px-2">
                    <option value="drive">Google Drive</option>
                    <option value="figma">Figma</option>
                    <option value="other">Outro</option>
                  </select>
                </div>
                <Input value={linkDraft.url} onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))} placeholder="https://..." className="mt-2" />
                {linkError && <p className="mt-2 text-xs text-red-400">{linkError}</p>}
                <div className="mt-3 flex gap-2">
                  <Button onClick={submitLink}>{linkDraft.id ? 'Salvar edicao' : 'Salvar link'}</Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setLinkDraft({ title: '', url: '', type: 'other' })
                      setLinkError('')
                      setShowLinksPanel(false)
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {cardState.links.map((link) => (
                <article key={link.id} className="rounded border border-white/10 bg-black/30 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a href={link.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-primary hover:underline">
                        {link.title}
                      </a>
                      <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                      <p className="mt-1 text-[11px] uppercase text-muted-foreground">{link.type}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => editLink(link)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeLink(link.id)} className="text-red-400 hover:text-red-300">
                        Remover
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
              {cardState.links.length === 0 && <p className="text-sm text-muted-foreground">Nenhum link adicionado.</p>}
            </div>
          </section>
        </section>

        <aside className="border-t border-white/10 bg-black/40 md:border-t-0">
          <header className="border-b border-white/10 px-4 py-3">
            <h3 className="text-lg font-semibold">Comentarios e atividade</h3>
          </header>

          <div className="space-y-4 p-4">
            <div className="rounded-lg border border-white/15 bg-black/40 p-3">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder="Escreva um comentario..."
                className="h-20 w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={saveComment}>Salvar</Button>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto pr-1">
              {cardState.activities.map((activity) => (
                <article key={activity.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">{activity.actorInitials}</span>
                    <p className="text-sm font-medium text-foreground">{activity.actorName}</p>
                  </div>
                  <p className="text-sm text-foreground/90">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.createdAt).toLocaleString('pt-BR')}</p>
                </article>
              ))}

              {cardState.activities.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
