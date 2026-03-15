import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { type Activity, type BoardData, type BoardShareSettings, type BoardStore, type CardData, type ColumnData, type Label, type MemberNotification } from '@/types'
import { createId } from '@/utils/createId'
import {
  archiveCardRemote,
  clearLegacyBoardStorage,
  createBoardRemote,
  createCardRemote,
  createListRemote,
  deleteCardRemote,
  deleteListRemote,
  insertNotificationsRemote,
  loadBoardStoreFromRemote,
  replaceBoardLabelsRemote,
  replaceBoardShareSettingsRemote,
  reorderListsRemote,
  setStoredBoardId,
  subscribeBoardRealtime,
  syncCardsOrderingRemote,
  updateListRemote,
  upsertCardRemote
} from '@/services/boardApi'

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
const REALTIME_RELOAD_DEBOUNCE_MS = 250

const EMPTY_STORE: BoardStore = {
  version: 3,
  boards: [],
  columns: [],
  cards: [],
  labelsByBoard: {},
  shareByBoard: {},
  archivedCards: [],
  notifications: [],
  members: [],
  currentBoardId: '',
  currentMemberId: ''
}

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

export default function Board({
  searchQuery,
  createBoardSignal,
  shareBoardSignal,
  openCardRequest,
  selectedBoardId,
  onBoardMetaChange
}: BoardProps) {
  const [store, setStore] = useState<BoardStore>(EMPTY_STORE)
  const [isLoadingStore, setIsLoadingStore] = useState(true)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardColor, setNewBoardColor] = useState('#ff0068')
  const [dismissedCreateSignal, setDismissedCreateSignal] = useState(createBoardSignal)
  const [dismissedShareSignal, setDismissedShareSignal] = useState(shareBoardSignal)
  const realtimeReloadTimer = useRef<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    })
  )

  const loadStore = useCallback(
    async (preferredBoardId?: string) => {
      setIsLoadingStore(true)
      setStoreError(null)
      try {
        const nextStore = await loadBoardStoreFromRemote(preferredBoardId ?? selectedBoardId)
        setStore(nextStore)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Nao foi possivel carregar os boards.'
        setStoreError(message)
      } finally {
        setIsLoadingStore(false)
      }
    },
    [selectedBoardId]
  )

  useEffect(() => {
    clearLegacyBoardStorage()
    void loadStore(selectedBoardId)
  }, [loadStore, selectedBoardId])

  const activeBoardId = useMemo(() => {
    if (selectedBoardId && store.boards.some((board) => board.id === selectedBoardId)) {
      return selectedBoardId
    }

    return store.currentBoardId
  }, [selectedBoardId, store.boards, store.currentBoardId])

  const isCreateBoardOpen = createBoardSignal > dismissedCreateSignal
  const isShareBoardOpen = shareBoardSignal > dismissedShareSignal

  useEffect(() => {
    setStoredBoardId(activeBoardId)
  }, [activeBoardId])

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

  useEffect(() => {
    if (!activeBoardId) {
      return
    }

    const unsubscribe = subscribeBoardRealtime(activeBoardId, () => {
      if (realtimeReloadTimer.current) {
        window.clearTimeout(realtimeReloadTimer.current)
      }
      realtimeReloadTimer.current = window.setTimeout(() => {
        void loadStore(activeBoardId)
      }, REALTIME_RELOAD_DEBOUNCE_MS)
    })

    return () => {
      if (realtimeReloadTimer.current) {
        window.clearTimeout(realtimeReloadTimer.current)
        realtimeReloadTimer.current = null
      }
      unsubscribe()
    }
  }, [activeBoardId, loadStore])

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

    let cardToPersist: CardData | null = null
    let notificationsToPersist: MemberNotification[] = []

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
                notificationsToPersist = memberNotifications
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

          cardToPersist = nextCard
          return nextCard
        })

      return {
        ...prev,
        notifications: nextNotifications,
        cards: nextCards
      }
    })

    if (cardToPersist) {
      void upsertCardRemote(activeBoardId, cardToPersist).catch(() => {
        void loadStore(activeBoardId)
      })
    }

    if (notificationsToPersist.length > 0) {
      void insertNotificationsRemote(notificationsToPersist).catch(() => {
        void loadStore(activeBoardId)
      })
    }
  }

  const addCardToList = (listId: string, title: string, placement: 'top' | 'bottom') => {
    let createdCard: CardData | null = null
    let nextCardsPayload: CardData[] = []
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
      createdCard = newCard

      if (placement === 'bottom') {
        nextCardsPayload = [...prev.cards, newCard]
        return {
          ...prev,
          cards: nextCardsPayload
        }
      }

      const insertIndex = prev.cards.findIndex((card) => card.listId === listId)
      if (insertIndex === -1) {
        nextCardsPayload = [...prev.cards, newCard]
        return {
          ...prev,
          cards: nextCardsPayload
        }
      }

      const nextCards = [...prev.cards]
      nextCards.splice(insertIndex, 0, newCard)
      nextCardsPayload = nextCards

      return {
        ...prev,
        cards: nextCards
      }
    })

    if (createdCard) {
      void createCardRemote(activeBoardId, createdCard).catch(() => {
        void loadStore(activeBoardId)
      })
      if (nextCardsPayload.length > 0) {
        void syncCardsOrderingRemote(activeBoardId, currentColumns, nextCardsPayload).catch(() => {
          void loadStore(activeBoardId)
        })
      }
    }
  }

  const deleteCard = (cardId: string) => {
    setStore((prev) => ({
      ...prev,
      cards: prev.cards.filter((card) => card.id !== cardId)
    }))
    void deleteCardRemote(cardId).catch(() => {
      void loadStore(activeBoardId)
    })
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
    void archiveCardRemote(cardId).catch(() => {
      void loadStore(activeBoardId)
    })
  }

  const addList = () => {
    const title = newListTitle.trim().slice(0, LIST_TITLE_MAX_LENGTH)
    if (!title) {
      return
    }

    let createdList: ColumnData | null = null
    setStore((prev) => {
      const boardColumns = prev.columns.filter((column) => column.boardId === activeBoardId)
      const nextPosition = boardColumns.length
      createdList = {
        id: createId('list'),
        boardId: activeBoardId,
        title,
        position: nextPosition
      }

      return {
        ...prev,
        columns: [
          ...prev.columns,
          createdList
        ]
      }
    })

    if (createdList) {
      void createListRemote(createdList).catch(() => {
        void loadStore(activeBoardId)
      })
    }

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
    void updateListRemote(columnId, { title: normalizedTitle }).catch(() => {
      void loadStore(activeBoardId)
    })
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
    void deleteListRemote(columnId).catch(() => {
      void loadStore(activeBoardId)
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
    void replaceBoardLabelsRemote(activeBoardId, labels).catch(() => {
      void loadStore(activeBoardId)
    })
  }

  const updateShareSettings = (nextSettings: BoardShareSettings) => {
    const existingShare = store.shareByBoard[activeBoardId]
    const boardOwnerId = currentBoard?.ownerMemberId ?? store.currentMemberId
    const ownerShareEntry = existingShare?.members.find((member) => member.memberId === boardOwnerId)
    const memberMap = new Map(nextSettings.members.map((member) => [member.memberId, member]))
    if (!memberMap.has(boardOwnerId)) {
      memberMap.set(boardOwnerId, ownerShareEntry ?? { memberId: boardOwnerId, permission: 'edit' })
    }

    const normalizedSettings: BoardShareSettings = {
      ...nextSettings,
      members: Array.from(memberMap.values())
    }
    const validMemberIdSet = new Set(normalizedSettings.members.map((member) => member.memberId))

    const cardsToPersistMap = new Map<string, CardData>()
    store.cards.forEach((card) => {
      if (!currentBoardCardListIds.has(card.listId)) {
        return
      }
      const filteredMemberIds = card.memberIds.filter((memberId) => validMemberIdSet.has(memberId))
      const needsUpdate = filteredMemberIds.length !== card.memberIds.length
      if (!needsUpdate) {
        return
      }
      cardsToPersistMap.set(card.id, {
        ...card,
        memberIds: filteredMemberIds,
        activities: card.activities.slice(0, MAX_CARD_ACTIVITIES)
      })
    })

    const cardsToPersist = Array.from(cardsToPersistMap.values())

    setStore((prev) => ({
      ...prev,
      shareByBoard: {
        ...prev.shareByBoard,
        [activeBoardId]: normalizedSettings
      },
      cards: prev.cards.map((card) => cardsToPersistMap.get(card.id) ?? card)
    }))

    void replaceBoardShareSettingsRemote(activeBoardId, boardOwnerId, normalizedSettings).catch(() => {
      void loadStore(activeBoardId)
    })

    cardsToPersist.forEach((card) => {
      void upsertCardRemote(activeBoardId, card).catch(() => {
        void loadStore(activeBoardId)
      })
    })
  }

  const inviteMemberByEmail = (email: string, permission: 'view' | 'edit'): { ok: boolean; message?: string } => {
    const normalizedEmail = email.trim().toLowerCase()
    const boardShare = store.shareByBoard[activeBoardId]
    if (!boardShare) {
      return { ok: false, message: 'Board sem configuracao de compartilhamento.' }
    }

    const existingMember = store.members.find((member) => member.email.toLowerCase() === normalizedEmail)
    if (!existingMember) {
      return { ok: false, message: 'Este usuario ainda nao acessou o sistema.' }
    }

    const hasAccessAlready = boardShare.members.some((entry) => entry.memberId === existingMember.id)
    if (hasAccessAlready) {
      return { ok: false, message: 'Este e-mail ja possui acesso.' }
    }

    const nextSettings: BoardShareSettings = {
      ...boardShare,
      members: [...boardShare.members, { memberId: existingMember.id, permission }]
    }
    updateShareSettings(nextSettings)

    return { ok: true }
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

    const isActiveCard = active.data.current?.type === 'Card'
    if (isActiveCard) {
      const activeCardId = String(active.id)
      const overType = over.data.current?.type
      const targetListId =
        overType === 'Card'
          ? String((over.data.current?.card as CardData | undefined)?.listId ?? over.id)
          : String(over.id)

      const sourceListId = (active.data.current?.card as CardData | undefined)?.listId
      const movedAcrossLists = Boolean(sourceListId && sourceListId !== targetListId)
      const targetListTitle = currentColumns.find((column) => column.id === targetListId)?.title ?? 'Lista'

      let cardsToSyncPayload: CardData[] = []
      let movedCardToPersist: CardData | null = null

      setStore((prev) => {
        const actor = prev.members.find((member) => member.id === prev.currentMemberId)
        const nowIso = new Date().toISOString()
        const nextCards = prev.cards.map((card) => {
          if (card.id !== activeCardId) {
            return card
          }

          const baseCard: CardData = {
            ...card,
            listId: targetListId,
            updatedAt: nowIso
          }

          if (!movedAcrossLists || !actor) {
            movedCardToPersist = baseCard
            return baseCard
          }

          const activity: Activity = {
            id: createId('activity'),
            type: 'system',
            actorId: actor.id,
            actorName: actor.name,
            actorInitials: actor.initials,
            message: `moveu o cartão para ${targetListTitle}.`,
            createdAt: nowIso
          }

          const withActivity: CardData = {
            ...baseCard,
            activities: [activity, ...card.activities].slice(0, MAX_CARD_ACTIVITIES)
          }
          movedCardToPersist = withActivity
          return withActivity
        })

        cardsToSyncPayload = nextCards.filter((card) => currentBoardCardListIds.has(card.listId))
        return {
          ...prev,
          cards: nextCards
        }
      })

      if (movedCardToPersist) {
        void upsertCardRemote(activeBoardId, movedCardToPersist).catch(() => {
          void loadStore(activeBoardId)
        })
      }

      void syncCardsOrderingRemote(activeBoardId, currentColumns, cardsToSyncPayload.length > 0 ? cardsToSyncPayload : store.cards).catch(() => {
        void loadStore(activeBoardId)
      })
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

    let movedColumnsPayload: ColumnData[] = []
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
      movedColumnsPayload = movedColumns

      const otherColumns = prev.columns.filter((column) => column.boardId !== activeBoardId)

      return {
        ...prev,
        columns: [...otherColumns, ...movedColumns]
      }
    })
    if (movedColumnsPayload.length > 0) {
      void reorderListsRemote(movedColumnsPayload).catch(() => {
        void loadStore(activeBoardId)
      })
    }
  }

  const createBoard = () => {
    const title = newBoardTitle.trim()
    if (!title) {
      return
    }

    const now = new Date().toISOString()
    const boardId = createId('board')
    const linkToken = createId('share').replace('share_', '')

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
          linkToken,
          allowLinkAccess: true,
          members: [{ memberId: prev.currentMemberId, permission: 'edit' }]
        }
      },
      currentBoardId: boardId
    }))
    void createBoardRemote(
      {
        id: boardId,
        title,
        color: newBoardColor,
        ownerMemberId: store.currentMemberId,
        createdAt: now,
        updatedAt: now
      },
      {
        boardId,
        linkToken,
        allowLinkAccess: true,
        members: [{ memberId: store.currentMemberId, permission: 'edit' }]
      }
    ).catch(() => {
      void loadStore(boardId)
    })

    setNewBoardTitle('')
    setNewBoardColor('#ff0068')
    setDismissedCreateSignal(createBoardSignal)
  }

  if (isLoadingStore) {
    return <div className="flex h-full w-full items-center justify-center text-sm text-[#d1d1d1]">Carregando boards...</div>
  }

  if (storeError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[#d1d1d1]">{storeError}</p>
        <Button className="h-9 bg-primary text-white hover:bg-primary/90" onClick={() => void loadStore(activeBoardId || selectedBoardId)}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (store.boards.length === 0) {
    return (
      <>
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-[#d1d1d1]">Nenhum board encontrado.</p>
          <Button className="h-9 bg-primary text-white hover:bg-primary/90" onClick={() => setDismissedCreateSignal(createBoardSignal - 1)}>
            Criar primeiro board
          </Button>
        </div>

        {isCreateBoardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Criar novo board">
            <div className="w-full max-w-141.25 rounded-2xl border border-white/10 bg-[#141414] p-5">
              <h2 className="text-[26px] font-semibold leading-[1.15] text-white">Criar novo board</h2>
              <p className="mt-1.5 text-[17px] text-[#d1d1d1]">Defina um nome para criar seu novo board!</p>
              <Input
                value={newBoardTitle}
                onChange={(event) => setNewBoardTitle(event.target.value)}
                className="mt-4 h-11 rounded-xl border border-primary bg-black px-3.5 text-[18px] font-semibold text-white placeholder:text-[#7d7d7d]"
                placeholder="Nome do time/organizacao/area"
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
      </>
    )
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
                  boardId={activeBoardId}
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
                boardId={activeBoardId}
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
                boardId={activeBoardId}
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

