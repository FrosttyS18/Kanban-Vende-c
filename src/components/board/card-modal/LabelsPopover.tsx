import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef } from 'react'
import { type Label } from '@/types'

type LabelsPopoverProps = {
  isOpen: boolean
  anchorEl: HTMLButtonElement | null
  availableLabels: Label[]
  selectedLabelIds: string[]
  searchValue: string
  newLabelName: string
  newLabelColor: string
  colorOptions: string[]
  onSearchChange: (value: string) => void
  onNewLabelNameChange: (value: string) => void
  onNewLabelColorChange: (value: string) => void
  onToggleLabel: (label: Label) => void
  onCreateLabel: () => void
  onClose: () => void
}

type Position = {
  top: number
  left: number
}

const POPOVER_WIDTH = 305
const POPOVER_HEIGHT = 430
const VIEWPORT_PADDING = 12

function getTextClass(color: string): string {
  const value = color.replace('#', '')
  if (value.length !== 6) {
    return 'text-[#242528]'
  }

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? 'text-[#242528]' : 'text-white'
}

export default function LabelsPopover({
  isOpen,
  anchorEl,
  availableLabels,
  selectedLabelIds,
  searchValue,
  newLabelName,
  newLabelColor,
  colorOptions,
  onSearchChange,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onToggleLabel,
  onCreateLabel,
  onClose
}: LabelsPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const position = useMemo<Position | null>(() => {
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
      if (containerRef.current?.contains(target)) {
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

  const filteredLabels = useMemo(() => {
    const term = searchValue.trim().toLowerCase()
    if (!term) {
      return availableLabels
    }

    return availableLabels.filter((label) => label.text.toLowerCase().includes(term))
  }, [availableLabels, searchValue])

  if (!isOpen || !anchorEl || !position) {
    return null
  }

  return createPortal(
    <div
      ref={containerRef}
      style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
      className="fixed z-[70] rounded-[10px] border border-[#3f3f3f] bg-[#2b2c30] p-3 shadow-2xl"
      role="dialog"
      aria-label="Etiquetas"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-[16px] font-semibold text-[#d1d1d1]">Etiquetas</h4>
        <button type="button" onClick={onClose} className="text-[20px] leading-none text-[#8b8b8b] hover:text-white">
          x
        </button>
      </div>

      <input
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar etiquetas..."
        className="mt-3 h-9 w-full rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
      />

      <div className="mt-3 max-h-[180px] space-y-2 overflow-y-auto pr-1">
        {filteredLabels.map((label) => {
          const selected = selectedLabelIds.includes(label.id)
          return (
            <button
              key={label.id}
              type="button"
              onClick={() => onToggleLabel(label)}
              className="flex w-full items-center gap-2"
            >
              <span className={`flex size-4 items-center justify-center rounded-[3px] border ${selected ? 'border-[#ff0068] bg-[#ff0068] text-white' : 'border-[#7d7d7d] text-transparent'}`}>
                v
              </span>
              <span className={`flex-1 rounded-[4px] px-3 py-1.5 text-left text-[14px] font-semibold ${getTextClass(label.color)}`} style={{ backgroundColor: label.color }}>
                {label.text}
              </span>
            </button>
          )
        })}

        {filteredLabels.length === 0 && <p className="text-sm text-[#8b8b8b]">Nenhuma etiqueta encontrada.</p>}
      </div>

      <div className="mt-3 border-t border-[#3f3f3f] pt-3">
        <h5 className="text-[13px] font-semibold text-[#d1d1d1]">Criar etiqueta</h5>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input
            value={newLabelName}
            onChange={(event) => onNewLabelNameChange(event.target.value)}
            placeholder="Nova etiqueta"
            className="h-9 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
          />
          <select
            value={newLabelColor}
            onChange={(event) => onNewLabelColorChange(event.target.value)}
            className="h-9 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] outline-none focus:border-[#ff0068]"
          >
            {colorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={onCreateLabel} className="mt-2 h-9 w-full rounded-[6px] bg-[#ff0068] px-4 text-sm font-semibold text-white hover:brightness-110">
          Criar
        </button>
      </div>
    </div>,
    document.body
  )
}
