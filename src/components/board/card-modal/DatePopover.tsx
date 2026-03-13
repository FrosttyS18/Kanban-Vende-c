import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef } from 'react'

type DatePopoverProps = {
  isOpen: boolean
  anchorEl: HTMLButtonElement | null
  dueDate: string
  dueTime: string
  onDateChange: (value: string) => void
  onTimeChange: (value: string) => void
  onSave: () => void
  onRemove: () => void
  onClose: () => void
}

type PopoverPosition = {
  top: number
  left: number
}

const POPOVER_WIDTH = 336
const POPOVER_HEIGHT = 252
const VIEWPORT_PADDING = 12

function getTodayDate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function DatePopover({
  isOpen,
  anchorEl,
  dueDate,
  dueTime,
  onDateChange,
  onTimeChange,
  onSave,
  onRemove,
  onClose
}: DatePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  const position = useMemo<PopoverPosition | null>(() => {
    if (!isOpen || !anchorEl) {
      return null
    }

    const rect = anchorEl.getBoundingClientRect()

    let left = rect.left
    if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    let top = rect.bottom + 8
    if (top + POPOVER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = Math.max(VIEWPORT_PADDING, rect.top - POPOVER_HEIGHT - 8)
    }

    return { top, left }
  }, [anchorEl, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target)) {
        return
      }
      if (anchorEl?.contains(target)) {
        return
      }
      onClose()
    }

    window.addEventListener('keydown', onEscape)
    window.addEventListener('mousedown', onPointerDown)

    return () => {
      window.removeEventListener('keydown', onEscape)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [anchorEl, isOpen, onClose])

  if (!isOpen || !anchorEl || !position) {
    return null
  }

  return createPortal(
    <div
      ref={popoverRef}
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      className="fixed z-[75] rounded-[10px] border border-[#3f3f3f] bg-[#2a2b2f] p-3 shadow-2xl"
      role="dialog"
      aria-label={'Configura\u00e7\u00e3o de data de entrega'}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[16px] font-semibold text-[#d1d1d1]">Datas</h4>
        <button type="button" onClick={onClose} className="rounded-[4px] px-1 text-[20px] leading-none text-[#8b8b8b] hover:text-white" aria-label="Fechar datas">
          &times;
        </button>
      </div>

      <div className="mt-3">
        <p className="text-sm font-semibold text-[#d1d1d1]">Data de entrega</p>
        <div className="mt-2 grid grid-cols-[1fr_120px] gap-2">
          <input
            type="date"
            value={dueDate}
            min={getTodayDate()}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-10 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] outline-none focus:border-[#ff0068]"
          />
          <input
            type="time"
            value={dueTime}
            onChange={(event) => onTimeChange(event.target.value)}
            className="h-10 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] outline-none focus:border-[#ff0068]"
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <button type="button" onClick={onSave} className="h-10 rounded-[6px] bg-[#ff0068] text-sm font-semibold text-white hover:brightness-110">
          Salvar
        </button>
        <button type="button" onClick={onRemove} className="h-10 rounded-[6px] bg-[#35363a] text-sm font-semibold text-[#d1d1d1] hover:bg-[#3f4045]">
          Remover
        </button>
      </div>
    </div>,
    document.body
  )
}

