export const ACTIVITY_MESSAGES = {
  memberAssignedTitle: 'Você foi adicionado em um cartão',
  memberAssignedMessage: (actorName: string, cardTitle: string) => `${actorName} adicionou você em "${cardTitle}".`,
  cardCreatedInList: (listTitle: string) => `adicionou este cartão a ${listTitle}.`,
  cardMovedToList: (listTitle: string) => `moveu o cartão para ${listTitle}.`
} as const

