import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
export default function Header() {
  return (
    <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur supports-[backdrop-filter]:bg-black/10">
      <div className="flex h-14 w-full items-center gap-4 px-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">V</div>
          <div className="text-sm font-bold tracking-wide text-foreground/90">Vende-C</div>
        </div>
        <div className="flex-1">
          <Input
            className="w-full max-w-md rounded-[3px] border-none bg-white/20 text-sm text-white placeholder:text-white/70 focus:bg-white focus:text-black focus:ring-2 focus:ring-primary/50"
            placeholder="Pesquisar..."
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/80 hover:text-foreground cursor-pointer transition-colors">
            <input type="checkbox" className="size-3.5 rounded-sm border-white/40 bg-transparent accent-primary" />
            Minhas tarefas
          </label>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm h-8">Criar</Button>
          <div className="size-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 border-2 border-white/10" />
        </div>
      </div>
    </header>
  )
}
