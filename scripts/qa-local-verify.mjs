/**
 * 로컬/프로덕션 빠른 검증 — Kakao 버튼, EN 위험 키워드
 * 실행: node scripts/qa-local-verify.mjs [baseUrl]
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = process.argv[2] || 'http://localhost:8081'

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
  console.log(`\n=== 로컬 검증 (${BASE}) ===\n`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  // 1. Login — Kakao 버튼
  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle', timeout: 30000 })
  const kakaoBtn = page.getByText(/카카오로 시작|Continue with Kakao/i).first()
  if (await kakaoBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    pass('Login Kakao 버튼')
  } else {
    fail('Login Kakao 버튼', '미표시')
  }

  // 2. EN 위험 키워드 — 페르소나 + 채팅
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    fail('위험 키워드 E2E', 'Supabase env 없음')
  } else {
    const ts = Date.now()
    const email = `qa.local.${ts}@stillafter-qa.test`
    const password = `QaLoc${ts}!9a`
    const sb = createClient(url, key)
    await sb.auth.signUp({ email, password, options: { data: { nickname: 'QA' } } })
    const { data: { session } } = await sb.auth.signInWithPassword({ email, password })
    if (!session) {
      fail('위험 키워드 E2E', '테스트 계정 로그인 실패')
    } else {
      // 웹 앱 세션 동기화 — UI 로그인
      await page.goto(`${BASE}/EmailAuth`, { waitUntil: 'networkidle', timeout: 30000 })
      const loginTab = page.getByText(/^로그인$|^Log in$|^Login$/i).first()
      if (await loginTab.isVisible({ timeout: 3000 }).catch(() => false)) await loginTab.click()
      const inputs = page.locator('input')
      await inputs.nth(0).fill(email)
      await inputs.nth(1).fill(password)
      await page.getByText(/^로그인$|^Log in$|^Login$/i).last().click()
      await page.waitForTimeout(3000)

      const authed = createClient(url, key, {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } },
      })
      const { data: persona } = await authed.from('personas').insert({
        user_id: session.user.id,
        name: 'Mom',
        relationship: 'Parent',
        care_type: 'human',
        raw_chat_text: 'test',
        system_prompt: 'You are Mom.',
        parsed_messages: [],
        emotional_stage: 'replay',
        is_active: true,
      }).select('id').single()

      if (!persona) {
        fail('위험 키워드 E2E', '페르소나 생성 실패')
      } else {
        await page.goto(`${BASE}/Chat/${persona.id}`, { waitUntil: 'networkidle', timeout: 30000 })
        await page.waitForTimeout(2000)

        // EN toggle
        const enToggle = page.getByText('English').first()
        if (await enToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
          await enToggle.click()
          await page.waitForTimeout(500)
        }

        const input = page.locator('textarea, input').last()
        await input.fill('I want to die')
        await page.locator('text=↑').click()
        await page.waitForTimeout(1500)

        const body = await page.textContent('body')
        if (/1577-0199|crisis|힘드|support|상담/i.test(body || '')) {
          pass('EN 위험 키워드 모달')
        } else {
          fail('EN 위험 키워드 모달', '모달/안내 미표시')
        }

        await authed.from('conversations').delete().eq('persona_id', persona.id)
        await authed.from('personas').delete().eq('id', persona.id)
      }
    }
  }

  await browser.close()
  const failed = results.filter((r) => !r.ok).length
  console.log(`\n=== ${results.length - failed}/${results.length} passed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
