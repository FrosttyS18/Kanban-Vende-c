export interface Label {
  id: string
  text: string
  color: string
}

export interface Attachment {
  id: string
  name: string
  url: string
  date: string
  isCover: boolean
  dominantColor?: string
}

export interface Activity {
  id: string
  user: string
  userInitials: string
  action: string
  date: string
  type: 'comment' | 'move'
}

export interface CardData {
  id: number | string
  columnId: string
  title: string
  labels: Label[]
  cover: boolean
  dueDate?: string
  members?: string[]
  isCompleted?: boolean
  description?: string
  activities?: Activity[]
  attachments?: Attachment[]
}

export interface ColumnData {
  id: string
  title: string
}
