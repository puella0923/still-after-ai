/**
 * 인증 서비스 — 이메일 + OAuth (카카오/구글)
 * Supabase Auth 기반
 */

import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import { isInAppBrowser } from '../utils/inAppBrowser'

export type AuthResult = {
  success: boolean
  error?: string
  code?: 'in_app_browser'
  /** @deprecated use code === 'in_app_browser' */
  isInAppBrowserError?: boolean
}

export { isInAppBrowser } from '../utils/inAppBrowser'

export function connectionErrorMessage(lang = 'ko'): string {
  return lang === 'en'
    ? 'Unable to connect. Please try again later.'
    : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
}

function signInNetworkErrorMessage(lang: string): string {
  return lang === 'en'
    ? 'Unable to connect. Please check your network.'
    : '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
}

function alreadyRegisteredMessage(lang: string): string {
  return lang === 'en'
    ? 'This email is already registered. Please log in instead.'
    : '이미 가입된 이메일입니다. 로그인 탭에서 로그인해주세요.'
}

function signUpFallbackError(lang: string): string {
  return lang === 'en'
    ? 'An error occurred during sign up.'
    : '회원가입 중 오류가 발생했습니다.'
}

function signInFallbackError(lang: string): string {
  return lang === 'en'
    ? 'An error occurred during login.'
    : '로그인 중 오류가 발생했습니다.'
}

function signInFailedMessage(lang: string): string {
  return lang === 'en'
    ? 'Login failed. Please try again.'
    : '로그인에 실패했습니다. 다시 시도해주세요.'
}

function signUpCompleteLoginFailedMessage(lang: string): string {
  return lang === 'en'
    ? 'Sign up complete but login failed. Please try logging in.'
    : '회원가입은 완료됐지만 로그인에 실패했습니다. 로그인 탭에서 다시 시도해주세요.'
}

function signUpFailedMessage(lang: string): string {
  return lang === 'en' ? 'Sign up failed.' : '회원가입에 실패했습니다.'
}

function updatePasswordFailedMessage(lang: string): string {
  return lang === 'en' ? 'Failed to update password.' : '비밀번호 변경에 실패했습니다.'
}

function isNetworkError(message: string): boolean {
  return /failed to fetch|network|fetch/i.test(message)
}

function isAlreadyRegistered(error: { message?: string; code?: string }): boolean {
  return (
    error.code === 'user_already_exists' ||
    /already registered|user already registered/i.test(error.message ?? '')
  )
}

function mapAuthErrorMessage(error: { message?: string; code?: string }, fallback: string, lang = 'ko'): string {
  if (isNetworkError(error.message ?? '')) return connectionErrorMessage(lang)
  return error.message || fallback
}

function getOAuthRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`
  }
  return Linking.createURL('auth/callback')
}

// ─── 이메일 회원가입 ───────────────────────────

async function saveProfile(userId: string, nickname: string): Promise<void> {
  try {
    await supabase.from('profiles').upsert(
      { id: userId, nickname },
      { onConflict: 'id' }
    )
  } catch {
    console.warn('[Auth] profiles 닉네임 저장 실패 (무시)')
  }
}

async function ensureActiveSession(
  email: string,
  password: string,
  existingSession: Session | null,
  lang = 'ko'
): Promise<{ ok: boolean; error?: string }> {
  if (existingSession) return { ok: true }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) return { ok: true }

  const login = await signInWithEmail(email, password, lang)
  if (login.success) return { ok: true }

  // signUp 직후 전파 지연 대비 1회 재시도
  await new Promise((r) => setTimeout(r, 600))
  const retry = await signInWithEmail(email, password, lang)
  if (retry.success) return { ok: true }

  return { ok: false, error: retry.error ?? login.error ?? signInFallbackError(lang) }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  nickname: string,
  lang = 'ko'
): Promise<{ success: boolean; needsConfirmation: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, needsConfirmation: false, error: connectionErrorMessage(lang) }
  }
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
      if (isAlreadyRegistered(error)) {
        const login = await signInWithEmail(email, password, lang)
        if (login.success) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user?.id) await saveProfile(session.user.id, nickname)
          return { success: true, needsConfirmation: false }
        }
        return { success: false, needsConfirmation: false, error: alreadyRegisteredMessage(lang) }
      }
      return { success: false, needsConfirmation: false, error: mapAuthErrorMessage(error, signUpFailedMessage(lang), lang) }
    }

    // identities가 비어있으면 기존 계정 — 로그인 시도
    if (data.user?.identities && data.user.identities.length === 0) {
      const login = await signInWithEmail(email, password, lang)
      if (login.success) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.id) await saveProfile(session.user.id, nickname)
        return { success: true, needsConfirmation: false }
      }
      return { success: false, needsConfirmation: false, error: alreadyRegisteredMessage(lang) }
    }

    const sessionResult = await ensureActiveSession(email, password, data.session, lang)
    if (!sessionResult.ok) {
      return {
        success: false,
        needsConfirmation: false,
        error: sessionResult.error ?? signUpCompleteLoginFailedMessage(lang),
      }
    }

    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      await saveProfile(session.user.id, nickname)
    }

    return { success: true, needsConfirmation: false }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (isNetworkError(msg)) {
      return { success: false, needsConfirmation: false, error: connectionErrorMessage(lang) }
    }
    return { success: false, needsConfirmation: false, error: signUpFallbackError(lang) }
  }
}

// ─── 이메일 로그인 ───────────────────────────

export async function signInWithEmail(
  email: string,
  password: string,
  lang = 'ko'
): Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: connectionErrorMessage(lang) }
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('email_not_confirmed')) {
        return {
          success: false,
          needsConfirmation: true,
          error: lang === 'en'
            ? 'Email verification required. Please check your inbox.'
            : '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
        }
      }
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: lang === 'en'
            ? 'Incorrect email or password.'
            : '이메일 또는 비밀번호가 올바르지 않습니다.',
        }
      }
      if (isNetworkError(error.message)) {
        return { success: false, error: signInNetworkErrorMessage(lang) }
      }
      return { success: false, error: error.message }
    }

    if (!data.session) {
      return { success: false, error: signInFailedMessage(lang) }
    }

    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (isNetworkError(msg)) {
      return { success: false, error: signInNetworkErrorMessage(lang) }
    }
    return { success: false, error: signInFallbackError(lang) }
  }
}

// ─── 이메일 OTP 인증 ───────────────────────────

export async function verifyEmailOtp(
  email: string,
  token: string,
  lang = 'ko'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: token.trim(),
      type: 'signup',
    })

    if (error) {
      if (error.message.includes('expired') || error.message.includes('Token has expired')) {
        return {
          success: false,
          error: lang === 'en'
            ? 'Verification code expired. Please resend the email.'
            : '인증 코드가 만료되었습니다. 메일을 재발송해주세요.',
        }
      }
      if (error.message.includes('invalid') || error.message.includes('Invalid')) {
        return {
          success: false,
          error: lang === 'en'
            ? 'Invalid verification code. Please check again.'
            : '인증 코드가 올바르지 않습니다. 다시 확인해주세요.',
        }
      }
      return { success: false, error: error.message }
    }

    if (!data.session) {
      return {
        success: false,
        error: lang === 'en'
          ? 'Verification failed. Please try again.'
          : '인증에 실패했습니다. 다시 시도해주세요.',
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: lang === 'en'
        ? 'An error occurred during verification.'
        : '인증 중 오류가 발생했습니다.',
    }
  }
}

// ─── 인증 메일 재발송 ───────────────────────────

export async function resendConfirmationEmail(
  email: string,
  lang = 'ko'
): Promise<{ success: boolean; error?: string; alreadyVerified?: boolean }> {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getOAuthRedirectUrl(),
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (
        msg.includes('already confirmed') ||
        msg.includes('already verified') ||
        msg.includes('email already')
      ) {
        return { success: false, alreadyVerified: true, error: error.message }
      }
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch {
    return {
      success: false,
      error: lang === 'en'
        ? 'Failed to resend confirmation email.'
        : '메일 재발송에 실패했습니다.',
    }
  }
}

/** 이메일 인증이 이미 완료됐는지 로그인 시도로 확인 */
export async function checkEmailVerificationStatus(
  email: string,
  password: string,
  lang = 'ko'
): Promise<'verified' | 'needs_confirmation' | 'invalid_credentials' | 'error'> {
  const result = await signInWithEmail(email, password, lang)
  if (result.success) return 'verified'
  if (result.needsConfirmation) return 'needs_confirmation'
  const invalidMsg = lang === 'en' ? 'Incorrect email or password.' : '이메일 또는 비밀번호가 올바르지 않습니다.'
  if (result.error === invalidMsg) return 'invalid_credentials'
  return 'error'
}

// ─── 비밀번호 재설정 ───────────────────────────

export async function sendPasswordReset(
  email: string,
  lang = 'ko'
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
    return {
      success: false,
      error: lang === 'en'
        ? 'Failed to send password reset email.'
        : '비밀번호 재설정 메일 발송에 실패했습니다.',
    }
  }
}

export async function updatePassword(
  newPassword: string,
  lang = 'ko'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: mapAuthErrorMessage(error, updatePasswordFailedMessage(lang), lang) }
    return { success: true }
  } catch {
    return { success: false, error: connectionErrorMessage(lang) }
  }
}

// ─── 구글 OAuth ───────────────────────────

export async function signInWithGoogle(lang = 'ko'): Promise<AuthResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: connectionErrorMessage(lang) }
  }

  if (isInAppBrowser()) {
    return {
      success: false,
      code: 'in_app_browser',
      isInAppBrowserError: true,
      error: lang === 'en'
        ? 'Google sign-in is not supported in this in-app browser. Please open in Safari or Chrome.'
        : 'Google 로그인은 이 앱 내 브라우저에서 지원되지 않습니다.\nSafari 또는 Chrome에서 열어주세요.',
    }
  }

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
    if (!data.url) {
      return {
        success: false,
        error: lang === 'en'
          ? 'Failed to get Google login URL.'
          : '구글 로그인 URL을 가져올 수 없습니다.',
      }
    }

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
      return {
        success: false,
        error: lang === 'en' ? 'Login was cancelled.' : '로그인이 취소되었습니다.',
      }
    }

    return {
      success: false,
      error: lang === 'en' ? 'Google login failed.' : '구글 로그인에 실패했습니다.',
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
      return { success: false, error: connectionErrorMessage(lang) }
    }
    return {
      success: false,
      error: lang === 'en'
        ? 'An error occurred during Google login.'
        : '구글 로그인 중 오류가 발생했습니다.',
    }
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
