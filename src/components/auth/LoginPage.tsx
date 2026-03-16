import Logo from "@/components/logo/Logo"
import googleLogo from "@/assets/login/google-logo.svg"
import shieldIcon from "@/assets/login/shield-icon.svg"
import previewTop from "@/assets/login/preview-top.png"
import previewBottom from "@/assets/login/preview-bottom.png"

interface LoginPageProps {
  onLogin: () => void
  loading: boolean
  error: string | null
  isConfigured: boolean
}

export default function LoginPage({ onLogin, loading, error, isConfigured }: LoginPageProps) {
  const disabled = loading || !isConfigured

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-6 py-8 text-white">
      <section className="login-fade absolute left-1/2 top-1/2 hidden h-132.25 w-233 -translate-x-1/2 -translate-y-1/2 origin-center scale-[1.15] overflow-hidden rounded-[22px] bg-[#141414] xl:block">
        <div className="login-enter-right login-delay-1 absolute right-3 top-2.5 h-127 w-114.75 rounded-xl bg-[#ff0068]">
          <h2 className="login-enter login-delay-2 absolute left-9 top-13 w-97.5 text-[31px]/[1.1] font-bold tracking-[-0.03em]">
            Bem-vindo ao sistema de KANBAN do VENDE-C
          </h2>
          <p className="login-enter login-delay-3 absolute left-9 top-35.5 w-97.5 text-xs/[1.35] font-normal text-white">
            Este sistema foi desenvolvido para organização de Tarefas e Demandas dos times internos e colaboradores do VENDE-C.
          </p>

          <article className="login-enter-right login-delay-4 absolute left-5.75 top-56 h-49 w-98.5 rounded-2xl bg-[#0f0f0f] p-2.5">
            <img src={previewTop} alt="Preview do board Kanban VENDE-C" className="h-44.5 w-93.5 rounded-[10px] object-cover" />
          </article>

          <article className="login-enter-right login-delay-5 absolute left-11.75 top-71.5 h-49 w-98.5 rounded-2xl bg-[#242529] p-2.5">
            <img src={previewBottom} alt="Preview do card modal Kanban VENDE-C" className="h-44.5 w-93.5 rounded-[10px] object-cover" />
          </article>
        </div>

        <div className="login-enter-left login-delay-1 absolute left-15 top-35.5 w-86.75">
          <Logo className="login-enter login-delay-2 mx-auto h-7.5 w-38.25" />
          <h1 className="login-enter login-delay-3 mt-10.25 text-center text-[17px]/[1.1] font-bold">Acesso ao Kaban do VENDE-C</h1>
          <p className="login-enter login-delay-4 mt-2.25 text-center text-[11.5px] text-[#555555]">Entre com sua conta Google corporativa</p>

          <button
            type="button"
            onClick={onLogin}
            disabled={disabled}
            className="login-enter login-delay-5 mt-7.25 flex h-9.5 w-full items-center justify-center gap-1.5 rounded-md border border-[#3b3b3b] bg-black text-[12.6px] font-bold text-white transition-colors hover:border-[#ff0068] hover:bg-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <img src={googleLogo} alt="" aria-hidden="true" className="h-3.25 w-3.25" />
            <span>{loading ? "Conectando..." : "Continuar com Google"}</span>
          </button>

          <p className="login-enter login-delay-6 mt-36.5 flex items-center justify-center gap-1.5 text-[11.5px] font-normal text-[#555555]">
            <img src={shieldIcon} alt="" aria-hidden="true" className="h-2.75 w-2.75" />
            <span>Acesso protegido por domínio corporativo</span>
          </p>
        </div>
      </section>

      <section className="login-fade mx-auto flex w-full max-w-[565px] flex-col gap-4 rounded-[27px] border border-white/5 bg-[#141414] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.6)] xl:hidden">
        <Logo className="login-enter login-delay-1 mx-auto h-[42.12px] w-[217.999px]" />
        <h1 className="login-enter login-delay-2 text-center text-[30px]/[1.1] font-bold tracking-[-0.02em]">Acesso ao Kaban do VENDE-C</h1>
        <p className="login-enter login-delay-3 text-center text-[16.368px] text-[#555555]">Entre com sua conta Google corporativa</p>
        <button
          type="button"
          onClick={onLogin}
          disabled={disabled}
          className="login-enter login-delay-4 mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[9px] border border-[#3b3b3b] bg-black text-[18px] font-bold text-white transition-colors hover:border-[#ff0068] hover:bg-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src={googleLogo} alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
          <span>{loading ? "Conectando..." : "Continuar com Google"}</span>
        </button>
        <p className="login-enter login-delay-5 mt-1 flex items-center justify-center gap-2 text-[16.368px] font-normal text-[#555555]">
          <img src={shieldIcon} alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
          <span>Acesso protegido por domínio corporativo</span>
        </p>
      </section>

      <div className="mx-auto mt-4 w-full max-w-[932px] space-y-2">
        {!isConfigured && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-center text-sm text-red-300">
            Não foi possível iniciar o login no momento. Tente novamente mais tarde.
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center text-sm text-amber-200">
            {error}
          </div>
        )}
      </div>

      <footer className="login-enter login-delay-6 absolute bottom-6 left-7 text-[11.5px] font-normal text-[#555555]">VENDE-C - 2026 Todos os direitos reservados</footer>
    </main>
  )
}
