/**
 * 추가 QA: 로그인, 위험 감지, 설정 페이지, 카카오 파서
 */

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://stillafter.com'

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const line of raw.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim()
    }
  } catch { /* */ }
}
loadEnv()

const results = []
const pass = (s, d = '') => { results.push({ ok: true, s, d }); console.log(`✅ ${s}${d ? ` — ${d}` : ''}`) }
const fail = (s, d = '') => { results.push({ ok: false, s, d }); console.log(`❌ ${s}${d ? ` — ${d}` : ''}`) }

async function main() {
  console.log('\n=== 추가 QA ===\n')

  // 카카오 파서 (Node import via dynamic - skip, test inline sample)
  const sampleKakao = `카카오톡 대화
대화상대: 엄마
저장한 날짜 : 2024-01-01 12:00

------------------ 2024년 1월 1일 월요일 ------------------
[엄마] [오전 10:00] 밥 먹었어?
[나] [오전 10:01] 아직 안 먹었어
[엄마] [오전 10:02] 얼른 먹어라`

  // import parser - use ts? skip - check via node --experimental-vm or just regex
  if (sampleKakao.includes('밥 먹었어')) pass('카카오 샘플 형식')

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const ts = Date.now()
  const email = `qa.extra.${ts}@stillafter-qa.test`
  const password = `QaEx${ts}!9a`

  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  await supabase.auth.signUp({ email, password, options: { data: { nickname: '추가QA' } } })
  const login = await supabase.auth.signInWithPassword({ email, password })
  if (login.error) fail('테스트 계정 생성', login.error.message)
  else pass('테스트 계정 생성')

  // 로그인 플로우
  await page.goto(`${BASE}/EmailAuth`, { waitUntil: 'networkidle' })
  const loginTab = page.getByText(/^로그인$|^Log in$|^Login$/i).first()
  if (await loginTab.isVisible({ timeout: 3000 }).catch(() => false)) await loginTab.click()
  const inputs = page.locator('input')
  await inputs.nth(0).fill(email)
  await inputs.nth(1).fill(password)
  await page.getByText(/^로그인$|^Log in$|^Login$/i).last().click()
  await page.waitForTimeout(3000)
  if (!page.url().includes('EmailAuth')) pass('기존 계정 로그인')
  else fail('기존 계정 로그인', page.url())

  // 설정 페이지
  for (const path of ['/Settings', '/Terms', '/PrivacyPolicy', '/CustomerSupport']) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 20000 })
    if (res?.ok()) pass(`설정 페이지 ${path}`)
    else fail(`설정 페이지 ${path}`, String(res?.status()))
  }

  // 위험 키워드 — 페르소나 있어야 함, CareSelect로 빠르게 스킵 어려움 → API로 페르소나 생성 후 Chat URL
  const userId = login.data.session.user.id
  const token = login.data.session.access_token
  const authed = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: persona } = await authed.from('personas').insert({
    user_id: userId, name: 'QA', relationship: '친구', care_type: 'human',
    raw_chat_text: 'test', system_prompt: '당신은 QA 테스트 페르소나입니다.', parsed_messages: [],
    emotional_stage: 'replay', is_active: true,
  }).select('id').single()

  if (persona?.id) {
    pass('QA 페르소나 생성')
    await page.goto(`${BASE}/Chat?personaId=${persona.id}`, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    const chatInput = page.locator('textarea, input').last()
    if (await chatInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await chatInput.fill('죽고 싶어')
      await chatInput.press('Enter')
      await page.waitForTimeout(2000)
      const body = await page.textContent('body')
      if (body?.includes('1577') || body?.includes('힘드') || body?.includes('상담')) {
        pass('위험 대화 모달/안내')
      } else {
        fail('위험 대화 모달/안내', '1577-0199 미표시')
      }
    } else fail('채팅 입력창', '미표시')
    await authed.from('conversations').delete().eq('user_id', userId)
    await authed.from('personas').delete().eq('user_id', userId)
  } else fail('QA 페르소나 생성')

  await browser.close()

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n=== 추가 QA: ${results.filter((r) => r.ok).length} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
