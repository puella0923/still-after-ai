// Web build — mounts Vercel Analytics on the web bundle only.
// Tracks page views and visitors for stillafter.com.
import { Analytics } from '@vercel/analytics/react'

export default function VercelAnalytics() {
  return <Analytics />
}
