import BoardPage from "@/pages/BoardPage"
import LoginPage from "@/components/auth/LoginPage"
import { useAuthSession } from "@/hooks/useAuthSession"

function App() {
  const { user, loading, actionLoading, error, login, logout, isConfigured } = useAuthSession()

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Validando sessao...
      </main>
    )
  }

  if (!user) {
    return <LoginPage onLogin={login} loading={actionLoading} error={error} isConfigured={isConfigured} />
  }

  return <BoardPage userEmail={user.email} onLogout={logout} isLogoutLoading={actionLoading} />
}

export default App
