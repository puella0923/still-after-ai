/**
 * 인앱 브라우저(WebView) 감지
 * Google OAuth 등은 LinkedIn·카카오 등 인앱 브라우저에서 차단됨 (disallowed_useragent)
 */

const IN_APP_UA_PATTERNS = [
  /FBAN|FBAV/i,
  /Instagram/i,
  /LinkedInApp/i,
  /LinkedIn/i,
  /Twitter/i,
  /Pinterest/i,
  /TikTok/i,
  /Line\//i,
  /KAKAOTALK/i,
  /NAVER/i,
  /MicroMessenger/i,
  /Snapchat/i,
  /GSA\//i,
  /; wv\)/i,
  /; wv;/i,
]

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent || (navigator as { vendor?: string }).vendor || ''
}

/** 인앱 브라우저(WebView) 여부 */
export function isInAppBrowser(): boolean {
  const ua = getUserAgent()
  if (!ua) return false
  return IN_APP_UA_PATTERNS.some((pattern) => pattern.test(ua))
}

/** 외부 브라우저 열기 시도 (웹 전용, 실패 시 false) */
export async function openInExternalBrowser(url?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const target = url ?? window.location.href

  try {
    const opened = window.open(target, '_blank', 'noopener,noreferrer')
    if (opened) return true
  } catch {
    // noop
  }

  try {
    await navigator.clipboard.writeText(target)
    return false
  } catch {
    return false
  }
}
