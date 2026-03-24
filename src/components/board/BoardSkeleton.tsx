type BoardSkeletonProps = {
  columnCount?: number
}

function SkeletonColumn({ index }: { index: number }) {
  const cardHeights = [80, 120, 95, 140, 110, 85, 130, 100]
  const cardCount = cardHeights.length

  return (
    <div className="flex w-68.25 shrink-0 flex-col rounded-2xl bg-[#101204]">
      <div className="flex items-center gap-2 px-4 pb-3 pt-3">
        <div className={`size-5 rounded-md skeleton-shimmer`} />
        <div className={`h-5 w-32 rounded-md skeleton-shimmer`} />
      </div>

      <div className="flex-1 space-y-2 px-2 pb-2">
        {Array.from({ length: cardCount }).map((_, cardIndex) => (
          <div
            key={`skeleton-card-${index}-${cardIndex}`}
            className="rounded-xl skeleton-shimmer"
            style={{ height: cardHeights[cardIndex % cardHeights.length] }}
          />
        ))}
      </div>

      <div className="px-4 pb-4 pt-2">
        <div className={`h-5.5 w-full rounded-md skeleton-shimmer`} />
      </div>
    </div>
  )
}

export default function BoardSkeleton({ columnCount = 5 }: BoardSkeletonProps) {
  return (
    <div className="flex h-full w-full items-start gap-4 overflow-x-auto px-6 py-6">
      {Array.from({ length: columnCount }).map((_, index) => (
        <SkeletonColumn key={`skeleton-column-${index}`} index={index} />
      ))}
    </div>
  )
}
