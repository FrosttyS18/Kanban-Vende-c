import { createPortal } from 'react-dom'
import { useEffect, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type ChecklistCreateMenuProps = {
  isOpen: boolean
  anchorEl: HTMLButtonElement | null
  value: string
  onChange: (value: string) => void
  onCreate: () => void
  onClose: () => void
}

type MenuPosition = {
  top: number
  left: number
}

const MENU_WIDTH = 320
const MENU_HEIGHT = 176
const VIEWPORT_PADDING = 12

export default function ChecklistCreateMenu({ isOpen, anchorEl, value, onChange, onCreate, onClose }: ChecklistCreateMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const position = useMemo<MenuPosition | null>(() => {
    if (!isOpen || !anchorEl) {
      return null
    }

    const rect = anchorEl.getBoundingClientRect()

    let left = rect.left
    if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    let top = rect.bottom + 8
    if (top + MENU_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = Math.max(VIEWPORT_PADDING, rect.top - MENU_HEIGHT - 8)
    }

    return { top, left }
  }, [anchorEl, isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) {
        return
      }
      if (anchorEl?.contains(target)) {
        return
      }
      onClose()
    }

    window.addEventListener('keydown', handleEscape)
    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleEscape)
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [anchorEl, isOpen, onClose])

  const disabled = useMemo(() => value.trim().length === 0, [value])

  if (!isOpen || !anchorEl || !position) {
    return null
  }

  return createPortal(
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
      className="fixed z-[65] rounded-[10px] border border-[#3f3f3f] bg-[#2a2b2f] p-3 shadow-2xl"
      role="dialog"
      aria-label="Criar checklist"
    >
      <h4 className="text-sm font-semibold text-[#d1d1d1]">Criar checklist</h4>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Título do checklist"
        className="mt-3 h-10 border-[#525252] bg-[#242528] text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d]"
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onCreate()
          }
        }}
        autoFocus
      />
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" onClick={onCreate} disabled={disabled} className="h-9 bg-[#ff0068] px-4 text-sm font-semibold text-white hover:brightness-110">
          Criar
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="h-9 px-4 text-sm font-semibold text-[#d1d1d1] hover:bg-white/10 hover:text-white">
          Cancelar
        </Button>
      </div>
    </div>,
    document.body
  )
}
