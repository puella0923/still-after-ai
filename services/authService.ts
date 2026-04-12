/**
 * 인증 서비스 — 이메일 + OAuth (카카오/구글)
 * Supabase Auth 기반
 */

import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import { supabase } from './supabase'

function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return Linking.createURL('auth/callback')
}

// ─── 이메일 회원가입 ───────────────────────────

export async function signUpWithEmail(
  email: string,
  password: string,
  nickname: string
): Promise<{ success: boolean; needsConfirmation: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
        emailRedirectTo: getOAuthRedirectUrl(),
      },
    })

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return { success: false, needsConfirmation: false, error: '이미 가입된 이메일입니다. 로그인해주세요.' }
      }
      return { success: false, needsConfirmation: false, error: error.message }
    }

    // identities가 비어있으면 이미 가입된 이메일
    if (data.user?.identities && data.user.identities.length === 0) {
      return { success: false, needsConfirmation: false, error: '이미 가입된 이메일입니다.' }
    }

    // profiles 테이블에 닉네임 저장 (upsert — 실패해도 회원가입은 진행)
    if (data.user?.id) {
      try {
        await supabase.from('profiles').upsert(
          { id: data.user.id, nickname },
          { onConflict: 'id' }
        )
      } catch {
        console.warn('[Auth] profiles 닉네임 저장 실패 (무시)')
      }
    }

    // session이 null이면 이메일 인증이 필요한 상태
    if (data.session === null) {
      return { success: true, needsConfirmation: true }
    }

    return { success: true, needsConfirmation: false }
  } catch {
    return { success: false, needsConfirmation: false, error: '회원가입 중 오류가 발생했습니다.' }
  }
}

// ─── 이메일 로그인 ───────────────────────────

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return { success: false, needsConfirmation: true, error: '이메일 인증이 필요합니다. 메일함을 확인해주세요.' }
      }
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' }
      }
      if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
        return { success: false, error: '서버에 연결할 수 없습니다. 인터넷 연결을 확인해주세요.' }
      }
      return { success: false, error: error.message }
    }

    if (!data.session) {
      return { success: false, error: '로그인에 실패했습니다. 다시 시도해주세요.' }
    }

    return { success: true }
  } catch {
    return { success: false, error: '로그인 중 오류가 발생했습니다.' }
  }
}

// ─── 인증 메일 재발송 ───────────────────────────

export async function resendConfirmationEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
      },
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: '메일 재발송에 실패했습니다.' }
  }
}

// ─── 비밀번호 재설정 ───────────────────────────

export async function sendPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Platform.OS === 'web'
        ? `${window.location.origin}/auth/reset-password`
        : Linking.createURL('auth/reset-password'),
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: '비밀번호 재설정 메일 발송에 실패했습니다.' }
  }
}

// ─── 카카오 OAuth ───────────────────────────

export async function signInWithKakao(): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUrl = getOAuthRedirectUrl()
    const isWeb = Platform.OS === 'web'

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectUrl,
        ...(isWeb ? {} : { skipBrowserRedirect: true }),
      },
    })

    if (error) return { success: false, error: error.message }
    if (!data.url) return { success: false, error: '카카오 로그인 URL을 가져올 수 없습니다.' }

    if (isWeb) {
      if (typeof window !== 'undefined' && window.location.href !== data.url) {
        window.location.assign(data.url)
      }
      return { success: true }
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

    if (result.type === 'success' && result.url) {
      await handleOAuthCallback(result.url)
      return { success: true }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: '로그인이 취소되었습니다.' }
    }

    return { success: false, error: '카카오 로그인에 실패했습니다.' }
  } catch {
    return { success: false, error: '카카오 로그인 중 오류가 발생했습니다.' }
  }
}

// ─── 구글 OAuth ───────────────────────────

export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectUrl = getOAuthRedirectUrl()
    const isWeb = Platform.OS === 'web'

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        ...(isWeb ? {} : { skipBrowserRedirect: true }),
      },
    })

    if (error) return { success: false, error: error.message }
    if (!data.url) return { success: false, error: '구글 로그인 URL을 가져올 수 없습니다.' }

    if (isWeb) {
      if (typeof window !== 'undefined' && window.location.href !== data.url) {
        window.location.assign(data.url)
      }
      return { success: true }
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

    if (result.type === 'success' && result.url) {
      await handleOAuthCallback(result.url)
      return { success: true }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: '로그인이 취소되었습니다.' }
    }

    return { success: false, error: '구글 로그인에 실패했습니다.' }
  } catch {
    return { success: false, error: '구글 로그인 중 오류가 발생했습니다.' }
  }
}

// ─── OAuth 콜백 처리 (공통) ───────────────────────────

async function handleOAuthCallback(url: string): Promise<void> {
  try {
    // Fragment (#) 파싱
    const hashPart = url.split('#')[1] ?? ''
    const hashParams = new URLSearchParams(hashPart)
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      return
    }

    // Query string (?) 파싱 — 일부 환경
    const queryPart = url.split('?')[1]?.split('#')[0] ?? ''
    const queryParams = new URLSearchParams(queryPart)
    const code = queryParams.get('code')

    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    }
  } catch (e) {
    console.error('[Auth] OAuth callback error:', e)
  }
}

// ─── 로그아웃 ───────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}
