import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { type CardData } from '@/types'

const CARD_HEIGHT_ESTIMATE = 100
const CARD_OVERSCAN = 3

type UseVirtualizedCardsOptions = {
  cards: CardData[]
  containerRef: React.RefObject<HTMLDivElement | null>
  enabled?: boolean
}

type UseVirtualizedCardsResult = {
  virtualItems: Array<{ index: number; start: number; size: number; key: React.Key }>
  totalSize: number
  scrollOffset: number
  isVirtualizationEnabled: boolean
}

export function useVirtualizedCards({
  cards,
  containerRef,
  enabled = true
}: UseVirtualizedCardsOptions): UseVirtualizedCardsResult {
  const scrollOffsetRef = useRef(0)

  const shouldVirtualize = enabled && cards.length > 15

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? cards.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: CARD_OVERSCAN
  })

  const getVirtualItems = rowVirtualizer.getVirtualItems
  const virtualItems = shouldVirtualize ? getVirtualItems() : []

  return {
    virtualItems,
    totalSize: rowVirtualizer.getTotalSize(),
    scrollOffset: scrollOffsetRef.current,
    isVirtualizationEnabled: shouldVirtualize
  }
}
