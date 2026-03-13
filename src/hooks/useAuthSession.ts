import { useCallback, useEffect, useMemo, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { LoginRateLimitStatus } from "@/types/auth"
import {
  clearLoginRateLimit,
  getLoginRateLimitStatus,
  registerFailedLoginAttempt,
} from "@/services/loginRateLimitService"
import {
  getAllowedEmailDomain,
  getCurrentSession,
  hasSupabaseConfig,
  isAllowedCorporateEmail,
  onAuthChange,
  signInWithGoogle,
  signOut,
} from "@/services/authService"

const defaultRateLimit: LoginRateLimitStatus = {
  isBlocked: false,
  failedAttempts: 0,
  blockedUntil: null,
}

function getRateLimitMessage(status: LoginRateLimitStatus): string {
  if (!status.isBlocked || !status.blockedUntil) return ""
  const diffMs = status.blockedUntil - Date.now()
  const minutes = Math.max(1, Math.ceil(diffMs / 60000))
  return `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`
}

export function useAuthSession() {
  const initialRateLimitStatus = useMemo(() => defaultRateLimit, [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    initialRateLimitStatus.isBlocked ? getRateLimitMessage(initialRateLimitStatus) : null,
  )
  const [rateLimitStatus, setRateLimitStatus] = useState<LoginRateLimitStatus>(
    initialRateLimitStatus,
  )
  const allowedDomain = useMemo(() => getAllowedEmailDomain(), [])

  const applyRateLimit = useCallback((status: LoginRateLimitStatus) => {
    setRateLimitStatus(status)
    if (status.isBlocked) {
      setError(getRateLimitMessage(status))
    }
  }, [])

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        setSession(null)
        return
      }

      if (!isAllowedCorporateEmail(nextSession.user.email)) {
        const status = await registerFailedLoginAttempt()
        applyRateLimit(status)
        await signOut()
        setSession(null)
        setError(`Acesso restrito ao dominio @${allowedDomain}.`)
        return
      }

      await clearLoginRateLimit()
      setRateLimitStatus(defaultRateLimit)
      setError(null)
      setSession(nextSession)
    },
    [allowedDomain, applyRateLimit],
  )

  useEffect(() => {
    let mounted = true

    const syncRateLimitStatus = async () => {
      const latestStatus = await getLoginRateLimitStatus()
      if (!mounted) return

      setRateLimitStatus((previousStatus) => {
        if (
          previousStatus.isBlocked === latestStatus.isBlocked &&
          previousStatus.failedAttempts === latestStatus.failedAttempts &&
          previousStatus.blockedUntil === latestStatus.blockedUntil
        ) {
          return previousStatus
        }
        return latestStatus
      })

      if (latestStatus.isBlocked) {
        setError(getRateLimitMessage(latestStatus))
      } else {
        setError((currentError) =>
          currentError?.startsWith("Muitas tentativas.") ? null : currentError,
        )
      }
    }

    const initializeSession = async () => {
      try {
        const currentSession = await getCurrentSession()
        if (!mounted) return
        await applySession(currentSession)
        await syncRateLimitStatus()
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void initializeSession()

    const unsubscribe = onAuthChange((_event, nextSession) => {
      void applySession(nextSession)
    })

    const timer = window.setInterval(() => {
      void syncRateLimitStatus()
    }, 30000)

    return () => {
      mounted = false
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [applySession])

  const login = useCallback(async () => {
    const status = await getLoginRateLimitStatus()
    if (status.isBlocked) {
      applyRateLimit(status)
      return
    }

    setActionLoading(true)
    setError(null)

    try {
      const result = await signInWithGoogle()
      if (result.error) {
        const nextStatus = await registerFailedLoginAttempt()
        setRateLimitStatus(nextStatus)
        if (nextStatus.isBlocked) {
          setError(getRateLimitMessage(nextStatus))
        } else {
          setError("Nao foi possivel iniciar o login com Google.")
        }
      }
    } finally {
      setActionLoading(false)
    }
  }, [applyRateLimit])

  const logout = useCallback(async () => {
    setActionLoading(true)
    await signOut()
    setSession(null)
    setActionLoading(false)
  }, [])

  const isConfigured = hasSupabaseConfig()
  const user: User | null = session?.user ?? null

  return {
    session,
    user,
    loading,
    actionLoading,
    error,
    login,
    logout,
    isConfigured,
    allowedDomain,
    rateLimitStatus,
  }
}
