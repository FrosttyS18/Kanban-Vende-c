import { createPortal } from "react-dom"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, X } from "lucide-react"
import Card from "@/components/board/Card"

type Props = {
  title: string
  count: number
}

export default function Column({ title, count }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cards State
  const [cards, setCards] = useState([
    { id: 1, title: "Pesquisar referências de design", labels: true, cover: false },
    { id: 2, title: "Criar wireframe da Home", labels: false, cover: false },
    { id: 3, title: "Aprovar paleta de cores", cover: true, labels: false },
    { id: 4, title: "Reunião de Kick-off", labels: false, cover: false },
    { id: 5, title: "Configurar ambiente dev", labels: false, cover: false },
  ])

  // Add Card State
  const [addingCardMode, setAddingCardMode] = useState<'top' | 'bottom' | null>(null)
  const [newCardTitle, setNewCardTitle] = useState("")

  const handleAddCard = () => {
    if (!newCardTitle.trim()) return

    const newCard = {
        id: Date.now(),
        title: newCardTitle,
        labels: false,
        cover: false
    }

    if (addingCardMode === 'top') {
        setCards([newCard, ...cards])
    } else {
        setCards([...cards, newCard])
    }
    setNewCardTitle("")
    // Keep the input open for multiple additions? Or close it? 
    // Usually Trello keeps it open. The user said "AI ELE Aparece com o nome que vc digitou nesse campo... E o cartao novo vem assim...."
    // I'll keep it open but clear the title.
  }

  // Helper component for the input form to avoid duplication
  const AddCardInput = () => (
    <div className="p-2">
        <div className="bg-[#242528] p-2 rounded-md border-2 border-primary mb-2 shadow-sm">
           <textarea 
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Insira um título ou cole um link"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none h-14"
              onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddCard()
                  }
              }}
           />
        </div>
        <div className="flex items-center gap-2">
            <Button 
              onClick={handleAddCard}
              className="bg-primary hover:bg-primary/90 text-primary-foreground h-8"
            >
                Adicionar Cartão
            </Button>
            <Button 
              onClick={() => setAddingCardMode(null)}
              variant="ghost" 
              size="icon"
              className="size-8 text-muted-foreground hover:text-foreground hover:bg-white/10"
            >
                <X className="size-5" />
            </Button>
        </div>
    </div>
  )


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && 
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    
    // Close on resize/scroll
    const handleScroll = () => { if(isMenuOpen) setIsMenuOpen(false) }

    document.addEventListener("mousedown", handleClickOutside)
    window.addEventListener("resize", () => setIsMenuOpen(false))
    window.addEventListener("scroll", handleScroll, true)

    return () => {
        document.removeEventListener("mousedown", handleClickOutside)
        window.removeEventListener("resize", () => setIsMenuOpen(false))
        window.removeEventListener("scroll", handleScroll, true)
    }
  }, [isMenuOpen])

  const handleOpenMenu = () => {
      if (isMenuOpen) {
          setIsMenuOpen(false)
          return
      }
      
      if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          setMenuPosition({
              top: rect.bottom + 8,
              left: rect.left
          })
          setIsMenuOpen(true)
      }
  }

  return (
    <section className="flex max-h-full w-72 shrink-0 flex-col rounded-lg bg-secondary shadow-sm border border-white/5 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-secondary-foreground">{title}</div>
          <div className="flex size-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-medium text-muted-foreground">{count}</div>
        </div>
        <Button 
            ref={buttonRef}
            onClick={handleOpenMenu}
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      {/* Add Card Top Input */}
      {addingCardMode === 'top' && <AddCardInput />}

      {/* Cards Area */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-0 custom-scrollbar">
        {cards.map(card => (
            <Card 
                key={card.id} 
                title={card.title} 
                labels={card.labels} 
                cover={card.cover} 
            />
        ))}
      </div>

      {/* Footer / Add Card Bottom Input */}
      {addingCardMode === 'bottom' ? (
        <AddCardInput />
      ) : (
        !addingCardMode && (
            <div className="p-2 pt-0">
                <Button 
                    onClick={() => setAddingCardMode('bottom')}
                    variant="ghost" 
                    className="h-8 w-full justify-start gap-2 px-2 text-sm text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                <Plus className="size-4" />
                Adicionar cartão
                </Button>
            </div>
        )
      )}

      {/* List Actions Menu Portal */}
      {isMenuOpen && createPortal(
        <div 
            ref={menuRef}
            style={{ 
                top: menuPosition.top, 
                left: menuPosition.left,
                position: 'fixed'
            }}
            className="w-[304px] bg-[#282e33] rounded-lg shadow-2xl border border-white/10 z-[10000] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
                <div className="size-8" /> {/* Spacer for centering */}
                <span className="text-sm font-semibold text-gray-300">Ações da Lista</span>
                <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="size-8 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
                >
                    <X className="size-4" />
                </button>
            </div>
            
            <div className="py-2">
                <div className="px-2 space-y-1">
                    <Button 
                        onClick={() => {
                            setIsMenuOpen(false)
                            setAddingCardMode('top')
                        }}
                        variant="ghost" 
                        className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10"
                    >
                        Adicionar cartão
                    </Button>

                    <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10">
                        Copiar lista
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10">
                        Mover lista
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10">
                        Mover todos os cartões nesta lista
                    </Button>
                    <Button 
                        onClick={() => {
                            const sorted = [...cards].sort((a, b) => a.title.localeCompare(b.title))
                            setCards(sorted)
                            setIsMenuOpen(false)
                        }}
                        variant="ghost" 
                        className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10"
                    >
                        Ordenar por nome (A-Z)
                    </Button>
                    <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10">
                        Seguir
                    </Button>
                </div>

                <div className="my-2 border-t border-white/10" />

                <div className="px-2 space-y-1">
                    <Button variant="ghost" className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10">
                        Arquivar Esta Lista
                    </Button>
                    <Button 
                        onClick={() => {
                            setCards([])
                            setIsMenuOpen(false)
                        }}
                        variant="ghost" 
                        className="w-full justify-start h-8 text-sm font-normal text-gray-300 hover:text-white hover:bg-white/10"
                    >
                        Arquivar todos os cartões nesta lista
                    </Button>
                </div>
            </div>
        </div>,
        document.body
      )}
    </section>
  )
}