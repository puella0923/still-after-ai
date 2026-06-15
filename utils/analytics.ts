/**
 * GA4 커스텀 이벤트 헬퍼
 * web 빌드에서만 동작 (React Native 빌드에서는 no-op)
 *
 * 이벤트 4종:
 *   service_start  — 온보딩 CTA 버튼 클릭 (로그인 화면 진입)
 *   chat_enter     — 채팅 화면 포커스 (실제 대화 시작)
 *   letter_draft   — 이별 편지 첫 글자 입력
 *   letter_send    — 이별 편지 발송 완료
 */

import { Platform } from 'react-native'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (Platform.OS !== 'web') return
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params ?? {})
}

export const analytics = {
  /** 온보딩 → 로그인 CTA 클릭 */
  serviceStart: () => trackEvent('service_start'),

  /** 채팅 화면 진입 */
  chatEnter: (params?: { persona_id?: string; stage?: string }) =>
    trackEvent('chat_enter', params),

  /** 이별 편지 초안 시작 (첫 글자 입력) */
  letterDraft: () => trackEvent('letter_draft'),

  /** 이별 편지 발송 완료 */
  letterSend: () => trackEvent('letter_send'),
}
