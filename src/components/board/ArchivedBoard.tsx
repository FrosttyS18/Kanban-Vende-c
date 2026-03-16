import { useCallback, useEffect, useState } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type ArchivedCardData } from '@/types'
import { deleteCardRemote, loadBoardStoreFromRemote, restoreArchivedCardRemote } from '@/services/boardApi'

export default function ArchivedBoard() {
  const [archivedCards, setArchivedCards] = useState<ArchivedCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)
  const [restoringCardId, setRestoringCardId] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const store = await loadBoardStoreFromRemote()
      setArchivedCards(store.archivedCards)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Não foi possível carregar os cartões arquivados.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  const handleDeleteForever = async (cardId: string) => {
    setDeletingCardId(cardId)
    try {
      await deleteCardRemote(cardId)
      setArchivedCards((prev) => prev.filter((card) => card.id !== cardId))
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir o cartão arquivado.'
      setError(message)
    } finally {
      setDeletingCardId(null)
    }
  }

  const handleRestore = async (cardId: string) => {
    setRestoringCardId(cardId)
    try {
      await restoreArchivedCardRemote(cardId)
      setArchivedCards((prev) => prev.filter((card) => card.id !== cardId))
    } catch (restoreError) {
      const message = restoreError instanceof Error ? restoreError.message : 'Não foi possível restaurar o cartão arquivado.'
      setError(message)
    } finally {
      setRestoringCardId(null)
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto p-8 text-foreground">
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
        <Archive className="size-8 text-primary" />
        Arquivados
      </h1>

      {isLoading && (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <p>Carregando cartões arquivados...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141414] px-4 py-3">
          <p className="text-sm text-[#d1d1d1]">{error}</p>
          <Button variant="outline" className="h-8 border-white/20 bg-transparent text-xs text-white hover:bg-white/10" onClick={() => void loadCards()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && archivedCards.length === 0 ? (
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-[#9fd2ff] hover:bg-[#0ea5e9]/10 hover:text-[#d1ecff]"
                      onClick={() => void handleRestore(card.id)}
                      aria-label="Restaurar cartão"
                      disabled={restoringCardId === card.id || deletingCardId === card.id}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => void handleDeleteForever(card.id)}
                      aria-label="Excluir definitivamente"
                      disabled={deletingCardId === card.id || restoringCardId === card.id}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
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
