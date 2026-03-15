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
      <div className="flex w-full max-w-[565px] flex-col items-center gap-4">
        <section
          className="relative box-border h-[365.796px] w-full overflow-hidden rounded-[27px] border border-white/5 shadow-[0_24px_72px_rgba(0,0,0,0.6)]"
          style={{ backgroundColor: "#141414" }}
        >
          <Logo className="absolute left-1/2 top-[50.398px] h-[42.12px] w-auto -translate-x-1/2" />

          <h1 className="absolute left-1/2 top-[117.398px] -translate-x-1/2 whitespace-nowrap text-[24.442px] font-bold leading-normal tracking-[-0.02em] text-white">
            Acesso ao Kaban do VENDE-C
          </h1>

          <p className="absolute left-1/2 top-[153.278px] -translate-x-1/2 whitespace-nowrap text-[16.368px] font-normal leading-normal text-[#555555]">
            Entre com sua conta Google corporativa
          </p>

          <Button
            onClick={onLogin}
            disabled={disabled}
            className="absolute left-[35px] top-[209.518px] h-[50px] w-[496px] rounded-[9px] bg-primary text-[18px] font-bold text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Conectando..." : "Continuar com Google"}
          </Button>

          <footer className="absolute left-1/2 top-[290.518px] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap text-[16.368px] font-normal leading-normal text-[#555555]">
            <ShieldCheck className="size-[16px]" />
            <span>Acesso protegido por domínio corporativo</span>
          </footer>
        </section>

        {!isConfigured && (
          <div
            role="alert"
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-center text-xs text-red-300"
          >
            Nao foi possivel iniciar o login no momento. Tente novamente mais tarde.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-xs text-amber-200"
          >
            {error}
          </div>
        )}
      </div>
    </main>
  )
}
