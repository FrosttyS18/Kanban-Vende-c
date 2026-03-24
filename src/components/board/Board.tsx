import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, X } from 'lucide-react'
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
import { isAllowedCardActivityEvent } from '@/constants/activityEvents'
import { queryKeys } from '@/lib/queryKeys'
import { type BoardData, type BoardShareSettings, type BoardStore, type CardData, type CardActivityEventType, type ColumnData, type GlobalUserRole, type Label, type MemberNotification, type RecordCardActivityInput } from '@/types'
import { createId } from '@/utils/createId'
import {
  archiveCardRemote,
  clearLegacyBoardStorage,
  createBoardRemote,
  createCardRemote,
  createListRemote,
  deleteCardRemote,
  deleteListRemote,
  createMemberAssignmentNotificationsRemote,
  inviteMemberByEmailRemote,
  loadBoardStoreFromRemote,
  getBoardSyncStampRemote,
  recordCardActivityRemote,
  replaceBoardLabelsRemote,
  replaceBoardShareSettingsRemote,
  reorderListsRemote,
  setLastBoardIdRemote,
  setStoredBoardId,
  subscribeBoardRealtimeWithOptions,
  syncCardsOrderingRemote,
  updateCardFieldsRemote,
  updateListRemote,
  upsertCardRemote
} from '@/services/boardApi'

type BoardProps = {
  createBoardSignal: number
  shareBoardSignal: number
  externalReloadSignal?: number
  openCardRequest?: { boardId: string; cardId: string; token: number } | null
  closeCardModalSignal?: number
  selectedBoardId?: string
  selectedBoardAccess?: boolean | null
  onBoardCreated?: (boardId: string) => void
  onCardOpen?: (boardId: string, cardId: string) => void
  onCardClose?: (boardId: string) => void
  onBoardMetaChange?: (meta: {
    boards: BoardData[]
    currentBoardId: string
    currentMemberId: string
    currentUserRole: GlobalUserRole
    notifications: MemberNotification[]
    unreadNotificationsCount: number
  }) => void
}

type ContextConfirmActionKind = 'archive_card' | 'delete_card' | 'delete_list'

type ContextConfirmAction = {
  kind: ContextConfirmActionKind
  targetId: string
  targetTitle: string
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
const REALTIME_RECONNECT_BASE_DELAY_MS = 500
const REALTIME_RECONNECT_MAX_DELAY_MS = 4000
const BOARD_SYNC_INTERACTION_THROTTLE_MS = 5000
const BOARD_SYNC_HEARTBEAT_MS = 45000
const TRANSIENT_BOARD_RETRY_BASE_DELAY_MS = 600
const TRANSIENT_BOARD_RETRY_MAX_ATTEMPTS = 3

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
  currentMemberId: '',
  currentUserRole: 'member'
}

function isTransientBoardLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalizedMessage = message.toLowerCase()

  return (
    normalizedMessage.includes('pgrst002') ||
    normalizedMessage.includes('schema cache') ||
    normalizedMessage.includes('could not query the database') ||
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('networkerror') ||
    normalizedMessage.includes('fetch failed') ||
    normalizedMessage.includes('timed out')
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function isQueryCancellationError(error: unknown): boolean {
  const name =
    typeof error === 'object' && error && 'name' in error && typeof error.name === 'string'
      ? error.name
      : ''
  const message = error instanceof Error ? error.message : String(error ?? '')
  const normalizedName = name.toLowerCase()
  const normalizedMessage = message.toLowerCase()

  return (
    normalizedName === 'cancellederror' ||
    normalizedName === 'cancelederror' ||
    normalizedName === 'aborterror' ||
    normalizedMessage === 'cancellederror' ||
    normalizedMessage === 'cancelederror' ||
    normalizedMessage.includes('query was cancelled') ||
    normalizedMessage.includes('cancelled') ||
    normalizedMessage.includes('canceled') ||
    normalizedMessage.includes('aborted')
  )
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

function getLocalBoardSyncStamp(snapshot: BoardStore, boardId: string): number {
  const board = snapshot.boards.find((item) => item.id === boardId)
  if (!board?.updatedAt) {
    return 0
  }

  const parsedStamp = Date.parse(board.updatedAt)
  return Number.isFinite(parsedStamp) ? parsedStamp : 0
}

export default function Board({
  createBoardSignal,
  shareBoardSignal,
  externalReloadSignal = 0,
  openCardRequest,
  closeCardModalSignal = 0,
  selectedBoardId,
  selectedBoardAccess = null,
  onBoardCreated,
  onCardOpen,
  onCardClose,
  onBoardMetaChange
}: BoardProps) {
  const queryClient = useQueryClient()
  const [store, setStore] = useState<BoardStore>(EMPTY_STORE)
  const [isLoadingStore, setIsLoadingStore] = useState(true)
  const [storeError, setStoreError] = useState<string | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)
  const [confirmContextAction, setConfirmContextAction] = useState<ContextConfirmAction | null>(null)
  const [isConfirmingContextAction, setIsConfirmingContextAction] = useState(false)
  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [activeCardId, setActiveCardId] = useState<string | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const [newBoardTitle, setNewBoardTitle] = useState('')
  const [newBoardColor, setNewBoardColor] = useState('#ff0068')
  const [dismissedCreateSignal, setDismissedCreateSignal] = useState(createBoardSignal)
  const [dismissedShareSignal, setDismissedShareSignal] = useState(shareBoardSignal)
  const boardInteractionRef = useRef<HTMLDivElement | null>(null)
  const realtimeDebounceTimerRef = useRef<number | null>(null)
  const pendingRealtimeRefreshRef = useRef(false)
  const isRealtimeRefreshingRef = useRef(false)
  const stampCheckInFlightRef = useRef(false)
  const lastStampCheckAtRef = useRef(0)
  const boardSyncHeartbeatTimerRef = useRef<number | null>(null)
  const realtimeReconnectTimerRef = useRef<number | null>(null)
  const realtimeReconnectAttemptRef = useRef(0)
  const [realtimeSubscriptionVersion, setRealtimeSubscriptionVersion] = useState(0)
  const operationErrorTimerRef = useRef<number | null>(null)
  const operationSuccessTimerRef = useRef<number | null>(null)
  const storeRef = useRef<BoardStore>(EMPTY_STORE)
  const dragSnapshotRef = useRef<{ cards: CardData[]; columns: ColumnData[] } | null>(null)
  const loadStoreRequestIdRef = useRef(0)
  const manualStoreLoadingRef = useRef(false)
  const channelIssueStreakRef = useRef(0)
  const stampCheckFailureStreakRef = useRef(0)
  const lastExternalReloadSignalRef = useRef(externalReloadSignal)

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
      if (operationSuccessTimerRef.current) {
        window.clearTimeout(operationSuccessTimerRef.current)
      }
      if (realtimeDebounceTimerRef.current) {
        window.clearTimeout(realtimeDebounceTimerRef.current)
      }
      if (boardSyncHeartbeatTimerRef.current) {
        window.clearInterval(boardSyncHeartbeatTimerRef.current)
      }
      if (realtimeReconnectTimerRef.current) {
        window.clearTimeout(realtimeReconnectTimerRef.current)
      }
      pendingRealtimeRefreshRef.current = false
      isRealtimeRefreshingRef.current = false
      stampCheckInFlightRef.current = false
      lastStampCheckAtRef.current = 0
      loadStoreRequestIdRef.current = 0
      channelIssueStreakRef.current = 0
      stampCheckFailureStreakRef.current = 0
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

  const showOperationSuccess = useCallback((message: string) => {
    setOperationSuccess(message)
    if (operationSuccessTimerRef.current) {
      window.clearTimeout(operationSuccessTimerRef.current)
    }
    operationSuccessTimerRef.current = window.setTimeout(() => {
      setOperationSuccess(null)
    }, 2200)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4
      }
    })
  )

  const loadStore = useCallback(
    async (preferredBoardId?: string, options?: { forceRefresh?: boolean; silent?: boolean; bypassInFlight?: boolean }) => {
      const requestId = ++loadStoreRequestIdRef.current
      const shouldShowLoader = options?.silent !== true
      if (shouldShowLoader) {
        manualStoreLoadingRef.current = true
        setIsLoadingStore(true)
      }
      setStoreError(null)
      try {
        let nextStore: BoardStore | null = null
        let lastError: unknown = null

        for (let attempt = 1; attempt <= TRANSIENT_BOARD_RETRY_MAX_ATTEMPTS; attempt += 1) {
          try {
            const targetBoardId = preferredBoardId ?? selectedBoardId
            nextStore = await queryClient.fetchQuery({
              queryKey: queryKeys.boardStore(targetBoardId),
              queryFn: () =>
                loadBoardStoreFromRemote(targetBoardId, {
                  forceRefresh: options?.forceRefresh || attempt > 1,
                  bypassInFlight: options?.bypassInFlight || attempt > 1
                }),
              staleTime: 0
            })
            break
          } catch (error) {
            lastError = error
            const shouldRetry = isTransientBoardLoadError(error) && attempt < TRANSIENT_BOARD_RETRY_MAX_ATTEMPTS
            if (!shouldRetry) {
              throw error
            }

            const jitter = Math.floor(Math.random() * 220)
            const backoffDelay = TRANSIENT_BOARD_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + jitter
            await wait(backoffDelay)
          }
        }

        if (!nextStore) {
          throw (lastError ?? new Error('Nao foi possivel carregar os boards.'))
        }

        if (requestId !== loadStoreRequestIdRef.current) {
          return
        }

        applyStore(nextStore)
      } catch (error) {
        if (requestId !== loadStoreRequestIdRef.current) {
          return
        }
        if (isQueryCancellationError(error)) {
          return
        }
        const message = error instanceof Error ? error.message : 'Nao foi possivel carregar os boards.'
        setStoreError(message)
      } finally {
        if (shouldShowLoader && requestId === loadStoreRequestIdRef.current) {
          setIsLoadingStore(false)
          manualStoreLoadingRef.current = false
        }
      }
    },
    [applyStore, queryClient, selectedBoardId]
  )

  useEffect(() => {
    clearLegacyBoardStorage()
  }, [])

  const boardStoreQuery = useQuery({
    queryKey: queryKeys.boardStore(selectedBoardId),
    queryFn: () => loadBoardStoreFromRemote(selectedBoardId),
    retry: (failureCount, error) => isTransientBoardLoadError(error) && failureCount < TRANSIENT_BOARD_RETRY_MAX_ATTEMPTS - 1,
    retryDelay: (attempt) => {
      const jitter = Math.floor(Math.random() * 220)
      return TRANSIENT_BOARD_RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1) + jitter
    },
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    if (boardStoreQuery.data) {
      applyStore(boardStoreQuery.data)
      setStoreError(null)
    }
  }, [applyStore, boardStoreQuery.data])

  useEffect(() => {
    if (!boardStoreQuery.error || manualStoreLoadingRef.current) {
      return
    }
    if (isQueryCancellationError(boardStoreQuery.error)) {
      return
    }
    const message = boardStoreQuery.error instanceof Error ? boardStoreQuery.error.message : 'Nao foi possivel carregar os boards.'
    setStoreError(message)
  }, [boardStoreQuery.error])

  useEffect(() => {
    if (manualStoreLoadingRef.current) {
      return
    }
    const isQueryLoading = boardStoreQuery.isLoading && !boardStoreQuery.data
    setIsLoadingStore(isQueryLoading)
  }, [boardStoreQuery.data, boardStoreQuery.isLoading])

  const activeBoardId = useMemo(() => {
    if (selectedBoardId && store.boards.some((board) => board.id === selectedBoardId)) {
      return selectedBoardId
    }

    return store.currentBoardId
  }, [selectedBoardId, store.boards, store.currentBoardId])

  const handleRemoteError = useCallback(
    (action: string, error: unknown, boardIdOverride?: string, details?: { resourceId?: string; rollback?: () => void }) => {
      if (isQueryCancellationError(error)) {
        details?.rollback?.()
        return
      }
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

  useEffect(() => {
    if (lastExternalReloadSignalRef.current === externalReloadSignal) {
      return
    }
    lastExternalReloadSignalRef.current = externalReloadSignal
    void loadStore(activeBoardId || undefined, {
      forceRefresh: true,
      silent: true,
      bypassInFlight: true
    })
  }, [activeBoardId, externalReloadSignal, loadStore])

  const invalidateBoardQueries = useCallback(
    (boardIdOverride?: string, options?: { includeArchived?: boolean }) => {
      const boardId = (boardIdOverride ?? activeBoardId).trim()
      if (boardId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.boardStore(boardId) })
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
      if (options?.includeArchived) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.archivedCards })
      }
    },
    [activeBoardId, queryClient]
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

  const recordActivityMutation = useMutation({
    mutationFn: (input: RecordCardActivityInput) => recordCardActivityRemote(input),
    onError: (error, input) => {
      handleRemoteError('record_activity', error, activeBoardId, { resourceId: input.cardId })
    }
  })

  const createMemberNotificationsMutation = useMutation({
    mutationFn: (variables: { cardId: string; memberIds: string[] }) =>
      createMemberAssignmentNotificationsRemote(variables.cardId, variables.memberIds)
  })

  const upsertCardMutation = useMutation({
    mutationFn: (variables: { boardId: string; card: CardData }) => upsertCardRemote(variables.boardId, variables.card)
  })

  const updateCardFieldsMutation = useMutation({
    mutationFn: (variables: {
      cardId: string
      payload: Partial<Pick<CardData, 'title' | 'description' | 'dueDate' | 'isCompleted' | 'listId' | 'updatedAt'>>
    }) => updateCardFieldsRemote(variables.cardId, variables.payload)
  })

  const createCardMutation = useMutation({
    mutationFn: (variables: { boardId: string; card: CardData }) => createCardRemote(variables.boardId, variables.card)
  })

  const syncCardsOrderingMutation = useMutation({
    mutationFn: (variables: { boardId: string; columns: ColumnData[]; cards: CardData[] }) =>
      syncCardsOrderingRemote(variables.boardId, variables.columns, variables.cards)
  })

  const deleteCardMutation = useMutation({
    mutationFn: (cardId: string) => deleteCardRemote(cardId)
  })

  const archiveCardMutation = useMutation({
    mutationFn: (cardId: string) => archiveCardRemote(cardId)
  })

  const createListMutation = useMutation({
    mutationFn: (column: ColumnData) => createListRemote(column)
  })

  const updateListMutation = useMutation({
    mutationFn: (variables: { columnId: string; payload: { title?: string; position?: number } }) =>
      updateListRemote(variables.columnId, variables.payload)
  })

  const deleteListMutation = useMutation({
    mutationFn: (columnId: string) => deleteListRemote(columnId)
  })

  const reorderListsMutation = useMutation({
    mutationFn: (columns: ColumnData[]) => reorderListsRemote(columns)
  })

  const replaceBoardLabelsMutation = useMutation({
    mutationFn: (variables: { boardId: string; labels: Label[] }) => replaceBoardLabelsRemote(variables.boardId, variables.labels)
  })

  const replaceBoardShareSettingsMutation = useMutation({
    mutationFn: (variables: { boardId: string; ownerMemberId: string; settings: BoardShareSettings }) =>
      replaceBoardShareSettingsRemote(variables.boardId, variables.ownerMemberId, variables.settings)
  })

  const inviteMemberByEmailMutation = useMutation({
    mutationFn: (variables: { boardId: string; email: string; permission: 'view' | 'edit' }) =>
      inviteMemberByEmailRemote(variables.boardId, variables.email, variables.permission)
  })

  const createBoardMutation = useMutation({
    mutationFn: (variables: { board: BoardData; shareSettings: BoardShareSettings }) =>
      createBoardRemote(variables.board, variables.shareSettings)
  })

  const runMutation = useCallback(
    async <TData, TError, TVariables>(
      mutation: UseMutationResult<TData, TError, TVariables, unknown>,
      variables: TVariables,
      options: {
        action: string
        boardId?: string
        resourceId?: string
        rollback?: () => void
        includeArchived?: boolean
        onSuccess?: (data: TData) => void
      }
    ): Promise<{ ok: boolean; data?: TData }> => {
      try {
        const data = await mutation.mutateAsync(variables)
        if (options.boardId) {
          invalidateBoardQueries(options.boardId, { includeArchived: options.includeArchived })
        }
        options.onSuccess?.(data)
        return { ok: true, data }
      } catch (error) {
        handleRemoteError(options.action, error, options.boardId, {
          resourceId: options.resourceId,
          rollback: options.rollback
        })
        return { ok: false }
      }
    },
    [handleRemoteError, invalidateBoardQueries]
  )

  const canCreateBoard = store.currentUserRole === 'admin'
  const isCreateBoardOpen = createBoardSignal > dismissedCreateSignal && canCreateBoard
  const isShareBoardOpen = shareBoardSignal > dismissedShareSignal

  useEffect(() => {
    setStoredBoardId(activeBoardId)
    if (isLoadingStore) {
      return
    }
    let cancelled = false
    void setLastBoardIdRemote(activeBoardId || null).catch(() => {
      if (cancelled) {
        return
      }
    })
    return () => {
      cancelled = true
    }
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

  const topProfileNotifications = useMemo(
    () => profileNotifications.slice(0, 8),
    [profileNotifications]
  )

  useEffect(() => {
    onBoardMetaChange?.({
      boards: store.boards,
      currentBoardId: activeBoardId,
      currentMemberId: store.currentMemberId,
      currentUserRole: store.currentUserRole,
      notifications: topProfileNotifications,
      unreadNotificationsCount
    })
  }, [activeBoardId, onBoardMetaChange, store.boards, store.currentMemberId, store.currentUserRole, topProfileNotifications, unreadNotificationsCount])

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
    if (!activeBoardId) {
      return
    }

    let effectDisposed = false
    const snapshot = storeRef.current
    const boardColumns = getBoardColumns(snapshot, activeBoardId)
    const boardCards = getBoardCards(snapshot, boardColumns)
    const logRealtime = (event: string, payload: Record<string, unknown>) => {
      if (import.meta.env.DEV) {
        console.info(`[${event}]`, payload)
      }
    }

    const runRealtimeRefreshQueue = async () => {
      if (effectDisposed || !activeBoardId) {
        return
      }
      if (isRealtimeRefreshingRef.current || !pendingRealtimeRefreshRef.current) {
        return
      }

      const boardId = activeBoardId
      isRealtimeRefreshingRef.current = true
      pendingRealtimeRefreshRef.current = false
      logRealtime('realtime_refresh_started', { boardId })

      try {
        await loadStore(boardId, { forceRefresh: true, silent: true, bypassInFlight: true })
      } catch (error) {
        console.warn('[realtime_refresh_failed]', {
          boardId,
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          error
        })
      } finally {
        isRealtimeRefreshingRef.current = false
        logRealtime('realtime_refresh_finished', { boardId })

        if (!effectDisposed && pendingRealtimeRefreshRef.current) {
          logRealtime('realtime_refresh_pending_coalesced', { boardId })
          void runRealtimeRefreshQueue()
        }
      }
    }

    const requestRealtimeRefresh = (mode: 'debounced' | 'immediate' = 'debounced') => {
      if (effectDisposed) {
        return
      }

      pendingRealtimeRefreshRef.current = true
      logRealtime('refresh_enqueued', {
        boardId: activeBoardId,
        mode
      })

      if (mode === 'immediate') {
        if (realtimeDebounceTimerRef.current) {
          window.clearTimeout(realtimeDebounceTimerRef.current)
          realtimeDebounceTimerRef.current = null
        }
        void runRealtimeRefreshQueue()
        return
      }

      if (realtimeDebounceTimerRef.current) {
        window.clearTimeout(realtimeDebounceTimerRef.current)
      }
      realtimeDebounceTimerRef.current = window.setTimeout(() => {
        realtimeDebounceTimerRef.current = null
        void runRealtimeRefreshQueue()
      }, REALTIME_RELOAD_DEBOUNCE_MS)
    }

    const requestBoardStampCheck = async (source: 'interaction' | 'focus' | 'visibility' | 'heartbeat') => {
      if (effectDisposed) {
        return
      }
      if (
        source === 'interaction' &&
        channelIssueStreakRef.current === 0 &&
        stampCheckFailureStreakRef.current === 0
      ) {
        return
      }
      if (pendingRealtimeRefreshRef.current || isRealtimeRefreshingRef.current) {
        return
      }

      const now = Date.now()
      if (now - lastStampCheckAtRef.current < BOARD_SYNC_INTERACTION_THROTTLE_MS) {
        return
      }
      if (stampCheckInFlightRef.current) {
        return
      }

      lastStampCheckAtRef.current = now
      stampCheckInFlightRef.current = true
      const boardId = activeBoardId
      logRealtime('interaction_stamp_check', { boardId, source })

      try {
        const [serverStamp, localStamp] = await Promise.all([
          getBoardSyncStampRemote(boardId),
          Promise.resolve(getLocalBoardSyncStamp(storeRef.current, boardId))
        ])

        if (serverStamp !== null && serverStamp > localStamp) {
          logRealtime('stamp_diverged_refresh_enqueued', {
            boardId,
            source,
            serverStamp,
            localStamp
          })
          requestRealtimeRefresh('immediate')
        }
        stampCheckFailureStreakRef.current = 0
      } catch (error) {
        stampCheckFailureStreakRef.current += 1
        if (import.meta.env.DEV) {
          console.warn('[board_sync_stamp_check_failed]', {
            boardId,
            source,
            attempt: stampCheckFailureStreakRef.current,
            message: error instanceof Error ? error.message : 'Erro desconhecido',
            error
          })
        }
        if (stampCheckFailureStreakRef.current >= 3) {
          showOperationError('Sincronizacao temporariamente instavel. Recuperando automaticamente.')
        }
      } finally {
        stampCheckInFlightRef.current = false
      }
    }

    const scheduleRealtimeReconnect = () => {
      if (realtimeReconnectTimerRef.current) {
        return
      }
      realtimeReconnectAttemptRef.current += 1
      const attempt = realtimeReconnectAttemptRef.current
      const delay = Math.min(REALTIME_RECONNECT_MAX_DELAY_MS, REALTIME_RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1))
      realtimeReconnectTimerRef.current = window.setTimeout(() => {
        realtimeReconnectTimerRef.current = null
        setRealtimeSubscriptionVersion((prev) => prev + 1)
      }, delay)
    }

    const handleBoardInteraction = () => {
      void requestBoardStampCheck('interaction')
    }

    const handleWindowFocus = () => {
      void requestBoardStampCheck('focus')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestBoardStampCheck('visibility')
      }
    }

    const boardSurface = boardInteractionRef.current
    if (boardSurface) {
      boardSurface.addEventListener('pointerdown', handleBoardInteraction, { passive: true })
      boardSurface.addEventListener('keydown', handleBoardInteraction)
    }
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    if (boardSyncHeartbeatTimerRef.current) {
      window.clearInterval(boardSyncHeartbeatTimerRef.current)
    }
    boardSyncHeartbeatTimerRef.current = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void requestBoardStampCheck('heartbeat')
      }
    }, BOARD_SYNC_HEARTBEAT_MS)

    const unsubscribe = subscribeBoardRealtimeWithOptions(activeBoardId, () => {
      requestRealtimeRefresh()
    }, {
      currentUserId: store.currentMemberId,
      initialScope: {
        listIds: boardColumns.map((column) => column.id),
        cardIds: boardCards.map((card) => card.id),
        checklistIds: boardCards.flatMap((card) => card.checklists.map((checklist) => `${card.id}:${checklist.id}`))
      },
      onSubscribed: () => {
        realtimeReconnectAttemptRef.current = 0
        channelIssueStreakRef.current = 0
        if (realtimeReconnectTimerRef.current) {
          window.clearTimeout(realtimeReconnectTimerRef.current)
          realtimeReconnectTimerRef.current = null
        }
      },
      onStatusChange: (status) => {
        logRealtime('channel_status', {
          boardId: activeBoardId,
          status
        })
      },
      onChannelIssue: ({ status, expectedClose }) => {
        if (expectedClose) {
          logRealtime('channel_closed_expected', {
            boardId: activeBoardId
          })
          return
        }

        channelIssueStreakRef.current += 1
        if (import.meta.env.DEV) {
          console.warn('[realtime_channel_issue]', {
            boardId: activeBoardId,
            status,
            streak: channelIssueStreakRef.current
          })
        }
        if (channelIssueStreakRef.current >= 3) {
          showOperationError('Sincronizacao instavel. Tentando reconectar automaticamente.')
        }
        requestRealtimeRefresh('immediate')
        scheduleRealtimeReconnect()
      }
    })

    void requestBoardStampCheck('visibility')

    return () => {
      effectDisposed = true
      pendingRealtimeRefreshRef.current = false
      isRealtimeRefreshingRef.current = false
      stampCheckInFlightRef.current = false
      lastStampCheckAtRef.current = 0

      if (realtimeDebounceTimerRef.current) {
        window.clearTimeout(realtimeDebounceTimerRef.current)
        realtimeDebounceTimerRef.current = null
      }
      if (boardSyncHeartbeatTimerRef.current) {
        window.clearInterval(boardSyncHeartbeatTimerRef.current)
        boardSyncHeartbeatTimerRef.current = null
      }
      if (realtimeReconnectTimerRef.current) {
        window.clearTimeout(realtimeReconnectTimerRef.current)
        realtimeReconnectTimerRef.current = null
      }
      if (boardSurface) {
        boardSurface.removeEventListener('pointerdown', handleBoardInteraction)
        boardSurface.removeEventListener('keydown', handleBoardInteraction)
      }
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      unsubscribe()
    }
  }, [activeBoardId, loadStore, realtimeSubscriptionVersion, showOperationError, store.currentMemberId])

  const cardsByList = useMemo(() => {
    const map = new Map<string, CardData[]>()

    currentColumns.forEach((column) => {
      map.set(column.id, [])
    })

    currentCards.forEach((card) => {
      const listCards = map.get(card.listId)
      if (listCards) {
        listCards.push(card)
      }
    })

    return map
  }, [currentColumns, currentCards])

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
      if (!isAllowedCardActivityEvent(eventType)) {
        return
      }

      const normalizedMessage = message.trim()
      if (!normalizedMessage) {
        return
      }

      recordActivityMutation.mutate({
        cardId,
        eventType,
        message: normalizedMessage,
        activityType: options?.activityType,
        dedupeWindowMinutes: options?.dedupeWindowMinutes
      })
    },
    [recordActivityMutation]
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
    const nowIso = new Date().toISOString()
    let addedMemberIdsForNotification: string[] = []

    const nextCards = snapshot.cards.map((card) => {
      if (card.id !== cardId) {
        return card
      }

      const nextCard: CardData = {
        ...card,
        ...updates,
        updatedAt: nowIso
      }

      if (Array.isArray(updates.memberIds)) {
        addedMemberIdsForNotification = Array.from(
          new Set(updates.memberIds.filter((memberId) => !card.memberIds.includes(memberId) && memberId !== snapshot.currentMemberId))
        )
      }

      return nextCard
    })

    applyStore({
      ...snapshot,
      cards: nextCards
    })

    const cardToPersist = nextCards.find((card) => card.id === cardId) ?? null

    if (cardToPersist) {
      const hasRelationalUpdates =
        'labels' in updates ||
        'memberIds' in updates ||
        'links' in updates ||
        'checklists' in updates

      if (hasRelationalUpdates) {
        void (async () => {
          const upsertResult = await runMutation(upsertCardMutation, { boardId: activeBoardId, card: cardToPersist }, {
            action: 'upsert_card',
            boardId: activeBoardId,
            resourceId: cardToPersist.id
          })

          if (!upsertResult.ok || addedMemberIdsForNotification.length === 0) {
            return
          }

          try {
            await createMemberNotificationsMutation.mutateAsync({
              cardId: cardToPersist.id,
              memberIds: addedMemberIdsForNotification
            })
          } catch (error) {
            console.error('[notification_create_error]', {
              action: 'create_member_assignment_notifications',
              boardId: activeBoardId,
              cardId: cardToPersist.id,
              memberIds: addedMemberIdsForNotification,
              message: error instanceof Error ? error.message : 'Erro desconhecido',
              error
            })
            showOperationError('Membros salvos, mas nao foi possivel enviar notificacao.')
          }
        })()
      } else {
        const scalarUpdates: Partial<Pick<CardData, 'title' | 'description' | 'dueDate' | 'isCompleted' | 'listId' | 'updatedAt'>> = {
          updatedAt: cardToPersist.updatedAt
        }
        if ('title' in updates) {
          scalarUpdates.title = cardToPersist.title
        }
        if ('description' in updates) {
          scalarUpdates.description = cardToPersist.description
        }
        if ('dueDate' in updates) {
          scalarUpdates.dueDate = cardToPersist.dueDate
        }
        if ('isCompleted' in updates) {
          scalarUpdates.isCompleted = cardToPersist.isCompleted
        }
        if ('listId' in updates) {
          scalarUpdates.listId = cardToPersist.listId
        }

        void runMutation(updateCardFieldsMutation, {
            cardId: cardToPersist.id,
            payload: scalarUpdates
          }, {
            action: 'update_card_fields',
            boardId: activeBoardId,
            resourceId: cardToPersist.id
          })
      }
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

    void runMutation(createCardMutation, {
        boardId: activeBoardId,
        card: createdCard
      }, {
        action: 'create_card',
        boardId: activeBoardId,
        resourceId: createdCard.id,
        onSuccess: () => {
        recordActivity(createdCard.id, 'card_created', ACTIVITY_MESSAGES.cardCreatedInList(createdListTitle))
        }
      })

    const boardCardsToSync = nextCardsPayload.filter((card) => boardListIds.has(card.listId))
    void runMutation(syncCardsOrderingMutation, {
        boardId: activeBoardId,
        columns: boardColumns,
        cards: boardCardsToSync
      }, {
        action: 'sync_cards_ordering_after_create',
        boardId: activeBoardId
      })
  }

  const deleteCard = async (cardId: string) => {
    const snapshot = storeRef.current
    applyStore({
      ...snapshot,
      cards: snapshot.cards.filter((card) => card.id !== cardId)
    })
    const deleteResult = await runMutation(deleteCardMutation, cardId, {
      action: 'delete_card',
      boardId: activeBoardId,
      resourceId: cardId,
      includeArchived: true
    })
    if (deleteResult.ok) {
      showOperationSuccess('Cartão excluído com sucesso.')
      return true
    }
    return false
  }

  const archiveCard = async (cardId: string) => {
    const snapshot = storeRef.current
    const card = snapshot.cards.find((item) => item.id === cardId)
    if (!card) {
      return false
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

    const archiveResult = await runMutation(archiveCardMutation, cardId, {
      action: 'archive_card',
      boardId: activeBoardId,
      resourceId: cardId,
      includeArchived: true
    })
    if (archiveResult.ok) {
      showOperationSuccess('Cartão arquivado com sucesso.')
      return true
    }
    return false
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

    void runMutation(createListMutation, createdList, {
      action: 'create_list',
      boardId: activeBoardId,
      resourceId: createdList.id
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
    void runMutation(updateListMutation, { columnId, payload: { title: normalizedTitle } }, {
      action: 'rename_list',
      boardId: activeBoardId,
      resourceId: columnId
    })
  }

  const deleteColumn = async (columnId: string) => {
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
    const deleteResult = await runMutation(deleteListMutation, columnId, {
      action: 'delete_list',
      boardId: activeBoardId,
      resourceId: columnId
    })
    if (deleteResult.ok) {
      showOperationSuccess('Lista excluída com sucesso.')
      return true
    }
    return false
  }

  const requestDeleteCard = (cardId: string) => {
    const snapshot = storeRef.current
    const cardTitle = snapshot.cards.find((card) => card.id === cardId)?.title ?? 'este cartao'
    setConfirmContextAction({
      kind: 'delete_card',
      targetId: cardId,
      targetTitle: cardTitle
    })
  }

  const requestArchiveCard = (cardId: string) => {
    const snapshot = storeRef.current
    const cardTitle = snapshot.cards.find((card) => card.id === cardId)?.title ?? 'este cartao'
    setConfirmContextAction({
      kind: 'archive_card',
      targetId: cardId,
      targetTitle: cardTitle
    })
  }

  const requestDeleteColumn = (columnId: string) => {
    const snapshot = storeRef.current
    const columnTitle = snapshot.columns.find((column) => column.id === columnId)?.title ?? 'esta lista'
    setConfirmContextAction({
      kind: 'delete_list',
      targetId: columnId,
      targetTitle: columnTitle
    })
  }

  const confirmContextActionConfig = useMemo(() => {
    if (!confirmContextAction) {
      return null
    }

    if (confirmContextAction.kind === 'archive_card') {
      return {
        title: 'Arquivar cartão',
        description: `Deseja arquivar "${confirmContextAction.targetTitle}"?`,
        confirmLabel: 'Arquivar'
      }
    }

    if (confirmContextAction.kind === 'delete_card') {
      return {
        title: 'Excluir cartão',
        description: `Deseja excluir "${confirmContextAction.targetTitle}"? Esta ação não pode ser desfeita.`,
        confirmLabel: 'Excluir'
      }
    }

    return {
      title: 'Excluir lista',
      description: `Deseja excluir a lista "${confirmContextAction.targetTitle}"? Os cartões desta lista também serão removidos.`,
      confirmLabel: 'Excluir lista'
    }
  }, [confirmContextAction])

  const handleConfirmContextAction = async () => {
    if (!confirmContextAction) {
      return
    }

    setIsConfirmingContextAction(true)
    let ok = false

    if (confirmContextAction.kind === 'archive_card') {
      ok = await archiveCard(confirmContextAction.targetId)
    } else if (confirmContextAction.kind === 'delete_card') {
      ok = await deleteCard(confirmContextAction.targetId)
    } else {
      ok = await deleteColumn(confirmContextAction.targetId)
    }

    setIsConfirmingContextAction(false)

    if (ok) {
      setConfirmContextAction(null)
    }
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
    void runMutation(replaceBoardLabelsMutation, { boardId: activeBoardId, labels }, {
      action: 'replace_labels',
      boardId: activeBoardId
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

    void runMutation(replaceBoardShareSettingsMutation, {
        boardId: activeBoardId,
        ownerMemberId: boardOwnerId,
        settings: normalizedSettings
      }, {
        action: 'replace_share_settings',
        boardId: activeBoardId
      })

    cardsToPersist.forEach((card) => {
      void runMutation(upsertCardMutation, { boardId: activeBoardId, card }, {
        action: 'upsert_card_after_share',
        boardId: activeBoardId,
        resourceId: card.id
        })
    })
  }

  const inviteMemberByEmail = async (email: string, permission: 'view' | 'edit'): Promise<{ ok: boolean; message?: string }> => {
    if (!activeBoardId) {
      return { ok: false, message: 'Board nao encontrado.' }
    }

    const mutationResult = await runMutation(
      inviteMemberByEmailMutation,
      {
      boardId: activeBoardId,
      email,
      permission
      },
      {
        action: 'invite_member_by_email',
        boardId: activeBoardId
      }
    )
    if (!mutationResult.ok) {
      return { ok: false, message: 'Nao foi possivel enviar o convite.' }
    }
    const result = mutationResult.data
    if (!result) {
      return { ok: false, message: 'Nao foi possivel enviar o convite.' }
    }
    if (!result.ok) {
      return result
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.boardStore(activeBoardId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
    ])
    return result
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
        void runMutation(updateCardFieldsMutation, {
            cardId: cardToPersist.id,
            payload: {
              listId: cardToPersist.listId,
              updatedAt: cardToPersist.updatedAt
            }
          }, {
            action: 'move_card_update_fields',
            boardId: activeBoardId,
            resourceId: cardToPersist.id,
            rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
          })
        recordActivity(cardToPersist.id, 'card_moved', ACTIVITY_MESSAGES.cardMovedToList(targetListTitle), { dedupeWindowMinutes: 10 })
      }

      const cardsToSyncPayload = boardCards.map((card) => (card.id === cardToPersist.id ? cardToPersist : card))
      void runMutation(syncCardsOrderingMutation, {
          boardId: activeBoardId,
          columns: boardColumns,
          cards: cardsToSyncPayload
        }, {
          action: 'sync_cards_ordering',
          boardId: activeBoardId,
          rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
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

    void runMutation(reorderListsMutation, movedColumns, {
      action: 'reorder_lists',
      boardId: activeBoardId,
      rollback: () => rollbackBoardDragSnapshot(dragSnapshot)
    })
  }

  const createBoard = () => {
    if (!canCreateBoard) {
      showOperationError('Somente administradores podem criar boards.')
      return
    }

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
          members: [{ memberId: snapshot.currentMemberId, permission: 'edit' as const }]
        }
      },
      currentBoardId: boardId
    })
    void runMutation(createBoardMutation, {
        board: {
          id: boardId,
          title,
          color: newBoardColor,
          ownerMemberId: snapshot.currentMemberId,
          createdAt: now,
          updatedAt: now
        },
        shareSettings: {
          boardId,
          linkToken,
          allowLinkAccess: true,
          members: [{ memberId: snapshot.currentMemberId, permission: 'edit' as const }]
        }
      }, {
        action: 'create_board',
        boardId
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

  const hasBoardInRoute = Boolean(selectedBoardId?.trim())
  const isAccessBlocked = hasBoardInRoute && selectedBoardAccess === false

  if (isAccessBlocked) {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-x-auto">
          <div className="flex min-w-max items-start gap-4 px-6 py-6 blur-sm">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`blocked-column-${index}`} className="w-68.25 shrink-0 rounded-2xl border border-white/10 bg-[#101204] p-4 opacity-60">
                <div className="h-5 w-36 rounded-md bg-white/10" />
                <div className="mt-4 space-y-3">
                  <div className="h-20 rounded-xl bg-white/10" />
                  <div className="h-20 rounded-xl bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1.5px]">
          <div className="mx-4 w-full max-w-140 rounded-2xl border border-white/20 bg-[#1f1f21]/95 px-6 py-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-white/25 bg-white/5">
              <Lock className="size-7 text-white" />
            </div>
            <p className="text-2xl font-semibold text-white">Acesso restrito</p>
            <p className="mt-2 text-base text-[#d1d1d1]">Você precisa de autorização de um administrador para visualizar esse Board.</p>
          </div>
        </div>
      </div>
    )
  }

  if (store.boards.length === 0) {
    if (hasBoardInRoute) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-[#d1d1d1]">Você precisa de permissão do administrador para ter acesso a este Board.</p>
          <Button className="h-9 bg-primary text-white hover:bg-primary/90" onClick={() => void loadStore(undefined, { forceRefresh: true })}>
            Tentar novamente
          </Button>
        </div>
      )
    }

    return (
      <>
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm text-[#d1d1d1]">Nenhum board encontrado.</p>
          <Button
            className="h-9 bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-[#6a6a6a]"
            onClick={() => setDismissedCreateSignal(createBoardSignal - 1)}
            disabled={!canCreateBoard}
            title={!canCreateBoard ? 'Somente administradores podem criar boards.' : undefined}
          >
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
      {operationSuccess && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[92] rounded-md border border-[#ff0068]/35 bg-[#1f1f21] px-3 py-2 text-xs font-medium text-[#ffd4e9] shadow-xl">
          {operationSuccess}
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div ref={boardInteractionRef} className="h-full w-full overflow-x-auto">
          <div className="flex min-w-max items-start gap-4 px-6 py-6">
            <SortableContext items={currentColumnIds} strategy={horizontalListSortingStrategy}>
              {currentColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={cardsByList.get(column.id) ?? []}
                  onRename={renameColumn}
                  onDelete={requestDeleteColumn}
                  onAddCard={addCardToList}
                  onUpdateCard={updateCardInStore}
                  onDeleteCard={requestDeleteCard}
                  onArchiveCard={requestArchiveCard}
                  availableLabels={availableLabels}
                  onUpdateAvailableLabels={updateAvailableLabels}
                  listOptions={listOptions}
                  boardMembers={sharedBoardMembers}
                  currentMemberId={store.currentMemberId}
                  boardId={activeBoardId}
                  onRecordActivity={handleRecordCardActivity}
                  closeCardModalSignal={closeCardModalSignal}
                  openCardRequest={openCardRequest}
                  onCardOpen={(cardId) => onCardOpen?.(activeBoardId, cardId)}
                  onCardClose={() => onCardClose?.(activeBoardId)}
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
                    placeholder="Título da lista"
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
                onDelete={requestDeleteCard}
                onArchive={requestArchiveCard}
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
          currentMemberId={store.currentMemberId}
          ownerMemberId={ownerMemberId}
          shareSettings={shareSettings}
          onClose={() => setDismissedShareSignal(shareBoardSignal)}
          onChange={updateShareSettings}
          onInviteByEmail={inviteMemberByEmail}
        />
      )}

      {confirmContextAction && confirmContextActionConfig && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/65 p-4" role="dialog" aria-modal="true" aria-label={confirmContextActionConfig.title}>
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1f1f21] p-5">
            <h3 className="text-lg font-semibold text-white">{confirmContextActionConfig.title}</h3>
            <p className="mt-2 text-sm text-[#d1d1d1]">{confirmContextActionConfig.description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-4 text-[#d1d1d1] hover:bg-white/10"
                disabled={isConfirmingContextAction}
                onClick={() => setConfirmContextAction(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="h-9 bg-primary px-4 text-white hover:bg-primary/90"
                disabled={isConfirmingContextAction}
                onClick={() => void handleConfirmContextAction()}
              >
                {isConfirmingContextAction ? 'Confirmando...' : confirmContextActionConfig.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

