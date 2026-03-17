import { supabase } from '@/lib/supabase'
import { createId } from '@/utils/createId'
import {
  type Activity,
  type BoardData,
  type BoardShareSettings,
  type BoardStore,
  type CardData,
  type Checklist,
  type ColumnData,
  type Label,
  type LinkAttachment,
  type Member,
  type MemberNotification,
  type RecordCardActivityInput,
  type SharePermission
} from '@/types'

type BoardRow = {
  id: string
  title: string
  color: string
  owner_id: string
  position: number
  created_at: string
  updated_at: string
}

type BoardMemberRow = {
  board_id: string
  user_id: string
  permission: SharePermission
  created_at: string
}

type BoardShareLinkRow = {
  board_id: string
  token: string
  is_active: boolean
}

type ListRow = {
  id: string
  board_id: string
  title: string
  position: number
}

type CardRow = {
  id: string
  list_id: string
  title: string
  description: string
  due_date: string | null
  is_completed: boolean
  position: number
  created_at: string
  updated_at: string
  archived_at: string | null
}

type LabelRow = {
  id: string
  board_id: string
  text: string
  color: string
}

type CardLabelRow = {
  card_id: string
  label_id: string
}

type CardMemberRow = {
  card_id: string
  user_id: string
}

type CardLinkRow = {
  id: string
  card_id: string
  title: string
  url: string
  type: LinkAttachment['type']
  created_at: string
}

type ChecklistRow = {
  id: string
  card_id: string
  title: string
  position: number
}

type ChecklistItemRow = {
  id: string
  checklist_id: string
  content: string
  is_done: boolean
  position: number
}

type CardActivityRow = {
  id: string
  card_id: string
  actor_id: string | null
  type: Activity['type']
  message: string
  created_at: string
}

type NotificationRow = {
  id: string
  user_id: string
  board_id: string
  card_id: string | null
  type: MemberNotification['type']
  title: string
  message: string
  is_read: boolean
  created_at: string
}

type ProfileRow = {
  id: string
  email: string
  full_name: string | null
  last_board_id?: string | null
}

const LEGACY_KEYS = ['kanban_vndc_store_v1', 'board_columns', 'board_cards', 'board_labels', 'archived_cards', 'kanban_vndc_store_v0']
const CURRENT_BOARD_STORAGE_KEY = 'kanban_vndc_current_board'
const MEMBER_COLORS = ['#ff0068', '#ff2d55', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7']
const STORE_VERSION = 3

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getNameFromProfile(profile: ProfileRow): string {
  if (profile.full_name?.trim()) {
    return profile.full_name.trim()
  }
  const local = profile.email.split('@')[0] ?? 'usuario'
  return local
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getInitials(name: string): string {
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

function colorFromId(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(index)
    hash |= 0
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

function createMember(profile: ProfileRow): Member {
  const name = getNameFromProfile(profile)
  return {
    id: profile.id,
    name,
    email: profile.email,
    initials: getInitials(name),
    color: colorFromId(profile.id)
  }
}

function getStoredBoardId(): string {
  return localStorage.getItem(CURRENT_BOARD_STORAGE_KEY)?.trim() ?? ''
}

export function setStoredBoardId(boardId: string): void {
  if (!boardId) {
    localStorage.removeItem(CURRENT_BOARD_STORAGE_KEY)
    return
  }
  localStorage.setItem(CURRENT_BOARD_STORAGE_KEY, boardId)
}

export function clearLegacyBoardStorage(): void {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
}

export async function setLastBoardIdRemote(boardId: string | null): Promise<void> {
  const user = await getCurrentUser()
  const nextBoardId = boardId?.trim() || null
  const { error } = await supabase.from('profiles').update({ last_board_id: nextBoardId }).eq('id', user.id)
  if (error) {
    throw new Error(error.message)
  }
}

async function getCurrentUser(): Promise<{ id: string; email: string; fullName: string | null; avatarUrl: string | null }> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user?.id || !data.user.email) {
    throw new Error('Sessao invalida.')
  }
  const fullNameRaw = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? null
  const avatarRaw = data.user.user_metadata?.avatar_url ?? null
  return {
    id: data.user.id,
    email: data.user.email.toLowerCase(),
    fullName: typeof fullNameRaw === 'string' ? fullNameRaw : null,
    avatarUrl: typeof avatarRaw === 'string' ? avatarRaw : null
  }
}

async function ensureCurrentProfile(): Promise<{ id: string; email: string; lastBoardId: string | null }> {
  const user = await getCurrentUser()
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.fullName,
    avatar_url: user.avatarUrl
  }
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('id,email,last_board_id').maybeSingle()
  if (error) {
    throw new Error(error.message)
  }

  const { error: syncInvitesError } = await supabase.rpc('sync_pending_board_invites_for_current_user')
  if (syncInvitesError) {
    throw new Error(syncInvitesError.message)
  }

  const row = data as { id: string; email: string; last_board_id: string | null } | null
  return {
    id: user.id,
    email: user.email,
    lastBoardId: row?.last_board_id ?? null
  }
}

function mapChecklistRows(checklists: ChecklistRow[], items: ChecklistItemRow[]): Checklist[] {
  const itemsByChecklist = new Map<string, Array<{ id: string; content: string; isDone: boolean }>>()
  items.forEach((itemRow) => {
    const list = itemsByChecklist.get(itemRow.checklist_id) ?? []
    list.push({
      id: itemRow.id,
      content: itemRow.content,
      isDone: itemRow.is_done
    })
    itemsByChecklist.set(itemRow.checklist_id, list)
  })

  return checklists
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((checklistRow) => ({
      id: checklistRow.id,
      title: checklistRow.title,
      items: (itemsByChecklist.get(checklistRow.id) ?? []).sort((a, b) => a.id.localeCompare(b.id))
    }))
}

async function fetchBoardStoreFromRemote(selectedBoardId?: string): Promise<BoardStore> {
  const currentUser = await ensureCurrentProfile()
  const currentUserId = currentUser.id
  const profileLastBoardId = currentUser.lastBoardId?.trim() ?? ''

  const { data: ownedBoardsRaw, error: ownedBoardsError } = await supabase
    .from('boards')
    .select('id,title,color,owner_id,position,created_at,updated_at')
    .eq('owner_id', currentUserId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (ownedBoardsError) {
    throw new Error(ownedBoardsError.message)
  }

  const { data: boardMembershipRowsRaw, error: membershipsError } = await supabase
    .from('board_members')
    .select('board_id,user_id,permission,created_at')
    .eq('user_id', currentUserId)

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  const membershipBoardIds = (boardMembershipRowsRaw as BoardMemberRow[] | null)?.map((row) => row.board_id) ?? []

  const { data: memberBoardsRaw, error: memberBoardsError } =
    membershipBoardIds.length > 0
      ? await supabase
          .from('boards')
          .select('id,title,color,owner_id,position,created_at,updated_at')
          .in('id', membershipBoardIds)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      : { data: [], error: null as { message: string } | null }

  if (memberBoardsError) {
    throw new Error(memberBoardsError.message)
  }

  const boardsMap = new Map<string, BoardRow>()
  ;((ownedBoardsRaw as BoardRow[] | null) ?? []).forEach((row) => boardsMap.set(row.id, row))
  ;((memberBoardsRaw as BoardRow[] | null) ?? []).forEach((row) => boardsMap.set(row.id, row))
  const boardRows = Array.from(boardsMap.values()).sort((a, b) => (a.position - b.position) || a.created_at.localeCompare(b.created_at))

  const boardIds = boardRows.map((row) => row.id)

  if (boardIds.length === 0) {
    const emptyStore: BoardStore = {
      version: STORE_VERSION,
      boards: [],
      columns: [],
      cards: [],
      labelsByBoard: {},
      shareByBoard: {},
      archivedCards: [],
      notifications: [],
      members: [],
      currentBoardId: '',
      currentMemberId: currentUserId
    }
    clearLegacyBoardStorage()
    setStoredBoardId('')
    return emptyStore
  }

  const storedBoardId = getStoredBoardId()
  const resolvedBoardId =
    (selectedBoardId && boardIds.includes(selectedBoardId) && selectedBoardId) ||
    (profileLastBoardId && boardIds.includes(profileLastBoardId) && profileLastBoardId) ||
    (storedBoardId && boardIds.includes(storedBoardId) && storedBoardId) ||
    boardIds[0] ||
    ''

  const detailBoardIds = resolvedBoardId ? [resolvedBoardId] : []

  const [boardMembersResult, boardShareLinksResult, listsResult, labelsResult, notificationsResult] = await Promise.all([
    detailBoardIds.length > 0
      ? supabase.from('board_members').select('board_id,user_id,permission,created_at').in('board_id', detailBoardIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    detailBoardIds.length > 0
      ? supabase.from('board_share_links').select('board_id,token,is_active').in('board_id', detailBoardIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    detailBoardIds.length > 0
      ? supabase.from('lists').select('id,board_id,title,position').in('board_id', detailBoardIds).order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    detailBoardIds.length > 0
      ? supabase.from('labels').select('id,board_id,text,color').in('board_id', detailBoardIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    supabase.from('notifications').select('id,user_id,board_id,card_id,type,title,message,is_read,created_at').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(200)
  ])

  if (boardMembersResult.error) {
    throw new Error(boardMembersResult.error.message)
  }
  if (boardShareLinksResult.error) {
    throw new Error(boardShareLinksResult.error.message)
  }
  if (listsResult.error) {
    throw new Error(listsResult.error.message)
  }
  if (labelsResult.error) {
    throw new Error(labelsResult.error.message)
  }
  if (notificationsResult.error) {
    throw new Error(notificationsResult.error.message)
  }

  const listRows = (listsResult.data as ListRow[] | null) ?? []
  const listIds = listRows.map((row) => row.id)

  const cardsResult =
    listIds.length > 0
      ? await supabase
          .from('cards')
          .select('id,list_id,title,description,due_date,is_completed,position,created_at,updated_at,archived_at')
          .in('list_id', listIds)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      : { data: [], error: null as { message: string } | null }

  if (cardsResult.error) {
    throw new Error(cardsResult.error.message)
  }

  const cardRows = (cardsResult.data as CardRow[] | null) ?? []
  const cardIds = cardRows.map((row) => row.id)

  const [cardLabelsResult, cardMembersResult, cardLinksResult, checklistsResult, activitiesResult] = await Promise.all([
    cardIds.length > 0
      ? supabase.from('card_labels').select('card_id,label_id').in('card_id', cardIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    cardIds.length > 0
      ? supabase.from('card_members').select('card_id,user_id').in('card_id', cardIds)
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    cardIds.length > 0
      ? supabase.from('card_links').select('id,card_id,title,url,type,created_at').in('card_id', cardIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    cardIds.length > 0
      ? supabase.from('checklists').select('id,card_id,title,position').in('card_id', cardIds).order('position', { ascending: true })
      : Promise.resolve({ data: [], error: null as { message: string } | null }),
    cardIds.length > 0
      ? supabase.from('card_activities').select('id,card_id,actor_id,type,message,created_at').in('card_id', cardIds).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null as { message: string } | null })
  ])

  if (cardLabelsResult.error) {
    throw new Error(cardLabelsResult.error.message)
  }
  if (cardMembersResult.error) {
    throw new Error(cardMembersResult.error.message)
  }
  if (cardLinksResult.error) {
    throw new Error(cardLinksResult.error.message)
  }
  if (checklistsResult.error) {
    throw new Error(checklistsResult.error.message)
  }
  if (activitiesResult.error) {
    throw new Error(activitiesResult.error.message)
  }

  const checklistRows = (checklistsResult.data as ChecklistRow[] | null) ?? []
  const checklistIds = checklistRows.map((row) => row.id)

  const checklistItemsResult =
    checklistIds.length > 0
      ? await supabase
          .from('checklist_items')
          .select('id,checklist_id,content,is_done,position')
          .in('checklist_id', checklistIds)
          .order('position', { ascending: true })
      : { data: [], error: null as { message: string } | null }

  if (checklistItemsResult.error) {
    throw new Error(checklistItemsResult.error.message)
  }

  const notificationsRows = (notificationsResult.data as NotificationRow[] | null) ?? []
  const boardMembersRows = (boardMembersResult.data as BoardMemberRow[] | null) ?? []
  const boardShareLinkRows = (boardShareLinksResult.data as BoardShareLinkRow[] | null) ?? []
  const labelRows = (labelsResult.data as LabelRow[] | null) ?? []
  const cardLabelRows = (cardLabelsResult.data as CardLabelRow[] | null) ?? []
  const cardMemberRows = (cardMembersResult.data as CardMemberRow[] | null) ?? []
  const cardLinkRows = (cardLinksResult.data as CardLinkRow[] | null) ?? []
  const checklistItemRows = (checklistItemsResult.data as ChecklistItemRow[] | null) ?? []
  const cardActivityRows = (activitiesResult.data as CardActivityRow[] | null) ?? []
  const resolvedBoardRow = boardRows.find((board) => board.id === resolvedBoardId) ?? null

  const profileIdSet = new Set<string>()
  if (resolvedBoardRow) {
    profileIdSet.add(resolvedBoardRow.owner_id)
  }
  boardMembersRows.forEach((row) => profileIdSet.add(row.user_id))
  cardMemberRows.forEach((row) => profileIdSet.add(row.user_id))
  cardActivityRows.forEach((row) => {
    if (row.actor_id) {
      profileIdSet.add(row.actor_id)
    }
  })

  const profileIds = Array.from(profileIdSet)

  const profilesResult =
    resolvedBoardRow && profileIds.length > 0
      ? await supabase.rpc('list_board_profiles', { p_board_id: resolvedBoardRow.id })
      : profileIds.length > 0
        ? await supabase.from('profiles').select('id,email,full_name').eq('id', currentUserId)
        : { data: [], error: null as { message: string } | null }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message)
  }

  const profileRows = (profilesResult.data as ProfileRow[] | null) ?? []
  const membersMap = new Map<string, Member>()

  profileRows.forEach((profile) => {
    membersMap.set(profile.id, createMember(profile))
  })

  const members = Array.from(membersMap.values())

  const labelsById = new Map<string, Label>()
  const labelsByBoard: Record<string, Label[]> = {}
  labelRows.forEach((labelRow) => {
    const label: Label = {
      id: labelRow.id,
      text: labelRow.text,
      color: labelRow.color
    }
    labelsById.set(label.id, label)
    const boardLabels = labelsByBoard[labelRow.board_id] ?? []
    boardLabels.push(label)
    labelsByBoard[labelRow.board_id] = boardLabels
  })

  if (resolvedBoardId && !Array.isArray(labelsByBoard[resolvedBoardId])) {
    labelsByBoard[resolvedBoardId] = []
  }

  const cardLabelsMap = new Map<string, Label[]>()
  cardLabelRows.forEach((row) => {
    const label = labelsById.get(row.label_id)
    if (!label) {
      return
    }
    const list = cardLabelsMap.get(row.card_id) ?? []
    list.push(label)
    cardLabelsMap.set(row.card_id, list)
  })

  const cardMembersMap = new Map<string, string[]>()
  cardMemberRows.forEach((row) => {
    const list = cardMembersMap.get(row.card_id) ?? []
    list.push(row.user_id)
    cardMembersMap.set(row.card_id, list)
  })

  const cardLinksMap = new Map<string, LinkAttachment[]>()
  cardLinkRows.forEach((row) => {
    const list = cardLinksMap.get(row.card_id) ?? []
    list.push({
      id: row.id,
      title: row.title,
      url: row.url,
      type: row.type,
      createdAt: row.created_at
    })
    cardLinksMap.set(row.card_id, list)
  })

  const checklistsByCardMap = new Map<string, Checklist[]>()
  const checklistRowsByCard = new Map<string, ChecklistRow[]>()
  checklistRows.forEach((row) => {
    const list = checklistRowsByCard.get(row.card_id) ?? []
    list.push(row)
    checklistRowsByCard.set(row.card_id, list)
  })
  checklistRowsByCard.forEach((rows, cardId) => {
    checklistsByCardMap.set(cardId, mapChecklistRows(rows, checklistItemRows))
  })

  const activitiesByCardMap = new Map<string, Activity[]>()
  cardActivityRows.forEach((row) => {
    const list = activitiesByCardMap.get(row.card_id) ?? []
    const actor = row.actor_id ? membersMap.get(row.actor_id) : undefined
    list.push({
      id: row.id,
      type: row.type,
      actorId: row.actor_id ?? currentUserId,
      actorName: actor?.name ?? 'Usuario',
      actorInitials: actor?.initials ?? 'US',
      message: row.message,
      createdAt: row.created_at
    })
    activitiesByCardMap.set(row.card_id, list)
  })

  const listById = new Map(listRows.map((row) => [row.id, row]))
  const boardById = new Map(boardRows.map((row) => [row.id, row]))

  const columns: ColumnData[] = listRows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    title: row.title,
    position: row.position
  }))

  const activeCardRows = cardRows.filter((row) => !row.archived_at)
  const cards: CardData[] = activeCardRows.map((row) => ({
    id: row.id,
    listId: row.list_id,
    title: row.title,
    description: row.description ?? '',
    labels: cardLabelsMap.get(row.id) ?? [],
    memberIds: cardMembersMap.get(row.id) ?? [],
    dueDate: row.due_date ?? undefined,
    isCompleted: row.is_completed,
    checklists: checklistsByCardMap.get(row.id) ?? [],
    links: cardLinksMap.get(row.id) ?? [],
    activities: activitiesByCardMap.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))

  const archivedCards = cardRows
    .filter((row) => row.archived_at)
    .map((row) => {
      const list = listById.get(row.list_id)
      const board = list ? boardById.get(list.board_id) : undefined
      return {
        id: row.id,
        boardId: list?.board_id ?? '',
        boardTitle: board?.title ?? 'Board',
        listId: row.list_id,
        listTitle: list?.title ?? 'Lista',
        title: row.title,
        labels: cardLabelsMap.get(row.id) ?? [],
        archivedAt: row.archived_at ?? row.updated_at
      }
    })
    .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())

  const boardMembershipByBoard = new Map<string, BoardMemberRow[]>()
  boardMembersRows.forEach((row) => {
    const list = boardMembershipByBoard.get(row.board_id) ?? []
    list.push(row)
    boardMembershipByBoard.set(row.board_id, list)
  })
  const boardShareByBoard = new Map(boardShareLinkRows.map((row) => [row.board_id, row]))

  const shareByBoard: Record<string, BoardShareSettings> = {}
  if (resolvedBoardRow) {
    const board = resolvedBoardRow
    const memberships = boardMembershipByBoard.get(board.id) ?? []
    const membersWithOwner = memberships.some((item) => item.user_id === board.owner_id)
      ? memberships
      : [{ board_id: board.id, user_id: board.owner_id, permission: 'edit' as SharePermission, created_at: new Date().toISOString() }, ...memberships]
    const shareLink = boardShareByBoard.get(board.id)
    shareByBoard[board.id] = {
      boardId: board.id,
      linkToken: shareLink?.token ?? createId('share').replace('share_', ''),
      allowLinkAccess: shareLink?.is_active ?? false,
      members: membersWithOwner.map((item) => ({
        memberId: item.user_id,
        permission: item.permission
      }))
    }
  }

  const boards: BoardData[] = boardRows.map((row) => ({
    id: row.id,
    title: row.title,
    color: row.color,
    ownerMemberId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))

  const notifications: MemberNotification[] = notificationsRows.map((row) => ({
    id: row.id,
    memberId: row.user_id,
    boardId: row.board_id,
    cardId: row.card_id ?? '',
    type: row.type,
    title: row.title,
    message: row.message,
    createdAt: row.created_at,
    isRead: row.is_read
  }))

  setStoredBoardId(resolvedBoardId)
  clearLegacyBoardStorage()

  return {
    version: STORE_VERSION,
    boards,
    columns,
    cards,
    labelsByBoard,
    shareByBoard,
    archivedCards,
    notifications,
    members,
    currentBoardId: resolvedBoardId,
    currentMemberId: currentUserId
  }
}

const BOARD_STORE_CACHE_TTL_MS = 5000
const boardStoreCacheByKey = new Map<string, { expiresAt: number; value: BoardStore }>()
const boardStoreInFlightByKey = new Map<string, Promise<BoardStore>>()

function cloneBoardStore(store: BoardStore): BoardStore {
  return JSON.parse(JSON.stringify(store)) as BoardStore
}

function getStoreCacheKey(selectedBoardId?: string): string {
  const normalized = selectedBoardId?.trim()
  return normalized ? `board:${normalized}` : 'board:auto'
}

function invalidateBoardStoreCache(boardId?: string): void {
  if (!boardId) {
    boardStoreCacheByKey.clear()
    return
  }

  boardStoreCacheByKey.delete(getStoreCacheKey(boardId))
  boardStoreCacheByKey.delete(getStoreCacheKey())
}

export async function loadBoardStoreFromRemote(
  selectedBoardId?: string,
  options?: { forceRefresh?: boolean; bypassInFlight?: boolean }
): Promise<BoardStore> {
  const cacheKey = getStoreCacheKey(selectedBoardId)
  const now = Date.now()
  const forceRefresh = options?.forceRefresh === true
  const bypassInFlight = options?.bypassInFlight === true

  if (forceRefresh) {
    boardStoreCacheByKey.delete(cacheKey)
  }

  const cachedEntry = boardStoreCacheByKey.get(cacheKey)
  if (cachedEntry && cachedEntry.expiresAt > now) {
    return cloneBoardStore(cachedEntry.value)
  }

  if (!bypassInFlight) {
    const inFlightPromise = boardStoreInFlightByKey.get(cacheKey)
    if (inFlightPromise) {
      const inFlightStore = await inFlightPromise
      return cloneBoardStore(inFlightStore)
    }

    const promise = fetchBoardStoreFromRemote(selectedBoardId)
    boardStoreInFlightByKey.set(cacheKey, promise)

    try {
      const result = await promise
      boardStoreCacheByKey.set(cacheKey, {
        expiresAt: Date.now() + BOARD_STORE_CACHE_TTL_MS,
        value: cloneBoardStore(result)
      })
      return cloneBoardStore(result)
    } finally {
      boardStoreInFlightByKey.delete(cacheKey)
    }
  }

  const result = await fetchBoardStoreFromRemote(selectedBoardId)
  boardStoreCacheByKey.set(cacheKey, {
    expiresAt: Date.now() + BOARD_STORE_CACHE_TTL_MS,
    value: cloneBoardStore(result)
  })
  return cloneBoardStore(result)
}

export async function updateBoardRemote(boardId: string, payload: { title: string; color: string }): Promise<void> {
  const { error } = await supabase.from('boards').update({ title: payload.title, color: payload.color }).eq('id', boardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function reorderBoardsRemote(orderedBoardIds: string[]): Promise<void> {
  const responses = await Promise.all(
    orderedBoardIds.map((boardId, index) =>
      supabase.from('boards').update({ position: index }).eq('id', boardId)
    )
  )
  const failed = responses.find((response) => response.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }
  invalidateBoardStoreCache()
}

export async function deleteBoardRemote(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache()
}

export async function createBoardRemote(board: BoardData, shareSettings: BoardShareSettings): Promise<void> {
  const { data: lastBoard, error: positionError } = await supabase
    .from('boards')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (positionError) {
    throw new Error(positionError.message)
  }

  const nextPosition = (lastBoard?.position ?? -1) + 1

  const { error: boardError } = await supabase.from('boards').insert({
    id: board.id,
    title: board.title,
    color: board.color,
    owner_id: board.ownerMemberId,
    position: nextPosition,
    created_at: board.createdAt,
    updated_at: board.updatedAt
  })
  if (boardError) {
    throw new Error(boardError.message)
  }

  const ownerMemberships = shareSettings.members.some((member) => member.memberId === board.ownerMemberId)
    ? shareSettings.members
    : [{ memberId: board.ownerMemberId, permission: 'edit' as const }, ...shareSettings.members]

  const validMemberships = ownerMemberships.filter((item) => isUuid(item.memberId))

  if (validMemberships.length > 0) {
    const { error: memberError } = await supabase.from('board_members').upsert(
      validMemberships.map((membership) => ({
        board_id: board.id,
        user_id: membership.memberId,
        permission: membership.permission
      })),
      { onConflict: 'board_id,user_id' }
    )
    if (memberError) {
      throw new Error(memberError.message)
    }
  }

  const { error: shareError } = await supabase.from('board_share_links').upsert(
    {
      board_id: board.id,
      token: shareSettings.linkToken,
      is_active: shareSettings.allowLinkAccess,
      created_by: board.ownerMemberId
    },
    { onConflict: 'board_id' }
  )
  if (shareError) {
    throw new Error(shareError.message)
  }
  invalidateBoardStoreCache()
}

export async function createListRemote(column: ColumnData): Promise<void> {
  const { error } = await supabase.from('lists').insert({
    id: column.id,
    board_id: column.boardId,
    title: column.title,
    position: column.position
  })
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(column.boardId)
}

export async function updateListRemote(columnId: string, payload: { title?: string; position?: number }): Promise<void> {
  const { data: listRow, error: listLookupError } = await supabase.from('lists').select('board_id').eq('id', columnId).maybeSingle()
  if (listLookupError) {
    throw new Error(listLookupError.message)
  }

  const { error } = await supabase.from('lists').update(payload).eq('id', columnId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache((listRow as { board_id?: string } | null)?.board_id)
}

export async function deleteListRemote(columnId: string): Promise<void> {
  const { data: listRow, error: listLookupError } = await supabase.from('lists').select('board_id').eq('id', columnId).maybeSingle()
  if (listLookupError) {
    throw new Error(listLookupError.message)
  }

  const { error } = await supabase.from('lists').delete().eq('id', columnId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache((listRow as { board_id?: string } | null)?.board_id)
}

export async function reorderListsRemote(columns: ColumnData[]): Promise<void> {
  const responses = await Promise.all(
    columns.map((column) =>
      supabase.from('lists').update({ position: column.position }).eq('id', column.id)
    )
  )
  const failed = responses.find((response) => response.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }
  invalidateBoardStoreCache(columns[0]?.boardId)
}

async function replaceCardLabelsRemote(boardId: string, cardId: string, labels: Label[]): Promise<void> {
  const uniqueLabels = Array.from(new Map(labels.map((label) => [label.id, label])).values())
  if (uniqueLabels.length > 0) {
    const { error: labelsError } = await supabase.from('labels').upsert(
      uniqueLabels.map((label) => ({
        id: label.id,
        board_id: boardId,
        text: label.text,
        color: label.color
      })),
      { onConflict: 'id' }
    )
    if (labelsError) {
      throw new Error(labelsError.message)
    }
  }

  const { error: clearError } = await supabase.from('card_labels').delete().eq('card_id', cardId)
  if (clearError) {
    throw new Error(clearError.message)
  }

  if (uniqueLabels.length === 0) {
    return
  }

  const { error: insertError } = await supabase.from('card_labels').insert(
    uniqueLabels.map((label) => ({
      card_id: cardId,
      label_id: label.id
    }))
  )
  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function replaceCardMembersRemote(cardId: string, memberIds: string[]): Promise<void> {
  const validMemberIds = memberIds.filter((memberId) => isUuid(memberId))
  const { error: clearError } = await supabase.from('card_members').delete().eq('card_id', cardId)
  if (clearError) {
    throw new Error(clearError.message)
  }
  if (validMemberIds.length === 0) {
    return
  }
  const { error: insertError } = await supabase.from('card_members').insert(
    validMemberIds.map((memberId) => ({
      card_id: cardId,
      user_id: memberId
    }))
  )
  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function replaceCardLinksRemote(cardId: string, links: LinkAttachment[]): Promise<void> {
  const { error: clearError } = await supabase.from('card_links').delete().eq('card_id', cardId)
  if (clearError) {
    throw new Error(clearError.message)
  }
  if (links.length === 0) {
    return
  }
  const { error: insertError } = await supabase.from('card_links').insert(
    links.map((link) => ({
      id: link.id,
      card_id: cardId,
      title: link.title,
      url: link.url,
      type: link.type,
      created_at: link.createdAt
    }))
  )
  if (insertError) {
    throw new Error(insertError.message)
  }
}

async function replaceCardChecklistsRemote(cardId: string, checklists: Checklist[]): Promise<void> {
  const { error: clearChecklistError } = await supabase.from('checklists').delete().eq('card_id', cardId)
  if (clearChecklistError) {
    throw new Error(clearChecklistError.message)
  }

  if (checklists.length === 0) {
    return
  }

  const checklistRows = checklists.map((checklist, index) => ({
    id: checklist.id,
    card_id: cardId,
    title: checklist.title,
    position: index
  }))

  const { error: insertChecklistError } = await supabase.from('checklists').insert(checklistRows)
  if (insertChecklistError) {
    throw new Error(insertChecklistError.message)
  }

  const itemRows: Array<{ id: string; checklist_id: string; content: string; is_done: boolean; position: number }> = []
  checklists.forEach((checklist) => {
    checklist.items.forEach((item, index) => {
      itemRows.push({
        id: item.id,
        checklist_id: checklist.id,
        content: item.content,
        is_done: item.isDone,
        position: index
      })
    })
  })

  if (itemRows.length > 0) {
    const { error: insertItemsError } = await supabase.from('checklist_items').insert(itemRows)
    if (insertItemsError) {
      throw new Error(insertItemsError.message)
    }
  }
}

async function getBoardIdByCardId(cardId: string): Promise<string | undefined> {
  const { data: cardRow, error: cardLookupError } = await supabase.from('cards').select('list_id').eq('id', cardId).maybeSingle()
  if (cardLookupError) {
    throw new Error(cardLookupError.message)
  }

  const listId = (cardRow as { list_id?: string } | null)?.list_id
  if (!listId) {
    return undefined
  }

  const { data: listRow, error: listLookupError } = await supabase.from('lists').select('board_id').eq('id', listId).maybeSingle()
  if (listLookupError) {
    throw new Error(listLookupError.message)
  }

  return (listRow as { board_id?: string } | null)?.board_id
}

export async function updateCardFieldsRemote(
  cardId: string,
  updates: Partial<Pick<CardData, 'title' | 'description' | 'dueDate' | 'isCompleted' | 'listId' | 'updatedAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = {}

  if ('title' in updates) {
    payload.title = updates.title
  }
  if ('description' in updates) {
    payload.description = updates.description ?? ''
  }
  if ('dueDate' in updates) {
    payload.due_date = updates.dueDate ?? null
  }
  if ('isCompleted' in updates) {
    payload.is_completed = updates.isCompleted
  }
  if ('listId' in updates) {
    payload.list_id = updates.listId
  }
  if ('updatedAt' in updates) {
    payload.updated_at = updates.updatedAt
  }

  if (Object.keys(payload).length === 0) {
    return
  }

  const boardId = await getBoardIdByCardId(cardId)
  const { error } = await supabase.from('cards').update(payload).eq('id', cardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function upsertCardRemote(boardId: string, card: CardData): Promise<void> {
  const { error } = await supabase.from('cards').upsert(
    {
      id: card.id,
      list_id: card.listId,
      title: card.title,
      description: card.description,
      due_date: card.dueDate ?? null,
      is_completed: card.isCompleted,
      archived_at: null,
      created_at: card.createdAt,
      updated_at: card.updatedAt
    },
    { onConflict: 'id' }
  )
  if (error) {
    throw new Error(error.message)
  }

  await replaceCardLabelsRemote(boardId, card.id, card.labels)
  await replaceCardMembersRemote(card.id, card.memberIds)
  await replaceCardLinksRemote(card.id, card.links)
  await replaceCardChecklistsRemote(card.id, card.checklists)
  invalidateBoardStoreCache(boardId)
}

export async function createCardRemote(boardId: string, card: CardData): Promise<void> {
  const { data: maxPositionRow, error: positionError } = await supabase
    .from('cards')
    .select('position')
    .eq('list_id', card.listId)
    .is('archived_at', null)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (positionError) {
    throw new Error(positionError.message)
  }

  const nextPosition = (maxPositionRow?.position ?? -1) + 1

  const { error: insertError } = await supabase.from('cards').insert({
    id: card.id,
    list_id: card.listId,
    title: card.title,
    description: card.description,
    due_date: card.dueDate ?? null,
    is_completed: card.isCompleted,
    position: nextPosition,
    created_at: card.createdAt,
    updated_at: card.updatedAt
  })
  if (insertError) {
    throw new Error(insertError.message)
  }

  await replaceCardLabelsRemote(boardId, card.id, card.labels)
  await replaceCardMembersRemote(card.id, card.memberIds)
  await replaceCardLinksRemote(card.id, card.links)
  await replaceCardChecklistsRemote(card.id, card.checklists)
  invalidateBoardStoreCache(boardId)
}

export async function recordCardActivityRemote(input: RecordCardActivityInput): Promise<void> {
  const boardId = await getBoardIdByCardId(input.cardId)

  const { error } = await supabase.rpc('record_card_activity', {
    p_card_id: input.cardId,
    p_event_type: input.eventType,
    p_message: input.message,
    p_activity_type: input.activityType ?? 'system',
    p_dedupe_window_minutes: input.dedupeWindowMinutes ?? 0
  })

  if (error) {
    throw new Error(error.message)
  }

  invalidateBoardStoreCache(boardId)
}

export async function deleteCardRemote(cardId: string): Promise<void> {
  const boardId = await getBoardIdByCardId(cardId)

  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function archiveCardRemote(cardId: string): Promise<void> {
  const boardId = await getBoardIdByCardId(cardId)

  const { error } = await supabase.from('cards').update({ archived_at: new Date().toISOString() }).eq('id', cardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function restoreArchivedCardRemote(cardId: string): Promise<void> {
  const boardId = await getBoardIdByCardId(cardId)

  const { error } = await supabase.from('cards').update({ archived_at: null }).eq('id', cardId)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function replaceBoardLabelsRemote(boardId: string, labels: Label[]): Promise<void> {
  const uniqueLabels = Array.from(new Map(labels.map((label) => [label.id, label])).values())
  if (uniqueLabels.length > 0) {
    const { error: upsertError } = await supabase.from('labels').upsert(
      uniqueLabels.map((label) => ({
        id: label.id,
        board_id: boardId,
        text: label.text,
        color: label.color
      })),
      { onConflict: 'id' }
    )
    if (upsertError) {
      throw new Error(upsertError.message)
    }
  }

  const { data: existingRows, error: existingError } = await supabase.from('labels').select('id').eq('board_id', boardId)
  if (existingError) {
    throw new Error(existingError.message)
  }

  const keepIds = new Set(uniqueLabels.map((label) => label.id))
  const labelIdsToDelete = ((existingRows as Array<{ id: string }> | null) ?? []).map((row) => row.id).filter((id) => !keepIds.has(id))
  if (labelIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase.from('labels').delete().eq('board_id', boardId).in('id', labelIdsToDelete)
    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }
  invalidateBoardStoreCache(boardId)
}

export async function replaceBoardShareSettingsRemote(boardId: string, ownerMemberId: string, settings: BoardShareSettings): Promise<void> {
  const ownerMember = { memberId: ownerMemberId, permission: 'edit' as const }
  const members = settings.members.some((item) => item.memberId === ownerMemberId) ? settings.members : [ownerMember, ...settings.members]
  const validMembers = members.filter((item) => isUuid(item.memberId))

  const { error: shareError } = await supabase.from('board_share_links').upsert(
    {
      board_id: boardId,
      token: settings.linkToken,
      is_active: settings.allowLinkAccess,
      created_by: ownerMemberId
    },
    { onConflict: 'board_id' }
  )
  if (shareError) {
    throw new Error(shareError.message)
  }

  const membersToKeep = validMembers.map((item) => item.memberId)

  const { data: existingMembersRows, error: existingMembersError } = await supabase
    .from('board_members')
    .select('user_id')
    .eq('board_id', boardId)
    .neq('user_id', ownerMemberId)

  if (existingMembersError) {
    throw new Error(existingMembersError.message)
  }

  const keepMembersSet = new Set(membersToKeep)
  const memberIdsToDelete = ((existingMembersRows as Array<{ user_id: string }> | null) ?? [])
    .map((row) => row.user_id)
    .filter((userId) => !keepMembersSet.has(userId))

  if (memberIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .in('user_id', memberIdsToDelete)
    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  const { error: upsertError } = await supabase.from('board_members').upsert(
    validMembers.map((item) => ({
      board_id: boardId,
      user_id: item.memberId,
      permission: item.permission
    })),
    { onConflict: 'board_id,user_id' }
  )
  if (upsertError) {
    throw new Error(upsertError.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function inviteMemberByEmailRemote(boardId: string, email: string, permission: SharePermission): Promise<{ ok: boolean; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase()
  const { data, error } = await supabase.rpc('invite_board_member_by_email', {
    p_board_id: boardId,
    p_email: normalizedEmail,
    p_permission: permission
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  const row = Array.isArray(data) ? data[0] : null
  if (!row?.ok) {
    const reason = typeof row?.message === 'string' ? row.message : ''
    if (reason === 'forbidden') {
      return { ok: false, message: 'Somente o owner pode convidar participantes.' }
    }
    if (reason === 'board_not_found') {
      return { ok: false, message: 'Board nao encontrado.' }
    }
    if (reason === 'email_required') {
      return { ok: false, message: 'Informe um e-mail valido.' }
    }
    if (reason === 'invalid_domain') {
      return { ok: false, message: 'Use um e-mail corporativo @vende-c.com.' }
    }
    if (reason === 'owner_already_member') {
      return { ok: false, message: 'Este e-mail ja possui acesso.' }
    }
    return { ok: false, message: 'Nao foi possivel adicionar este e-mail.' }
  }

  invalidateBoardStoreCache(boardId)
  const messageCode = typeof row?.message === 'string' ? row.message : ''
  if (messageCode === 'invitation_created') {
    return { ok: true, message: 'Convite enviado. O acesso sera liberado no primeiro login.' }
  }
  if (messageCode === 'member_added') {
    return { ok: true, message: 'Participante adicionado com sucesso.' }
  }
  return { ok: true, message: 'Compartilhamento atualizado com sucesso.' }
}

export async function syncCardsOrderingRemote(boardId: string, columns: ColumnData[], cards: CardData[]): Promise<void> {
  const listIds = new Set(columns.filter((column) => column.boardId === boardId).map((column) => column.id))
  const boardCards = cards.filter((card) => listIds.has(card.listId))
  const positionByList = new Map<string, number>()

  const updates = boardCards.map((card) => {
    const currentListPosition = positionByList.get(card.listId) ?? 0
    positionByList.set(card.listId, currentListPosition + 1)
    return supabase.from('cards').update({ list_id: card.listId, position: currentListPosition }).eq('id', card.id)
  })

  const responses = await Promise.all(updates)
  const failed = responses.find((response) => response.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }
  invalidateBoardStoreCache(boardId)
}

export async function insertNotificationsRemote(notifications: MemberNotification[]): Promise<void> {
  if (notifications.length === 0) {
    return
  }
  const rows = notifications
    .filter((notification) => isUuid(notification.memberId))
    .map((notification) => ({
      id: notification.id,
      user_id: notification.memberId,
      board_id: notification.boardId,
      card_id: notification.cardId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: notification.isRead,
      created_at: notification.createdAt
    }))

  if (rows.length === 0) {
    return
  }

  const { error } = await supabase.from('notifications').upsert(rows, { onConflict: 'id' })
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache(notifications[0]?.boardId)
}

export async function markNotificationsReadRemote(userId: string): Promise<void> {
  if (!isUuid(userId)) {
    return
  }
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false)
  if (error) {
    throw new Error(error.message)
  }
  invalidateBoardStoreCache()
}

export async function joinBoardViaTokenRemote(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_board_via_token', { p_token: token })
  if (error) {
    throw new Error(error.message)
  }
  if (typeof data !== 'string') {
    throw new Error('Token invalido.')
  }
  invalidateBoardStoreCache()
  return data
}

type RealtimeCallback = () => void

type RealtimePayload = {
  eventType?: string
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}

type RealtimeStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

type RealtimeScope = {
  listIds?: string[]
  cardIds?: string[]
  checklistIds?: string[]
}

type RealtimeSubscribeOptions = {
  currentUserId?: string
  initialScope?: RealtimeScope
  onChannelIssue?: (status: Exclude<RealtimeStatus, 'SUBSCRIBED'>) => void
  onSubscribed?: () => void
}

function getPayloadString(payload: RealtimePayload, key: string): string | undefined {
  const nextValue = payload.new?.[key]
  if (typeof nextValue === 'string' && nextValue.length > 0) {
    return nextValue
  }

  const previousValue = payload.old?.[key]
  if (typeof previousValue === 'string' && previousValue.length > 0) {
    return previousValue
  }

  return undefined
}

function syncScopedId(set: Set<string>, id: string | undefined, eventType: string | undefined): void {
  if (!id) {
    return
  }
  if (eventType === 'DELETE') {
    set.delete(id)
    return
  }
  set.add(id)
}

export function subscribeBoardRealtime(boardId: string, onChange: RealtimeCallback, currentUserId?: string): () => void {
  return subscribeBoardRealtimeWithOptions(boardId, onChange, { currentUserId })
}

export function subscribeBoardRealtimeWithOptions(boardId: string, onChange: RealtimeCallback, options?: RealtimeSubscribeOptions): () => void {
  const channel = supabase.channel(`board-sync-${boardId}-${Date.now()}`)
  const scopedListIds = new Set<string>(options?.initialScope?.listIds ?? [])
  const scopedCardIds = new Set<string>(options?.initialScope?.cardIds ?? [])
  const scopedChecklistIds = new Set<string>(options?.initialScope?.checklistIds ?? [])
  let disposed = false
  let hasIssuedErrorSignal = false

  const seedScope = async () => {
    const { data: listRows, error: listError } = await supabase.from('lists').select('id').eq('board_id', boardId)
    if (disposed || listError) {
      return
    }

    const listIds = ((listRows as Array<{ id: string }> | null) ?? []).map((row) => row.id)
    listIds.forEach((id) => scopedListIds.add(id))
    if (listIds.length === 0) {
      return
    }

    const { data: cardRows, error: cardError } = await supabase.from('cards').select('id,list_id').in('list_id', listIds)
    if (disposed || cardError) {
      return
    }

    const cardIds = ((cardRows as Array<{ id: string; list_id: string }> | null) ?? [])
      .filter((row) => scopedListIds.has(row.list_id))
      .map((row) => row.id)
    cardIds.forEach((id) => scopedCardIds.add(id))
    if (cardIds.length === 0) {
      return
    }

    const { data: checklistRows, error: checklistError } = await supabase.from('checklists').select('id,card_id').in('card_id', cardIds)
    if (disposed || checklistError) {
      return
    }

      ;((checklistRows as Array<{ id: string; card_id: string }> | null) ?? [])
        .filter((row) => scopedCardIds.has(row.card_id))
        .forEach((row) => scopedChecklistIds.add(`${row.card_id}:${row.id}`))
  }

  const notifyChannelIssue = (status: Exclude<RealtimeStatus, 'SUBSCRIBED'>) => {
    if (hasIssuedErrorSignal) {
      return
    }
    hasIssuedErrorSignal = true
    options?.onChannelIssue?.(status)
  }

  const isScopedCardEvent = (payload: RealtimePayload): boolean => {
    const listId = getPayloadString(payload, 'list_id')
    const cardId = getPayloadString(payload, 'id')
    const isKnownCard = Boolean(cardId && scopedCardIds.has(cardId))
    const isInCurrentBoardList = Boolean(listId && scopedListIds.has(listId))

    if (!isInCurrentBoardList && !isKnownCard) {
      if (!listId && !cardId) {
        onChange()
      }
      return false
    }

    syncScopedId(scopedCardIds, cardId, payload.eventType)
    if (payload.eventType === 'DELETE' && cardId) {
      const checklistIdsToDelete: string[] = []
      scopedChecklistIds.forEach((checklistId) => {
        if (checklistId.startsWith(`${cardId}:`)) {
          checklistIdsToDelete.push(checklistId)
        }
      })
      checklistIdsToDelete.forEach((checklistId) => scopedChecklistIds.delete(checklistId))
    }
    return true
  }

  const isScopedCardChildEvent = (payload: RealtimePayload, key: string = 'card_id'): boolean => {
    const cardId = getPayloadString(payload, key)
    return Boolean(cardId && scopedCardIds.has(cardId))
  }

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` }, onChange)
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `board_id=eq.${boardId}` }, (payload) => {
    const typedPayload = payload as RealtimePayload
    syncScopedId(scopedListIds, getPayloadString(typedPayload, 'id'), typedPayload.eventType)
    onChange()
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'labels', filter: `board_id=eq.${boardId}` }, onChange)
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'board_members', filter: `board_id=eq.${boardId}` }, onChange)
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'board_share_links', filter: `board_id=eq.${boardId}` }, onChange)
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, (payload) => {
    if (isScopedCardEvent(payload as RealtimePayload)) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'card_labels' }, (payload) => {
    if (isScopedCardChildEvent(payload as RealtimePayload)) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'card_members' }, (payload) => {
    if (isScopedCardChildEvent(payload as RealtimePayload)) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'card_links' }, (payload) => {
    if (isScopedCardChildEvent(payload as RealtimePayload)) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'card_activities' }, (payload) => {
    if (isScopedCardChildEvent(payload as RealtimePayload)) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'checklists' }, (payload) => {
    const typedPayload = payload as RealtimePayload
    const checklistId = getPayloadString(typedPayload, 'id')
    if (!isScopedCardChildEvent(typedPayload)) {
      return
    }
    const cardId = getPayloadString(typedPayload, 'card_id')
    if (checklistId && cardId) {
      const scopedChecklistId = `${cardId}:${checklistId}`
      syncScopedId(scopedChecklistIds, scopedChecklistId, typedPayload.eventType)
    }
    onChange()
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'checklist_items' }, (payload) => {
    const typedPayload = payload as RealtimePayload
    const checklistId = getPayloadString(typedPayload, 'checklist_id')
    if (!checklistId) {
      onChange()
      return
    }
    const hasChecklistInScope = Array.from(scopedChecklistIds).some((value) => value.endsWith(`:${checklistId}`))
    if (hasChecklistInScope) {
      onChange()
    }
  })
  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
    if (!options?.currentUserId) {
      onChange()
      return
    }

    const userId = getPayloadString(payload as RealtimePayload, 'user_id')
    if (userId === options.currentUserId) {
      onChange()
    }
  })

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      hasIssuedErrorSignal = false
      options?.onSubscribed?.()
      return
    }
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      notifyChannelIssue(status)
    }
  })
  void seedScope()

  return () => {
    disposed = true
    void supabase.removeChannel(channel)
  }
}
