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
      <section className="relative mx-auto hidden h-[756px] w-full max-w-[1331px] overflow-hidden rounded-[31.564px] bg-[#141414] xl:block">
        <div className="absolute right-[17px] top-[15px] h-[725px] w-[656px] rounded-[17.359px] bg-[#ff0068]">
          <h2 className="absolute left-[52px] top-[74px] w-[503px] text-[44px]/[1.1] font-bold tracking-[-0.03em]">
            Bem vindo ao sistema de KANBAN do VENDE-C
          </h2>
          <p className="absolute left-[52px] top-[225px] w-[504px] text-[16.368px]/[1.35] font-normal text-white">
            Este sistema foi desenvolvido para organização de Tarefas e Demandas dos times internos e colaboradores do VENDE-C.
          </p>

          <article className="absolute left-[33px] top-[320px] h-[280.157px] w-[563.097px] rounded-[22.264px] bg-[#0f0f0f] p-[14px]">
            <img src={previewTop} alt="Preview do board Kanban VENDE-C" className="h-[255.027px] w-[534.087px] rounded-[13.915px] object-cover" />
          </article>

          <article className="absolute left-[67px] top-[442px] h-[280.157px] w-[563.097px] rounded-[22.264px] bg-[#242529] p-[14px]">
            <img src={previewBottom} alt="Preview do card modal Kanban VENDE-C" className="h-[255.027px] w-[534.087px] rounded-[13.915px] object-cover" />
          </article>
        </div>

        <div className="absolute left-[85px] top-[203px] w-[496px]">
          <Logo className="mx-auto h-[42.12px] w-[217.999px]" />
          <h1 className="mt-[59px] text-center text-[24.442px]/[1.1] font-bold">Acesso ao Kaban do VENDE-C</h1>
          <p className="mt-[13px] text-center text-[16.368px] text-[#555555]">Entre com sua conta Google corporativa</p>

          <button
            type="button"
            onClick={onLogin}
            disabled={disabled}
            className="mt-[42px] flex h-[54px] w-full items-center justify-center gap-2 rounded-[9px] border border-[#3b3b3b] bg-black text-[18px] font-bold text-white transition-colors hover:border-[#ff0068] hover:bg-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <img src={googleLogo} alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
            <span>{loading ? "Conectando..." : "Continuar com Google"}</span>
          </button>

          <p className="mt-[167px] flex items-center justify-center gap-2 text-[16.368px] font-normal text-[#555555]">
            <img src={shieldIcon} alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
            <span>Acesso protegido por domínio corporativo</span>
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[565px] flex-col gap-4 rounded-[27px] border border-white/5 bg-[#141414] p-6 shadow-[0_24px_72px_rgba(0,0,0,0.6)] xl:hidden">
        <Logo className="mx-auto h-[42.12px] w-[217.999px]" />
        <h1 className="text-center text-[30px]/[1.1] font-bold tracking-[-0.02em]">Acesso ao Kaban do VENDE-C</h1>
        <p className="text-center text-[16.368px] text-[#555555]">Entre com sua conta Google corporativa</p>
        <button
          type="button"
          onClick={onLogin}
          disabled={disabled}
          className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-[9px] border border-[#3b3b3b] bg-black text-[18px] font-bold text-white transition-colors hover:border-[#ff0068] hover:bg-[#0d0d0d] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <img src={googleLogo} alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
          <span>{loading ? "Conectando..." : "Continuar com Google"}</span>
        </button>
        <p className="mt-1 flex items-center justify-center gap-2 text-[16.368px] font-normal text-[#555555]">
          <img src={shieldIcon} alt="" aria-hidden="true" className="h-[16px] w-[16px]" />
          <span>Acesso protegido por domínio corporativo</span>
        </p>
      </section>

      <div className="mx-auto mt-4 w-full max-w-[1331px] space-y-2">
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

      <footer className="absolute bottom-6 left-7 text-[16.368px] font-normal text-[#555555]">VENDE-C - 2026 Todos os direitos reservados</footer>
    </main>
  )
}
