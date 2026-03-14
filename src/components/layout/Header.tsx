import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Search, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo/Logo'
import { type MemberNotification } from '@/types'

interface HeaderProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  onCreateBoard: () => void
  onShareBoard: () => void
  activeBoardTitle?: string
  activeBoardColor?: string
  notifications?: MemberNotification[]
  unreadNotificationsCount?: number
  onMarkNotificationsRead?: () => void
  onOpenNotification?: (notification: MemberNotification) => void
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
  onShareBoard,
  activeBoardTitle,
  activeBoardColor,
  notifications = [],
  unreadNotificationsCount = 0,
  onMarkNotificationsRead,
  onOpenNotification
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)

  const initials = useMemo(() => getInitials(userEmail), [userEmail])

  useEffect(() => {
    if (!isUserMenuOpen && !isNotificationsOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedUserMenu = userMenuRef.current?.contains(target)
      const clickedNotificationMenu = notificationMenuRef.current?.contains(target)

      if (clickedUserMenu || clickedNotificationMenu) {
        return
      }

      setIsUserMenuOpen(false)
      setIsNotificationsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
        setIsNotificationsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen, isUserMenuOpen])

  return (
    <header className="w-full border-b border-[#3d3d3d] bg-[#1e1e1e] shadow-[inset_0_-1px_0_0_#3d3d3d]">
      <div className="flex h-17.5 items-center gap-3 px-4 lg:gap-4 lg:px-6.5">
        <div className="flex w-37.5 shrink-0 items-center md:w-41.25">
          <Logo className="h-6.5 w-auto" />
        </div>

        <div className="relative flex flex-1 items-center justify-center">
          {activeBoardTitle && (
            <div className="absolute left-25 hidden max-w-62.5 items-center gap-2 rounded-[7px] border border-white/15 bg-[#252525] px-2.5 py-1 md:flex">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeBoardColor || '#ff0068' }} />
              <span className="truncate text-[12px] font-semibold text-[#d1d1d1]">{activeBoardTitle}</span>
            </div>
          )}
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-9 w-[min(760px,46vw)] min-w-55 rounded-[7px] border-none bg-black pr-10 text-[14px] text-[#d1d1d1] placeholder:text-[#d1d1d1] focus-visible:ring-2 focus-visible:ring-primary lg:w-[min(760px,50vw)]"
              placeholder="Pesquisar"
              aria-label="Pesquisar"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#d1d1d1]" />
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2.5">
          <Button
            onClick={onShareBoard}
            className="h-8 rounded-[7px] bg-[#d1d1d1] px-3 text-[12px] font-semibold text-[#333333] hover:bg-[#e2e2e2]"
          >
            Compartilhar
          </Button>

          <Button
            onClick={onCreateBoard}
            className="h-8 rounded-[7px] bg-primary px-3.5 text-[12px] font-semibold text-white hover:bg-primary/90"
          >
            Criar
          </Button>

          <div ref={notificationMenuRef} className="relative">
            <button
              type="button"
              onClick={() =>
                setIsNotificationsOpen((prev) => {
                  const next = !prev
                  setIsUserMenuOpen(false)
                  if (next) {
                    onMarkNotificationsRead?.()
                  }
                  return next
                })
              }
              className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-[#252525] text-[#d1d1d1] hover:bg-[#2f2f2f]"
              aria-label="Abrir notificações"
            >
              <Bell className="size-4" />
            </button>
            {unreadNotificationsCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#ff2d55] px-1 text-[9px] font-bold text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}

            {isNotificationsOpen && (
              <div className="absolute right-0 top-10 z-50 w-76 rounded-lg border border-white/10 bg-[#1e1e1e] p-2 shadow-xl">
                <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-[#a9a9a9]">Notificações</p>
                <div className="mt-1 max-h-66 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-[#9a9a9a]">Sem notificações novas.</p>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          onOpenNotification?.(notification)
                          setIsNotificationsOpen(false)
                        }}
                        className="block w-full rounded-[6px] px-2 py-2 text-left hover:bg-white/5"
                      >
                        <p className="text-xs font-semibold text-white">{notification.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#d1d1d1]">{notification.message}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={userMenuRef} className="relative ml-1.5">
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen(false)
                setIsUserMenuOpen((prev) => !prev)
              }}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white"
              aria-label="Abrir menu de usuario"
            >
              {initials}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-white/10 bg-[#1e1e1e] p-2 shadow-xl">
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
