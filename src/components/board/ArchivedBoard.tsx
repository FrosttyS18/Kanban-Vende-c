import { useState, useEffect } from "react"
import { Archive } from "lucide-react"
import Card from "@/components/board/Card"
import { type Label, type Attachment } from "@/types"

interface ArchivedCard {
  id: string
  title: string
  labels: Label[]
  cover: boolean
  attachments?: Attachment[]
  archivedAt: string
  originalColumn: string
}

export default function ArchivedBoard() {
  const [archivedCards, setArchivedCards] = useState<ArchivedCard[]>([])

  useEffect(() => {
    const loadCards = () => {
      try {
        const stored = localStorage.getItem('archived_cards')
        if (stored) {
          setArchivedCards(JSON.parse(stored))
        }
      } catch (e) {
        console.error("Failed to load archived cards", e)
      }
    }
    
    loadCards()
    
    // Listen for storage events (in case of multiple tabs, though not critical here)
    window.addEventListener('storage', loadCards)
    return () => window.removeEventListener('storage', loadCards)
  }, [])

  const handleDeleteForever = (id: string | number) => {
    const newCards = archivedCards.filter(c => c.id !== id)
    setArchivedCards(newCards)
    localStorage.setItem('archived_cards', JSON.stringify(newCards))
  }

  // Group by Year
  const groupedByYear = archivedCards.reduce((acc, card) => {
    const date = new Date(card.archivedAt || Date.now())
    const year = date.getFullYear().toString()
    
    if (!acc[year]) {
      acc[year] = []
    }
    acc[year].push(card)
    return acc
  }, {} as Record<string, ArchivedCard[]>)

  // Sort years descending
  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="h-full w-full overflow-y-auto p-8 text-foreground">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Archive className="size-8 text-primary" />
        Arquivos
      </h1>

      {years.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p>Nenhum item arquivado.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {years.map(year => (
            <div key={year} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                <span className="text-4xl font-light text-primary/50">{year}</span>
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {groupedByYear[year].length} itens
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {groupedByYear[year].map(card => (
                  <div key={card.id} className="opacity-80 hover:opacity-100 transition-opacity">
                    <Card 
                      id={card.id}
                      title={card.title}
                      cover={card.cover}
                      labels={card.labels}
                      attachments={card.attachments || []}
                      onDelete={handleDeleteForever}
                      availableLabels={[]}
                      onUpdateAvailableLabels={() => {}}
                      // No onArchive prop means it won't show the option or it won't work, which is fine for Archived view
                    />
                    <div className="mt-2 text-[10px] text-muted-foreground text-center">
                        Origem: {card.originalColumn} • {new Date(card.archivedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
