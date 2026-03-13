import { useEffect, useState } from 'react'
import { Archive, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ArchivedCardData } from '@/types'
import { loadBoardStore, saveBoardStore } from '@/services/boardService'

export default function ArchivedBoard() {
  const [archivedCards, setArchivedCards] = useState<ArchivedCardData[]>([])

  useEffect(() => {
    const loadCards = () => {
      const store = loadBoardStore()
      setArchivedCards(store.archivedCards)
    }

    loadCards()
    window.addEventListener('storage', loadCards)
    return () => window.removeEventListener('storage', loadCards)
  }, [])

  const handleDeleteForever = (cardId: string) => {
    const store = loadBoardStore()
    const nextArchived = store.archivedCards.filter((card) => card.id !== cardId)

    saveBoardStore({
      ...store,
      archivedCards: nextArchived
    })

    setArchivedCards(nextArchived)
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 text-foreground">
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
        <Archive className="size-8 text-primary" />
        Arquivados
      </h1>

      {archivedCards.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <p>Nenhum card arquivado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {archivedCards
            .slice()
            .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
            .map((card) => (
              <article key={`${card.id}_${card.archivedAt}`} className="rounded-lg border border-white/10 bg-[#141414] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold uppercase text-foreground">{card.title}</h3>
                  <Button variant="ghost" size="icon" className="size-7 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => handleDeleteForever(card.id)} aria-label="Excluir definitivamente">
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">Board: {card.boardTitle}</p>
                <p className="text-xs text-muted-foreground">Lista: {card.listTitle}</p>
                <p className="mt-2 text-xs text-muted-foreground">Arquivado em {new Date(card.archivedAt).toLocaleString('pt-BR')}</p>

                {card.labels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {card.labels.map((label) => (
                      <span key={label.id} className="rounded px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: label.color }}>
                        {label.text}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))}
        </div>
      )}
    </div>
  )
}
