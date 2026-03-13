import { type BoardData, type BoardShareSettings, type BoardStore, type CardData, type ColumnData, type Label, type Member } from '@/types'

const STORAGE_KEY = 'kanban_vndc_store_v1'
const STORE_VERSION = 2

const LEGACY_KEYS = ['board_columns', 'board_cards', 'board_labels', 'archived_cards', 'kanban_vndc_store_v0']

const MEMBER_SEED = [
  { name: 'Wesley', email: 'wesley@vende-c.com', color: '#facc15' },
  { name: 'Douglas', email: 'douglas@vende-c.com', color: '#b700ff' },
  { name: 'Henrique', email: 'henrique@vende-c.com', color: '#006fff' },
  { name: 'Rafael TSUMI', email: 'rafael@vende-c.com', color: '#00e5ff' }
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

function deriveNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'usuario'
  return localPart
    .split(/[._-]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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

function buildSeedMembers(userEmail?: string): Member[] {
  const seeded = MEMBER_SEED.map((entry) => createMember(entry.name, entry.email, entry.color))

  if (!userEmail) {
    return seeded
  }

  const exists = seeded.some((member) => member.email.toLowerCase() === userEmail.toLowerCase())
  if (exists) {
    return seeded
  }

  return [createMember(deriveNameFromEmail(userEmail), userEmail, '#ff0068'), ...seeded]
}

function createDefaultBoards(): BoardData[] {
  const now = new Date().toISOString()
  return [
    {
      id: createId('board'),
      title: 'VENDE-C - Social Media',
      createdAt: now,
      updatedAt: now
    },
    {
      id: createId('board'),
      title: 'Time - Audio visual',
      createdAt: now,
      updatedAt: now
    }
  ]
}

function createDefaultLabels(): Label[] {
  return [
    { id: createId('label'), text: 'Wesley', color: '#facc15' },
    { id: createId('label'), text: 'Douglas', color: '#b700ff' },
    { id: createId('label'), text: 'Henrique', color: '#006fff' },
    { id: createId('label'), text: 'Rafael TSUMI', color: '#00e5ff' }
  ]
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
      labels: getLabel('Wesley'),
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
      labels: [...getLabel('Wesley'), ...getLabel('Douglas')],
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
      labels: getLabel('Henrique'),
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
      labels: getLabel('Rafael TSUMI'),
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

function createFreshStore(userEmail?: string): BoardStore {
  const boards = createDefaultBoards()
  const members = buildSeedMembers(userEmail)
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
      normalized[board.id] = createShareSettings(board.id, members)
      return
    }

    normalized[board.id] = {
      boardId: board.id,
      linkToken: existing.linkToken || createLinkToken(),
      allowLinkAccess: typeof existing.allowLinkAccess === 'boolean' ? existing.allowLinkAccess : true,
      members: Array.isArray(existing.members) ? existing.members.filter((item) => members.some((member) => member.id === item.memberId)) : []
    }
  })

  return normalized
}

function normalizeStore(raw: BoardStore, userEmail?: string): BoardStore {
  const safeBoards = Array.isArray(raw.boards) ? raw.boards : []
  const boards = safeBoards.length > 0 ? safeBoards : createDefaultBoards()

  const safeColumns = Array.isArray(raw.columns) ? raw.columns : []
  const columns = safeColumns.length > 0 ? safeColumns : createDefaultLists(boards[0].id, boards[1]?.id ?? boards[0].id)

  const safeCards = Array.isArray(raw.cards) ? raw.cards : []
  const labelsByBoard = raw.labelsByBoard && typeof raw.labelsByBoard === 'object' ? raw.labelsByBoard : {}

  boards.forEach((board, index) => {
    if (!Array.isArray(labelsByBoard[board.id])) {
      labelsByBoard[board.id] = index === 0 ? createDefaultLabels() : []
    }
  })

  const members = Array.isArray(raw.members) && raw.members.length > 0 ? raw.members : buildSeedMembers(userEmail)

  if (userEmail) {
    const hasUser = members.some((member) => member.email.toLowerCase() === userEmail.toLowerCase())
    if (!hasUser) {
      members.unshift(createMember(deriveNameFromEmail(userEmail), userEmail, '#ff0068'))
    }
  }

  const shareByBoard = normalizeShareByBoard(raw.shareByBoard, boards, members)

  const currentMemberId = members.some((member) => member.id === raw.currentMemberId)
    ? raw.currentMemberId
    : members[0]?.id ?? ''

  const currentBoardId = boards.some((board) => board.id === raw.currentBoardId)
    ? raw.currentBoardId
    : boards[0].id

  return {
    ...raw,
    version: STORE_VERSION,
    boards,
    columns,
    cards: safeCards,
    labelsByBoard,
    shareByBoard,
    archivedCards: Array.isArray(raw.archivedCards) ? raw.archivedCards : [],
    members,
    currentBoardId,
    currentMemberId
  }
}

export function loadBoardStore(userEmail?: string): BoardStore {
  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    clearLegacyStorage()
    const fresh = createFreshStore(userEmail)
    saveBoardStore(fresh)
    return fresh
  }

  try {
    const parsed = JSON.parse(raw) as BoardStore
    if (parsed.version !== STORE_VERSION) {
      clearLegacyStorage()
      const fresh = createFreshStore(userEmail)
      saveBoardStore(fresh)
      return fresh
    }

    const normalized = normalizeStore(parsed, userEmail)
    saveBoardStore(normalized)
    return normalized
  } catch {
    clearLegacyStorage()
    const fresh = createFreshStore(userEmail)
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
