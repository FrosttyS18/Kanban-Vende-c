import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Menu, Search, Trash2, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Logo from '@/components/logo/Logo'
import { type MemberNotification, type SearchResultItem, type SearchScope } from '@/types'

interface HeaderProps {
  userEmail?: string
  onLogout?: () => void
  isLogoutLoading?: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
  searchScope: SearchScope
  onSearchScopeChange: (scope: SearchScope) => void
  searchResults: SearchResultItem[]
  searchLoading?: boolean
  searchError?: string | null
  searchOpeningLabel?: string | null
  onSelectSearchResult?: (result: SearchResultItem) => void
  onCreateBoard: () => void
  canCreateBoard?: boolean
  onShareBoard: () => void
  activeBoardTitle?: string
  activeBoardColor?: string
  notifications?: MemberNotification[]
  unreadNotificationsCount?: number
  onMarkNotificationsRead?: () => void
  onOpenNotification?: (notification: MemberNotification) => void
  onDeleteNotification?: (notification: MemberNotification) => void
  onOpenMobileSidebar?: () => void
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
  searchScope,
  onSearchScopeChange,
  searchResults,
  searchLoading = false,
  searchError = null,
  searchOpeningLabel = null,
  onSelectSearchResult,
  onCreateBoard,
  canCreateBoard = true,
  onShareBoard,
  activeBoardTitle,
  activeBoardColor,
  notifications = [],
  unreadNotificationsCount = 0,
  onMarkNotificationsRead,
  onOpenNotification,
  onDeleteNotification,
  onOpenMobileSidebar
}: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [highlightedResultIndex, setHighlightedResultIndex] = useState(-1)
  const [deletingNotificationIds, setDeletingNotificationIds] = useState<string[]>([])
  const [notificationToastMessage, setNotificationToastMessage] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notificationMenuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const deleteTimersRef = useRef<number[]>([])
  const toastTimerRef = useRef<number | null>(null)

  const initials = useMemo(() => getInitials(userEmail), [userEmail])
  const normalizedQuery = searchQuery.trim()
  const canSearch = normalizedQuery.length >= 3
  const shouldShowSearchDropdown = isSearchOpen && canSearch
  const activeHighlightedResultIndex = searchResults.length === 0 ? -1 : Math.min(highlightedResultIndex, searchResults.length - 1)

  useEffect(() => {
    if (!isUserMenuOpen && !isNotificationsOpen && !isSearchOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const clickedUserMenu = userMenuRef.current?.contains(target)
      const clickedNotificationMenu = notificationMenuRef.current?.contains(target)
      const clickedSearch = searchRef.current?.contains(target)

      if (clickedUserMenu || clickedNotificationMenu || clickedSearch) {
        return
      }

      setIsUserMenuOpen(false)
      setIsNotificationsOpen(false)
      setIsSearchOpen(false)
      setHighlightedResultIndex(-1)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
        setIsNotificationsOpen(false)
        setIsSearchOpen(false)
        setHighlightedResultIndex(-1)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isNotificationsOpen, isSearchOpen, isUserMenuOpen])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      deleteTimersRef.current.forEach((timer) => window.clearTimeout(timer))
      deleteTimersRef.current = []
    }
  }, [])

  const handleSelectSearchResult = (result: SearchResultItem) => {
    onSelectSearchResult?.(result)
    setIsSearchOpen(false)
    setHighlightedResultIndex(-1)
  }

  const handleDeleteNotification = (notification: MemberNotification) => {
    if (deletingNotificationIds.includes(notification.id)) {
      return
    }

    setDeletingNotificationIds((previous) => [...previous, notification.id])
    const timer = window.setTimeout(() => {
      onDeleteNotification?.(notification)
      setDeletingNotificationIds((previous) => previous.filter((id) => id !== notification.id))
      setNotificationToastMessage('Notificação excluída.')
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
      toastTimerRef.current = window.setTimeout(() => {
        setNotificationToastMessage(null)
      }, 1800)
      deleteTimersRef.current = deleteTimersRef.current.filter((currentTimer) => currentTimer !== timer)
    }, 180)
    deleteTimersRef.current.push(timer)
  }

  return (
    <header className="w-full border-b border-[#3d3d3d] bg-[#1e1e1e] shadow-[inset_0_-1px_0_0_#3d3d3d]">
      <div className="relative flex h-16 items-center border-b border-[#3d3d3d] px-4 lg:hidden">
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="inline-flex size-10 items-center justify-center rounded-md text-[#d1d1d1] hover:bg-white/10"
            aria-label="Abrir menu de boards"
          >
            <Menu className="size-8" />
          </button>
        )}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <Logo className="h-8 w-auto" />
        </div>
        <span className="ml-auto inline-flex size-10 items-center justify-center rounded-full bg-primary text-[18px] font-semibold text-white">
          {initials}
        </span>
      </div>

      <div className="hidden min-h-17.5 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 lg:flex lg:gap-4 lg:px-6.5 lg:py-0">
        <div className="flex shrink-0 items-center gap-2 lg:w-41.25">
          <Logo className="h-6.5 w-auto" />
        </div>

        {activeBoardTitle && (
          <div className="hidden min-w-0 max-w-44 shrink-0 items-center gap-2 rounded-[7px] border border-white/15 bg-[#252525] px-2 py-1 md:flex lg:max-w-62.5 lg:px-2.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: activeBoardColor || '#ff0068' }} />
            <span className="truncate text-[12px] font-semibold text-[#d1d1d1]">{activeBoardTitle}</span>
          </div>
        )}

        <div ref={searchRef} className="relative min-w-0 flex-1">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(event) => {
                onSearchChange(event.target.value)
                setIsSearchOpen(true)
                setHighlightedResultIndex(-1)
              }}
              onFocus={() => {
                setIsSearchOpen(true)
                setIsNotificationsOpen(false)
                setIsUserMenuOpen(false)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsSearchOpen(false)
                  setHighlightedResultIndex(-1)
                  return
                }

                if (!canSearch) {
                  return
                }

                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setIsSearchOpen(true)
                  setHighlightedResultIndex((prev) => {
                    if (searchResults.length === 0) {
                      return -1
                    }
                    const next = prev + 1
                    if (next >= searchResults.length) {
                      return 0
                    }
                    return next
                  })
                  return
                }

                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setIsSearchOpen(true)
                  setHighlightedResultIndex((prev) => {
                    if (searchResults.length === 0) {
                      return -1
                    }
                    if (prev <= 0) {
                      return Math.max(0, searchResults.length - 1)
                    }
                    return prev - 1
                  })
                  return
                }

                if (event.key === 'Enter' && activeHighlightedResultIndex >= 0 && activeHighlightedResultIndex < searchResults.length) {
                  event.preventDefault()
                  handleSelectSearchResult(searchResults[activeHighlightedResultIndex])
                }
              }}
              className="h-9 w-full min-w-0 rounded-[7px] border-none bg-black pr-10 text-[14px] text-[#d1d1d1] placeholder:text-[#d1d1d1] focus-visible:ring-2 focus-visible:ring-primary lg:max-w-[min(760px,50vw)]"
              placeholder="Pesquisar"
              aria-label="Pesquisar"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#d1d1d1]" />
          </div>

          {shouldShowSearchDropdown && (
            <div className="absolute left-0 right-0 top-11 z-50 rounded-[9px] border border-white/10 bg-[#1f1f21] p-2 shadow-2xl">
              <div className="mb-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSearchScopeChange('board')}
                  className={`rounded-[7px] px-2.5 py-1 text-[11px] font-semibold ${
                    searchScope === 'board' ? 'bg-primary text-white' : 'bg-[#2c2c2f] text-[#d1d1d1] hover:bg-[#3a3a3f]'
                  }`}
                >
                  Neste board
                </button>
                <button
                  type="button"
                  onClick={() => onSearchScopeChange('all')}
                  className={`rounded-[7px] px-2.5 py-1 text-[11px] font-semibold ${
                    searchScope === 'all' ? 'bg-primary text-white' : 'bg-[#2c2c2f] text-[#d1d1d1] hover:bg-[#3a3a3f]'
                  }`}
                >
                  Todos os boards
                </button>
              </div>

              {searchLoading ? (
                <p className="px-2 py-2 text-xs text-[#a9a9a9]">Buscando...</p>
              ) : searchError ? (
                <p className="px-2 py-2 text-xs text-[#ffb4ae]">{searchError}</p>
              ) : searchResults.length === 0 ? (
                <p className="px-2 py-2 text-xs text-[#a9a9a9]">Nenhum card encontrado.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.cardId}-${result.rank}-${index}`}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className={`w-full rounded-[7px] px-2 py-2 text-left ${
                        activeHighlightedResultIndex === index ? 'bg-[#ff0068]/20' : 'hover:bg-white/7'
                      }`}
                    >
                      <p className="truncate text-[13px] font-semibold text-white">{result.cardTitle}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#a9a9a9]">
                        {result.boardTitle} · {result.listTitle}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchOpeningLabel && (
            <p className="pointer-events-none absolute -bottom-5 left-1 text-[11px] font-medium text-[#d1d1d1]">
              {searchOpeningLabel}
            </p>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Button
            onClick={onShareBoard}
            className="hidden h-8 rounded-[7px] bg-[#d1d1d1] px-3 text-[12px] font-semibold text-[#333333] hover:bg-[#e2e2e2] sm:inline-flex"
          >
            Compartilhar
          </Button>

          <Button
            onClick={() => {
              if (canCreateBoard) {
                onCreateBoard()
              }
            }}
            disabled={!canCreateBoard}
            title={!canCreateBoard ? 'Somente administradores podem criar boards.' : undefined}
            className="h-8 rounded-[7px] bg-primary px-3.5 text-[12px] font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-[#6a6a6a]"
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
                  setIsSearchOpen(false)
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
              <div className="absolute right-0 top-10 z-50 w-[min(304px,calc(100vw-24px))] rounded-lg border border-white/10 bg-[#1e1e1e] p-2 shadow-xl">
                <div className="flex items-center justify-between px-1 py-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a9a9a9]">Notificações</p>
                  {unreadNotificationsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => onMarkNotificationsRead?.()}
                      className="text-[10px] font-semibold text-primary hover:text-primary/80"
                    >
                      Marcar todas
                    </button>
                  )}
                </div>
                <div className="mt-1 max-h-66 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-[#9a9a9a]">Sem notificações novas.</p>
                  ) : (
                    notifications.map((notification) => {
                      const isDeleting = deletingNotificationIds.includes(notification.id)
                      return (
                      <div
                        key={notification.id}
                        className={`flex items-start gap-1 rounded-[6px] px-1 py-1 transition-all duration-200 ease-out ${notification.isRead ? 'hover:bg-white/5' : 'bg-[#ff0068]/12 hover:bg-[#ff0068]/18'} ${isDeleting ? '-translate-x-2 scale-[0.98] opacity-0' : 'translate-x-0 scale-100 opacity-100'}`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onOpenNotification?.(notification)
                            setIsNotificationsOpen(false)
                          }}
                          disabled={isDeleting}
                          className="flex-1 rounded-[6px] px-1 py-1 text-left disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-1.5">
                            {!notification.isRead && <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />}
                            <p className={`text-xs font-semibold ${notification.isRead ? 'text-white' : 'text-[#ffe3f0]'}`}>{notification.title}</p>
                          </div>
                          <p className={`mt-0.5 line-clamp-2 text-xs ${notification.isRead ? 'text-[#d1d1d1]' : 'text-[#ffd4e9]'}`}>{notification.message}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(notification)}
                          disabled={isDeleting}
                          className="mt-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[#a9a9a9] hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Excluir notificação"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    )})
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
                setIsSearchOpen(false)
                setIsUserMenuOpen((prev) => !prev)
              }}
              className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white"
              aria-label="Abrir menu de usuário"
            >
              {initials}
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-white/10 bg-[#1e1e1e] p-2 shadow-xl">
                <div className="mb-2 rounded-md bg-[#252525] px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-[#d1d1d1]">
                    <UserRound className="size-4" />
                    <span className="truncate">{userEmail ?? 'Usuário'}</span>
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
      {notificationToastMessage && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[90] rounded-md border border-[#ff0068]/35 bg-[#1f1f21] px-3 py-2 text-xs font-medium text-[#ffd4e9] shadow-xl">
          {notificationToastMessage}
        </div>
      )}
    </header>
  )
}
