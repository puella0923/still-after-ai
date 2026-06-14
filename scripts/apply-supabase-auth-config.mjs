#!/usr/bin/env node
/**
 * Still After — Supabase Auth 설정 자동 적용
 * 이메일 인증 생략 (mailer_autoconfirm) + 비밀번호 재설정 템플릿
 *
 * 실행: npm run supabase:apply-auth
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv() {
  const envPath = resolve(ROOT, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ||
  (SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split('.')[0] : '')

const SITE_URL = process.env.SUPABASE_SITE_URL || 'https://stillafter.com'

const REDIRECT_URLS = [
  `${SITE_URL}/auth/callback`,
  `${SITE_URL}/auth/reset-password`,
  'https://www.stillafter.com/auth/callback',
  'https://www.stillafter.com/auth/reset-password',
  'still-after://auth/callback',
  'still-after://auth/reset-password',
  'http://localhost:8081/auth/callback',
  'http://localhost:8082/auth/callback',
]

function readTemplate(filename) {
  return readFileSync(resolve(ROOT, 'supabase/email-templates', filename), 'utf8')
}

function fail(msg) {
  console.error(`\n❌ ${msg}`)
  process.exit(1)
}

if (!ACCESS_TOKEN) {
  fail(
    'SUPABASE_ACCESS_TOKEN이 없습니다.\n' +
      '1. https://supabase.com/dashboard/account/tokens 에서 토큰 발급\n' +
      '2. .env 파일에 SUPABASE_ACCESS_TOKEN=your-token 추가\n' +
      '3. npm run supabase:apply-auth 재실행'
  )
}

if (!PROJECT_REF) fail('EXPO_PUBLIC_SUPABASE_URL 또는 SUPABASE_PROJECT_REF가 필요합니다.')

const payload = {
  external_email_enabled: true,
  mailer_autoconfirm: true,
  mailer_secure_email_change_enabled: true,
  site_url: SITE_URL,
  uri_allow_list: REDIRECT_URLS.join(','),
  mailer_subjects_recovery: '[Still After] 비밀번호 재설정 안내',
  mailer_templates_recovery_content: readTemplate('reset-password.html'),
}

const KAKAO_CLIENT_ID = process.env.SUPABASE_KAKAO_CLIENT_ID
const KAKAO_CLIENT_SECRET = process.env.SUPABASE_KAKAO_CLIENT_SECRET
if (KAKAO_CLIENT_ID && KAKAO_CLIENT_SECRET) {
  payload.external_kakao_enabled = true
  payload.external_kakao_client_id = KAKAO_CLIENT_ID
  payload.external_kakao_secret = KAKAO_CLIENT_SECRET
}

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`

async function main() {
  console.log(`\n🔧 Supabase Auth 설정 적용 중... (project: ${PROJECT_REF})\n`)

  const getRes = await fetch(API, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  if (!getRes.ok) fail(`현재 설정 조회 실패 (${getRes.status}): ${await getRes.text()}`)

  const before = await getRes.json()
  console.log('현재 상태:')
  console.log(`  - mailer_autoconfirm: ${before.mailer_autoconfirm}`)
  console.log(`  - site_url: ${before.site_url}`)

  const patchRes = await fetch(API, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!patchRes.ok) fail(`설정 적용 실패 (${patchRes.status}): ${await patchRes.text()}`)

  const after = await patchRes.json()
  console.log('\n✅ 적용 완료!')
  console.log(`  - 이메일 인증: ${after.mailer_autoconfirm ? '생략 (자동 확인)' : '필수'}`)
  console.log(`  - Site URL: ${after.site_url}`)
  if (KAKAO_CLIENT_ID && KAKAO_CLIENT_SECRET) {
    console.log(`  - Kakao OAuth: ${after.external_kakao_enabled ? '활성화' : '비활성화'}`)
  } else {
    console.log('  - Kakao OAuth: SUPABASE_KAKAO_CLIENT_ID/SECRET 없음 — Dashboard에서 수동 설정 필요')
  }
  console.log('\n📱 회원가입 후 바로 로그인됩니다.\n')
}

main().catch((e) => fail(e.message))
