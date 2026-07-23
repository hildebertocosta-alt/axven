import { createBrowserClient } from '@supabase/ssr'

// O cliente Supabase, ao inicializar, lê e limpa o hash da URL (#access_token=...)
// pra estabelecer a sessão. Capturamos o "type" (recovery | magiclink) ANTES
// disso, pra sabermos depois, na tela de login, se o link era de recuperação
// de senha (precisa pedir senha nova) ou magic link (entra direto).
export const authLinkType =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type')
    : null

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
