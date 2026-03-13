import type { Session, User } from "@supabase/supabase-js"

export interface LoginRateLimitStatus {
  isBlocked: boolean
  failedAttempts: number
  blockedUntil: number | null
}

export interface AuthSessionState {
  session: Session | null
  user: User | null
  loading: boolean
  actionLoading: boolean
  error: string | null
  rateLimitStatus: LoginRateLimitStatus
}
