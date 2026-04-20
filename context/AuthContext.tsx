import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 앱 시작 시 저장된 세션 복원
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (__DEV__) console.log('[Auth] 세션 복원:', session?.user?.email ?? '없음')
      })
      .catch(() => {
        if (__DEV__) console.log('[Auth] 세션 확인 실패 → 비로그인 상태로 시작')
      })
      .finally(() => setLoading(false))

    // 로그인/로그아웃 이벤트 실시간 감지
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (__DEV__) console.log('[Auth] 상태 변경:', event, session?.user?.email ?? '없음')
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signOut = async (): Promise<void> => {
    // 먼저 로컬 상태를 즉시 초기화 (UI가 바로 비인증 상태로 전환)
    setUser(null)
    setSession(null)
    // 그 다음 Supabase 서버 측 세션 무효화
    try {
      await supabase.auth.signOut()
    } catch (e) {
      if (__DEV__) console.warn('[Auth] signOut 서버 요청 실패 (로컬은 이미 초기화됨):', e)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.')
  return ctx
}
