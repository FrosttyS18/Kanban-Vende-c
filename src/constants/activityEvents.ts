import { type CardActivityEventType } from '@/types'

export const ALLOWED_ACTIVITY_EVENTS = ['comment_added', 'card_moved'] as const satisfies readonly CardActivityEventType[]

const allowedActivityEventsSet = new Set<CardActivityEventType>(ALLOWED_ACTIVITY_EVENTS)

export function isAllowedCardActivityEvent(eventType: CardActivityEventType): boolean {
  return allowedActivityEventsSet.has(eventType)
}
