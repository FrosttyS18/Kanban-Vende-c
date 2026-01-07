import { Button } from "@/components/ui/button"
import { LayoutDashboard, Star, Archive, Settings, Plus } from "lucide-react"

interface SidebarProps {
  currentView?: 'board' | 'archived'
  onNavigate?: (view: 'board' | 'archived') => void
}

export default function Sidebar({ currentView = 'board', onNavigate }: SidebarProps) {
  return (
    <aside className="hidden w-64 border-r border-white/10 bg-black/20 backdrop-blur-sm p-3 md:flex md:flex-col gap-4">
      <div className="px-2 py-1">
        <div className="mb-2 flex items-center justify-between px-2 text-xs font-bold text-foreground/70">
          <span>Área de Trabalho</span>
          <Plus className="size-3 cursor-pointer hover:text-foreground" />
        </div>
        <div className="grid gap-1">
          <Button 
            onClick={() => onNavigate?.('board')}
            variant={currentView === 'board' ? "secondary" : "ghost"} 
            className={`justify-start gap-2 h-9 font-medium ${currentView === 'board' ? 'bg-white/10 text-foreground hover:bg-white/20 border-none' : 'text-foreground/70 hover:text-foreground hover:bg-white/10'}`}
          >
            <LayoutDashboard className="size-4" />
            Vende-C Projeto
          </Button>
          <Button variant="ghost" className="justify-start gap-2 text-foreground/70 hover:text-foreground hover:bg-white/10 h-9">
            <Star className="size-4" />
            Destaques
          </Button>
          <Button 
            onClick={() => onNavigate?.('archived')}
            variant={currentView === 'archived' ? "secondary" : "ghost"}
            className={`justify-start gap-2 h-9 font-medium ${currentView === 'archived' ? 'bg-white/10 text-foreground hover:bg-white/20 border-none' : 'text-foreground/70 hover:text-foreground hover:bg-white/10'}`}
          >
            <Archive className="size-4" />
            Arquivados
          </Button>
        </div>
      </div>
      
      <div className="mt-auto border-t border-white/10 pt-3 px-2">
         <Button variant="ghost" className="w-full justify-start gap-2 text-foreground/70 hover:text-foreground hover:bg-white/10 h-9">
            <Settings className="size-4" />
            Configurações
          </Button>
      </div>
    </aside>
  )
}
