import { useState } from 'react'
import { type Checklist } from '@/types'

type ChecklistBlockProps = {
  checklist: Checklist
  draftItem: string
  onDraftChange: (value: string) => void
  onAddItem: () => void
  onCancelDraft: () => void
  onToggleItem: (itemId: string) => void
  onUpdateItem: (itemId: string, content: string) => void
  onRemoveItem: (itemId: string) => void
  onRemoveChecklist: () => void
}

const CHECKLIST_ICON_URL = 'http://localhost:3845/assets/0c04a6a95bb30c5af177f0d2a6601b30dd08486c.svg'

export default function ChecklistBlock({
  checklist,
  draftItem,
  onDraftChange,
  onAddItem,
  onCancelDraft,
  onToggleItem,
  onUpdateItem,
  onRemoveItem,
  onRemoveChecklist
}: ChecklistBlockProps) {
  const totalItems = checklist.items.length
  const doneItems = checklist.items.filter((item) => item.isDone).length
  const progress = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')

  const startItemEdit = (itemId: string, content: string) => {
    setEditingItemId(itemId)
    setEditingItemText(content)
  }

  const cancelItemEdit = () => {
    setEditingItemId(null)
    setEditingItemText('')
  }

  const saveItemEdit = () => {
    if (!editingItemId) {
      return
    }

    const content = editingItemText.trim()
    if (!content) {
      return
    }

    onUpdateItem(editingItemId, content)
    cancelItemEdit()
  }

  return (
    <article className="rounded-[8px] border border-[#3f3f3f] bg-[#2b2c30] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src={CHECKLIST_ICON_URL} alt="" className="size-[14px] shrink-0" />
          <h4 className="truncate text-[16px] font-semibold leading-none text-[#d1d1d1]">{checklist.title}</h4>
        </div>
        <button
          type="button"
          onClick={onRemoveChecklist}
          className="h-9 shrink-0 rounded-[6px] bg-[#3b3c40] px-4 text-sm font-semibold text-[#d1d1d1] transition-colors hover:bg-[#45464b]"
        >
          Excluir
        </button>
      </div>

      <div className="mt-3">
        <p className="text-xs font-semibold text-[#a5a5a5]">{progress}%</p>
        <div className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-[#1d1e22]">
          <div className="h-full rounded-full bg-[#ff0068] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {checklist.items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {checklist.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => onToggleItem(item.id)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[2px] border ${
                  item.isDone ? 'border-[#ff0068] bg-[#ff0068]' : 'border-[#d1d1d1] bg-transparent'
                }`}
                aria-label={`Marcar item ${item.content}`}
              >
                {item.isDone && (
                  <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                    <path d="M2.3 6.2L4.9 8.6L9.7 3.8" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <div className="min-w-0 flex-1">
                {editingItemId === item.id ? (
                  <div>
                    <input
                      value={editingItemText}
                      onChange={(event) => setEditingItemText(event.target.value)}
                      className="h-8 w-full rounded-[6px] border border-[#ff0068] bg-[#242528] px-2 text-[15px] text-[#d1d1d1] outline-none focus:border-[#ff0068]"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          saveItemEdit()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelItemEdit()
                        }
                      }}
                      autoFocus
                    />
                    <div className="mt-1 flex items-center gap-3">
                      <button type="button" onClick={saveItemEdit} className="text-sm font-semibold text-[#ff0068] hover:text-[#ff4a96]">
                        Salvar
                      </button>
                      <button type="button" onClick={cancelItemEdit} className="text-sm font-semibold text-[#d1d1d1] hover:text-white">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[16px] leading-[20px] ${item.isDone ? 'text-[#8b8b8b] line-through' : 'text-[#d1d1d1]'}`}>{item.content}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <button type="button" onClick={() => startItemEdit(item.id, item.content)} className="text-xs font-semibold text-[#d1d1d1] hover:text-white">
                        Editar
                      </button>
                      <button type="button" onClick={() => onRemoveItem(item.id)} className="text-xs font-semibold text-[#da7e77] hover:text-[#f6a7a1]">
                        Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <input
          value={draftItem}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="Adicionar um item"
          className="h-[36px] w-full rounded-[6px] border border-[#ff0068] bg-[#242528] px-3 text-[16px] text-[#d1d1d1] placeholder:text-[#9a9a9a] outline-none focus:border-[#ff0068]"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onAddItem()
            }
          }}
        />

        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={onAddItem}
            className="h-8 rounded-[4px] bg-[#ff0068] px-4 text-[16px] font-semibold text-white hover:brightness-110"
          >
            Adicionar
          </button>
          <button
            type="button"
            onClick={onCancelDraft}
            className="h-8 px-2 text-[16px] font-semibold text-[#d1d1d1] transition-colors hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </article>
  )
}
