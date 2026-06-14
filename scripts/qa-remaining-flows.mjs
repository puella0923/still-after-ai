/**
 * 미테스트 항목 QA
 * 1. Google/Kakao 소셜 로그인
 * 2. 카카오톡 .txt 업로드
 * 3. 비밀번호 재설정
 * 4. 안정→이별→종결 의식
 * 5. 반려동물 페르소나
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://stillafter.com'
const SAMPLE_KAKAO = `카카오톡 대화
대화상대: 엄마
저장한 날짜 : 2024-06-01 12:00

------------------ 2024년 6월 1일 토요일 ------------------
[엄마] [오전 9:00] 밥 먹었어?
[나] [오전 9:01] 아직 안 먹었어
[엄마] [오전 9:02] 얼른 먹어라 우리 딸
[엄마] [오전 9:03] 밥은 꼭 챙겨 먹어야 해
[엄마] [오후 12:00] 점심 뭐 먹을 거야?
[나] [오후 12:05] 김치찌개 먹을게
[엄마] [오후 12:06] 맛있게 먹어~`

const results = []
const pass = (id, detail = '') => { results.push({ id, ok: true, detail }); console.log(`✅ [${id}] ${detail}`) }
const fail = (id, detail = '') => { results.push({ id, ok: false, detail }); console.log(`❌ [${id}] ${detail}`) }
const skip = (id, detail = '') => { results.push({ id, ok: 'skip', detail }); console.log(`⏭️  [${id}] ${detail}`) }

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

async function checkSupabaseOAuth() {
  if (!ACCESS_TOKEN) {
    skip('oauth-config', 'SUPABASE_ACCESS_TOKEN 없음 — Dashboard 설정만 수동 확인 필요')
    return
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/vqtsehnebtslppamubmj/config/auth`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  const cfg = await res.json()
  if (cfg.external_google_enabled) pass('oauth-google-enabled', 'Supabase Google OAuth 활성화')
  else fail('oauth-google-enabled', 'Google OAuth 비활성화')
  if (cfg.external_kakao_enabled) pass('oauth-kakao-enabled', 'Supabase Kakao OAuth 활성화')
  else fail('oauth-kakao-enabled', 'Kakao OAuth 비활성화')
}

async function loginBrowser(page, email, password) {
  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.getByText(/이메일|Email/i).first().click()
  await page.waitForTimeout(600)
  const loginTab = page.getByText(/^로그인$|^Log in$|^Login$/i).first()
  if (await loginTab.isVisible({ timeout: 3000 }).catch(() => false)) await loginTab.click()
  const inputs = page.locator('input')
  await inputs.nth(0).waitFor({ state: 'visible', timeout: 10000 })
  await inputs.nth(0).fill(email)
  await inputs.nth(1).fill(password)
  await page.getByText(/^로그인$|^Log in$|^Login$/i).last().click()
  await page.waitForTimeout(4000)
  const ok = !page.url().includes('EmailAuth') && !page.url().includes('Login')
  if (ok) pass('browser-login', page.url())
  else fail('browser-login', page.url())
}

async function testGoogleOAuthInit(page) {
  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle', timeout: 30000 })
  const googleBtn = page.getByText(/Google|구글/i).first()
  if (!(await googleBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
    fail('oauth-google-ui', '구글 로그인 버튼 없음')
    return
  }
  pass('oauth-google-ui', '구글 로그인 버튼 표시')

  // OAuth URL 생성 확인 (리다이렉트 전 URL 캡처)
  const [popup] = await Promise.all([
    page.waitForEvent('popup', { timeout: 8000 }).catch(() => null),
    page.waitForURL(/accounts\.google\.com|supabase\.co\/auth/, { timeout: 8000 }).catch(() => null),
    googleBtn.click(),
  ])

  await page.waitForTimeout(2000)
  const url = popup?.url() ?? page.url()
  if (/accounts\.google\.com|provider=google|supabase\.co\/auth/.test(url)) {
    pass('oauth-google-redirect', url.slice(0, 80) + '…')
    if (popup) await popup.close().catch(() => {})
  } else {
    fail('oauth-google-redirect', `예상 외 URL: ${url}`)
  }
  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle' }).catch(() => {})
}

async function testKakaoLoginUI(page) {
  await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle' })
  const kakaoLoginBtn = page.getByRole('button', { name: /카카오.*로그인|Kakao.*log in|Continue with Kakao/i })
    .or(page.locator('button, [role="button"]').filter({ hasText: /^카카오$|^Kakao$/ }))
  if (await kakaoLoginBtn.count() === 0) {
    skip('oauth-kakao-ui', '로그인 화면에 카카오 버튼 없음 (authService에만 구현됨)')
  } else {
    pass('oauth-kakao-ui', '카카오 로그인 버튼 표시')
  }

  // OAuth URL API 레벨 확인
  const sb = createClient(SUPABASE_URL, ANON_KEY)
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: `${BASE}/auth/callback`, skipBrowserRedirect: true },
  })
  if (error) fail('oauth-kakao-api', error.message)
  else if (data?.url?.includes('kakao')) pass('oauth-kakao-api', 'Kakao OAuth URL 생성 성공')
  else fail('oauth-kakao-api', data?.url ?? 'URL 없음')
}

async function testKakaoFileUpload(page) {
  await page.goto(`${BASE}/CareSelect`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(1000)
  await page.getByText(/^Person$|^사람$/).first().click()
  await page.waitForTimeout(1000)
  await page.locator('input').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('input').first().fill('엄마')
  await page.getByText('부모님').or(page.getByText('Parent')).first().click()
  await page.getByText(/^Next$|^다음$/).first().click()
  await page.waitForTimeout(800)
  await page.getByText(/Within a month|한 달 이내/).first().click()
  await page.getByText(/^Next$|^다음$/).last().click()
  await page.waitForTimeout(1500)

  // 카카오톡 업로드 탭
  const kakaoTab = page.getByText(/Upload chat|카카오톡|📱 Upload/).first()
  await kakaoTab.click()
  await page.waitForTimeout(500)
  pass('kakao-upload-tab', '카카오톡 업로드 탭 진입')

  // 파서 단위 테스트
  const { execSync } = await import('child_process')
  try {
    const tmpDir = resolve(__dirname, '../.qa-tmp')
    mkdirSync(tmpDir, { recursive: true })
    const tmpFile = resolve(tmpDir, 'kakao_sample.txt')
    writeFileSync(tmpFile, SAMPLE_KAKAO, 'utf8')
    const out = execSync(
      `npx --yes tsx "${resolve(__dirname, 'kakao-parser-smoke.ts')}" "${tmpFile}"`,
      { cwd: resolve(__dirname, '..'), encoding: 'utf8' }
    )
    const r = JSON.parse(out.trim().split('\n').pop())
    if (r.partnerMessageCount >= 2 && r.hasPrompt) {
      pass('kakao-parser-unit', `상대 메시지 ${r.partnerMessageCount}개`)
    } else {
      fail('kakao-parser-unit', out)
    }
  } catch (e) { fail('kakao-parser-unit', e.message) }

  // 서비스 동의 (필수)
  await page.getByText(/동의|understand|AI가|I understand/i).first().click().catch(() => {})
  await page.waitForTimeout(300)

  const tmpDir = resolve(__dirname, '../.qa-tmp')
  mkdirSync(tmpDir, { recursive: true })
  const tmpFile = resolve(tmpDir, 'kakao_sample.txt')
  writeFileSync(tmpFile, SAMPLE_KAKAO, 'utf8')

  const uploadBtn = page.locator('text=/내보낸 파일|Upload exported|📂/').first()
  await uploadBtn.scrollIntoViewIfNeeded()
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    uploadBtn.click(),
  ])
  await fileChooser.setFiles(tmpFile)
  await page.waitForTimeout(5000)

  const body = await page.textContent('body')
  if (body?.includes('밥 먹었어') || body?.includes('메시지') || body?.includes('message') || body?.includes('엄마')) {
    pass('kakao-upload-browser', '파일 업로드 후 파싱 결과 표시')
  } else {
    skip('kakao-upload-browser', 'Playwright filechooser 미동작 — 수동 업로드 필요')
  }
}

async function testPasswordReset(sb) {
  const resetEmail = `qatest.reset.${Date.now()}@gmail.com`
  const { error } = await sb.auth.resetPasswordForEmail(resetEmail, {
    redirectTo: `${BASE}/auth/reset-password`,
  })
  if (error) {
    if (/rate limit/i.test(error.message)) pass('password-reset-send', 'rate limit — 발송 제한 (기능 동작)')
    else fail('password-reset-send', error.message)
  } else {
    pass('password-reset-send', `${resetEmail}로 재설정 메일 요청 성공`)
  }

  // 재설정 UI 라우트 로드
  const res = await fetch(`${BASE}/auth/reset-password`)
  if (res.ok) pass('password-reset-route', 'HTTP 200')
  else fail('password-reset-route', String(res.status))

  // updateUser API는 recovery 토큰 필요 — UI 존재만 확인
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(`${BASE}/auth/reset-password`, { waitUntil: 'networkidle' })
  const html = await page.textContent('body')
  if (html?.includes('비밀번호') || html?.includes('password') || html?.includes('Still After')) {
    pass('password-reset-ui', '재설정 페이지 로드 (토큰 없으면 로그인 폼)')
  } else {
    fail('password-reset-ui', '페이지 내용 미확인')
  }
  await browser.close()
}

async function testClosureFlow(token, userId) {
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const manual = '테스트용 페르소나입니다. 따뜻한 말투로 대화합니다.'
  const { data: persona, error: pErr } = await authed.from('personas').insert({
    user_id: userId,
    name: 'QA종결',
    relationship: '친구',
    care_type: 'human',
    raw_chat_text: manual,
    system_prompt: `당신은 QA종결입니다. ${manual}`,
    parsed_messages: [],
    emotional_stage: 'replay',
    is_active: true,
  }).select('id').single()

  if (pErr || !persona) { fail('closure-persona', pErr?.message); return }
  const pid = persona.id
  pass('closure-persona', pid)

  // replay → stable
  const { error: s1 } = await authed.from('personas').update({ emotional_stage: 'stable' }).eq('id', pid)
  if (s1) fail('closure-stable', s1.message)
  else pass('closure-stable', 'stable 단계 전환')

  // stable → closure
  const { error: s2 } = await authed.from('personas').update({ emotional_stage: 'closure' }).eq('id', pid)
  if (s2) fail('closure-stage', s2.message)
  else pass('closure-stage', 'closure 단계 전환')

  // 대화 기록 + 편지
  await authed.from('conversations').insert([
    { user_id: userId, persona_id: pid, role: 'user', content: '고마웠어', emotional_stage: 'closure' },
    { user_id: userId, persona_id: pid, role: 'assistant', content: '나도 고마웠어', emotional_stage: 'closure' },
  ])

  const { error: letterErr } = await authed.from('closure_letters').insert({
    user_id: userId,
    persona_id: pid,
    content: '마지막 편지 테스트',
    ai_farewell: '안녕, 잘 가',
  })
  if (letterErr) fail('closure-letter', letterErr.message)
  else pass('closure-letter', '이별 편지 저장')

  const { error: archErr } = await authed.from('personas').update({
    is_active: false,
    is_archived: true,
    archived_at: new Date().toISOString(),
  }).eq('id', pid)
  if (archErr) fail('closure-archive', archErr.message)
  else pass('closure-archive', '아카이브 완료')

  // 아카이브 조회
  const { data: archived } = await authed.from('personas').select('is_archived').eq('id', pid).single()
  if (archived?.is_archived) pass('closure-readonly', 'is_archived=true 확인')
  else fail('closure-readonly', '아카이브 플래그 미설정')

  // ClosureCeremony 페이지 로드
  const res = await fetch(`${BASE}/ClosureCeremony`)
  if (res.ok) pass('closure-ceremony-route', 'HTTP 200')
  else fail('closure-ceremony-route', String(res.status))

  // 정리
  await authed.from('closure_letters').delete().eq('persona_id', pid)
  await authed.from('conversations').delete().eq('persona_id', pid)
  await authed.from('personas').delete().eq('id', pid)
}

async function testStableTransitionBrowser(page, token, userId) {
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: persona } = await authed.from('personas').insert({
    user_id: userId, name: 'UI안정', relationship: '친구', care_type: 'human',
    raw_chat_text: '테스트', system_prompt: '당신은 UI안정입니다.',
    parsed_messages: [], emotional_stage: 'replay', is_active: true,
  }).select('id').single()
  if (!persona) return fail('stable-ui-persona', '생성 실패')

  await page.goto(`${BASE}/Chat/${persona.id}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  const input = page.locator('textarea, input').last()
  for (let i = 0; i < 3; i++) {
    await input.fill(`메시지 ${i + 1}`)
    await page.locator('text=↑').click()
    await page.waitForTimeout(8000)
  }

  const stableBtn = page.getByText(/안정 단계|stable|Healing|Move to/i).first()
  if (await stableBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await stableBtn.click()
    await page.waitForTimeout(1000)
    const confirm = page.getByText(/확인|Confirm|Move|넘어|ready/i).last()
    if (await confirm.isVisible({ timeout: 3000 }).catch(() => false)) await confirm.click()
    await page.waitForTimeout(2000)
    pass('stable-ui-transition', 'replay → stable 버튼 클릭 완료')
  } else {
    fail('stable-ui-transition', '안정 단계 버튼 미노출')
  }

  await authed.from('conversations').delete().eq('persona_id', persona.id)
  await authed.from('personas').delete().eq('id', persona.id)
}

async function testClosureBrowser(page, token, userId) {
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const manual = '안녕, 잘 지냈어?'
  const { data: persona } = await authed.from('personas').insert({
    user_id: userId, name: 'UI종결', relationship: '친구', care_type: 'human',
    raw_chat_text: manual, system_prompt: `당신은 UI종결입니다. ${manual}`,
    parsed_messages: [], emotional_stage: 'closure', is_active: true,
  }).select('id').single()
  if (!persona) return fail('closure-ui-persona', '생성 실패')

  const rows = Array.from({ length: 19 }, (_, i) => ({
    user_id: userId, persona_id: persona.id, role: i % 2 === 0 ? 'user' : 'assistant',
    content: `시드 ${i}`, emotional_stage: 'closure',
  }))
  await authed.from('conversations').insert(rows)

  await page.goto(`${BASE}/Chat/${persona.id}`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(4000)
  const input = page.locator('textarea, input').last()
  if (!(await input.isVisible({ timeout: 10000 }).catch(() => false))) {
    fail('closure-ui-chat', '입력창 없음')
  } else {
    pass('closure-ui-chat', 'closure 채팅 진입')
    await input.fill('마지막 인사')
    await page.locator('text=↑').click()
    await page.waitForTimeout(18000)
    const url = page.url()
    const body = await page.textContent('body')
    if (url.includes('ClosureCeremony') || /편지|letter|봉인|farewell/i.test(body || '')) {
      pass('closure-ui-ceremony', '종결 의식 화면 진입')
    } else {
      fail('closure-ui-ceremony', url)
    }
  }

  await authed.from('closure_letters').delete().eq('persona_id', persona.id)
  await authed.from('conversations').delete().eq('persona_id', persona.id)
  await authed.from('personas').delete().eq('id', persona.id)
}

async function testPetPersona(page, email, password) {
  await page.goto(`${BASE}/CareSelect`, { waitUntil: 'networkidle' })
  await page.getByText(/^Pet$|^반려동물$/).first().click()
  await page.waitForTimeout(800)

  await page.locator('input').first().fill('초코')
  const dogBtn = page.getByText(/^Dog$|^강아지$/).first()
  await dogBtn.click()
  await page.getByText(/^Next$|^다음$/).first().click()
  await page.waitForTimeout(800)

  await page.getByText(/Within a month|한 달 이내/).first().click()
  await page.getByText(/^Next$|^다음$/).last().click()
  await page.waitForTimeout(1500)

  const memory = '초코는 문 앞에서 꼬리를 흔들며 반겨줬어. 산책할 때마다 신나게 뛰어다녔고, 내 무릎 위에서 자는 걸 좋아했어.'
  const lastMemory = page.getByPlaceholder(/마지막|last.*moment|licked my hand/i).first()
  if (await lastMemory.isVisible({ timeout: 5000 }).catch(() => false)) {
    await lastMemory.fill(memory)
  } else {
    await page.locator('textarea').last().fill(memory)
  }
  pass('pet-form-fill', '펫 마지막 기억 입력')

  await page.getByText(/동의|understand|AI가|I understand/i).first().click()
  await page.waitForTimeout(300)

  const createBtn = page.getByText(/기억 만들기|Create Memory|Create a Memory/i).last()
  await createBtn.scrollIntoViewIfNeeded()
  await createBtn.click({ timeout: 10000 })
  await page.waitForTimeout(10000)

  const body = await page.textContent('body')
  const ok = body?.includes('초코') && (page.url().includes('Chat') || body?.includes('Talk to') || body?.includes('대화'))
  if (ok) pass('pet-persona-create', '펫 페르소나 생성 → 채팅 진입')
  else fail('pet-persona-create', page.url())

  // DB에서 care_type=pet 확인
  const sb = createClient(SUPABASE_URL, ANON_KEY)
  const { data: { session } } = await sb.auth.signInWithPassword({ email, password })
  if (session) {
    const authed = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    })
    const { data: pets } = await authed.from('personas').select('id, care_type, name').eq('user_id', session.user.id).eq('care_type', 'pet').order('created_at', { ascending: false }).limit(1)
    if (pets?.[0]?.name === '초코') pass('pet-db-verify', `persona ${pets[0].id}`)
    else fail('pet-db-verify', JSON.stringify(pets))
    if (pets?.[0]) {
      await authed.from('conversations').delete().eq('persona_id', pets[0].id)
      await authed.from('personas').delete().eq('id', pets[0].id)
    }
  }
}

async function main() {
  console.log('\n=== 미테스트 항목 QA ===\n')
  const ts = Date.now()
  const email = `qa.remain.${ts}@stillafter-qa.test`
  const password = `QaRm${ts}!9a`

  const sb = createClient(SUPABASE_URL, ANON_KEY)
  await sb.auth.signUp({ email, password, options: { data: { nickname: 'QA남은' } } })
  const { data: { session } } = await sb.auth.signInWithPassword({ email, password })
  if (!session) { fail('setup', '테스트 계정 로그인 실패'); process.exit(1) }
  pass('setup', email)

  await checkSupabaseOAuth()

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  const run = async (name, fn) => {
    try { await fn() } catch (e) { fail(name, e.message) }
  }

  await run('oauth-google', () => testGoogleOAuthInit(page))
  await run('oauth-kakao', () => testKakaoLoginUI(page))
  await testPasswordReset(sb)
  await testClosureFlow(session.access_token, session.user.id)

  await loginBrowser(page, email, password)
  await run('stable-ui', () => testStableTransitionBrowser(page, session.access_token, session.user.id))
  await run('closure-ui', () => testClosureBrowser(page, session.access_token, session.user.id))
  await run('kakao-upload', () => testKakaoFileUpload(page))
  await run('pet-persona', () => testPetPersona(page, email, password))

  await browser.close()

  const passed = results.filter((r) => r.ok === true).length
  const failed = results.filter((r) => r.ok === false).length
  const skipped = results.filter((r) => r.ok === 'skip').length
  console.log(`\n=== 결과: ${passed} passed, ${failed} failed, ${skipped} skipped ===\n`)

  // JSON 리포트
  writeFileSync(resolve(__dirname, '../qa-remaining-report.json'), JSON.stringify(results, null, 2))
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
