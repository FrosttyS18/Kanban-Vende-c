import { useEffect, useMemo, useRef, useState } from 'react'
import { Bold, ChevronDown, Italic, List, ListOrdered } from 'lucide-react'

type DescriptionEditorProps = {
  value: string
  draftValue: string
  isEditing: boolean
  onStartEdit: () => void
  onDraftChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function looksLikeHtml(value: string): boolean {
  return /<[^>]+>/.test(value)
}

function decodeHtmlEntities(value: string): string {
  if (typeof window === 'undefined') {
    return value
  }

  const textarea = document.createElement('textarea')
  let decoded = value
  for (let index = 0; index < 3; index += 1) {
    textarea.innerHTML = decoded
    const next = textarea.value
    if (next === decoded) {
      break
    }
    decoded = next
  }
  return decoded
}

function toHtml(value: string): string {
  if (!value.trim()) {
    return ''
  }

  if (!looksLikeHtml(value) && /&amp;|&nbsp;/.test(value)) {
    return escapeHtml(decodeHtmlEntities(value)).replaceAll('\n', '<br>')
  }

  if (looksLikeHtml(value)) {
    return value
  }

  return escapeHtml(value).replaceAll('\n', '<br>')
}

export default function DescriptionEditor({
  value,
  draftValue,
  isEditing,
  onStartEdit,
  onDraftChange,
  onSave,
  onCancel
}: DescriptionEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)
  const initializedEditRef = useRef(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const readHtml = useMemo(() => toHtml(value), [value])
  const plainTextLength = useMemo(() => readHtml.replace(/<[^>]+>/g, ' ').trim().length, [readHtml])
  const shouldCollapse = plainTextLength > 260

  useEffect(() => {
    if (!isEditing) {
      initializedEditRef.current = false
      return
    }

    if (!editorRef.current || initializedEditRef.current) {
      return
    }

    initializedEditRef.current = true
    editorRef.current.innerHTML = toHtml(draftValue)
    editorRef.current.focus()
    editorRef.current.scrollIntoView({ block: 'nearest' })
  }, [draftValue, isEditing])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) {
        return
      }
      onSave()
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [isEditing, onSave])

  const applyCommand = (command: 'bold' | 'italic' | 'insertUnorderedList' | 'insertOrderedList') => {
    if (!editorRef.current) {
      return
    }

    editorRef.current.focus()
    document.execCommand(command)
    onDraftChange(editorRef.current.innerHTML)
  }

  if (isEditing) {
    return (
      <div ref={containerRef} className="mt-2 w-full max-w-140 rounded-[10px] border border-[#ff0068] bg-[#242528]">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#3f3f3f] px-3 py-2">
          <button
            type="button"
            onClick={() => applyCommand('bold')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label="Negrito"
          >
            <Bold className="size-4" />
            <span>Negrito</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('italic')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label={'It\u00e1lico'}
          >
            <Italic className="size-4" />
            <span>{'It\u00e1lico'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertUnorderedList')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label="Lista com marcadores"
          >
            <List className="size-4" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertOrderedList')}
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label="Lista numerada"
          >
            <ListOrdered className="size-4" />
            <span>Numerada</span>
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => onDraftChange((event.currentTarget as HTMLDivElement).innerHTML)}
          className="min-h-55 max-h-80 overflow-y-auto px-4 py-3 text-left text-[16px] leading-[1.55] text-[#d1d1d1] outline-none [direction:ltr] [unicode-bidi:plaintext] wrap-anywhere [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
          role="textbox"
          aria-label={'Editor de descri\u00e7\u00e3o'}
          dir="ltr"
        />

        <div className="flex items-center border-t border-[#3f3f3f] px-3 py-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSave} className="h-8 rounded-lg bg-[#ff0068] px-4 text-[16px] font-semibold text-white hover:brightness-110">
              Salvar
            </button>
            <button type="button" onClick={onCancel} className="h-8 px-2 text-[16px] font-semibold text-[#d1d1d1] hover:text-white">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mt-2 w-full max-w-140 rounded-[10px] border border-[#3f3f3f] bg-[#2b2c30] px-4 py-3"
      role="button"
      tabIndex={0}
      onClick={(event) => {
        const target = event.target as HTMLElement
        if (target.closest('button')) {
          return
        }
        onStartEdit()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onStartEdit()
        }
      }}
      aria-label={'Abrir edi\u00e7\u00e3o da descri\u00e7\u00e3o'}
    >
      {readHtml ? (
        <div>
          <div className="relative">
            <div
              className={`text-left text-[16px] leading-[1.55] text-[#d1d1d1] [direction:ltr] [unicode-bidi:plaintext] wrap-anywhere [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 ${shouldCollapse && !isExpanded ? 'max-h-30 overflow-hidden' : ''}`}
              dangerouslySetInnerHTML={{ __html: readHtml }}
              dir="ltr"
            />
            {shouldCollapse && !isExpanded && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-[#2b2c30] to-transparent" />}
          </div>
          {shouldCollapse && (
            <div className="mt-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsExpanded((prev) => !prev)
                }}
                className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-[6px] bg-[#303134] px-4 text-sm font-semibold text-[#d1d1d1] hover:bg-[#3a3b3f]"
              >
                <span>{isExpanded ? 'Mostrar menos' : 'Mostrar mais'}</span>
                <ChevronDown className={`size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[16px] text-[#8b8b8b]">{'Adicione uma descri\u00e7\u00e3o do briefing.'}</p>
      )}
    </div>
  )
}

