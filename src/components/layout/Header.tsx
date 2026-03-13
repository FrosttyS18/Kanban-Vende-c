import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Logo from "@/components/logo/Logo"

interface HeaderProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
}

export default function Header({ userEmail, onLogout, isLogoutLoading = false }: HeaderProps) {
  return (
    <header className="w-full border-b border-white/10 bg-black/20 backdrop-blur supports-backdrop-filter:bg-black/10">
      <div className="relative flex h-14 w-full items-center justify-between px-4">
        <div className="flex items-center gap-2 z-10">
          <Logo className="h-6 w-auto" />
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
          <Input
            className="w-full rounded-[3px] border-none bg-[#000000] text-sm text-white placeholder:text-white/70 focus:bg-[#000000] focus:text-white focus:ring-2 focus:ring-primary/50"
            placeholder="Pesquisar..."
          />
        </div>
        <div className="flex items-center gap-3 z-10">
          <label className="flex items-center gap-2 text-xs font-medium text-foreground/80 hover:text-foreground cursor-pointer transition-colors">
            <input type="checkbox" className="size-3.5 rounded-sm border-white/40 bg-transparent accent-primary" />
            Minhas tarefas
          </label>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm h-8">Criar</Button>
          {userEmail && (
            <span className="hidden max-w-48 truncate text-xs text-foreground/80 lg:inline">
              {userEmail}
            </span>
          )}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              size="sm"
              disabled={isLogoutLoading}
              className="h-8 border-white/20 bg-transparent text-xs text-foreground hover:bg-white/10"
            >
              {isLogoutLoading ? "Saindo..." : "Sair"}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
