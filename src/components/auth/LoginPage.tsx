import { ShieldCheck } from "lucide-react"
import Logo from "@/components/logo/Logo"
import { Button } from "@/components/ui/button"

interface LoginPageProps {
  onLogin: () => void
  loading: boolean
  error: string | null
  isConfigured: boolean
}

export default function LoginPage({ onLogin, loading, error, isConfigured }: LoginPageProps) {
  const disabled = loading || !isConfigured

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <section
        className="w-full max-w-104 rounded-3xl border border-white/5 p-8 shadow-[0_24px_72px_rgba(0,0,0,0.6)]"
        style={{ backgroundColor: "#141414" }}
      >
        <header className="mb-7 flex flex-col items-center gap-4 text-center">
          <Logo className="h-9 w-auto" />
          <div className="space-y-1.5">
            <h1 className="text-[2rem]/[1.1] font-semibold tracking-[-0.02em] text-white">
              Acesso ao Kanban do VENDE-C
            </h1>
            <p className="text-sm text-white/45">Entre com sua conta Google corporativa</p>
          </div>
        </header>

        <div className="space-y-4">
          <Button
            onClick={onLogin}
            disabled={disabled}
            className="h-12 w-full rounded-lg bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Conectando..." : "Continuar com Google"}
          </Button>

          {!isConfigured && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-center text-xs text-red-300"
            >
              Nao foi possivel iniciar o login no momento. Tente novamente mais tarde.
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-xs text-amber-200"
            >
              {error}
            </div>
          )}
        </div>

        <footer className="mt-7 flex items-center justify-center gap-2 text-xs text-white/35">
          <ShieldCheck className="size-3.5" />
          <span>Acesso protegido por dominio corporativo</span>
        </footer>
      </section>
    </main>
  )
}
