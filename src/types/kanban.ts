export type ID = string

export type Profile = {
  id: ID
  email: string
  avatarUrl?: string
  fullName?: string
}

export type Label = {
  id: ID
  boardId: ID
  name: string
  colorHex: string
}

export type Board = {
  id: ID
  title: string
  backgroundColor?: string
}

export type List = {
  id: ID
  boardId: ID
  title: string
  positionOrder: number
}

export type Card = {
  id: ID
  listId: ID
  title: string
  description?: string
  dueDate?: string
  positionOrder: number
  coverImageUrl?: string
  labelIds?: ID[]
  memberIds?: ID[]
}

export type Checklist = {
  id: ID
  cardId: ID
  title: string
}

export type ChecklistItem = {
  id: ID
  checklistId: ID
  content: string
  isChecked: boolean
}

export type Activity = {
  id: ID
  cardId: ID
  userId: ID
  actionType: string
  createdAt: string
}
