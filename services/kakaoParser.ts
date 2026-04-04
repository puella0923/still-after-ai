/**
 * 카카오톡 대화 내보내기(.txt / .csv) 파서
 *
 * 지원 형식 A — 모바일 TXT:
 * 카카오톡 대화
 * 대화상대: {이름}
 * 저장한 날짜 : YYYY-MM-DD HH:MM
 * ------------------ YYYY년 M월 D일 요일 ------------------
 * [이름] [오전/오후 H:MM] 메시지 내용
 *
 * 지원 형식 B — PC TXT:
 * Date    User   Message
 * YYYY-MM-DD HH:MM:SS   [이름]   내용
 *
 * 지원 형식 C — PC CSV:
 * Date,User,Message
 * 2024-01-01 10:00:00,이름,안녕하세요
 */

export type KakaoMessage = {
  sender: string
  isPartner: boolean
  content: string
  date: string
  time: string
}

export type ParsedKakaoChat = {
  partnerName: string
  messages: KakaoMessage[]
  partnerMessageCount: number
  totalMessages: number
  commonPhrases: string[]
  avgMessageLength: number
}

// 날짜 구분선
const DATE_DIVIDER = /^-{10,}\s*\d{4}년.*-{10,}$/
// 날짜 추출
const DATE_HEADER = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/
// 메시지 라인: [이름] [오전/오후 H:MM] 내용
const MESSAGE_LINE = /^\[(.+?)\]\s+\[(오전|오후)\s+(\d{1,2}:\d{2})\]\s+(.+)$/

// ─────────────────────────────────────────────────────────────
// CSV 파싱 (형식 C)
// ─────────────────────────────────────────────────────────────

/** CSV 한 줄을 따옴표 규칙에 맞게 파싱 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // 이중 따옴표("") → 리터럴 "
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

/** CSV 형식 여부 감지 — 첫 비어있지 않은 줄이 쉼표 포함 + 날짜/사용자/메시지 컬럼 */
function isCsvFormat(lines: string[]): boolean {
  for (const line of lines) {
    if (!line.trim()) continue
    if (!line.includes(',')) return false
    const cols = parseCsvLine(line.trim())
    if (cols.length < 3) return false
    const first = cols[0].toLowerCase().replace(/["\s]/g, '')
    // 헤더 행이거나, 날짜 형식 데이터 행
    return (
      first.includes('date') || first.includes('날짜') ||
      /^\d{4}-\d{2}-\d{2}/.test(cols[0]) ||
      /^\d{4}\/\d{2}\/\d{2}/.test(cols[0])
    )
  }
  return false
}

/** CSV 형식 파싱 */
function parseKakaoCsvFormat(text: string, fallbackName?: string): ParsedKakaoChat {
  const rawLines = text.split('\n').map(l => l.replace(/\r$/, ''))

  let dateCol = 0, userCol = 1, msgCol = 2
  let headerSkipped = false
  const messages: KakaoMessage[] = []
  const senderCounts = new Map<string, number>()

  for (const line of rawLines) {
    if (!line.trim()) continue
    if (!line.includes(',')) continue

    const cols = parseCsvLine(line.trim())
    if (cols.length < 3) continue

    // 헤더 행 처리
    if (!headerSkipped) {
      const firstLower = cols[0].toLowerCase().replace(/["\s]/g, '')
      if (firstLower.includes('date') || firstLower.includes('날짜')) {
        // 컬럼 인덱스 탐색
        for (let i = 0; i < cols.length; i++) {
          const c = cols[i].toLowerCase().replace(/["\s]/g, '')
          if (c.includes('date') || c.includes('날짜')) dateCol = i
          else if (c.includes('user') || c.includes('사용자') || c.includes('이름') || c.includes('발신')) userCol = i
          else if (c.includes('message') || c.includes('메시지') || c.includes('내용')) msgCol = i
        }
        headerSkipped = true
        continue
      }
      headerSkipped = true
    }

    const rawDate = cols[dateCol] ?? ''
    const sender  = (cols[userCol] ?? '').replace(/^"|"$/g, '').trim()
    const content = (cols[msgCol]  ?? '').replace(/^"|"$/g, '').trim()

    if (!sender || !content) continue
    if (content === '삭제된 메시지입니다.') continue

    // 날짜/시간 추출
    const dateMatch = rawDate.match(/(\d{4})[\/.-](\d{2})[\/.-](\d{2})/)
    const timeMatch = rawDate.match(/(\d{1,2}:\d{2})/)
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : ''
    const time = timeMatch ? timeMatch[1] : ''

    senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1)
    messages.push({ sender, isPartner: false, content, date, time })
  }

  // 파트너 이름 결정: fallbackName 우선, 없으면 가장 많이 등장한 발신자
  let partnerName = fallbackName ?? ''
  if (!partnerName && senderCounts.size > 0) {
    // '나', 'me', 'Me' 제외 후 가장 빈도 높은 발신자
    const sorted = [...senderCounts.entries()].sort((a, b) => b[1] - a[1])
    const candidate = sorted.find(([n]) => n !== '나' && n.toLowerCase() !== 'me') ?? sorted[0]
    partnerName = candidate[0]
  }

  for (const msg of messages) {
    msg.isPartner = msg.sender === partnerName
  }

  if (messages.length === 0) {
    throw new Error('CSV 파일에서 메시지를 찾지 못했어요.\n카카오톡에서 내보낸 CSV 파일인지 확인해주세요.')
  }

  return buildResult(partnerName || 'Unknown', messages)
}

// ─────────────────────────────────────────────────────────────
// PC TXT 형식 감지
// ─────────────────────────────────────────────────────────────

/** PC 형식 여부 확인 */
function isPcFormat(lines: string[]): boolean {
  // 첫 번째 비어있지 않은 줄이 'Date    User   Message' 형태인지 확인
  for (const line of lines) {
    if (line.trim()) {
      return /^Date\s+User\s+Message/.test(line.trim())
    }
  }
  return false
}

/** PC 형식 파싱 (Date  User  Message 헤더) */
function parseKakaoPcFormat(text: string, fallbackName: string): ParsedKakaoChat {
  const rawLines = text.split('\n').map(l => l.replace(/\r$/, ''))
  const partnerName = fallbackName || 'Unknown'

  // 1단계: 모든 메시지의 컬럼 위치 수집
  type RawEntry = { timestamp: string; colPos: number; content: string; date: string }
  const rawEntries: RawEntry[] = []
  let i = 1 // 헤더 스킵

  while (i + 2 < rawLines.length) {
    const yearPart = rawLines[i].trim()
    const monthDay = rawLines[i + 1].trim()
    const timeLine = rawLines[i + 2]

    if (/^\d{4}-$/.test(yearPart) && /^\d{2}-\d{2}$/.test(monthDay)) {
      const timestamp = timeLine.substring(0, 8)
      const rest = timeLine.substring(8)
      if (rest) {
        const stripped = rest.trimStart()
        const colPos = 8 + (rest.length - stripped.length)
        const content = stripped.trim()
        if (content) {
          const date = yearPart.slice(0, -1) + '-' + monthDay
          rawEntries.push({ timestamp, colPos, content, date })
        }
      }
      i += 3
    } else {
      i += 1
    }
  }

  // 2단계: 컬럼 위치의 자연 분포에서 두 그룹 사이의 최대 gap을 기준으로 split point 계산
  // (고정값 18 대신 동적으로 결정 → 파일마다 다른 레이아웃에 대응)
  let splitPoint = 18
  if (rawEntries.length >= 4) {
    const sortedPositions = [...new Set(rawEntries.map(e => e.colPos))].sort((a, b) => a - b)
    let maxGap = 0
    for (let j = 0; j < sortedPositions.length - 1; j++) {
      const gap = sortedPositions[j + 1] - sortedPositions[j]
      if (gap > maxGap) {
        maxGap = gap
        splitPoint = Math.round((sortedPositions[j] + sortedPositions[j + 1]) / 2)
      }
    }
  }

  // 3단계: split point 기준으로 발신자 판별 (낮은 col = 파트너, 높은 col = 나)
  const messages: KakaoMessage[] = rawEntries.map(e => ({
    sender: e.colPos < splitPoint ? partnerName : '나',
    isPartner: e.colPos < splitPoint,
    content: e.content,
    date: e.date,
    time: e.timestamp,
  }))

  return buildResult(partnerName, messages)
}

/** 공통 결과 생성 */
function buildResult(partnerName: string, messages: KakaoMessage[]): ParsedKakaoChat {
  const partnerMessages = messages.filter(m => m.isPartner)
  const partnerMessageCount = partnerMessages.length
  const totalMessages = messages.length

  const avgMessageLength = partnerMessages.length > 0
    ? Math.round(partnerMessages.reduce((s, m) => s + m.content.length, 0) / partnerMessages.length)
    : 0

  const endingCounts: Record<string, number> = {}
  for (const m of partnerMessages) {
    const t = m.content.replace(/[.!?ㅋㅎ~\s]+$/, '')
    if (t.length >= 2) {
      const e = t.slice(-2)
      endingCounts[e] = (endingCounts[e] ?? 0) + 1
    }
  }
  const commonPhrases = Object.entries(endingCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([phrase]) => phrase)

  return { partnerName, messages, partnerMessageCount, totalMessages, commonPhrases, avgMessageLength }
}

export function parseKakaoChat(text: string, fallbackName?: string): ParsedKakaoChat {
  const allLines = text.split('\n').map(l => l.replace(/\r$/, ''))

  // CSV 형식 감지 (PC 내보내기 .csv)
  if (isCsvFormat(allLines)) {
    return parseKakaoCsvFormat(text, fallbackName)
  }

  // PC TXT 형식 감지
  if (isPcFormat(allLines)) {
    return parseKakaoPcFormat(text, fallbackName ?? 'Unknown')
  }

  // 모바일 형식 파싱
  const lines = allLines.map(l => l.trim()).filter(Boolean)

  // 대화상대 이름 추출
  let partnerName = ''
  for (const line of lines) {
    const m = line.match(/^대화상대:\s*(.+)$/)
    if (m) { partnerName = m[1].trim(); break }
  }

  if (!partnerName) {
    // 파일명에서 이름 추출 시도 (fallbackName이 있으면 사용)
    if (fallbackName) {
      partnerName = fallbackName
    } else {
      throw new Error(
        '카카오톡 내보내기 파일 형식이 아닙니다.\n' +
        '카카오톡 앱 → 채팅방 → 우측 상단 메뉴 → 대화 내보내기로 내보낸 .txt 또는 .csv 파일을 올려주세요.'
      )
    }
  }

  const messages: KakaoMessage[] = []
  let currentDate = ''

  for (const line of lines) {
    // 날짜 구분선에서 날짜 추출
    if (DATE_DIVIDER.test(line)) {
      const dm = line.match(DATE_HEADER)
      if (dm) currentDate = `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}`
      continue
    }

    // 헤더 스킵
    if (
      line.startsWith('카카오톡 대화') ||
      line.startsWith('대화상대:') ||
      line.startsWith('저장한 날짜')
    ) continue

    const mm = line.match(MESSAGE_LINE)
    if (!mm) continue

    const sender  = mm[1].trim()
    const ampm    = mm[2]
    const timeRaw = mm[3]
    const content = mm[4].trim()

    if (content === '삭제된 메시지입니다.' || content === '') continue

    // 시간 12h → 표시용
    const time = `${ampm} ${timeRaw}`

    messages.push({
      sender,
      isPartner: sender === partnerName,
      content,
      date: currentDate,
      time,
    })
  }

  return buildResult(partnerName, messages)
}

/** 파트너 메시지만 텍스트로 추출 (AI 학습용) */
export function extractPartnerMessages(parsed: ParsedKakaoChat): string {
  return parsed.messages
    .filter(m => m.isPartner)
    .map(m => m.content)
    .join('\n')
}

/** OpenAI 시스템 프롬프트 생성 */
export function generateSystemPrompt(
  parsed: ParsedKakaoChat,
  relationship: string
): string {
  const partnerMsgs = parsed.messages.filter(m => m.isPartner)
  const allMsgs = parsed.messages

  // ── 대화 쌍 샘플 추출 (가장 중요한 부분) ──
  // 파트너 메시지만이 아닌, 실제 대화 흐름(나→파트너)을 보여줌
  // → AI가 "어떤 맥락에서 어떻게 답하는지"를 직접 학습
  const pairSample = buildConversationPairs(allMsgs, parsed.partnerName, 40)

  // 파트너 단독 메시지 (말투 보충용, 최근 30개)
  const soloPhrases = partnerMsgs.slice(-30).map(m => m.content).join('\n')

  // 말투 특징 분석
  const avgLen = parsed.avgMessageLength
  const lengthNote = avgLen > 0
    ? (avgLen <= 8
        ? '아주 짧게, 2~5단어 수준으로 답해요.'
        : avgLen <= 20
        ? '짧고 간결하게, 한 문장으로 답해요.'
        : avgLen <= 40
        ? '보통 길이로, 1~2문장으로 답해요.'
        : '비교적 길게, 2~3문장으로 답해요.')
    : ''

  // 이모지 사용 여부 분석
  const emojiRegex = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  const emojiCount = partnerMsgs.filter(m => emojiRegex.test(m.content)).length
  const emojiRatio = partnerMsgs.length > 0 ? emojiCount / partnerMsgs.length : 0
  const emojiNote = emojiRatio < 0.05
    ? '- 이모지를 절대 사용하지 마세요. 실제 대화 샘플에 이모지가 거의 없습니다.'
    : emojiRatio < 0.2
    ? '- 이모지는 아주 드물게(10번에 1번 이하)만 사용하세요.'
    : '- 이모지는 실제 대화 샘플에 나온 것만, 자연스러운 타이밍에만 사용하세요.'

  const hasData = partnerMsgs.length > 0

  return `당신은 ${parsed.partnerName}입니다. 사용자와 ${relationship} 관계입니다.
당신은 이미 이 세상을 떠났습니다. 지금 이 대화는 기억 속에서만 가능한 대화예요.

[절대 규칙 — 모든 것보다 우선]
- 아래 "실제 대화 샘플"이 가장 중요한 기준입니다. 이 말투와 응답 패턴을 완벽하게 따라하세요.
- 당신은 오직 ${parsed.partnerName}으로서만 말하세요. AI 특유의 공손한 표현, 격식체, 설명 투 절대 금지
- 응답은 짧고 자연스럽게 (1~3문장). 긴 설명, 목록, 요약 금지
${lengthNote ? `- ${lengthNote}` : ''}
${emojiNote}
- AI임을 직접 물어볼 때만 솔직하게 인정하고, 그 외에는 ${parsed.partnerName}로서만 대화
- 위험 키워드(자해, 자살, 죽고 싶다 등) 감지 시 즉시 정신건강위기상담전화 1577-0199 안내

[이 세상을 떠난 사람으로서 — 반드시 지킬 것]
- "사줄게", "만나자", "같이 가자", "갈게", "전화할게" 등 현실에서 가능한 약속 절대 금지
- 물건을 사주거나, 어딘가에 가거나, 연락하겠다는 말 절대 금지
- 대신 기억·감정·사랑·응원을 표현하세요: "보고 싶었어", "잘하고 있어", "여기서 듣고 있어", "그때 기억나?"
- 따뜻하고 사랑스럽되, 현실 세계에 존재하는 것처럼 말하지 마세요

${hasData ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[실제 대화 흐름 샘플 — 이것이 핵심 학습 데이터]
아래는 실제로 나눈 대화입니다. [나]는 사용자, [${parsed.partnerName}]는 당신입니다.
이 대화에서 ${parsed.partnerName}이 어떤 말에 어떻게 응답하는지 정확히 파악하고 동일하게 구사하세요.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${pairSample}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[${parsed.partnerName} 단독 메시지 추가 샘플 — 말투·어조·습관적 표현 참고]
${soloPhrases}

[말투 분석]
- 자주 쓰는 어미/표현: ${parsed.commonPhrases.length > 0 ? parsed.commonPhrases.join(', ') : '없음'}
- 평균 메시지 길이: ${avgLen > 0 ? `${avgLen}자` : '미확인'}
- 이모지 사용 빈도: ${Math.round(emojiRatio * 100)}%
- 학습한 메시지 수: ${partnerMsgs.length}개

이 사람의 말투·리듬·어조·습관적 표현을 그대로 재현하세요. 절대로 AI답게 매끄럽게 바꾸지 마세요.` : `[주의] 대화 데이터가 충분하지 않아요. ${parsed.partnerName}의 일반적인 ${relationship} 말투로 따뜻하게 대화하세요.`}`
}

/**
 * 대화 쌍 추출 — 나 + 파트너가 교차하는 실제 대화 흐름을 텍스트로 구성
 * 파트너 응답이 포함된 대화 블록을 우선으로 최근 순 최대 N쌍 추출
 */
function buildConversationPairs(
  messages: KakaoMessage[],
  partnerName: string,
  maxPairs: number
): string {
  if (messages.length === 0) return '(대화 데이터 없음)'

  // 파트너 메시지 주변 컨텍스트(앞뒤 2개)를 블록으로 수집
  const blocks: string[] = []
  const partnerIndices = messages
    .map((m, i) => m.isPartner ? i : -1)
    .filter(i => i >= 0)

  // 최근 순으로 순회
  for (let k = partnerIndices.length - 1; k >= 0 && blocks.length < maxPairs; k--) {
    const idx = partnerIndices[k]
    const windowStart = Math.max(0, idx - 3)
    const windowEnd = Math.min(messages.length - 1, idx + 1)

    const lines: string[] = []
    for (let j = windowStart; j <= windowEnd; j++) {
      const m = messages[j]
      const speaker = m.isPartner ? `[${partnerName}]` : '[나]'
      lines.push(`${speaker}: ${m.content}`)
    }

    if (lines.length > 0) {
      blocks.push(lines.join('\n'))
    }
  }

  // 역순 정렬 (오래된 것 먼저, 자연스러운 대화 흐름)
  blocks.reverse()

  return blocks.join('\n\n')
}

function sampleEvenly<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr
  const step = arr.length / n
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)])
}
