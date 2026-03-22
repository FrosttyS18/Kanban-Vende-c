import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/lib/queryKeys'
import { type ArchivedCardData } from '@/types'
import { deleteCardRemote, loadBoardStoreFromRemote, restoreArchivedCardRemote } from '@/services/boardApi'

export default function ArchivedBoard() {
  const queryClient = useQueryClient()

  const archivedCardsQuery = useQuery({
    queryKey: queryKeys.archivedCards,
    queryFn: async () => {
      const store = await loadBoardStoreFromRemote(undefined, { forceRefresh: true, bypassInFlight: true })
      return store.archivedCards
    }
  })

  const restoreMutation = useMutation({
    mutationFn: (cardId: string) => restoreArchivedCardRemote(cardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.archivedCards })
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (cardId: string) => deleteCardRemote(cardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.archivedCards })
      await queryClient.invalidateQueries({ queryKey: queryKeys.boardCatalog })
    }
  })

  async function runMutation<TData, TError, TVariables>(
    mutation: UseMutationResult<TData, TError, TVariables, unknown>,
    variables: TVariables
  ): Promise<{ ok: boolean; error?: TError }> {
    try {
      await mutation.mutateAsync(variables)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error as TError }
    }
  }

  const handleRestoreArchivedCard = async (cardId: string) => {
    await runMutation(restoreMutation, cardId)
  }

  const handleDeleteArchivedCard = async (cardId: string) => {
    await runMutation(deleteMutation, cardId)
  }

  const archivedCards: ArchivedCardData[] = archivedCardsQuery.data ?? []
  const queryErrorMessage = archivedCardsQuery.error instanceof Error ? archivedCardsQuery.error.message : null

  return (
    <div className="h-full w-full overflow-y-auto p-8 text-foreground">
      <h1 className="mb-8 flex items-center gap-3 text-3xl font-bold">
        <Archive className="size-8 text-primary" />
        Arquivados
      </h1>

      {archivedCardsQuery.isLoading && (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <p>Carregando cartoes arquivados...</p>
        </div>
      )}

      {queryErrorMessage && !archivedCardsQuery.isLoading && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-[#141414] px-4 py-3">
          <p className="text-sm text-[#d1d1d1]">{queryErrorMessage}</p>
          <Button variant="outline" className="h-8 border-white/20 bg-transparent text-xs text-white hover:bg-white/10" onClick={() => void archivedCardsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!archivedCardsQuery.isLoading && !queryErrorMessage && archivedCards.length === 0 ? (
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
                      onClick={() => void handleRestoreArchivedCard(card.id)}
                      aria-label="Restaurar cartao"
                      disabled={restoreMutation.isPending || deleteMutation.isPending}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => void handleDeleteArchivedCard(card.id)}
                      aria-label="Excluir definitivamente"
                      disabled={deleteMutation.isPending || restoreMutation.isPending}
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
