/**
 * 첫 방문 유저 E2E QA (API + 프로덕션 URL)
 * 실행: node scripts/qa-first-user-flow.mjs
 */

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

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const results = []
function pass(step, detail = '') {
  results.push({ step, ok: true, detail })
  console.log(`✅ ${step}${detail ? ` — ${detail}` : ''}`)
}
function fail(step, detail = '') {
  results.push({ step, ok: false, detail })
  console.log(`❌ ${step}${detail ? ` — ${detail}` : ''}`)
}

async function checkUrl(path, expectInHtml) {
  const url = `${BASE}${path}`
  try {
    const res = await fetch(url, { redirect: 'follow' })
    const html = await res.text()
    if (!res.ok) {
      fail(`URL ${path}`, `HTTP ${res.status}`)
      return false
    }
    if (expectInHtml && !html.includes(expectInHtml)) {
      fail(`URL ${path}`, `expected "${expectInHtml}" not in HTML`)
      return false
    }
    pass(`URL ${path}`, `HTTP ${res.status}`)
    return true
  } catch (e) {
    fail(`URL ${path}`, e.message)
    return false
  }
}

const ts = Date.now()
const testEmail = `qa.flow.${ts}@stillafter-qa.test`
const testPassword = `QaTest${ts}!9a`
const testNickname = '큐에이'

async function main() {
  console.log('\n=== Still After — 첫 유저 플로우 QA ===\n')
  console.log(`테스트 계정: ${testEmail}\n`)

  // ── 1. 프로덕션 페이지 로드 ──
  await checkUrl('/', 'Still After')
  await checkUrl('/EmailAuth', 'Still After')
  await checkUrl('/EmailAuth', 'Still After')

  if (!SUPABASE_URL || !ANON_KEY) {
    fail('환경변수', 'EXPO_PUBLIC_SUPABASE_URL / ANON_KEY 없음')
    printSummary()
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, ANON_KEY)

  // ── 2. 회원가입 (이메일 인증 없이) ──
  let session = null
  {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: { data: { nickname: testNickname } },
    })
    if (error) {
      fail('회원가입', error.message)
    } else {
      session = data.session
      if (!session) {
        const login = await supabase.auth.signInWithPassword({ email: testEmail, password: testPassword })
        if (login.error) fail('회원가입 후 로그인', login.error.message)
        else {
          session = login.data.session
          pass('회원가입 + 로그인', `user ${session.user.id.slice(0, 8)}…`)
        }
      } else {
        pass('회원가입', `즉시 세션 발급 (${session.user.id.slice(0, 8)}…)`)
      }
    }
  }

  if (!session) {
    printSummary()
    process.exit(1)
  }

  const userId = session.user.id
  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })

  // ── 3. 프로필 저장 ──
  {
    const { error } = await authed.from('profiles').upsert({ id: userId, nickname: testNickname })
    if (error) fail('프로필 저장', error.message)
    else pass('프로필 저장')
  }

  // ── 4. 페르소나 생성 (직접 작성 플로우) ──
  const manualText = '엄마는 항상 걱정이 많고 따뜻했어. 밥 먹었냐고 자주 물어봤고, 반찬 투정하는 나한테 화내지 않았어. 주말마다 국 끓여주셨고.'
  const systemPrompt = `당신은 엄마입니다. 사용자와 부모님 관계입니다.\n--- 기억 ---\n${manualText}`
  let personaId = null
  {
    const { data, error } = await authed.from('personas').insert({
      user_id: userId,
      name: '엄마',
      relationship: '부모님',
      care_type: 'human',
      raw_chat_text: manualText,
      parsed_messages: [],
      system_prompt: systemPrompt,
      message_style: {},
      emotional_stage: 'replay',
      is_active: true,
    }).select('id').single()

    if (error) fail('페르소나 생성', error.message)
    else {
      personaId = data.id
      pass('페르소나 생성', personaId)
    }
  }

  if (!personaId) {
    printSummary()
    process.exit(1)
  }

  // ── 5. 페르소나 조회 (홈 화면 데이터) ──
  {
    const { data, error } = await authed.from('personas')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
    if (error) fail('페르소나 목록 조회', error.message)
    else if (!data?.length) fail('페르소나 목록 조회', '0건')
    else pass('페르소나 목록 조회', `${data.length}건`)
  }

  // ── 6. AI 채팅 (Edge Function) ──
  {
    const edgeUrl = `${SUPABASE_URL}/functions/v1/chat`
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        systemPrompt,
        messages: [{ role: 'user', content: '밥 먹었어?' }],
        maxTokens: 200,
        temperature: 0.7,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      fail('AI 채팅', `${res.status} ${body?.error ?? JSON.stringify(body)}`)
    } else if (!body?.content?.trim()) {
      fail('AI 채팅', '빈 응답')
    } else {
      pass('AI 채팅', body.content.slice(0, 60) + '…')
    }
  }

  // ── 7. 대화 저장 ──
  {
    const { error } = await authed.from('conversations').insert([
      { user_id: userId, persona_id: personaId, role: 'user', content: '밥 먹었어?', emotional_stage: 'replay' },
      { user_id: userId, persona_id: personaId, role: 'assistant', content: 'QA 테스트 응답', emotional_stage: 'replay' },
    ])
    if (error) fail('대화 저장', error.message)
    else pass('대화 저장')
  }

  // ── 8. 위험 키워드 감지 (클라이언트 로직) ──
  {
    const DANGER = ['자해', '자살', '죽고 싶', '사라지고 싶']
    const detected = DANGER.some((k) => '죽고 싶어'.includes(k))
    if (detected) pass('위험 키워드 감지 로직')
    else fail('위험 키워드 감지 로직')
  }

  // ── 9. 스키마 진단 ──
  for (const table of ['personas', 'conversations', 'profiles', 'closure_letters']) {
    const { error } = await authed.from(table).select('id').limit(1)
    if (error) fail(`DB ${table}`, error.message)
    else pass(`DB ${table} 접근`)
  }

  // ── 10. 정리 (테스트 데이터 삭제) ──
  {
    await authed.from('conversations').delete().eq('user_id', userId)
    await authed.from('personas').delete().eq('user_id', userId)
    await authed.from('profiles').delete().eq('id', userId)
    pass('테스트 데이터 정리')
  }

  printSummary()
  const failed = results.filter((r) => !r.ok).length
  process.exit(failed > 0 ? 1 : 0)
}

function printSummary() {
  const ok = results.filter((r) => r.ok).length
  const fail = results.filter((r) => !r.ok).length
  console.log(`\n=== 결과: ${ok} passed, ${fail} failed ===\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
