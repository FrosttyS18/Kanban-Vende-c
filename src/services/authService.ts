import type { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { isSupabaseConfigured, supabase } from "@/lib/supabase"

const allowedEmailDomain = (import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN ?? "vende-c.com")
  .trim()
  .toLowerCase()
  .replace(/^@/, "")

export function getAllowedEmailDomain(): string {
  return allowedEmailDomain
}

export function hasSupabaseConfig(): boolean {
  return isSupabaseConfigured
}

export function isAllowedCorporateEmail(email: string | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().endsWith(`@${allowedEmailDomain}`)
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  if (!hasSupabaseConfig()) {
    return {
      error: "Configuração do Supabase ausente. Defina as variáveis de ambiente.",
    }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        prompt: "select_account",
        hd: allowedEmailDomain,
      },
    },
  })

  return { error: error?.message ?? null }
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!hasSupabaseConfig()) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): () => void {
  if (!hasSupabaseConfig()) return () => undefined
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback)
  return () => subscription.unsubscribe()
}

export async function signOut(): Promise<void> {
  if (!hasSupabaseConfig()) return
  await supabase.auth.signOut()
}
