import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type MutationBusyContextValue = {
  busy: boolean
  label: string | null
  runMutation: <T>(label: string, fn: () => Promise<T>) => Promise<T>
}

const MutationBusyContext = createContext<MutationBusyContextValue | null>(null)

export function MutationBusyProvider({ children }: { children: ReactNode }) {
  const countRef = useRef(0)
  const [label, setLabel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const begin = useCallback((nextLabel: string) => {
    countRef.current += 1
    setLabel(nextLabel)
    setBusy(true)
  }, [])

  const end = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1)
    if (countRef.current === 0) {
      setBusy(false)
      setLabel(null)
    }
  }, [])

  const runMutation = useCallback(
    async <T,>(nextLabel: string, fn: () => Promise<T>): Promise<T> => {
      begin(nextLabel)
      try {
        return await fn()
      } finally {
        end()
      }
    },
    [begin, end],
  )

  const value = useMemo(
    () => ({ busy, label, runMutation }),
    [busy, label, runMutation],
  )

  return (
    <MutationBusyContext.Provider value={value}>
      {children}
    </MutationBusyContext.Provider>
  )
}

export function useMutationBusy(): MutationBusyContextValue {
  const ctx = useContext(MutationBusyContext)
  if (!ctx) {
    throw new Error('useMutationBusy must be used within MutationBusyProvider')
  }
  return ctx
}

/** Optional — returns no-op runner when provider missing (tests). */
export function useMutationBusyOptional(): MutationBusyContextValue | null {
  return useContext(MutationBusyContext)
}
