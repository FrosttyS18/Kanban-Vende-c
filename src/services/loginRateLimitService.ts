import type { LoginRateLimitStatus } from "@/types/auth"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

const LOGIN_RATE_LIMIT_IDENTIFIER_KEY = "socialteam-login-rate-limit-id"

interface LoginRateLimitRpcRow {
  is_blocked: boolean | null
  failed_attempts: number | string | null
  blocked_until: string | null
  retry_after_seconds: number | string | null
}

const defaultStatus: LoginRateLimitStatus = {
  isBlocked: false,
  failedAttempts: 0,
  blockedUntil: null,
}

function getOrCreateDeviceIdentifier(): string {
  const current = localStorage.getItem(LOGIN_RATE_LIMIT_IDENTIFIER_KEY)?.trim()
  if (current) return current

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

  localStorage.setItem(LOGIN_RATE_LIMIT_IDENTIFIER_KEY, generated)
  return generated
}

function toTimestampMs(value: string | null): number | null {
  if (!value) return null
  const normalized = value.includes("T") ? value : value.replace(" ", "T")
  const timestamp = Date.parse(normalized)
  return Number.isFinite(timestamp) ? timestamp : null
}

function toInteger(value: number | string | null): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value))
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed))
  }
  return 0
}

function normalizeRpcStatus(payload: LoginRateLimitRpcRow | null | undefined): LoginRateLimitStatus {
  if (!payload) return defaultStatus

  const blockedUntil = toTimestampMs(payload.blocked_until)
  const isBlocked =
    Boolean(payload.is_blocked) && blockedUntil !== null && blockedUntil > Date.now()

  return {
    isBlocked,
    failedAttempts: toInteger(payload.failed_attempts),
    blockedUntil: isBlocked && blockedUntil !== null ? blockedUntil : null,
  }
}

async function callRateLimitRpc(
  rpcName: "get_login_rate_limit_status" | "register_login_failure",
): Promise<LoginRateLimitStatus> {
  if (!isSupabaseConfigured) return defaultStatus

  const identifier = getOrCreateDeviceIdentifier()
  const { data, error } = await supabase.rpc(rpcName, { p_identifier: identifier })

  if (error) return defaultStatus

  if (Array.isArray(data)) {
    return normalizeRpcStatus((data[0] as LoginRateLimitRpcRow | undefined) ?? null)
  }

  return normalizeRpcStatus((data as LoginRateLimitRpcRow | null) ?? null)
}

export async function getLoginRateLimitStatus(): Promise<LoginRateLimitStatus> {
  return callRateLimitRpc("get_login_rate_limit_status")
}

export async function registerFailedLoginAttempt(): Promise<LoginRateLimitStatus> {
  return callRateLimitRpc("register_login_failure")
}

export async function clearLoginRateLimit(): Promise<LoginRateLimitStatus> {
  if (!isSupabaseConfigured) return defaultStatus

  const identifier = getOrCreateDeviceIdentifier()
  const { error } = await supabase.rpc("clear_login_rate_limit", { p_identifier: identifier })

  if (error) return defaultStatus

  return defaultStatus
}
