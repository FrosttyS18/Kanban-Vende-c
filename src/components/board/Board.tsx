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
import { ACTIVITY_MESSAGES } from '@/constants/activityMessages'
import { type BoardData, type BoardShareSettings, type BoardStore, type CardData, type CardActivityEventType, type ColumnData, type Label, type MemberNotification, type RecordCardActivityInput } from '@/types'
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
  recordCardActivityRemote,
  replaceBoardLabelsRemote,
  replaceBoardShareSettingsRemote,
  reorderListsRemote,
  setLastBoardIdRemote,
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
  closeCardModalSignal?: number
  selectedBoardId?: string
  onBoardCreated?: (boardId: string) => void
  onCardOpen?: (boardId: string, cardId: string) => void
  onCardClose?: (boardId: string) => void
  onBoardMetaChange?: (meta: {
    boards: BoardData[]
    currentBoardId: string
    currentMemberId: string
    notifications: MemberNotification[]
    unreadNotificationsCount: number
  }) => void
}

const LIST_TITLE_MAX_LENGTH = 150
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
const MUTATION_ERROR_RESET_MS = 6000

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

function getBoardColumns(snapshot: BoardStore, boardId: string): ColumnData[] {
  return snapshot.columns
    .filter((column) => column.boardId === boardId)
    .sort((a, b) => a.position - b.position)
}

function getBoardCards(snapshot: BoardStore, boardColumns: ColumnData[]): CardData[] {
  const boardListIds = new Set(boardColumns.map((column) => column.id))
  return snapshot.cards.filter((card) => boardListIds.has(card.listId))
}

function hasCardLayoutChanged(previousCards: CardData[], nextCards: CardData[]): boolean {
  if (previousCards.length !== nextCards.length) {
    return true
  }

  for (let index = 0; index < previousCards.length; index += 1) {
    const previousCard = previousCards[index]
    const nextCard = nextCards[index]

    if (!nextCard) {
      return true
    }

    if (previousCard.id !== nextCard.id || previousCard.listId !== nextCard.listId) {
      return true
    }
  }

  return false
}

function hasColumnsOrderChanged(previousColumns: ColumnData[], nextColumns: ColumnData[]): boolean {
  if (previousColumns.length !== nextColumns.length) {
    return true
  }

  for (let index = 0; index < previousColumns.length; index += 1) {
    if (previousColumns[index]?.id !== nextColumns[index]?.id) {
      return true
    }
  }

  return false
}

export default function Board({
  searchQuery,
  createBoardSignal,
  shareBoardSignal,
  openCardRequest,
  closeCardModalSignal = 0,
  selectedBoardId,
  onBoardCreated,
  onCardOpen,
  onCardClose,
  onBoardMetaChange
}: BoardProps) {
  const [store, setStore] = useState<BoardStore>(EMPTY_STORE)
  const [isLoadingStore, setIsLoadingStore] = useState(true)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardColor, setNewBoardColor] = useState('#ff0068')
  const [dismissedCreateSignal, setDismissedCreateSignal] = useState(createBoardSignal)
  const [dismissedShareSignal, setDismissedShareSignal] = useState(shareBoardSignal)
  const realtimeReloadTimer = useRef<number | null>(null)
  const operationErrorTimerRef = useRef<number | null>(null)
  const storeRef = useRef<BoardStore>(EMPTY_STORE)
  const dragSnapshotRef = useRef<{ cards: CardData[]; columns: ColumnData[] } | null>(null)

  const applyStore = useCallback((nextStore: BoardStore) => {
    storeRef.current = nextStore
    setStore(nextStore)
  }, [])

  useEffect(() => {
    storeRef.current = store
  }, [store])

  useEffect(() => {
    return () => {
      if (operationErrorTimerRef.current) {
        window.clearTimeout(operationErrorTimerRef.current)
      }
    }
  }, [])

  const showOperationError = useCallback((message: string) => {
    setOperationError(message)
    if (operationErrorTimerRef.current) {
      window.clearTimeout(operationErrorTimerRef.current)
    }
    operationErrorTimerRef.current = window.setTimeout(() => {
      setOperationError(null)
    }, MUTATION_ERROR_RESET_MS)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    })
  )

  const loadStore = useCallback(
    async (preferredBoardId?: string, options?: { forceRefresh?: boolean; silent?: boolean }) => {
      const shouldShowLoader = options?.silent !== true
      if (shouldShowLoader) {
        setIsLoadingStore(true)
      }
      setStoreError(null)
      try {
        const nextStore = await loadBoardStoreFromRemote(preferredBoardId ?? selectedBoardId, options)
        applyStore(nextStore)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar os boards.'
        setStoreError(message)
      } finally {
        if (shouldShowLoader) {
          setIsLoadingStore(false)
        }
      }
    },
    [applyStore, selectedBoardId]
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

  const handleRemoteError = useCallback(
    (action: string, error: unknown, boardIdOverride?: string, details?: { resourceId?: string; rollback?: () => void }) => {
      details?.rollback?.()
      const message = error instanceof Error ? error.message : 'Não foi possível salvar as alterações.'
      const boardId = boardIdOverride ?? activeBoardId
      console.error('[board_mutation_error]', {
        action,
        boardId,
        resourceId: details?.resourceId,
        message,
        error
      })
      showOperationError(message)
      void loadStore(boardId, { forceRefresh: true, silent: true })
    },
    [activeBoardId, loadStore, showOperationError]
  )

  const rollbackBoardDragSnapshot = useCallback(
    (dragSnapshot: { cards: CardData[]; columns: ColumnData[] } | null) => {
      if (!dragSnapshot) {
        return
      }

      const snapshot = storeRef.current
      const otherColumns = snapshot.columns.filter((column) => column.boardId !== activeBoardId)
      const boardListIds = new Set(dragSnapshot.columns.map((column) => column.id))
      const otherCards = snapshot.cards.filter((card) => !boardListIds.has(card.listId))

      applyStore({
        ...snapshot,
        columns: [...otherColumns, ...dragSnapshot.columns],
        cards: [...otherCards, ...dragSnapshot.cards]
      })
    },
    [activeBoardId, applyStore]
  )

  const isCreateBoardOpen = createBoardSignal > dismissedCreateSignal
  const isShareBoardOpen = shareBoardSignal > dismissedShareSignal

  useEffect(() => {
    setStoredBoardId(activeBoardId)
    if (isLoadingStore) {
      return
    }
    void setLastBoardIdRemote(activeBoardId || null).catch(() => undefined)
  }, [activeBoardId, isLoadingStore])

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
        void loadStore(activeBoardId, { forceRefresh: true, silent: true })
      }, REALTIME_RELOAD_DEBOUNCE_MS)
    }, store.currentMemberId)

    return () => {
      if (realtimeReloadTimer.current) {
        window.clearTimeout(realtimeReloadTimer.current)
        realtimeReloadTimer.current = null
      }
      unsubscribe()
    }
  }, [activeBoardId, loadStore, store.currentMemberId])

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

  const recordActivity = useCallback(
    (cardId: string, eventType: CardActivityEventType, message: string, options?: { activityType?: RecordCardActivityInput['activityType']; dedupeWindowMinutes?: number }) => {
      const normalizedMessage = message.trim()
      if (!normalizedMessage) {
        return
      }

      void recordCardActivityRemote({
        cardId,
        eventType,
        message: normalizedMessage,
        activityType: options?.activityType,
        dedupeWindowMinutes: options?.dedupeWindowMinutes
      }).catch((error) => {
        handleRemoteError('record_activity', error, activeBoardId)
      })
    },
    [activeBoardId, handleRemoteError]
  )

  const handleRecordCardActivity = useCallback(
    (cardId: string, input: Omit<RecordCardActivityInput, 'cardId'>) => {
      recordActivity(cardId, input.eventType, input.message, {
        activityType: input.activityType,
        dedupeWindowMinutes: input.dedupeWindowMinutes
      })
    },
    [recordActivity]
  )

  const updateCardInStore = (cardId: string, updates: Partial<CardData>) => {
    if (updates.dueDate) {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      if (new Date(updates.dueDate) < startOfToday) {
        return
      }
    }

    const snapshot = storeRef.current
    const actor = snapshot.members.find((member) => member.id === snapshot.currentMemberId)
    const nowIso = new Date().toISOString()
    let cardToPersist: CardData | null = null
    let notificationsToPersist: MemberNotification[] = []
    let nextNotifications = snapshot.notifications

    const nextCards = snapshot.cards.map((card) => {
      if (card.id !== cardId) {
        return card
      }

      const nextCard: CardData = {
        ...card,
        ...updates,
        updatedAt: nowIso
      }
      cardToPersist = nextCard

      if (actor && Array.isArray(updates.memberIds)) {
        const addedMemberIds = updates.memberIds.filter((memberId) => !card.memberIds.includes(memberId))
        if (addedMemberIds.length > 0) {
          const memberNotifications = addedMemberIds
            .filter((memberId) => memberId !== actor.id)
            .map((memberId): MemberNotification | null => {
              const targetMember = snapshot.members.find((member) => member.id === memberId)
              if (!targetMember) {
                return null
              }

              return {
                id: createId('notif'),
                memberId: targetMember.id,
                boardId: activeBoardId,
                cardId: card.id,
                type: 'member_assigned' as const,
                title: ACTIVITY_MESSAGES.memberAssignedTitle,
                message: ACTIVITY_MESSAGES.memberAssignedMessage(actor.name, card.title),
                createdAt: nowIso,
                isRead: false
              }
            })
            .filter((item): item is MemberNotification => item !== null)

          if (memberNotifications.length > 0) {
            notificationsToPersist = memberNotifications
            nextNotifications = [...snapshot.notifications, ...memberNotifications]
          }
        }
      }

      return nextCard
    })

    applyStore({
      ...snapshot,
      cards: nextCards,
      notifications: nextNotifications
    })

    if (cardToPersist) {
      void upsertCardRemote(activeBoardId, cardToPersist).catch((error) => {
        handleRemoteError('upsert_card', error, activeBoardId)
      })
    }

    if (notificationsToPersist.length > 0) {
      void insertNotificationsRemote(notificationsToPersist).catch((error) => {
        handleRemoteError('insert_notifications', error, activeBoardId)
      })
    }
  }

  const addCardToList = (listId: string, title: string, placement: 'top' | 'bottom') => {
    const nowIso = new Date().toISOString()
    const snapshot = storeRef.current
    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const boardListIds = new Set(boardColumns.map((column) => column.id))
    const createdListTitle = boardColumns.find((column) => column.id === listId)?.title ?? 'Lista'
    const createdCard: CardData = {
      id: createId('card'),
      listId,
      title,
      description: '',
      labels: [],
      memberIds: [],
      isCompleted: false,
      checklists: [],
      links: [],
      activities: [],
      createdAt: nowIso,
      updatedAt: nowIso
    }

    const nextCardsPayload = [...snapshot.cards]
    if (placement === 'bottom') {
      nextCardsPayload.push(createdCard)
    } else {
      const insertIndex = snapshot.cards.findIndex((card) => card.listId === listId)
      if (insertIndex === -1) {
        nextCardsPayload.push(createdCard)
      } else {
        nextCardsPayload.splice(insertIndex, 0, createdCard)
      }
    }

    applyStore({
      ...snapshot,
      cards: nextCardsPayload
    })

    void createCardRemote(activeBoardId, createdCard)
      .then(() => {
        recordActivity(createdCard.id, 'card_created', ACTIVITY_MESSAGES.cardCreatedInList(createdListTitle))
      })
      .catch((error) => {
        handleRemoteError('create_card', error, activeBoardId)
      })

    const boardCardsToSync = nextCardsPayload.filter((card) => boardListIds.has(card.listId))
    void syncCardsOrderingRemote(activeBoardId, boardColumns, boardCardsToSync).catch((error) => {
      handleRemoteError('sync_cards_ordering_after_create', error, activeBoardId)
    })
  }

  const deleteCard = (cardId: string) => {
    const snapshot = storeRef.current
    applyStore({
      ...snapshot,
      cards: snapshot.cards.filter((card) => card.id !== cardId)
    })
    void deleteCardRemote(cardId).catch((error) => {
      handleRemoteError('delete_card', error, activeBoardId)
    })
  }

  const archiveCard = (cardId: string) => {
    const snapshot = storeRef.current
    const card = snapshot.cards.find((item) => item.id === cardId)
    if (!card) {
      return
    }

    const list = snapshot.columns.find((column) => column.id === card.listId)
    const board = snapshot.boards.find((item) => item.id === activeBoardId)

    applyStore({
      ...snapshot,
      cards: snapshot.cards.filter((item) => item.id !== cardId),
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
        ...snapshot.archivedCards
      ]
    })

    void archiveCardRemote(cardId).catch((error) => {
      handleRemoteError('archive_card', error, activeBoardId)
    })
  }

  const addList = () => {
    const title = newListTitle.trim().slice(0, LIST_TITLE_MAX_LENGTH)
    if (!title) {
      return
    }

    const snapshot = storeRef.current
    const nextPosition = snapshot.columns.filter((column) => column.boardId === activeBoardId).length
    const createdList: ColumnData = {
      id: createId('list'),
      boardId: activeBoardId,
      title,
      position: nextPosition
    }

    applyStore({
      ...snapshot,
      columns: [...snapshot.columns, createdList]
    })

    void createListRemote(createdList).catch((error) => {
      handleRemoteError('create_list', error, activeBoardId)
    })

    setNewListTitle('')
    setIsAddingList(false)
  }

  const renameColumn = (columnId: string, title: string) => {
    const normalizedTitle = title.trim().slice(0, LIST_TITLE_MAX_LENGTH)
    if (!normalizedTitle) {
      return
    }

    const snapshot = storeRef.current
    applyStore({
      ...snapshot,
      columns: snapshot.columns.map((column) => (column.id === columnId ? { ...column, title: normalizedTitle } : column))
    })
    void updateListRemote(columnId, { title: normalizedTitle }).catch((error) => {
      handleRemoteError('rename_list', error, activeBoardId)
    })
  }

  const deleteColumn = (columnId: string) => {
    const snapshot = storeRef.current
    const remainingColumns = snapshot.columns.filter((column) => column.id !== columnId)
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

    applyStore({
      ...snapshot,
      columns: normalizedColumns,
      cards: snapshot.cards.filter((card) => card.listId !== columnId)
    })
    void deleteListRemote(columnId).catch((error) => {
      handleRemoteError('delete_list', error, activeBoardId)
    })
  }

  const updateAvailableLabels = (labels: Label[]) => {
    const snapshot = storeRef.current
    applyStore({
      ...snapshot,
      labelsByBoard: {
        ...snapshot.labelsByBoard,
        [activeBoardId]: labels
      }
    })
    void replaceBoardLabelsRemote(activeBoardId, labels).catch((error) => {
      handleRemoteError('replace_labels', error, activeBoardId)
    })
  }

  const updateShareSettings = (nextSettings: BoardShareSettings) => {
    const snapshot = storeRef.current
    const existingShare = snapshot.shareByBoard[activeBoardId]
    const boardOwnerId = snapshot.boards.find((board) => board.id === activeBoardId)?.ownerMemberId ?? snapshot.currentMemberId
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

    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const boardListIds = new Set(boardColumns.map((column) => column.id))
    const cardsToPersistMap = new Map<string, CardData>()
    snapshot.cards.forEach((card) => {
      if (!boardListIds.has(card.listId)) {
        return
      }
      const filteredMemberIds = card.memberIds.filter((memberId) => validMemberIdSet.has(memberId))
      const needsUpdate = filteredMemberIds.length !== card.memberIds.length
      if (!needsUpdate) {
        return
      }
      cardsToPersistMap.set(card.id, {
        ...card,
        memberIds: filteredMemberIds
      })
    })

    const cardsToPersist = Array.from(cardsToPersistMap.values())

    applyStore({
      ...snapshot,
      shareByBoard: {
        ...snapshot.shareByBoard,
        [activeBoardId]: normalizedSettings
      },
      cards: snapshot.cards.map((card) => cardsToPersistMap.get(card.id) ?? card)
    })

    void replaceBoardShareSettingsRemote(activeBoardId, boardOwnerId, normalizedSettings).catch((error) => {
      handleRemoteError('replace_share_settings', error, activeBoardId)
    })

    cardsToPersist.forEach((card) => {
      void upsertCardRemote(activeBoardId, card).catch((error) => {
        handleRemoteError('upsert_card_after_share', error, activeBoardId)
      })
    })
  }

  const inviteMemberByEmail = (email: string, permission: 'view' | 'edit'): { ok: boolean; message?: string } => {
    const snapshot = storeRef.current
    const normalizedEmail = email.trim().toLowerCase()
    const boardShare = snapshot.shareByBoard[activeBoardId]
    if (!boardShare) {
      return { ok: false, message: 'Board sem configuracao de compartilhamento.' }
    }

    const existingMember = snapshot.members.find((member) => member.email.toLowerCase() === normalizedEmail)
    if (!existingMember) {
      return { ok: false, message: 'Este usuário ainda não acessou o sistema.' }
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
    const snapshot = storeRef.current
    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const boardCards = getBoardCards(snapshot, boardColumns)
    dragSnapshotRef.current = {
      cards: boardCards.map((card) => ({ ...card })),
      columns: boardColumns.map((column) => ({ ...column }))
    }

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

    const snapshot = storeRef.current
    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const boardListIds = new Set(boardColumns.map((column) => column.id))
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
      const activeIndex = snapshot.cards.findIndex((card) => card.id === activeId)
      const overIndex = snapshot.cards.findIndex((card) => card.id === overId)

      if (activeIndex === -1 || overIndex === -1) {
        return
      }

      const activeCardValue = snapshot.cards[activeIndex]
      const overCardValue = snapshot.cards[overIndex]

      if (!boardListIds.has(activeCardValue.listId) || !boardListIds.has(overCardValue.listId)) {
        return
      }

      const draft = [...snapshot.cards]
      draft[activeIndex] = {
        ...draft[activeIndex],
        listId: overCardValue.listId,
        updatedAt: new Date().toISOString()
      }

      applyStore({
        ...snapshot,
        cards: arrayMove(draft, activeIndex, overIndex)
      })
    }

    if (overIsColumn) {
      const activeIndex = snapshot.cards.findIndex((card) => card.id === activeId)
      if (activeIndex === -1) {
        return
      }

      const activeCardValue = snapshot.cards[activeIndex]
      if (!boardListIds.has(activeCardValue.listId) || !boardListIds.has(overId)) {
        return
      }

      if (activeCardValue.listId === overId) {
        return
      }

      const draft = [...snapshot.cards]
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

      applyStore({
        ...snapshot,
        cards: draft
      })
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    setActiveCardId(null)
    setActiveColumnId(null)

    const dragSnapshot = dragSnapshotRef.current
    dragSnapshotRef.current = null

    const { active, over } = event
    if (!over) {
      if (dragSnapshot) {
        void loadStore(activeBoardId, { forceRefresh: true, silent: true })
      }
      return
    }

    const isActiveCard = active.data.current?.type === 'Card'
    if (isActiveCard) {
      const snapshot = storeRef.current
      const boardColumns = getBoardColumns(snapshot, activeBoardId)
      const boardCards = getBoardCards(snapshot, boardColumns)
      const activeCardId = String(active.id)
      const movedCardCurrent = boardCards.find((card) => card.id === activeCardId)
      if (!movedCardCurrent) {
        return
      }

      const previousCard = dragSnapshot?.cards.find((card) => card.id === activeCardId)
      const movedAcrossLists = Boolean(previousCard && previousCard.listId !== movedCardCurrent.listId)
      const layoutChanged = dragSnapshot ? hasCardLayoutChanged(dragSnapshot.cards, boardCards) : true

      if (!layoutChanged && !movedAcrossLists) {
        return
      }

      let cardToPersist = movedCardCurrent
      if (movedAcrossLists) {
        cardToPersist = {
          ...movedCardCurrent,
          updatedAt: new Date().toISOString()
        }

        applyStore({
          ...snapshot,
          cards: snapshot.cards.map((card) => (card.id === cardToPersist.id ? cardToPersist : card))
        })

        const targetListTitle = boardColumns.find((column) => column.id === cardToPersist.listId)?.title ?? 'Lista'
        void upsertCardRemote(activeBoardId, cardToPersist).catch((error) => {
          handleRemoteError('move_card_upsert', error, activeBoardId, {
            resourceId: cardToPersist.id,
            rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
          })
        })
        recordActivity(cardToPersist.id, 'card_moved', ACTIVITY_MESSAGES.cardMovedToList(targetListTitle), { dedupeWindowMinutes: 10 })
      }

      const cardsToSyncPayload = boardCards.map((card) => (card.id === cardToPersist.id ? cardToPersist : card))
      void syncCardsOrderingRemote(activeBoardId, boardColumns, cardsToSyncPayload).catch((error) => {
        handleRemoteError('sync_cards_ordering', error, activeBoardId, {
          rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
        })
      })
      return
    }

    const isActiveColumn = active.data.current?.type === 'Column'
    if (!isActiveColumn) {
      return
    }

    if (active.id === over.id) {
      return
    }

    const snapshot = storeRef.current
    const activeId = String(active.id)
    const overType = over.data.current?.type
    const overId =
      overType === 'Card'
        ? String((over.data.current?.card as CardData | undefined)?.listId ?? over.id)
        : String(over.id)

    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const activeIndex = boardColumns.findIndex((column) => column.id === activeId)
    const overIndex = boardColumns.findIndex((column) => column.id === overId)

    if (activeIndex === -1 || overIndex === -1) {
      return
    }

    const movedColumns = arrayMove(boardColumns, activeIndex, overIndex).map((column, index) => ({
      ...column,
      position: index
    }))

    if (!hasColumnsOrderChanged(boardColumns, movedColumns)) {
      return
    }

    const otherColumns = snapshot.columns.filter((column) => column.boardId !== activeBoardId)
    applyStore({
      ...snapshot,
      columns: [...otherColumns, ...movedColumns]
    })

    void reorderListsRemote(movedColumns).catch((error) => {
      handleRemoteError('reorder_lists', error, activeBoardId, {
        rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
      })
    })
  }

  const createBoard = () => {
    const title = newBoardTitle.trim()
    if (!title) {
      return
    }

    const snapshot = storeRef.current
    const now = new Date().toISOString()
    const boardId = createId('board')
    const linkToken = createId('share').replace('share_', '')

    const nextBoards = [
      ...snapshot.boards,
      {
        id: boardId,
        title,
        color: newBoardColor,
        ownerMemberId: snapshot.currentMemberId,
        createdAt: now,
        updatedAt: now
      }
    ]

    applyStore({
      ...snapshot,
      boards: nextBoards,
      labelsByBoard: {
        ...snapshot.labelsByBoard,
        [boardId]: []
      },
      shareByBoard: {
        ...snapshot.shareByBoard,
        [boardId]: {
          boardId,
          linkToken,
          allowLinkAccess: true,
          members: [{ memberId: snapshot.currentMemberId, permission: 'edit' }]
        }
      },
      currentBoardId: boardId
    })
    void createBoardRemote(
      {
        id: boardId,
        title,
        color: newBoardColor,
        ownerMemberId: snapshot.currentMemberId,
        createdAt: now,
        updatedAt: now
      },
      {
        boardId,
        linkToken,
        allowLinkAccess: true,
        members: [{ memberId: snapshot.currentMemberId, permission: 'edit' }]
      }
    ).catch((error) => {
      handleRemoteError('create_board', error, boardId)
    })

    setNewBoardTitle('')
    setNewBoardColor('#ff0068')
    setDismissedCreateSignal(createBoardSignal)
    onBoardCreated?.(boardId)
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
      {operationError && (
        <div className="px-6 pt-3">
          <div className="rounded-xl border border-[#820002] bg-[#820002]/20 px-3 py-2 text-sm text-[#ffb4ae]">
            {operationError}
          </div>
        </div>
      )}
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
                  onRecordActivity={handleRecordCardActivity}
                  closeCardModalSignal={closeCardModalSignal}
                  onCardOpen={(cardId) => onCardOpen?.(activeBoardId, cardId)}
                  onCardClose={() => onCardClose?.(activeBoardId)}
                  searchActive={searchQuery.trim().length > 0}
                  operationErrorMessage={operationError}
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
                  Adicionar nova Lista
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
                onRecordActivity={() => undefined}
                closeCardModalSignal={closeCardModalSignal}
                onCardOpen={() => undefined}
                onCardClose={() => undefined}
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
                onRecordActivity={handleRecordCardActivity}
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



