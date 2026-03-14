import { type BoardData, type BoardShareSettings, type BoardStore, type CardData, type ColumnData, type Label, type Member } from '@/types'

const STORAGE_KEY = 'kanban_vndc_store_v1'
const STORE_VERSION = 2

const LEGACY_KEYS = ['board_columns', 'board_cards', 'board_labels', 'archived_cards', 'kanban_vndc_store_v0']

const MEMBER_SEED = [{ name: 'Wesley Lima', email: 'wesley.lima@vende-c.com', color: '#ff0068' }]
const LEGACY_FAKE_MEMBER_EMAILS = new Set(['wesley@vende-c.com', 'douglas@vende-c.com', 'henrique@vende-c.com', 'rafael@vende-c.com'])

const BOARD_COLOR_PALETTE = [
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

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function createLinkToken(): string {
  return Math.random().toString(36).slice(2, 12)
}

function getInitials(input: string): string {
  const parts = input
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(' ')
    .filter(Boolean)

  if (parts.length === 0) {
    return 'US'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function createMember(name: string, email: string, color: string): Member {
  return {
    id: createId('member'),
    name,
    email,
    initials: getInitials(name),
    color
  }
}

function createShareSettings(boardId: string, members: Member[]): BoardShareSettings {
  return {
    boardId,
    linkToken: createLinkToken(),
    allowLinkAccess: true,
    members: members.slice(0, 1).map((member) => ({ memberId: member.id, permission: 'edit' }))
  }
}

function buildSeedMembers(): Member[] {
  const seeded = MEMBER_SEED.map((entry) => createMember(entry.name, entry.email, entry.color))

  return seeded
}

function createDefaultBoards(): BoardData[] {
  const now = new Date().toISOString()
  const ownerMemberId = createId('member_owner_placeholder')
  return [
    {
      id: createId('board'),
      title: 'VENDE-C - Social Media',
      color: '#ff0068',
      ownerMemberId,
      createdAt: now,
      updatedAt: now
    },
    {
      id: createId('board'),
      title: 'Time - Audio visual',
      color: '#0ea5e9',
      ownerMemberId,
      createdAt: now,
      updatedAt: now
    }
  ]
}

function createDefaultLabels(): Label[] {
  return [{ id: createId('label'), text: 'Wesley Lima', color: '#ff0068' }]
}

function toISO(offsetHours: number): string {
  const date = new Date()
  date.setHours(date.getHours() + offsetHours)
  return date.toISOString()
}

function createDefaultLists(primaryBoardId: string, secondaryBoardId: string): ColumnData[] {
  return [
    { id: createId('list'), boardId: primaryBoardId, title: 'IDEIAS', position: 0 },
    { id: createId('list'), boardId: primaryBoardId, title: 'TITULO', position: 1 },
    { id: createId('list'), boardId: secondaryBoardId, title: 'IDEIAS', position: 0 }
  ]
}

function createDefaultCards(columns: ColumnData[], labels: Label[]): CardData[] {
  const ideasList = columns.find((column) => column.title === 'IDEIAS')
  if (!ideasList) {
    return []
  }

  const getLabel = (text: string) => labels.filter((label) => label.text === text)

  const now = new Date().toISOString()

  return [
    {
      id: createId('card'),
      listId: ideasList.id,
      title: 'CARROSSEL TENDENCIAS DE CONSUMO',
      description: '',
      labels: getLabel('Wesley Lima'),
      memberIds: [],
      dueDate: toISO(2),
      isCompleted: true,
      checklists: [],
      links: [{ id: createId('link'), title: 'Link do google drive', url: 'https://drive.google.com', type: 'drive', createdAt: now }],
      activities: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: createId('card'),
      listId: ideasList.id,
      title: 'Template workshop Novas imagens thumbs',
      description: '',
      labels: getLabel('Wesley Lima'),
      memberIds: [],
      dueDate: toISO(-10),
      isCompleted: false,
      checklists: [],
      links: [
        { id: createId('link'), title: 'Drive 1', url: 'https://drive.google.com', type: 'drive', createdAt: now },
        { id: createId('link'), title: 'Drive 2', url: 'https://drive.google.com', type: 'drive', createdAt: now },
        { id: createId('link'), title: 'Figma', url: 'https://figma.com', type: 'figma', createdAt: now }
      ],
      activities: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: createId('card'),
      listId: ideasList.id,
      title: 'Template workshop Novas imagens thumbs',
      description: '',
      labels: getLabel('Wesley Lima'),
      memberIds: [],
      dueDate: toISO(20),
      isCompleted: false,
      checklists: [],
      links: [{ id: createId('link'), title: 'Drive', url: 'https://drive.google.com', type: 'drive', createdAt: now }],
      activities: [],
      createdAt: now,
      updatedAt: now
    },
    {
      id: createId('card'),
      listId: ideasList.id,
      title: 'Template workshop Novas imagens thumbs',
      description: '',
      labels: getLabel('Wesley Lima'),
      memberIds: [],
      dueDate: toISO(240),
      isCompleted: false,
      checklists: [],
      links: [{ id: createId('link'), title: 'Drive', url: 'https://drive.google.com', type: 'drive', createdAt: now }],
      activities: [],
      createdAt: now,
      updatedAt: now
    }
  ]
}

function createFreshStore(): BoardStore {
  const members = buildSeedMembers()
  const ownerMemberId = members[0]?.id ?? ''
  const boards = createDefaultBoards().map((board) => ({ ...board, ownerMemberId }))
  const labels = createDefaultLabels()
  const columns = createDefaultLists(boards[0].id, boards[1].id)
  const cards = createDefaultCards(columns, labels)

  return {
    version: STORE_VERSION,
    boards,
    columns,
    cards,
    labelsByBoard: {
      [boards[0].id]: labels,
      [boards[1].id]: []
    },
    shareByBoard: {
      [boards[0].id]: createShareSettings(boards[0].id, members),
      [boards[1].id]: createShareSettings(boards[1].id, members)
    },
    archivedCards: [],
    notifications: [],
    members,
    currentBoardId: boards[0].id,
    currentMemberId: members[0]?.id ?? ''
  }
}

function clearLegacyStorage(): void {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key))
}

function normalizeShareByBoard(rawShareByBoard: BoardStore['shareByBoard'], boards: BoardData[], members: Member[]): BoardStore['shareByBoard'] {
  const normalized: BoardStore['shareByBoard'] = {}

  boards.forEach((board) => {
    const existing = rawShareByBoard?.[board.id]
    if (!existing) {
      normalized[board.id] = {
        ...createShareSettings(board.id, members),
        members: [{ memberId: board.ownerMemberId, permission: 'edit' }]
      }
      return
    }

    const validMembers = Array.isArray(existing.members) ? existing.members.filter((item) => members.some((member) => member.id === item.memberId)) : []
    const hasOwner = validMembers.some((item) => item.memberId === board.ownerMemberId)
    const membersWithOwner = hasOwner ? validMembers : [{ memberId: board.ownerMemberId, permission: 'edit' as const }, ...validMembers]

    normalized[board.id] = {
      boardId: board.id,
      linkToken: existing.linkToken || createLinkToken(),
      allowLinkAccess: typeof existing.allowLinkAccess === 'boolean' ? existing.allowLinkAccess : true,
      members: membersWithOwner
    }
  })

  return normalized
}

function normalizeStore(raw: BoardStore): BoardStore {
  const safeBoards = Array.isArray(raw.boards) ? raw.boards : []
  const boards =
    safeBoards.length > 0
      ? safeBoards.map((board, index) => ({
          ...board,
          color: board.color || BOARD_COLOR_PALETTE[index % BOARD_COLOR_PALETTE.length]
        }))
      : createDefaultBoards()

  const safeColumns = Array.isArray(raw.columns) ? raw.columns : []
  const columns = safeColumns.length > 0 ? safeColumns : createDefaultLists(boards[0].id, boards[1]?.id ?? boards[0].id)

  const safeCards = Array.isArray(raw.cards) ? raw.cards : []
  const labelsByBoard = raw.labelsByBoard && typeof raw.labelsByBoard === 'object' ? raw.labelsByBoard : {}

  boards.forEach((board, index) => {
    if (!Array.isArray(labelsByBoard[board.id])) {
      labelsByBoard[board.id] = index === 0 ? createDefaultLabels() : []
    }
  })

  const baseMembers = Array.isArray(raw.members) && raw.members.length > 0 ? raw.members : buildSeedMembers()
  const corporateEmail = MEMBER_SEED[0].email.toLowerCase()
  const membersByEmail = new Map<string, Member>()
  baseMembers.forEach((member) => {
    const normalizedEmail = member.email.toLowerCase()
    if (LEGACY_FAKE_MEMBER_EMAILS.has(normalizedEmail)) {
      return
    }
    membersByEmail.set(normalizedEmail, member)
  })
  if (!membersByEmail.has(corporateEmail)) {
    const corporateSeed = MEMBER_SEED[0]
    membersByEmail.set(corporateEmail, createMember(corporateSeed.name, corporateSeed.email, corporateSeed.color))
  }
  const members = Array.from(membersByEmail.values())
  const fallbackOwnerMemberId = members[0]?.id ?? ''
  const boardsWithOwner = boards.map((board) => ({
    ...board,
    ownerMemberId: board.ownerMemberId && members.some((member) => member.id === board.ownerMemberId) ? board.ownerMemberId : fallbackOwnerMemberId
  }))

  const shareByBoard = normalizeShareByBoard(raw.shareByBoard, boardsWithOwner, members)

  const currentMemberId = members.some((member) => member.id === raw.currentMemberId) ? raw.currentMemberId : members[0]?.id ?? ''

  const currentBoardId = boardsWithOwner.some((board) => board.id === raw.currentBoardId)
    ? raw.currentBoardId
    : boardsWithOwner[0].id

  const validMemberIds = new Set(members.map((member) => member.id))
  const cards = safeCards.map((card) => ({
    ...card,
    memberIds: card.memberIds.filter((memberId) => validMemberIds.has(memberId))
  }))
  const notifications =
    Array.isArray(raw.notifications) && raw.notifications.length > 0
      ? raw.notifications.filter((notification) => validMemberIds.has(notification.memberId))
      : []

  return {
    ...raw,
    version: STORE_VERSION,
    boards: boardsWithOwner,
    columns,
    cards,
    labelsByBoard,
    shareByBoard,
    archivedCards: Array.isArray(raw.archivedCards) ? raw.archivedCards : [],
    notifications,
    members,
    currentBoardId,
    currentMemberId
  }
}

export function loadBoardStore(): BoardStore {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    clearLegacyStorage()
    const fresh = createFreshStore()
    saveBoardStore(fresh)
    return fresh
  }

  try {
    const parsed = JSON.parse(raw) as BoardStore
    if (parsed.version !== STORE_VERSION) {
      clearLegacyStorage()
      const fresh = createFreshStore()
      saveBoardStore(fresh)
      return fresh
    }

    const normalized = normalizeStore(parsed)
    saveBoardStore(normalized)
    return normalized
  } catch {
    clearLegacyStorage()
    const fresh = createFreshStore()
    saveBoardStore(fresh)
    return fresh
  }
}

export function saveBoardStore(store: BoardStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getStorageKey(): string {
  return STORAGE_KEY
}
