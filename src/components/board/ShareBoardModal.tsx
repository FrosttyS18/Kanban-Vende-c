import { useMemo, useState } from 'react'
import { Copy, Link2, Trash2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type BoardData, type BoardShareSettings, type Member, type SharePermission } from '@/types'

type ShareBoardModalProps = {
  isOpen: boolean
  board: BoardData
  members: Member[]
  shareSettings: BoardShareSettings
  onClose: () => void
  onChange: (next: BoardShareSettings) => void
}

function getShareLink(token: string): string {
  if (typeof window === 'undefined') {
    return `/shared/${token}`
  }

  return `${window.location.origin}/shared/${token}`
}

export default function ShareBoardModal({ isOpen, board, members, shareSettings, onClose, onChange }: ShareBoardModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [permission, setPermission] = useState<SharePermission>('view')
  const [copied, setCopied] = useState(false)

  const availableMembers = useMemo(
    () => members.filter((member) => !shareSettings.members.some((shared) => shared.memberId === member.id)),
    [members, shareSettings.members]
  )

  const shareLink = getShareLink(shareSettings.linkToken)

  if (!isOpen) {
    return null
  }

  const addMember = () => {
    if (!selectedMemberId) {
      return
    }

    const exists = shareSettings.members.some((member) => member.memberId === selectedMemberId)
    if (exists) {
      return
    }

    onChange({
      ...shareSettings,
      members: [...shareSettings.members, { memberId: selectedMemberId, permission }]
    })

    setSelectedMemberId('')
    setPermission('view')
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Compartilhar board">
      <div className="w-full max-w-xl rounded-xl border border-white/15 bg-[#1e1e1e] p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Compartilhar board</h2>
            <p className="mt-1 text-sm text-[#d1d1d1]">{board.title}</p>
          </div>
          <Button variant="ghost" size="icon" className="text-[#d1d1d1] hover:bg-white/10" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-[#252525] p-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#d1d1d1]">Link do board</label>
          <div className="flex gap-2">
            <Input value={shareLink} readOnly className="h-10 border-white/20 bg-black text-sm text-white" />
            <Button
              className="h-10 min-w-24 bg-primary text-white hover:bg-primary/90"
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
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-[#d1d1d1]">
            <input
              type="checkbox"
              checked={shareSettings.allowLinkAccess}
              onChange={(event) => onChange({ ...shareSettings, allowLinkAccess: event.target.checked })}
              className="accent-primary"
            />
            Permitir acesso por link (visualização)
          </label>
        </div>

        <div className="mb-4 rounded-lg border border-white/10 bg-[#252525] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#d1d1d1]">Adicionar membro</h3>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_120px]">
            <select
              value={selectedMemberId}
              onChange={(event) => setSelectedMemberId(event.target.value)}
              className="h-10 rounded-md border border-white/20 bg-black px-3 text-sm text-white outline-none focus:border-primary"
            >
              <option value="">Selecionar membro</option>
              {availableMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              value={permission}
              onChange={(event) => setPermission(event.target.value as SharePermission)}
              className="h-10 rounded-md border border-white/20 bg-black px-3 text-sm text-white outline-none focus:border-primary"
            >
              <option value="view">Visualizar</option>
              <option value="edit">Editar</option>
            </select>
            <Button className="h-10 bg-primary text-white hover:bg-primary/90" onClick={addMember}>
              <UserPlus className="mr-1 size-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#252525] p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#d1d1d1]">Membros com acesso</h3>
          <div className="space-y-2">
            {shareSettings.members.map((sharedMember) => {
              const member = members.find((item) => item.id === sharedMember.memberId)
              if (!member) {
                return null
              }

              return (
                <div key={member.id} className="flex items-center gap-3 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                  <span className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: member.color }}>
                    {member.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{member.name}</p>
                    <p className="truncate text-xs text-[#d1d1d1]">{member.email}</p>
                  </div>
                  <select
                    value={sharedMember.permission}
                    onChange={(event) =>
                      onChange({
                        ...shareSettings,
                        members: shareSettings.members.map((entry) =>
                          entry.memberId === member.id ? { ...entry, permission: event.target.value as SharePermission } : entry
                        )
                      })
                    }
                    className="h-8 rounded-md border border-white/20 bg-black px-2 text-xs text-white"
                  >
                    <option value="view">Visualizar</option>
                    <option value="edit">Editar</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-300 hover:bg-red-500/10 hover:text-red-200"
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
              <div className="rounded-md border border-dashed border-white/15 p-3 text-sm text-[#d1d1d1]">
                Nenhum membro com acesso ainda.
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" className="text-[#d1d1d1] hover:bg-white/10" onClick={onClose}>
            Fechar
          </Button>
          <Button className="bg-primary text-white hover:bg-primary/90" onClick={onClose}>
            <Link2 className="mr-1 size-4" />
            Concluir
          </Button>
        </div>
      </div>
    </div>
  )
}
