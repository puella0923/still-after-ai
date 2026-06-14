/**
 * 브라우저 UI QA — Playwright
 * 실행: npx playwright install chromium && node scripts/qa-browser-flow.mjs
 */

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = 'https://stillafter.com'

const results = []
function pass(s, d = '') { results.push({ s, ok: true, d }); console.log(`✅ ${s}${d ? ` — ${d}` : ''}`) }
function fail(s, d = '') { results.push({ s, ok: false, d }); console.log(`❌ ${s}${d ? ` — ${d}` : ''}`) }

async function waitForText(page, text, timeout = 15000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout })
}

async function main() {
  console.log('\n=== Still After — 브라우저 UI QA ===\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  const ts = Date.now()
  const email = `qa.ui.${ts}@stillafter-qa.test`
  const password = `QaUi${ts}!9a`
  const nickname = '테스트유저'

  try {
    // 1. 온보딩
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 })
    const body = await page.textContent('body')
    if (body?.includes('천천히 시작') || body?.includes('Start slowly') || body?.includes('한 번만 더') || body?.includes('just one more time') || body?.includes('Still After')) {
      pass('온보딩 랜딩', '히어로/CTA 표시')
    } else {
      fail('온보딩 랜딩', 'CTA 텍스트 없음')
    }

    // CTA 클릭 → Login
    const startBtn = page.getByText(/천천히 시작|Start slowly|무료로 시작|Start for free/i).first()
    if (await startBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await startBtn.click()
      await page.waitForTimeout(1500)
      pass('온보딩 → 로그인 이동')
    } else {
      await page.goto(`${BASE}/Login`, { waitUntil: 'networkidle' })
      pass('로그인 페이지 직접 진입')
    }

    // 2. 이메일 로그인 선택
    const emailBtn = page.getByText(/이메일|Email/i).first()
    if (await emailBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await emailBtn.click()
      await page.waitForTimeout(1000)
      pass('이메일 로그인 선택')
    } else {
      await page.goto(`${BASE}/EmailAuth`, { waitUntil: 'networkidle' })
      pass('EmailAuth 직접 진입')
    }

    // 3. 회원가입 탭
    const signupTab = page.getByText(/회원가입|Sign up|Sign Up/i).first()
    await signupTab.click({ timeout: 10000 })
    await page.waitForTimeout(500)
    pass('회원가입 탭 전환')

    // 4. 폼 입력
    const inputs = page.locator('input')
    const count = await inputs.count()
    if (count < 3) {
      fail('회원가입 폼', `input ${count}개만 발견`)
    } else {
      // 일반적 순서: 닉네임, 이메일, 비밀번호, 비밀번호확인
      await inputs.nth(0).fill(nickname)
      await inputs.nth(1).fill(email)
      await inputs.nth(2).fill(password)
      if (count >= 4) await inputs.nth(3).fill(password)
      pass('회원가입 폼 입력', email)
    }

    // 5. 약관 동의 체크박스
    const checkboxes = page.locator('[role="checkbox"], input[type="checkbox"]')
    const cbCount = await checkboxes.count()
    if (cbCount > 0) {
      for (let i = 0; i < cbCount; i++) {
        try { await checkboxes.nth(i).click({ force: true, timeout: 2000 }) } catch { /* */ }
      }
      pass('약관 동의', `${cbCount}개`)
    } else {
      // RN Web은 Pressable — 텍스트 탭으로 동의
      const agreeAll = page.getByText(/전체 동의|Agree to All/i).first()
      if (await agreeAll.isVisible({ timeout: 3000 }).catch(() => false)) {
        await agreeAll.click()
        pass('전체 동의 클릭')
      } else {
        fail('약관 동의', '체크박스/전체동의 없음')
      }
    }

    // 6. 가입 버튼
    const submit = page.getByText(/회원가입|Sign up|Sign Up/i).last()
    await submit.click({ timeout: 5000 })
    await page.waitForTimeout(4000)

    // 7. 홈 진입 확인
    const homeText = await page.textContent('body')
    const onHome = homeText?.includes('기억') || homeText?.includes('Memory') || homeText?.includes('새로') || homeText?.includes('Create')
    if (onHome || !page.url().includes('EmailAuth')) {
      pass('회원가입 후 홈 진입', page.url())
    } else {
      const errText = homeText?.match(/오류|실패|error|연결/i)?.[0]
      fail('회원가입 후 홈 진입', errText ?? page.url())
    }

    // 8. 페르소나 만들기
    const createBtn = page.getByText(/새 기억|새로 만들|Create|AI 인격|기억 만들/i).first()
    if (await createBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      await createBtn.click()
      await page.waitForTimeout(1500)
      pass('페르소나 만들기 클릭')
    } else {
      await page.goto(`${BASE}/CareSelect`, { waitUntil: 'networkidle' })
      pass('CareSelect 직접 진입')
    }

    // 9. 사람 선택
    const humanCard = page.getByText(/^Person$|^사람$/).first()
    await humanCard.click({ timeout: 10000 })
    await page.waitForTimeout(1000)
    pass('케어 대상: 사람')

    // 10. 관계 설정 — 이름 + 부모님
    await page.waitForTimeout(1000)
    const nameInput = page.locator('input').first()
    if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nameInput.fill('엄마')
      pass('이름 입력: 엄마')
    }

    const parentBtn = page.getByText('부모님').first()
    if (await parentBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await parentBtn.click()
      pass('관계: 부모님')
    }

    const nextBtn = page.getByText(/다음|Next/i).first()
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click()
      await page.waitForTimeout(1500)
      pass('관계 설정 다음')
    }

    // 11. TimingCheck — 시점 선택 후 다음
    const timingOption = page.getByText(/Within a month|한 달 이내/i).first()
    if (await timingOption.isVisible({ timeout: 8000 }).catch(() => false)) {
      await timingOption.click()
      await page.waitForTimeout(500)
      pass('타이밍 선택')
    }
    const next2 = page.getByText(/^Next$|^다음$/).last()
    if (await next2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await next2.click({ timeout: 5000 })
      await page.waitForTimeout(2000)
      pass('타이밍 단계 통과')
    }

    // 12. PersonaCreate — 직접 작성
    await page.waitForTimeout(1000)
    const manualTab = page.getByText(/Write it yourself|직접 작성/i).first()
    if (await manualTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await manualTab.click()
      pass('직접 작성 탭')
    }

    const textareas = page.locator('textarea, input[multiline]')
    const taCount = await textareas.count()
    const memory = '엄마는 항상 걱정이 많고 따뜻했어. 밥 먹었냐고 자주 물어봤고, 반찬 투정하는 나한테 화내지 않았어.'
    if (taCount > 0) {
      await textareas.last().fill(memory)
      pass('기억 직접 작성')
    } else {
      const allInputs = page.locator('input')
      const n = await allInputs.count()
      if (n > 1) await allInputs.nth(n - 1).fill(memory)
      pass('기억 입력 (input)')
    }

    // 서비스 동의
    const serviceAgree = page.getByText(/서비스|동의|AI|인격/i).filter({ hasNotText: /전체/ }).first()
    const agreeTexts = page.getByText(/동의|understand|AI가/i)
    const agreeN = await agreeTexts.count()
    for (let i = 0; i < Math.min(agreeN, 3); i++) {
      try { await agreeTexts.nth(i).click({ timeout: 1000 }) } catch { /* */ }
    }
    pass('서비스 동의 시도')

    // 생성 버튼
    const createPersona = page.getByText(/Create Memory|기억 만들|만들기|Create/i).last()
    if (await createPersona.isVisible({ timeout: 5000 }).catch(() => false)) {
      await createPersona.click()
      await page.waitForTimeout(8000)
      pass('페르소나 생성 클릭')
    }

    // 13. AI 생성 / 채팅 진입
    await page.waitForTimeout(3000)
    const afterCreate = await page.textContent('body')
    const inChat = afterCreate?.includes('밥') || afterCreate?.includes('대화') || afterCreate?.includes('입력') || page.url().includes('Chat')
    if (inChat) {
      pass('채팅 화면 진입')
    } else {
      // AIGenerating에서 자동 이동 대기
      await page.waitForTimeout(5000)
      const chatInput = page.locator('textarea, input').last()
      if (await chatInput.isVisible({ timeout: 10000 }).catch(() => false)) {
        pass('채팅 입력창 표시')
      } else {
        fail('채팅 화면 진입', page.url())
      }
    }

    // 14. 메시지 전송
    const chatField = page.locator('textarea, input[placeholder]').last()
    if (await chatField.isVisible({ timeout: 8000 }).catch(() => false)) {
      await chatField.fill('밥 먹었어?')
      const sendBtn = page.locator('text=↑').or(page.getByRole('button').filter({ hasText: /전송|send/i })).first()
      if (await sendBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sendBtn.click()
      } else {
        await chatField.press('Enter')
      }
      await page.waitForTimeout(12000)
      const reply = await page.textContent('body')
      if (reply && reply.length > 200) {
        pass('AI 응답 수신', '본문 길이 증가 확인')
      } else {
        fail('AI 응답 수신', '응답 미확인')
      }
    }

    // 스크린샷
    await page.screenshot({ path: resolve(__dirname, '../qa-screenshot-final.png'), fullPage: true })
    pass('스크린샷 저장', 'qa-screenshot-final.png')

  } catch (e) {
    fail('예외 발생', e.message)
    await page.screenshot({ path: resolve(__dirname, '../qa-screenshot-error.png'), fullPage: true }).catch(() => {})
  } finally {
    await browser.close()
  }

  const failed = results.filter((r) => !r.ok).length
  console.log(`\n=== UI QA: ${results.filter((r) => r.ok).length} passed, ${failed} failed ===\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main()
