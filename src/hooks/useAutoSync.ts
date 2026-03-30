import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { fullSync } from '@/lib/sync'
import { isSupabaseConfigured } from '@/lib/supabase'

const DEBOUNCE_MS = 2000

export function useAutoSync() {
  const user = useAuthStore((s) => s.user)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSync = () => {
    if (!isSupabaseConfigured() || !user) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      fullSync().catch(() => {
        // best-effort — do not surface errors automatically
      })
    }, DEBOUNCE_MS)
  }

  // Sync on mount when user is authenticated
  useEffect(() => {
    if (!isSupabaseConfigured() || !user) return
    scheduleSync()

    const handleOnline = () => scheduleSync()
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('online', handleOnline)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])
}
