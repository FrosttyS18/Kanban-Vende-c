import BoardPage from "@/pages/BoardPage"
import LoginPage from "@/components/auth/LoginPage"
import { useAuthSession } from "@/hooks/useAuthSession"

function App() {
  const {
    user,
    loading,
    actionLoading,
    error,
    login,
    logout,
    isConfigured,
    sessionBootstrapError,
    retrySessionBootstrap
  } = useAuthSession()

  if (loading) {
    if (sessionBootstrapError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-xl border border-[#820002] bg-[#1f1f21] p-5 text-center">
            <p className="text-sm text-[#ffb4ae]">{sessionBootstrapError}</p>
            <button
              type="button"
              onClick={retrySessionBootstrap}
              className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      )
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Validando sessão...
      </main>
    )
  }

  if (!user) {
    if (sessionBootstrapError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-xl border border-[#820002] bg-[#1f1f21] p-5 text-center">
            <p className="text-sm text-[#ffb4ae]">{sessionBootstrapError}</p>
            <button
              type="button"
              onClick={retrySessionBootstrap}
              className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      )
    }

    return <LoginPage onLogin={login} loading={actionLoading} error={error} isConfigured={isConfigured} />
  }

  return <BoardPage userEmail={user.email} onLogout={logout} isLogoutLoading={actionLoading} />
}

export default App
