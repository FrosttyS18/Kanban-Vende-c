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
import { type Activity, type BoardData, type BoardShareSettings, type BoardStore, type CardData, type Label, type MemberNotification } from '@/types'
import { createId, loadBoardStore, saveBoardStore } from '@/services/boardService'

type BoardProps = {
  searchQuery: string
  createBoardSignal: number
  shareBoardSignal: number
  openCardRequest?: { boardId: string; cardId: string; token: number } | null
  selectedBoardId?: string
  onBoardMetaChange?: (meta: {
    boards: BoardData[]
    currentBoardId: string
    currentMemberId: string
    notifications: MemberNotification[]
    unreadNotificationsCount: number
  }) => void
}

const LIST_TITLE_MAX_LENGTH = 150
const ACTIVITY_COOLDOWN_MS = 15000
const MAX_CARD_ACTIVITIES = 120
const BOARD_COLOR_OPTIONS = [
  '#ff0068',
  '#ff2d55',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#0ea5e9',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899'
]

function shouldThrottleCompletionActivity(activity: Activity, actorId: string, nowMs: number): boolean {
  if (activity.type !== 'system' || activity.actorId !== actorId) {
    return false
  }

  if (!activity.message.startsWith('marcou como')) {
    return false
  }

  const activityTimeMs = new Date(activity.createdAt).getTime()
  return nowMs - activityTimeMs <= ACTIVITY_COOLDOWN_MS
}

function getInitialsFromName(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean)
  if (parts.length === 0) {
    return 'US'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function deriveNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'usuario'
  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function Board({
  searchQuery,
  createBoardSignal,
  shareBoardSignal,
  openCardRequest,
  selectedBoardId,
  onBoardMetaChange
}: BoardProps) {
  const [store, setStore] = useState<BoardStore>(() => loadBoardStore())
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardColor, setNewBoardColor] = useState('#ff0068')
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

  const profileNotifications = useMemo(
    () =>
      store.notifications
        .filter((notification) => notification.memberId === store.currentMemberId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [store.currentMemberId, store.notifications]
  )

  const unreadNotificationsCount = useMemo(
    () => profileNotifications.filter((notification) => !notification.isRead).length,
    [profileNotifications]
  )

  useEffect(() => {
    onBoardMetaChange?.({
      boards: store.boards,
      currentBoardId: activeBoardId,
      currentMemberId: store.currentMemberId,
      notifications: profileNotifications.slice(0, 8),
      unreadNotificationsCount
    })
  }, [activeBoardId, onBoardMetaChange, profileNotifications, store.boards, store.currentMemberId, unreadNotificationsCount])

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

  useEffect(() => {
    if (!openCardRequest || openCardRequest.boardId !== activeBoardId) {
      return
    }

    const targetCard = currentCards.find((card) => card.id === openCardRequest.cardId)
    if (!targetCard) {
      return
    }

    const timerId = window.setTimeout(() => {
      const targetElement = document.getElementById(`card-${openCardRequest.cardId}`)
      targetElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      targetElement?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }, 80)

    return () => window.clearTimeout(timerId)
  }, [activeBoardId, currentCards, openCardRequest])

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
  const ownerMemberId = currentBoard?.ownerMemberId ?? store.currentMemberId
  const sharedMemberIds = useMemo(() => new Set((shareSettings?.members ?? []).map((member) => member.memberId)), [shareSettings?.members])
  const sharedBoardMembers = useMemo(() => store.members.filter((member) => sharedMemberIds.has(member.id)), [sharedMemberIds, store.members])

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

    setStore((prev) => {
      const actor = prev.members.find((member) => member.id === prev.currentMemberId)
      const nowIso = new Date().toISOString()
      const nowMs = new Date(nowIso).getTime()

      let nextNotifications = prev.notifications

      const nextCards = prev.cards.map((card) => {
          if (card.id !== cardId) {
            return card
          }

          const nextCard: CardData = {
            ...card,
            ...updates,
            activities: Array.isArray(updates.activities) ? updates.activities.slice(0, MAX_CARD_ACTIVITIES) : card.activities.slice(0, MAX_CARD_ACTIVITIES),
            updatedAt: nowIso
          }

          if (updates.activities || !actor) {
            return nextCard
          }

          if (Array.isArray(updates.memberIds)) {
            const addedMemberIds = updates.memberIds.filter((memberId) => !card.memberIds.includes(memberId))
            if (addedMemberIds.length > 0) {
              const memberNotifications = addedMemberIds
                .filter((memberId) => memberId !== actor.id)
                .map((memberId) => {
                  const targetMember = prev.members.find((member) => member.id === memberId)
                  if (!targetMember) {
                    return null
                  }

                  return {
                    id: createId('notif'),
                    memberId: targetMember.id,
                    boardId: activeBoardId,
                    cardId: card.id,
                    type: 'member_assigned' as const,
                    title: 'Você foi adicionado em um cartão',
                    message: `${actor.name} adicionou você em "${card.title}".`,
                    createdAt: nowIso,
                    isRead: false
                  }
                })
                .filter((item): item is MemberNotification => item !== null)

              if (memberNotifications.length > 0) {
                nextNotifications = [...prev.notifications, ...memberNotifications]
              }
            }
          }

          if (typeof updates.isCompleted === 'boolean' && updates.isCompleted !== card.isCompleted) {
            const message = updates.isCompleted ? 'marcou como concluído' : 'marcou como pendente'
            const activity: Activity = {
              id: createId('activity'),
              type: 'system',
              actorId: actor.id,
              actorName: actor.name,
              actorInitials: actor.initials,
              message,
              createdAt: nowIso
            }

            const recentCompletionIndex = card.activities.findIndex((item) => shouldThrottleCompletionActivity(item, actor.id, nowMs))
            if (recentCompletionIndex !== -1) {
            nextCard.activities = [activity, ...card.activities.filter((_, index) => index !== recentCompletionIndex)].slice(0, MAX_CARD_ACTIVITIES)
              return nextCard
            }

            nextCard.activities = [activity, ...card.activities].slice(0, MAX_CARD_ACTIVITIES)
          }

          return nextCard
        })

      return {
        ...prev,
        notifications: nextNotifications,
        cards: nextCards
      }
    })
  }

  const addCardToList = (listId: string, title: string, placement: 'top' | 'bottom') => {
    setStore((prev) => {
      const nowIso = new Date().toISOString()
      const actor = prev.members.find((member) => member.id === prev.currentMemberId)
      const listName = prev.columns.find((column) => column.id === listId)?.title ?? 'Lista'
      const creationActivity: Activity[] = actor
        ? [
            {
              id: createId('activity'),
              type: 'system',
              actorId: actor.id,
              actorName: actor.name,
              actorInitials: actor.initials,
              message: `adicionou este cartão a ${listName}.`,
              createdAt: nowIso
            }
          ]
        : []

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
        activities: creationActivity,
        createdAt: nowIso,
        updatedAt: nowIso
      }

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
    const title = newListTitle.trim().slice(0, LIST_TITLE_MAX_LENGTH)
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
    const normalizedTitle = title.trim().slice(0, LIST_TITLE_MAX_LENGTH)
    if (!normalizedTitle) {
      return
    }

    setStore((prev) => ({
      ...prev,
      columns: prev.columns.map((column) => (column.id === columnId ? { ...column, title: normalizedTitle } : column))
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
    setStore((prev) => {
      const existingShare = prev.shareByBoard[activeBoardId]
      const boardOwnerId = prev.boards.find((board) => board.id === activeBoardId)?.ownerMemberId ?? prev.currentMemberId
      const ownerShareEntry = existingShare?.members.find((member) => member.memberId === boardOwnerId)
      const memberMap = new Map(nextSettings.members.map((member) => [member.memberId, member]))
      if (!memberMap.has(boardOwnerId)) {
        memberMap.set(boardOwnerId, ownerShareEntry ?? { memberId: boardOwnerId, permission: 'edit' })
      }
      const validMembers = Array.from(memberMap.values())
      const validMemberIdSet = new Set(validMembers.map((member) => member.memberId))

      return {
        ...prev,
        shareByBoard: {
          ...prev.shareByBoard,
          [activeBoardId]: {
            ...nextSettings,
            members: validMembers
          }
        },
        cards: prev.cards.map((card) =>
          currentBoardCardListIds.has(card.listId)
            ? {
                ...card,
                memberIds: card.memberIds.filter((memberId) => validMemberIdSet.has(memberId)),
                activities: card.activities.slice(0, MAX_CARD_ACTIVITIES)
              }
            : card
        )
      }
    })
  }

  const inviteMemberByEmail = (email: string, permission: 'view' | 'edit'): { ok: boolean; message?: string } => {
    let result: { ok: boolean; message?: string } = { ok: false, message: 'Não foi possível adicionar este e-mail.' }
    const normalizedEmail = email.trim().toLowerCase()

    setStore((prev) => {
      const boardShare = prev.shareByBoard[activeBoardId]
      if (!boardShare) {
        result = { ok: false, message: 'Board sem configuração de compartilhamento.' }
        return prev
      }

      const existingMember = prev.members.find((member) => member.email.toLowerCase() === normalizedEmail)
      const hasAccessAlready = boardShare.members.some((entry) => entry.memberId === existingMember?.id)
      if (hasAccessAlready) {
        result = { ok: false, message: 'Este e-mail já possui acesso.' }
        return prev
      }

      const memberToUse =
        existingMember ??
        {
          id: createId('member'),
          name: deriveNameFromEmail(normalizedEmail),
          email: normalizedEmail,
          initials: getInitialsFromName(deriveNameFromEmail(normalizedEmail)),
          color: BOARD_COLOR_OPTIONS[prev.members.length % BOARD_COLOR_OPTIONS.length]
        }

      result = { ok: true }
      return {
        ...prev,
        members: existingMember ? prev.members : [...prev.members, memberToUse],
        shareByBoard: {
          ...prev.shareByBoard,
          [activeBoardId]: {
            ...boardShare,
            members: [...boardShare.members, { memberId: memberToUse.id, permission }]
          }
        }
      }
    })

    return result
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

        if (activeCardValue.listId === overId) {
          return prev
        }

        const draft = [...prev.cards]
        const [card] = draft.splice(activeIndex, 1)
        const updatedCard: CardData = {
          ...card,
          listId: overId,
          updatedAt: new Date().toISOString()
        }

        const targetListLastIndex = draft.reduce((lastIndex, currentCard, index) => {
          if (currentCard.listId === overId) {
            return index
          }
          return lastIndex
        }, -1)

        const insertIndex = targetListLastIndex === -1 ? draft.length : targetListLastIndex + 1
        draft.splice(insertIndex, 0, updatedCard)

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
    const overType = over.data.current?.type
    const overId =
      overType === 'Card'
        ? String((over.data.current?.card as CardData | undefined)?.listId ?? over.id)
        : String(over.id)

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
        color: newBoardColor,
        ownerMemberId: store.currentMemberId,
        createdAt: now,
        updatedAt: now
      }
    ]

    setStore((prev) => ({
      ...prev,
      boards: nextBoards,
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

    setNewBoardTitle('')
    setNewBoardColor('#ff0068')
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
                  boardMembers={sharedBoardMembers}
                  currentMemberId={store.currentMemberId}
                  searchActive={searchQuery.trim().length > 0}
                />
              ))}
            </SortableContext>

            <div className="w-68.25 shrink-0">
              {!isAddingList ? (
                <Button
                  onClick={() => setIsAddingList(true)}
                  variant="ghost"
                  className="h-11 w-full justify-start rounded-2xl bg-[#3f3f3f] px-4 text-[14px] font-medium text-[#d1d1d1] hover:bg-[#4a4a4a]"
                >
                  <Plus className="mr-2 size-4" />
                  Adicionar um cartão
                </Button>
              ) : (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#101204] p-3">
                  <Input
                    autoFocus
                    value={newListTitle}
                    onChange={(event) => setNewListTitle(event.target.value.slice(0, LIST_TITLE_MAX_LENGTH))}
                    maxLength={LIST_TITLE_MAX_LENGTH}
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
                boardMembers={sharedBoardMembers}
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
                boardMembers={sharedBoardMembers}
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
          <div className="w-full max-w-141.25 rounded-2xl border border-white/10 bg-[#141414] p-5">
            <h2 className="text-[26px] font-semibold leading-[1.15] text-white">Criar novo board</h2>
            <p className="mt-1.5 text-[17px] text-[#d1d1d1]">Defina um nome para criar seu novo board!</p>
            <Input
              value={newBoardTitle}
              onChange={(event) => setNewBoardTitle(event.target.value)}
              className="mt-4 h-11 rounded-xl border border-primary bg-black px-3.5 text-[18px] font-semibold text-white placeholder:text-[#7d7d7d]"
              placeholder="Nome do time/organização/área"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  createBoard()
                }
              }}
            />
            <div className="mt-4">
              <p className="text-[13px] font-semibold text-[#d1d1d1]">Cor do board</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {BOARD_COLOR_OPTIONS.map((color) => {
                  const selected = color === newBoardColor
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewBoardColor(color)}
                      aria-label={`Selecionar cor ${color}`}
                      className={`size-7 rounded-full border-2 ${selected ? 'border-white' : 'border-transparent hover:border-white/40'}`}
                      style={{ backgroundColor: color }}
                    />
                  )
                })}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                variant="ghost"
                className="h-10 rounded-xl px-5 text-[17px] font-semibold text-[#d1d1d1] hover:bg-white/10"
                onClick={() => {
                  setDismissedCreateSignal(createBoardSignal)
                  setNewBoardTitle('')
                  setNewBoardColor('#ff0068')
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createBoard} className="h-10 rounded-xl bg-primary px-5 text-[17px] font-semibold text-white hover:bg-primary/90">
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
          ownerMemberId={ownerMemberId}
          shareSettings={shareSettings}
          onClose={() => setDismissedShareSignal(shareBoardSignal)}
          onChange={updateShareSettings}
          onInviteByEmail={inviteMemberByEmail}
        />
      )}
    </div>
  )
}
