import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../lib/supabaseClient'

const SESSION_CHECK_MS = 12_000

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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s`))
    }, ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        window.clearTimeout(timer)
        reject(err)
      })
  })
}

async function fetchIsAdmin(userId: string): Promise<boolean> {
  const client = getSupabaseClient()
  if (!client) return false
  try {
    const { data, error } = await client
      .from('app_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    return !!data && !error
  } catch {
    return false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const adminRequestId = useRef(0)

  const applySession = useCallback((s: Session | null) => {
    setSession(s)
    setUser(s?.user ?? null)
  }, [])

  const resolveAdmin = useCallback(async (uid: string | undefined) => {
    const requestId = ++adminRequestId.current
    if (!uid) {
      setIsAdmin(false)
      return
    }
    const admin = await fetchIsAdmin(uid)
    if (adminRequestId.current === requestId) {
      setIsAdmin(admin)
    }
  }, [])

  const refreshAdmin = useCallback(async () => {
    const client = getSupabaseClient()
    if (!client) {
      setIsAdmin(false)
      return
    }
    try {
      const { data } = await withTimeout(
        client.auth.getUser(),
        SESSION_CHECK_MS,
        'getUser',
      )
      await resolveAdmin(data.user?.id)
    } catch {
      setIsAdmin(false)
    }
  }, [resolveAdmin])

  useEffect(() => {
    const client = getSupabaseClient()
    if (!client) {
      applySession(null)
      setIsAdmin(false)
      setLoading(false)
      return
    }

    let active = true

    void (async () => {
      try {
        const { data } = await withTimeout(
          client.auth.getSession(),
          SESSION_CHECK_MS,
          'getSession',
        )
        if (!active) return
        const s = data.session
        applySession(s)
        setLoading(false)
        void resolveAdmin(s?.user?.id)
      } catch {
        if (!active) return
        applySession(null)
        setIsAdmin(false)
        setLoading(false)
      }
    })()

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, s) => {
      if (!active) return
      applySession(s)
      setLoading(false)
      void resolveAdmin(s?.user?.id)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [applySession, resolveAdmin])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient()
      if (!client) return { error: 'Supabase not configured', isAdmin: false }
      const { error } = await client.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message, isAdmin: false }
      const uid = (await client.auth.getUser()).data.user?.id
      const admin = uid ? await fetchIsAdmin(uid) : false
      setIsAdmin(admin)
      return { error: null as string | null, isAdmin: admin }
    },
    [],
  )

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
