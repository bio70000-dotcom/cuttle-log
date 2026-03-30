import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Session } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      signIn: async (email: string, password: string) => {
        const supabase = getSupabase()
        if (!supabase) {
          set({ error: 'Supabase가 설정되지 않았습니다' })
          return
        }
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }
          set({ user: data.user, session: data.session, isLoading: false, error: null })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '로그인에 실패했습니다',
            isLoading: false,
          })
        }
      },

      signUp: async (email: string, password: string) => {
        const supabase = getSupabase()
        if (!supabase) {
          set({ error: 'Supabase가 설정되지 않았습니다' })
          return
        }
        set({ isLoading: true, error: null })
        try {
          const { data, error } = await supabase.auth.signUp({ email, password })
          if (error) {
            set({ error: error.message, isLoading: false })
            return
          }
          set({ user: data.user, session: data.session, isLoading: false, error: null })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '회원가입에 실패했습니다',
            isLoading: false,
          })
        }
      },

      signOut: async () => {
        const supabase = getSupabase()
        if (!supabase) return
        set({ isLoading: true, error: null })
        try {
          await supabase.auth.signOut()
          set({ user: null, session: null, isLoading: false, error: null })
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : '로그아웃에 실패했습니다',
            isLoading: false,
          })
        }
      },

      initialize: async () => {
        const supabase = getSupabase()
        if (!supabase) return
        set({ isLoading: true })
        try {
          const { data } = await supabase.auth.getSession()
          set({
            user: data.session?.user ?? null,
            session: data.session,
            isLoading: false,
          })

          // Listen for auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({ user: session?.user ?? null, session })
          })
        } catch {
          set({ user: null, session: null, isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
      }),
    }
  )
)
