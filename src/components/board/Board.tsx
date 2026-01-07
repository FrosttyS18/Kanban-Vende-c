import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Column from "@/components/board/Column"

interface ColumnData {
  id: string
  title: string
  count: number
}

export default function Board() {
  const [columns, setColumns] = useState<ColumnData[]>([
    { id: '1', title: "Na Fila", count: 12 },
    { id: '2', title: "Fazendo", count: 4 },
    { id: '3', title: "Feito", count: 26 },
    { id: '4', title: "Aprovados", count: 10 },
    { id: '5', title: "Agendado", count: 5 },
  ])

  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")

  const handleAddList = () => {
    if (!newListTitle.trim()) return
    
    setColumns([
      ...columns,
      {
        id: Date.now().toString(),
        title: newListTitle,
        count: 0
      }
    ])
    setNewListTitle("")
    setIsAddingList(false)
  }

  return (
    <div className="h-full w-full">
      <div className="h-full w-full overflow-x-auto">
        <div className="flex h-full items-start gap-4 p-4 min-w-max">
          {columns.map(col => (
            <Column key={col.id} title={col.title} count={col.count} />
          ))}

          {/* Add List Button/Form */}
          <div className="w-72 shrink-0">
            {!isAddingList ? (
              <Button 
                onClick={() => setIsAddingList(true)}
                variant="ghost"
                className="w-full justify-start gap-2 bg-white/5 hover:bg-white/10 text-white font-medium h-12"
              >
                <Plus className="size-4" />
                Adicionar outra lista
              </Button>
            ) : (
              <div className="bg-[#101204] p-3 rounded-lg border border-white/5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Input 
                  autoFocus
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Digite o nome da lista..."
                  className="bg-[#22272b] border-white/20 text-white placeholder:text-muted-foreground focus-visible:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddList()
                    if (e.key === 'Escape') setIsAddingList(false)
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={handleAddList}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Adicionar Lista
                  </Button>
                  <Button
                    onClick={() => setIsAddingList(false)}
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="size-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
