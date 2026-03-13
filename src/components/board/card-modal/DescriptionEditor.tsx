import { useEffect, useMemo, useRef, useState } from 'react'
import { Bold, Italic, List, ListOrdered } from 'lucide-react'

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

function toHtml(value: string): string {
  if (!value.trim()) {
    return ''
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
  const editorRef = useRef<HTMLDivElement>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const readHtml = useMemo(() => toHtml(value), [value])
  const plainTextLength = useMemo(() => readHtml.replace(/<[^>]+>/g, ' ').trim().length, [readHtml])
  const shouldCollapse = plainTextLength > 420

  useEffect(() => {
    if (!isEditing || !editorRef.current) {
      return
    }

    editorRef.current.innerHTML = toHtml(draftValue)
    editorRef.current.focus()
  }, [draftValue, isEditing])

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
      <div className="mt-2 w-full max-w-[560px] rounded-[10px] border border-[#ff0068] bg-[#242528]">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#3f3f3f] px-3 py-2">
          <button
            type="button"
            onClick={() => applyCommand('bold')}
            className="flex h-8 items-center gap-1 rounded-[4px] px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label="Negrito"
          >
            <Bold className="size-4" />
            <span>Negrito</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('italic')}
            className="flex h-8 items-center gap-1 rounded-[4px] px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label={'It\u00e1lico'}
          >
            <Italic className="size-4" />
            <span>{'It\u00e1lico'}</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertUnorderedList')}
            className="flex h-8 items-center gap-1 rounded-[4px] px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
            aria-label="Lista com marcadores"
          >
            <List className="size-4" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => applyCommand('insertOrderedList')}
            className="flex h-8 items-center gap-1 rounded-[4px] px-2 text-[13px] font-semibold text-[#d1d1d1] hover:bg-[#303134]"
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
          className="min-h-[220px] max-h-[320px] overflow-y-auto px-4 py-3 text-[16px] leading-[1.55] text-[#d1d1d1] outline-none"
          role="textbox"
          aria-label={'Editor de descri\u00e7\u00e3o'}
        />

        <div className="flex items-center justify-between border-t border-[#3f3f3f] px-3 py-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onSave} className="h-8 rounded-[4px] bg-[#ff0068] px-4 text-[16px] font-semibold text-white hover:brightness-110">
              Salvar
            </button>
            <button type="button" onClick={onCancel} className="h-8 px-2 text-[16px] font-semibold text-[#d1d1d1] hover:text-white">
              Cancelar
            </button>
          </div>
          <div className="h-8 rounded-[4px] bg-[#303134] px-3 text-[14px] font-semibold leading-8 text-[#a5a5a5]">{'Ajuda para formata\u00e7\u00e3o'}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="mt-2 w-full max-w-[560px] rounded-[10px] border border-[#3f3f3f] bg-[#2b2c30] px-4 py-3"
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
      <div className="flex justify-end">
        <button type="button" onClick={onStartEdit} className="h-8 rounded-[6px] bg-[#3b3c40] px-4 text-[16px] font-semibold text-[#d1d1d1] hover:bg-[#45464b]">
          Editar
        </button>
      </div>

      {readHtml ? (
        <div className="mt-3">
          <div
            className={`text-[16px] leading-[1.55] text-[#d1d1d1] ${shouldCollapse && !isExpanded ? 'max-h-[210px] overflow-hidden' : ''}`}
            dangerouslySetInnerHTML={{ __html: readHtml }}
          />
          {shouldCollapse && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setIsExpanded((prev) => !prev)
              }}
              className="mt-3 h-8 rounded-[6px] bg-[#303134] px-4 text-sm font-semibold text-[#d1d1d1] hover:bg-[#3a3b3f]"
            >
              {isExpanded ? 'Mostrar menos' : 'Mostrar mais'}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[16px] text-[#8b8b8b]">{'Adicione uma descri\u00e7\u00e3o do briefing.'}</p>
      )}
    </div>
  )
}

