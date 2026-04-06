import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const isConfigured =
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== '여기에입력' &&
  supabaseAnonKey !== '여기에입력'

// 미설정 상태에서도 앱이 실행되도록 fallback URL 사용 (실제 API 호출은 실패)
const resolvedUrl = isConfigured ? supabaseUrl! : 'https://placeholder.supabase.co'
const resolvedKey = isConfigured ? supabaseAnonKey! : 'placeholder'

/** 실제 Supabase 자격증명이 설정됐는지 여부 */
export const isSupabaseConfigured = Boolean(isConfigured)

export const supabase = createClient(resolvedUrl, resolvedKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
})

// 앱이 포그라운드로 돌아올 때 토큰 자동 갱신
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
