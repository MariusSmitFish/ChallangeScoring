import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient'

type AuthContextValue = {
  session: Session | null
  user: User | null
  isAdmin: boolean
  loading: boolean
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: string | null; isAdmin: boolean }>
  signOut: () => Promise<void>
  refreshAdmin: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false
  const { data, error } = await client
    .from('app_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  return !!data && !error
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const refreshAdmin = useCallback(async () => {
    const client = getSupabaseClient()
    const uid = client ? (await client.auth.getUser()).data.user?.id : null
    if (!uid) {
      setIsAdmin(false)
      return
    }
    setIsAdmin(await fetchIsAdmin(uid))
  }, [])

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      setSession(null)
      setUser(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }

    let cancelled = false

    void (async () => {
      const { data: { session: s } } = await client.auth.getSession()
      if (cancelled) return
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        setIsAdmin(await fetchIsAdmin(s.user.id))
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        setIsAdmin(await fetchIsAdmin(s.user.id))
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const client = getSupabaseClient()
    if (!client)
      return { error: 'Supabase not configured', isAdmin: false }
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message, isAdmin: false }
    await refreshAdmin()
    const uid = (await client.auth.getUser()).data.user?.id
    const admin = uid ? await fetchIsAdmin(uid) : false
    return { error: null as string | null, isAdmin: admin }
  }, [refreshAdmin])

  const signOut = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) return
    await client.auth.signOut()
    setIsAdmin(false)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      isAdmin,
      loading,
      signIn,
      signOut,
      refreshAdmin,
    }),
    [session, user, isAdmin, loading, signIn, signOut, refreshAdmin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
