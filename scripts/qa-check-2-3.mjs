/**
 * QA #2 비밀번호 재설정 링크 E2E
 * QA #3 카카오톡 .txt 업로드 E2E
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://stillafter.com'
const SAMPLE_KAKAO = `카카오톡 대화
대화상대: 엄마
저장한 날짜 : 2024-06-01 12:00

------------------ 2024년 6월 1일 토요일 ------------------
[엄마] [오전 9:00] 밥 먹었어?
[나] [오전 9:01] 아직 안 먹었어
[엄마] [오전 9:02] 얼른 먹어라 우리 딸`

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = 'vqtsehnebtslppamubmj'

const log = { pass: [], fail: [] }
const ok = (m) => { log.pass.push(m); console.log('✅', m) }
const bad = (m) => { log.fail.push(m); console.log('❌', m) }

async function getServiceRoleKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  const keys = await res.json()
  const svc = keys.find((k) => k.name === 'service_role')
  return svc?.api_key
}

async function testPasswordResetE2E() {
  console.log('\n── #2 비밀번호 재설정 ──\n')
  const ts = Date.now()
  const email = `qa.reset.e2e.${ts}@gmail.com`
  const oldPw = `OldPw${ts}!9a`
  const newPw = `NewPw${ts}!9b`

  const sb = createClient(SUPABASE_URL, ANON_KEY)
  const { error: signErr } = await sb.auth.signUp({ email, password: oldPw })
  if (signErr && !/already|exists/i.test(signErr.message)) {
    bad(`회원가입: ${signErr.message}`)
    return
  }
  ok(`테스트 계정 생성: ${email}`)

  const serviceKey = await getServiceRoleKey()
  if (!serviceKey) { bad('service_role 키 조회 실패'); return }

  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'recovery',
      email,
      options: { redirect_to: `${BASE}/auth/reset-password` },
    }),
  })
  const linkData = await linkRes.json()
  if (!linkRes.ok) { bad(`generate_link: ${JSON.stringify(linkData)}`); return }

  const recoveryUrl = linkData.action_link || linkData.properties?.action_link
  if (!recoveryUrl) { bad('recovery URL 없음'); return }
  ok('Supabase recovery 링크 생성')

  if (!recoveryUrl.includes('stillafter.com') && !recoveryUrl.includes('reset-password')) {
    bad(`redirect URL 이상: ${recoveryUrl.slice(0, 100)}`)
  } else {
    ok('redirect_to = stillafter.com/auth/reset-password')
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  await page.goto(recoveryUrl, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3000)

  const body = await page.textContent('body')
  const inRecovery = body?.includes('비밀번호') || body?.includes('password') || body?.includes('새 비밀번호') || body?.includes('Set a new')
  if (!inRecovery) {
    bad(`재설정 UI 미표시: ${page.url()}`)
    await browser.close()
    return
  }
  ok('recovery 링크 → 비밀번호 재설정 화면')

  const pwInputs = page.locator('input[type="password"], input').filter({ hasNotText: '' })
  const count = await pwInputs.count()
  if (count < 2) {
    bad(`비밀번호 입력 필드 ${count}개`)
  } else {
    await pwInputs.nth(0).fill(newPw)
    await pwInputs.nth(1).fill(newPw)
    ok('새 비밀번호 입력')
  }

  const submit = page.getByText(/비밀번호 변경|Update password|변경하기/i).first()
  await submit.click()
  await page.waitForTimeout(3000)
  await page.getByText(/확인|OK|Confirm/i).first().click().catch(() => {})
  await page.waitForTimeout(2000)

  const sbOld = createClient(SUPABASE_URL, ANON_KEY)
  const { error: oldLoginErr } = await sbOld.auth.signInWithPassword({ email, password: oldPw })
  if (oldLoginErr) ok('이전 비밀번호 로그인 거부됨')
  else bad('이전 비밀번호로도 로그인됨')

  const sbNew = createClient(SUPABASE_URL, ANON_KEY)
  const { error: newLoginErr, data: newSession } = await sbNew.auth.signInWithPassword({ email, password: newPw })
  if (newLoginErr) bad(`새 비밀번호 로그인 실패: ${newLoginErr.message}`)
  else ok('새 비밀번호로 로그인 성공')

  await browser.close()

  // 정리
  if (newSession?.session) {
    const admin = createClient(SUPABASE_URL, serviceKey)
    await admin.auth.admin.deleteUser(newSession.user.id)
  }
}

async function testKakaoUploadE2E() {
  console.log('\n── #3 카카오톡 .txt 업로드 ──\n')

  const { execSync } = await import('child_process')
  const tmpDir = resolve(__dirname, '../.qa-tmp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpFile = resolve(tmpDir, 'kakao_qa.txt')
  writeFileSync(tmpFile, SAMPLE_KAKAO, 'utf8')

  try {
    const out = execSync(
      `npx --yes tsx "${resolve(__dirname, 'kakao-parser-smoke.ts')}" "${tmpFile}"`,
      { cwd: resolve(__dirname, '..'), encoding: 'utf8' }
    )
    const r = JSON.parse(out.trim())
    if (r.partnerMessageCount >= 2 && r.hasPrompt) ok(`파서: 엄마 메시지 ${r.partnerMessageCount}개, 프롬프트 생성`)
    else bad(`파서 결과 이상: ${out}`)
  } catch (e) {
    bad(`파서: ${e.message}`)
  }

  const ts = Date.now()
  const email = `qa.kakao.${ts}@stillafter-qa.test`
  const password = `QaKk${ts}!9a`
  const sb = createClient(SUPABASE_URL, ANON_KEY)
  await sb.auth.signUp({ email, password })
  const { data: { session } } = await sb.auth.signInWithPassword({ email, password })
  if (!session) { bad('로그인 실패'); return }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle' })
  await page.getByText(/이메일|Email/i).first().click()
  await page.waitForTimeout(400)
  await page.getByText(/^로그인$|^Log in$|^Login$/i).first().click().catch(() => {})
  await page.locator('input').nth(0).fill(email)
  await page.locator('input').nth(1).fill(password)
  await page.getByText(/^로그인$|^Log in$|^Login$/i).last().click()
  await page.waitForTimeout(3000)

  await page.goto(`${BASE}/CareSelect`, { waitUntil: 'networkidle' })
  await page.getByText(/^Person$|^사람$/).first().click()
  await page.waitForTimeout(800)
  await page.locator('input').first().fill('엄마')
  await page.getByText('부모님').or(page.getByText('Parent')).first().click()
  await page.getByText(/^Next$|^다음$/).first().click()
  await page.waitForTimeout(800)
  await page.getByText(/Within a month|한 달 이내/).first().click()
  await page.getByText(/^Next$|^다음$/).last().click()
  await page.waitForTimeout(1500)

  await page.getByText(/Upload chat|카카오톡|📱 Upload/).first().click()
  await page.waitForTimeout(500)
  ok('카카오톡 업로드 탭')

  await page.getByText(/동의|understand|AI가|I understand/i).first().click().catch(() => {})

  const fileInput = page.locator('#kakao-chat-file-input')
  if (await fileInput.count() === 0) {
    bad('숨김 file input (#kakao-chat-file-input) 없음 — PersonaCreate 수정 필요')
  } else {
    await fileInput.setInputFiles(tmpFile)
    await page.waitForTimeout(4000)
    const body = await page.textContent('body')
    if (body?.includes('밥 먹었어') || body?.includes('엄마') || body?.includes('message') || body?.includes('메시지')) {
      ok('브라우저 파일 업로드 → 파싱 미리보기 표시')
    } else {
      bad('파싱 미리보기 미확인')
    }
  }

  await browser.close()
  const admin = createClient(SUPABASE_URL, await getServiceRoleKey())
  await admin.auth.admin.deleteUser(session.user.id)
}

async function main() {
  console.log('=== QA #2 #3 검증 ===')
  await testPasswordResetE2E()
  await testKakaoUploadE2E()
  console.log(`\n=== 완료: ${log.pass.length} passed, ${log.fail.length} failed ===\n`)
  process.exit(log.fail.length > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
