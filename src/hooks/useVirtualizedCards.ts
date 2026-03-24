import { useVirtualizer } from '@tanstack/react-virtual'
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
  const shouldVirtualize = enabled && cards.length > 15

  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? cards.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => CARD_HEIGHT_ESTIMATE,
    overscan: CARD_OVERSCAN
  })

  const activeScrollOffset = shouldVirtualize ? (rowVirtualizer.scrollOffset ?? 0) : 0
  const totalSize = shouldVirtualize ? cards.length * CARD_HEIGHT_ESTIMATE : 0
  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : []

  return {
    virtualItems,
    totalSize,
    scrollOffset: activeScrollOffset,
    isVirtualizationEnabled: shouldVirtualize
  }
}
