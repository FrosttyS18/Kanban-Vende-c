import { useMemo, useState } from 'react'
import { Search, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo/Logo'

interface HeaderProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  onCreateBoard: () => void
  onShareBoard: () => void
}

function getInitials(email?: string): string {
  if (!email) {
    return 'WS'
  }

  const local = email.split('@')[0] ?? 'ws'
  const parts = local.split(/[._-]/g).filter(Boolean)

  if (parts.length === 0) {
    return 'WS'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

export default function Header({
  userEmail,
  onLogout,
  isLogoutLoading = false,
  searchQuery,
  onSearchChange,
  onCreateBoard,
  onShareBoard
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const initials = useMemo(() => getInitials(userEmail), [userEmail])

  return (
    <header className="w-full border-b border-[#525252] bg-[#1e1e1e]">
      <div className="flex h-[100px] items-center gap-3 px-4 lg:gap-5 lg:px-8">
        <div className="flex w-[150px] shrink-0 items-center md:w-[165px]">
          <Logo className="h-8 w-auto" />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-[44px] w-[min(827px,45vw)] min-w-[220px] rounded-[7px] border-none bg-black pr-11 text-[16px] text-[#d1d1d1] placeholder:text-[#d1d1d1] focus-visible:ring-2 focus-visible:ring-primary md:h-[51px] md:w-[min(827px,48vw)] lg:w-[min(827px,52vw)]"
              placeholder="Pesquisar"
              aria-label="Pesquisar"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-[#d1d1d1]" />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-3 lg:gap-4">
          <Button
            onClick={onShareBoard}
            className="h-[36px] rounded-[7px] bg-[#d1d1d1] px-3 text-[13px] font-semibold text-[#333333] hover:bg-[#e2e2e2] md:h-[39px] md:px-4 md:text-[16px]"
          >
            Compartilhar
          </Button>

          <Button
            onClick={onCreateBoard}
            className="h-[36px] rounded-[7px] bg-primary px-4 text-[13px] font-semibold text-white hover:bg-primary/90 md:h-[39px] md:px-5 md:text-[16px]"
          >
            Criar
          </Button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
              aria-label="Abrir menu de usuario"
            >
              {initials}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-[62px] z-50 w-56 rounded-lg border border-white/10 bg-[#1e1e1e] p-2 shadow-xl">
                <div className="mb-2 rounded-md bg-[#252525] px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-[#d1d1d1]">
                    <UserRound className="size-4" />
                    <span className="truncate">{userEmail ?? 'Usuario'}</span>
                  </div>
                </div>
                {onLogout && (
                  <Button
                    onClick={onLogout}
                    disabled={isLogoutLoading}
                    variant="ghost"
                    className="h-9 w-full justify-start text-sm text-[#d1d1d1] hover:bg-white/10"
                  >
                    {isLogoutLoading ? 'Saindo...' : 'Sair'}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
