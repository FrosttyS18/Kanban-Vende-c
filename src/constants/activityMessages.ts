export const ACTIVITY_MESSAGES = {
  memberAssignedTitle: 'Voc\u00ea foi adicionado em um cart\u00e3o',
  memberAssignedMessage: (actorName: string, cardTitle: string) => `${actorName} adicionou voc\u00ea em "${cardTitle}".`,
  cardCreatedInList: (listTitle: string) => `adicionou este cart\u00e3o a ${listTitle}.`,
  cardMovedToList: (listTitle: string) => `moveu o cart\u00e3o para ${listTitle}.`
} as const
