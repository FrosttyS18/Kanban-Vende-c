export interface Label {
  id: string
  text: string
  color: string
}

export interface Member {
  id: string
  name: string
  email: string
  initials: string
  color: string
}

export type SharePermission = 'view' | 'edit'

export interface BoardShareMember {
  memberId: string
  permission: SharePermission
}

export interface BoardShareSettings {
  boardId: string
  linkToken: string
  allowLinkAccess: boolean
  members: BoardShareMember[]
}

export interface LinkAttachment {
  id: string
  title: string
  url: string
  type: 'drive' | 'figma' | 'other'
  createdAt: string
}

export interface Attachment {
  id: string
  name: string
  url: string
  date: string
  isCover: boolean
  dominantColor?: string
}

export interface ChecklistItem {
  id: string
  content: string
  isDone: boolean
}

export interface Checklist {
  id: string
  title: string
  items: ChecklistItem[]
}

export interface Activity {
  id: string
  type: 'comment' | 'system'
  actorId: string
  actorName: string
  actorInitials: string
  message: string
  createdAt: string
}

export interface MemberNotification {
  id: string
  memberId: string
  boardId: string
  cardId: string
  type: 'member_assigned'
  title: string
  message: string
  createdAt: string
  isRead: boolean
}

export interface CardData {
  id: string
  listId: string
  title: string
  description: string
  labels: Label[]
  memberIds: string[]
  dueDate?: string
  isCompleted: boolean
  checklists: Checklist[]
  links: LinkAttachment[]
  activities: Activity[]
  createdAt: string
  updatedAt: string
}

export interface ColumnData {
  id: string
  boardId: string
  title: string
  position: number
}

export interface BoardData {
  id: string
  title: string
  color: string
  ownerMemberId: string
  createdAt: string
  updatedAt: string
}

export interface ArchivedCardData {
  id: string
  boardId: string
  boardTitle: string
  listId: string
  listTitle: string
  title: string
  labels: Label[]
  archivedAt: string
}

export interface BoardStore {
  version: number
  boards: BoardData[]
  columns: ColumnData[]
  cards: CardData[]
  labelsByBoard: Record<string, Label[]>
  shareByBoard: Record<string, BoardShareSettings>
  archivedCards: ArchivedCardData[]
  notifications: MemberNotification[]
  members: Member[]
  currentBoardId: string
  currentMemberId: string
}
