import { createPortal } from "react-dom"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Check, Pencil, Trash2 } from "lucide-react"
import { type Label } from "@/types"

type LabelsPopoverProps = {
  isOpen: boolean
  anchorEl: HTMLButtonElement | null
  availableLabels: Label[]
  selectedLabelIds: string[]
  searchValue: string
  newLabelName: string
  newLabelColor: string
  onSearchChange: (value: string) => void
  onNewLabelNameChange: (value: string) => void
  onNewLabelColorChange: (value: string) => void
  onToggleLabel: (label: Label) => void
  onUpdateLabel: (labelId: string, updates: Partial<Label>) => void
  onDeleteLabel: (labelId: string) => void
  onCreateLabel: () => void
  onClose: () => void
}

type Position = {
  top: number
  left: number
}

type ColorPickerState = {
  mode: 'create' | 'edit'
  position: Position
}

const POPOVER_WIDTH = 305
const POPOVER_HEIGHT = 430
const EDITOR_WIDTH = 280
const EDITOR_HEIGHT = 160
const COLOR_PICKER_WIDTH = 248
const COLOR_PICKER_HEIGHT = 272
const VIEWPORT_PADDING = 12

type RGB = {
  r: number
  g: number
  b: number
}

type HSV = {
  h: number
  s: number
  v: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(hex: string): RGB {
  const normalized = normalizeHexColor(hex, "#ff0068").replace("#", "")
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  }
}

function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsv({ r, g, b }: RGB): HSV {
  const rr = r / 255
  const gg = g / 255
  const bb = b / 255
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rr) {
      h = 60 * (((gg - bb) / delta) % 6)
    } else if (max === gg) {
      h = 60 * ((bb - rr) / delta + 2)
    } else {
      h = 60 * ((rr - gg) / delta + 4)
    }
  }

  if (h < 0) {
    h += 360
  }

  const s = max === 0 ? 0 : delta / max
  const v = max
  return { h, s, v }
}

function hsvToRgb({ h, s, v }: HSV): RGB {
  const hh = ((h % 360) + 360) % 360
  const c = v * s
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = v - c

  let rr = 0
  let gg = 0
  let bb = 0

  if (hh < 60) {
    rr = c
    gg = x
  } else if (hh < 120) {
    rr = x
    gg = c
  } else if (hh < 180) {
    gg = c
    bb = x
  } else if (hh < 240) {
    gg = x
    bb = c
  } else if (hh < 300) {
    rr = x
    bb = c
  } else {
    rr = c
    bb = x
  }

  return {
    r: (rr + m) * 255,
    g: (gg + m) * 255,
    b: (bb + m) * 255
  }
}

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

function normalizeHexColor(input: string, fallback: string): string {
  const value = input.trim()
  const withHash = value.startsWith("#") ? value : `#${value}`
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : fallback
}

export default function LabelsPopover({
  isOpen,
  anchorEl,
  availableLabels,
  selectedLabelIds,
  searchValue,
  newLabelName,
  newLabelColor,
  onSearchChange,
  onNewLabelNameChange,
  onNewLabelColorChange,
  onToggleLabel,
  onUpdateLabel,
  onDeleteLabel,
  onCreateLabel,
  onClose
}: LabelsPopoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [editingLabelName, setEditingLabelName] = useState('')
  const [editingLabelColor, setEditingLabelColor] = useState('')
  const [editorPosition, setEditorPosition] = useState<Position | null>(null)
  const [colorPickerState, setColorPickerState] = useState<ColorPickerState | null>(null)
  const [pickerDraftColor, setPickerDraftColor] = useState('#ff0068')
  const [pickerDraftHSV, setPickerDraftHSV] = useState<HSV>({ h: 330, s: 1, v: 1 })
  const [dragMode, setDragMode] = useState<'sv' | 'hue' | null>(null)
  const svAreaRef = useRef<HTMLDivElement>(null)
  const hueAreaRef = useRef<HTMLDivElement>(null)

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
      if (editorRef.current?.contains(target)) {
        return
      }
      if (colorPickerRef.current?.contains(target)) {
        return
      }
      if (anchorEl?.contains(target)) {
        return
      }
      setColorPickerState(null)
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

  const updateSVFromPointer = useCallback((clientX: number, clientY: number) => {
    const area = svAreaRef.current
    if (!area) {
      return
    }
    const rect = area.getBoundingClientRect()
    const s = clamp((clientX - rect.left) / rect.width, 0, 1)
    const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1)
    setPickerDraftHSV((prev) => {
      const next = { ...prev, s, v }
      setPickerDraftColor(rgbToHex(hsvToRgb(next)))
      return next
    })
  }, [])

  const updateHueFromPointer = useCallback((clientX: number) => {
    const area = hueAreaRef.current
    if (!area) {
      return
    }
    const rect = area.getBoundingClientRect()
    const h = clamp(((clientX - rect.left) / rect.width) * 360, 0, 360)
    setPickerDraftHSV((prev) => {
      const next = { ...prev, h }
      setPickerDraftColor(rgbToHex(hsvToRgb(next)))
      return next
    })
  }, [])

  useEffect(() => {
    if (!dragMode) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (dragMode === "sv") {
        updateSVFromPointer(event.clientX, event.clientY)
      } else {
        updateHueFromPointer(event.clientX)
      }
    }

    const handleMouseUp = () => {
      setDragMode(null)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragMode, updateHueFromPointer, updateSVFromPointer])

  const startEditingLabel = (label: Label, triggerEl: HTMLButtonElement) => {
    const rect = triggerEl.getBoundingClientRect()
    let left = rect.right + 8
    if (left + EDITOR_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = rect.left - EDITOR_WIDTH - 8
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    let top = rect.top - 6
    if (top + EDITOR_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = window.innerHeight - EDITOR_HEIGHT - VIEWPORT_PADDING
    }
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING
    }

    setEditingLabelId(label.id)
    setEditingLabelName(label.text)
    setEditingLabelColor(label.color)
    setEditorPosition({ top, left })
    setColorPickerState(null)
  }

  const cancelEditingLabel = () => {
    setEditingLabelId(null)
    setEditingLabelName('')
    setEditingLabelColor('')
    setEditorPosition(null)
    setColorPickerState(null)
  }

  const openColorPicker = (mode: 'create' | 'edit', triggerEl: HTMLButtonElement) => {
    if (!position) {
      return
    }

    const current = mode === 'edit' ? editingLabelColor : newLabelColor
    const nextColor = normalizeHexColor(current, '#ff0068')
    const nextHsv = rgbToHsv(hexToRgb(nextColor))
    setPickerDraftColor(nextColor)
    setPickerDraftHSV(nextHsv)

    let left = position.left + POPOVER_WIDTH + 10
    if (left + COLOR_PICKER_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
      left = position.left - COLOR_PICKER_WIDTH - 10
    }
    if (left < VIEWPORT_PADDING) {
      left = VIEWPORT_PADDING
    }

    let top = position.top
    if (top + COLOR_PICKER_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
      top = window.innerHeight - COLOR_PICKER_HEIGHT - VIEWPORT_PADDING
    }
    if (top < VIEWPORT_PADDING) {
      top = VIEWPORT_PADDING
    }

    triggerEl.blur()
    setColorPickerState({ mode, position: { top, left } })
  }

  const applyColorPicker = () => {
    if (!colorPickerState) {
      return
    }

    const nextColor = normalizeHexColor(pickerDraftColor, '#ff0068')
    if (colorPickerState.mode === 'edit') {
      setEditingLabelColor(nextColor)
    } else {
      onNewLabelColorChange(nextColor)
    }
    setColorPickerState(null)
  }

  const saveEditingLabel = () => {
    if (!editingLabelId) {
      return
    }
    const nextName = editingLabelName.trim()
    if (!nextName) {
      return
    }
    const fallback = availableLabels.find((label) => label.id === editingLabelId)?.color ?? '#ff0068'
    const nextColor = normalizeHexColor(editingLabelColor, fallback)
    onUpdateLabel(editingLabelId, { text: nextName, color: nextColor })
    cancelEditingLabel()
  }

  if (!isOpen || !anchorEl || !position) {
    return null
  }

  return createPortal(
    <>
      <div
        ref={containerRef}
        style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
        className="fixed z-70 rounded-[10px] border border-[#3f3f3f] bg-[#2b2c30] p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
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

        <div className="mt-3 max-h-45 space-y-2 overflow-y-auto pr-1">
          {filteredLabels.map((label) => {
            const selected = selectedLabelIds.includes(label.id)
            return (
              <div key={label.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleLabel(label)}
                  className={`flex size-5 items-center justify-center rounded-[3px] border ${
                    selected ? 'border-[#ff0068] bg-[#ff0068] text-white' : 'border-[#7d7d7d] text-transparent'
                  }`}
                  aria-label={`Selecionar etiqueta ${label.text}`}
                >
                  <Check className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleLabel(label)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-left text-[14px] font-semibold ${getTextClass(label.color)}`}
                  style={{ backgroundColor: label.color }}
                >
                  {label.text}
                </button>
                <button
                  type="button"
                  onClick={(event) => startEditingLabel(label, event.currentTarget)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#b6b6b6] hover:bg-[#3a3b3f] hover:text-white"
                  aria-label={`Editar etiqueta ${label.text}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteLabel(label.id)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#da7e77] hover:bg-[#3a3b3f] hover:text-[#f6a7a1]"
                  aria-label={`Excluir etiqueta ${label.text}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}

          {filteredLabels.length === 0 && <p className="text-sm text-[#8b8b8b]">Nenhuma etiqueta encontrada.</p>}
        </div>

        <div className="mt-3 border-t border-[#3f3f3f] pt-3">
          <h5 className="text-[13px] font-semibold text-[#d1d1d1]">Criar etiqueta</h5>
          <div className="mt-2 grid gap-2">
            <input
              value={newLabelName}
              onChange={(event) => onNewLabelNameChange(event.target.value)}
              placeholder="Nova etiqueta"
              className="h-9 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(event) => openColorPicker('create', event.currentTarget)}
                className="h-9 w-12 rounded-[6px] border border-[#525252] p-1"
                style={{ backgroundColor: normalizeHexColor(newLabelColor, '#ff0068') }}
                aria-label="Selecionar cor da nova etiqueta"
              />
              <input
                value={newLabelColor}
                onChange={(event) => onNewLabelColorChange(event.target.value)}
                placeholder="#ff0068"
                className="h-9 flex-1 rounded-[6px] border border-[#525252] bg-[#242528] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
              />
            </div>
          </div>

          <button type="button" onClick={onCreateLabel} className="mt-2 h-9 w-full rounded-[6px] bg-[#ff0068] px-4 text-sm font-semibold text-white hover:brightness-110">
            Criar
          </button>
        </div>
      </div>

      {editingLabelId && editorPosition && (
        <div
          ref={editorRef}
          style={{ top: editorPosition.top, left: editorPosition.left, width: EDITOR_WIDTH }}
          className="fixed z-80 rounded-[10px] border border-[#3f3f3f] bg-[#242528] p-2.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Editar etiqueta"
        >
          <input
            value={editingLabelName}
            onChange={(event) => setEditingLabelName(event.target.value)}
            placeholder="Nome da etiqueta"
            className="h-8 w-full rounded-[6px] border border-[#525252] bg-[#1f2024] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => openColorPicker('edit', event.currentTarget)}
              className="h-8 w-10 rounded-[6px] border border-[#525252] p-1"
              style={{ backgroundColor: normalizeHexColor(editingLabelColor, '#ff0068') }}
              aria-label="Selecionar cor da etiqueta"
            />
            <input
              value={editingLabelColor}
              onChange={(event) => setEditingLabelColor(event.target.value)}
              placeholder="#ff0068"
              className="h-8 flex-1 rounded-[6px] border border-[#525252] bg-[#1f2024] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={saveEditingLabel} className="h-8 rounded-[6px] bg-[#ff0068] px-3 text-xs font-semibold text-white">
              Salvar
            </button>
            <button type="button" onClick={cancelEditingLabel} className="h-8 rounded-[6px] border border-[#525252] px-3 text-xs font-semibold text-[#d1d1d1]">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {colorPickerState && (
        <div
          ref={colorPickerRef}
          style={{ top: colorPickerState.position.top, left: colorPickerState.position.left, width: COLOR_PICKER_WIDTH }}
          className="fixed z-90 rounded-[10px] border border-[#3f3f3f] bg-[#141414] p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Selecionar cor"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a9a9a9]">Cor da etiqueta</p>
          <div
            ref={svAreaRef}
            className="relative mt-2 h-30 w-full cursor-crosshair rounded-[6px]"
            style={{ backgroundColor: `hsl(${pickerDraftHSV.h}, 100%, 50%)` }}
            onMouseDown={(event) => {
                event.preventDefault()
              updateSVFromPointer(event.clientX, event.clientY)
              setDragMode("sv")
            }}
          >
            <div className="absolute inset-0 rounded-[6px] bg-linear-to-r from-white to-transparent" />
            <div className="absolute inset-0 rounded-[6px] bg-linear-to-t from-black to-transparent" />
            <span
              className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
              style={{ left: `${pickerDraftHSV.s * 100}%`, top: `${(1 - pickerDraftHSV.v) * 100}%` }}
            />
          </div>

          <div
            ref={hueAreaRef}
            className="relative mt-2 h-3.5 w-full cursor-ew-resize rounded-full"
            style={{ background: "linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" }}
            onMouseDown={(event) => {
              event.preventDefault()
              updateHueFromPointer(event.clientX)
              setDragMode("hue")
            }}
          >
            <span
              className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-black"
              style={{ left: `${(pickerDraftHSV.h / 360) * 100}%` }}
            />
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a9a9a9]">HEX</p>
            <input
              value={pickerDraftColor}
              onChange={(event) => {
                const nextValue = event.target.value
                setPickerDraftColor(nextValue)
                if (/^#[0-9a-fA-F]{6}$/.test(nextValue.trim())) {
                  setPickerDraftHSV(rgbToHsv(hexToRgb(nextValue)))
                }
              }}
              placeholder="#ff0068"
              className="mt-1 h-9 w-full rounded-[6px] border border-[#525252] bg-[#1f2024] px-3 text-sm text-[#d1d1d1] placeholder:text-[#7d7d7d] outline-none focus:border-[#ff0068]"
            />
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setColorPickerState(null)} className="h-8 rounded-[6px] border border-[#525252] px-3 text-xs font-semibold text-[#d1d1d1]">
              Cancelar
            </button>
            <button type="button" onClick={applyColorPicker} className="h-8 rounded-[6px] bg-[#ff0068] px-3 text-xs font-semibold text-white">
              OK
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  )
}
