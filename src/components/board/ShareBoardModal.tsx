import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Copy, Link2, Mail, Trash2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type BoardData, type BoardShareSettings, type Member, type SharePermission } from '@/types'

type ShareBoardModalProps = {
  isOpen: boolean
  board: BoardData
  members: Member[]
  ownerMemberId: string
  shareSettings: BoardShareSettings
  onClose: () => void
  onChange: (next: BoardShareSettings) => void
  onInviteByEmail: (email: string, permission: SharePermission) => { ok: boolean; message?: string }
}

function getShareLink(token: string): string {
  if (typeof window === 'undefined') {
    return `/shared/${token}`
  }

  return `${window.location.origin}/shared/${token}`
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

type SelectOption = {
  value: string
  label: string
}

type CustomSelectProps = {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  buttonClassName?: string
  menuClassName?: string
}

function CustomSelect({ value, options, onChange, buttonClassName = '', menuClassName = '' }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (containerRef.current?.contains(target)) {
        return
      }
      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selected = options.find((option) => option.value === value) ?? options[0]

  return (
    <div ref={containerRef} className={`relative ${menuClassName}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative h-11 w-full rounded-lg border border-white/15 bg-black pl-3 pr-10 text-left text-sm font-medium text-white outline-none transition-colors hover:border-white/25 ${buttonClassName}`}
      >
        <span className="block truncate">{selected?.label ?? ''}</span>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#d1d1d1]" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-12 z-40 w-full overflow-hidden rounded-lg border border-white/15 bg-[#1a1a1a] shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`block w-full px-3 py-2 text-left text-sm ${
                option.value === selected?.value ? 'bg-primary text-white' : 'text-[#d1d1d1] hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ShareBoardModal({ isOpen, board, members, ownerMemberId, shareSettings, onClose, onChange, onInviteByEmail }: ShareBoardModalProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [permission, setPermission] = useState<SharePermission>('view')
  const [copied, setCopied] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const shareLink = getShareLink(shareSettings.linkToken)

  if (!isOpen) {
    return null
  }

  const addMember = () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase()
    if (!normalizedEmail) {
      setInviteError('Informe um e-mail para convidar.')
      return
    }

    if (!isValidEmail(normalizedEmail)) {
      setInviteError('Digite um e-mail válido.')
      return
    }

    const inviteResult = onInviteByEmail(normalizedEmail, permission)
    if (!inviteResult.ok) {
      setInviteError(inviteResult.message ?? 'Não foi possível adicionar este e-mail.')
      return
    }

    setInviteError('')
    setInviteEmail('')
    setPermission('view')
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Compartilhar board">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-[#1e1e1e] p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-[30px] font-semibold leading-tight text-white">Compartilhar "{board.title}"</h2>
            <p className="mt-1 text-sm text-[#bcbcbc]">Adicione pessoas, ajuste permissões e controle o acesso do link.</p>
          </div>
          <Button variant="ghost" size="icon" className="text-[#d1d1d1] hover:bg-white/10" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <section className="mt-1">
          <label htmlFor="share-invite-email" className="text-sm font-medium text-[#d9d9d9]">
            Adicionar participantes por e-mail ou domínio
          </label>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_170px_130px]">
            <Input
              id="share-invite-email"
              value={inviteEmail}
              onChange={(event) => {
                setInviteEmail(event.target.value)
                if (inviteError) {
                  setInviteError('')
                }
              }}
              placeholder="exemplo@empresa.com"
              className="h-11 border-white/20 bg-black text-sm text-white placeholder:text-[#8b8b8b] focus-visible:ring-2 focus-visible:ring-primary"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addMember()
                }
              }}
            />
            <CustomSelect
              value={permission}
              onChange={(nextValue) => setPermission(nextValue as SharePermission)}
              options={[
                { value: 'view', label: 'Visualizar' },
                { value: 'edit', label: 'Editar' }
              ]}
            />
            <Button className="h-11 bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60" onClick={addMember} disabled={!inviteEmail.trim()}>
              <UserPlus className="mr-1 size-4" />
              Adicionar
            </Button>
          </div>
          {inviteError && <p className="mt-2 text-sm text-[#ff8fae]">{inviteError}</p>}
        </section>

        <section className="mt-6 border-t border-white/10 pt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[28px] font-semibold text-white">Pessoas com acesso</h3>
            <div className="flex items-center gap-1 text-[#d1d1d1]">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Copiar resumo de acessos"
                onClick={async () => {
                  const lines = shareSettings.members
                    .map((entry) => {
                      const member = members.find((item) => item.id === entry.memberId)
                      if (!member) {
                        return ''
                      }
                      return `${member.name} <${member.email}> - ${entry.permission === 'edit' ? 'Editar' : 'Visualizar'}`
                    })
                    .filter(Boolean)
                    .join('\n')

                  if (!lines) {
                    return
                  }

                  try {
                    await navigator.clipboard.writeText(lines)
                  } catch {
                    setCopied(false)
                  }
                }}
              >
                <Copy className="size-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Enviar convite por e-mail"
                onClick={() => {
                  const emails = shareSettings.members
                    .map((entry) => members.find((item) => item.id === entry.memberId)?.email ?? '')
                    .filter(Boolean)
                    .join(';')

                  if (!emails || typeof window === 'undefined') {
                    return
                  }

                  window.location.href = `mailto:${emails}`
                }}
              >
                <Mail className="size-4" />
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {shareSettings.members.map((sharedMember) => {
              const member = members.find((item) => item.id === sharedMember.memberId)
              if (!member) {
                return null
              }

              return (
                <div key={member.id} className="flex items-center gap-3 border-b border-white/10 py-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: member.color }}>
                    {member.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{member.name}</p>
                    <p className="truncate text-xs text-[#d1d1d1]">{member.email}</p>
                  </div>
                  <div className="min-w-34">
                    <CustomSelect
                      value={sharedMember.permission}
                      onChange={(nextValue) =>
                        onChange({
                          ...shareSettings,
                          members: shareSettings.members.map((entry) =>
                            entry.memberId === member.id ? { ...entry, permission: nextValue as SharePermission } : entry
                          )
                        })
                      }
                      options={[
                        { value: 'view', label: 'Visualizar' },
                        { value: 'edit', label: 'Editar' }
                      ]}
                      buttonClassName="h-9 pl-2.5 pr-10 text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`size-8 ${
                      shareSettings.members.length <= 1 || member.id === ownerMemberId
                        ? 'cursor-not-allowed text-[#6f6f6f]'
                        : 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
                    }`}
                    disabled={shareSettings.members.length <= 1 || member.id === ownerMemberId}
                    onClick={() =>
                      onChange({
                        ...shareSettings,
                        members: shareSettings.members.filter((entry) => entry.memberId !== member.id)
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )
            })}

            {shareSettings.members.length === 0 && (
              <div className="px-1 py-3 text-sm text-[#9a9a9a]">
                Nenhum membro com acesso ainda.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 border-t border-white/10 pt-5">
          <h3 className="text-xl font-semibold text-white">Acesso geral</h3>
          <div className="mt-3 flex flex-col gap-3 p-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/15 bg-black/40">
                  <Link2 className="size-4 text-[#d1d1d1]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{shareSettings.allowLinkAccess ? 'Qualquer pessoa com o link' : 'Restrito'}</p>
                  <p className="truncate text-sm text-[#bcbcbc]">
                    {shareSettings.allowLinkAccess ? 'Pessoas com o link podem visualizar este board.' : 'Somente pessoas adicionadas podem abrir o board.'}
                  </p>
                </div>
              </div>
              <div className="min-w-46">
                <CustomSelect
                  value={shareSettings.allowLinkAccess ? 'link' : 'restricted'}
                  onChange={(nextValue) => onChange({ ...shareSettings, allowLinkAccess: nextValue === 'link' })}
                  options={[
                    { value: 'restricted', label: 'Restrito' },
                    { value: 'link', label: 'Qualquer pessoa com o link' }
                  ]}
                  buttonClassName="h-9 pl-3 pr-10"
                />
              </div>
            </div>
            <Input value={shareLink} readOnly className="h-10 border-white/20 bg-black text-sm text-white" />
          </div>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="outline"
            className="h-10 border-white/20 bg-transparent text-white hover:bg-white/10"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareLink)
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              } catch {
                setCopied(false)
              }
            }}
          >
            <Copy className="mr-1 size-4" />
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-10 text-[#d1d1d1] hover:bg-white/10" onClick={onClose}>
              Fechar
            </Button>
            <Button className="h-10 bg-primary text-white hover:bg-primary/90" onClick={onClose}>
              Concluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
