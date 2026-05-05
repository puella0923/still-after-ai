// Native (iOS/Android) — no-op.
// Vercel Analytics is web-only; on native platforms this renders nothing.
// Metro bundler picks VercelAnalytics.web.tsx automatically when bundling for web.
export default function VercelAnalytics() {
  return null
}
