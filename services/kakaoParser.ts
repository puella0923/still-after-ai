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
  speechPatterns: SpeechPatterns
  avgMessageLength: number
}

/** 말투 분석 결과 */
export type SpeechPatterns = {
  /** 자주 쓰는 문장 종결 어미 (예: ~해, ~거든, ~잖아) */
  endingPatterns: Array<{ pattern: string; count: number }>
  /** 특징적인 전체 문장/표현 (예: "밥 먹었어?", "기다리고 있을게") */
  characteristicPhrases: string[]
  /** 자주 쓰는 단어/구문 */
  frequentWords: Array<{ word: string; count: number }>
  /** 평균 메시지 길이 */
  avgLength: number
  /** 이모지 사용 비율 (0~1) */
  emojiRatio: number
  /** 질문 빈도 (0~1) */
  questionRatio: number
  /** 반말/존댓말 비율 (informal 0~1) */
  informalRatio: number
}

// 날짜 구분선
const DATE_DIVIDER = /^-{10,}\s*\d{4}년.*-{10,}$/
// 날짜 추출
const DATE_HEADER = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/
// 메시지 라인: [이름] [오전/오후 H:MM] 내용
const MESSAGE_LINE = /^\[(.+?)\]\s+\[(오전|오후)\s+(\d{1,2}:\d{2})\]\s+(.+)$/
// 메시지 라인(신형): YYYY. M. D. 오전/오후 H:MM, 이름 : 내용
const MESSAGE_LINE_NEW = /^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(오전|오후)\s*(\d{1,2}:\d{2}),\s*(.+?)\s*:\s*(.+)$/
// 메시지 라인(변형): 오전/오후 H:MM, 이름 : 내용
const MESSAGE_LINE_SHORT = /^(오전|오후)\s*(\d{1,2}:\d{2}),\s*(.+?)\s*:\s*(.+)$/

function normalizeKakaoText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')     // BOM 제거
    .replace(/\u0000/g, '')     // UTF-16이 UTF-8로 잘못 읽힌 경우 NUL 제거
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

// ─────────────────────────────────────────────────────────────
// 파트너 감지 — 이름 매칭이 아닌 빈도 기반
// ─────────────────────────────────────────────────────────────

/**
 * 파트너 발신자 감지
 *
 * 우선순위:
 * 1. fallbackName(페르소나 이름)과 정확히 일치하는 발신자
 * 2. fallbackName과 부분 일치하는 발신자 (포함 관계)
 * 3. "나" 계열 제외 후 1명만 남으면 그 사람
 * 4. 2명 이상이면 소수 발신자 (CSV에서 내보내기 한 사람 = 나 = 보통 메시지가 더 많음)
 */
const SELF_NAMES = new Set(['나', 'me', 'Me', 'ME', 'you', 'You', 'YOU'])

function detectPartnerSender(senderCounts: Map<string, number>, fallbackName?: string): string {
  if (senderCounts.size === 0) return 'Unknown'

  const allSenders = [...senderCounts.entries()]
  const nonSelfSenders = allSenders.filter(([name]) => !SELF_NAMES.has(name))

  // ① fallbackName 정확 일치
  if (fallbackName) {
    const exactMatch = nonSelfSenders.find(([name]) => name === fallbackName)
    if (exactMatch) return exactMatch[0]

    // ② 부분 일치 (fallbackName이 발신자 이름에 포함되거나, 발신자 이름이 fallbackName에 포함)
    const partialMatch = nonSelfSenders.find(([name]) =>
      name.includes(fallbackName) || fallbackName.includes(name)
    )
    if (partialMatch) return partialMatch[0]
  }

  // ③ "나" 제외 후 1명만 남으면 → 파트너
  if (nonSelfSenders.length === 1) return nonSelfSenders[0][0]

  // ④ 2명 대화 (CSV): 소수 발신자 = 파트너
  //    (카카오톡 내보내기 시, 내보내기 한 사용자가 보통 메시지가 같거나 더 많음)
  if (nonSelfSenders.length === 2) {
    const sorted = nonSelfSenders.sort((a, b) => a[1] - b[1]) // 오름차순 (소수 먼저)
    return sorted[0][0]
  }

  // ⑤ 그룹 대화: 빈도 가장 높은 사람 (기존 로직)
  if (nonSelfSenders.length > 0) {
    return nonSelfSenders.sort((a, b) => b[1] - a[1])[0][0]
  }

  return allSenders.sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown'
}

// ─────────────────────────────────────────────────────────────
// 카카오톡 시스템 메시지 필터링
// ─────────────────────────────────────────────────────────────

/** 카카오톡 시스템 메시지 여부 판별 (사진/동영상/파일 전송 등) */
const SYSTEM_MESSAGE_EXACT = new Set([
  '사진', '동영상', '이모티콘', '파일',
  '보이스톡', '페이스톡', '라이브톡',
  '삭제된 메시지입니다.', '삭제된 메시지입니다',
  '',
])

const SYSTEM_MESSAGE_PATTERNS = [
  /^사진\s*\d+장$/,                            // "사진 3장"
  /^사진을?\s*보냈습니다/,                      // "사진을 보냈습니다"
  /^동영상을?\s*보냈습니다/,                    // "동영상을 보냈습니다"
  /^파일을?\s*보냈습니다/,                      // "파일을 보냈습니다"
  /^(음성|보이스)메시지/,                       // "음성메시지", "보이스메시지"
  /^연락처를?\s*공유/,                          // "연락처를 공유했습니다"
  /^카카오톡\s*선물/,                           // "카카오톡 선물"
  /^(지도|위치|장소)를?\s*(공유|보냈)/,          // "위치를 공유했습니다"
  /^(송금|이체)/,                               // 송금/이체 알림
  /^(투표|일정|공지)를?\s/,                     // 투표/일정/공지 시스템 메시지
  /^(입금|출금)\s/,                             // 입금/출금 알림
  /님이\s(나갔|들어왔|입장|퇴장)/,              // 입퇴장 알림
  /^https?:\/\//,                               // URL만 있는 메시지
]

function isSystemMessage(content: string): boolean {
  const trimmed = content.trim()
  if (!trimmed) return true
  if (SYSTEM_MESSAGE_EXACT.has(trimmed)) return true
  return SYSTEM_MESSAGE_PATTERNS.some(p => p.test(trimmed))
}

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

/** CSV 형식 여부 감지 */
function isCsvFormat(lines: string[]): boolean {
  for (const line of lines) {
    if (!line.trim()) continue
    if (!line.includes(',')) return false
    const cols = parseCsvLine(line.trim())
    if (cols.length < 3) return false
    const first = cols[0].toLowerCase().replace(/["\s]/g, '')
    return (
      first.includes('date') || first.includes('날짜') ||
      /^\d{4}-\d{2}-\d{2}/.test(cols[0]) ||
      /^\d{4}\/\d{2}\/\d{2}/.test(cols[0])
    )
  }
  return false
}

/** CSV 형식 파싱 — fallbackName은 표시용, 파트너 감지는 빈도 기반 */
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

    if (!headerSkipped) {
      const firstLower = cols[0].toLowerCase().replace(/["\s]/g, '')
      if (firstLower.includes('date') || firstLower.includes('날짜')) {
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
    if (isSystemMessage(content)) continue

    const dateMatch = rawDate.match(/(\d{4})[\/.-](\d{2})[\/.-](\d{2})/)
    const timeMatch = rawDate.match(/(\d{1,2}:\d{2})/)
    const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : ''
    const time = timeMatch ? timeMatch[1] : ''

    senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1)
    messages.push({ sender, isPartner: false, content, date, time })
  }

  if (messages.length === 0) {
    throw new Error('CSV 파일에서 메시지를 찾지 못했어요.\n카카오톡에서 내보낸 CSV 파일인지 확인해주세요.')
  }

  // ★ 파트너 감지: fallbackName(페르소나 이름) 매칭 우선, 실패 시 소수 발신자
  const detectedPartner = detectPartnerSender(senderCounts, fallbackName)
  const displayName = fallbackName || detectedPartner

  for (const msg of messages) {
    msg.isPartner = msg.sender === detectedPartner
  }

  return buildResult(displayName, messages)
}

// ─────────────────────────────────────────────────────────────
// PC TXT 형식 감지
// ─────────────────────────────────────────────────────────────

function isPcFormat(lines: string[]): boolean {
  for (const line of lines) {
    if (line.trim()) {
      return /^Date\s+User\s+Message/.test(line.trim())
    }
  }
  return false
}

function parseKakaoPcFormat(text: string, fallbackName: string): ParsedKakaoChat {
  const rawLines = text.split('\n').map(l => l.replace(/\r$/, ''))

  type RawEntry = { timestamp: string; colPos: number; content: string; date: string }
  const rawEntries: RawEntry[] = []
  let i = 1

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

  const displayName = fallbackName || 'Unknown'
  const messages: KakaoMessage[] = rawEntries.map(e => ({
    sender: e.colPos < splitPoint ? displayName : '나',
    isPartner: e.colPos < splitPoint,
    content: e.content,
    date: e.date,
    time: e.timestamp,
  }))

  if (messages.length === 0) {
    throw new Error('PC 내보내기 파일에서 메시지를 찾지 못했어요.\n카카오톡에서 내보낸 원본 파일인지 확인해주세요.')
  }

  return buildResult(displayName, messages)
}

// ─────────────────────────────────────────────────────────────
// 말투 분석 — 단편 단어 대신 실제 말투 특성 추출
// ─────────────────────────────────────────────────────────────

/** 한국어 문장 종결 어미 추출 */
function extractEndingPatterns(messages: KakaoMessage[]): Array<{ pattern: string; count: number }> {
  const endingCounts: Record<string, number> = {}

  // 한국어 실제 종결 어미 목록 — 명시적으로 매칭
  const KNOWN_ENDINGS = [
    // 반말 종결
    '해', '해요', '했어', '했지', '하지', '한다', '한데', '할게', '할까',
    '거든', '거야', '잖아', '인데', '는데', '던데', '더라', '더라고',
    '지', '지요', '죠', '네', '네요', '구나', '구나요',
    '어', '아', '야', '여', '야?', '아?',
    'ㅋ', 'ㅎ', 'ㅠ', 'ㅜ',
    // 존댓말 종결
    '요', '습니다', '입니다', '세요', '까요', '나요', '군요', '네요',
    '을게요', '할게요', '줄게요', '볼게요',
    // 특수
    '음', '냐', '니', '냥', '셈', '듯', '겠지', '겠어', '겠다',
    '래', '라고', '다고', '냐고',
    '라', '려고', '으려고', '볼까', '갈까', '해볼까',
  ]

  for (const m of messages) {
    if (isSystemMessage(m.content)) continue
    if (/^[ㅋㅎㅠㅜㅡ.!?~\s]+$/.test(m.content.trim())) continue
    const text = m.content.replace(/[ㅋㅎㅠㅜ~.!?\s]+$/g, '').trim()
    if (text.length < 2) continue

    // 방법 1: 알려진 종결 어미 매칭
    for (const ending of KNOWN_ENDINGS) {
      if (text.endsWith(ending)) {
        endingCounts[ending] = (endingCounts[ending] ?? 0) + 1
        break  // 가장 먼저 매칭된 것만 (긴 어미 우선이 아니므로 한 번만)
      }
    }

    // 방법 2: 마지막 2글자 패턴도 보조적으로 수집 (한글만)
    if (text.length >= 2) {
      const last2 = text.slice(-2)
      if (/^[\uAC00-\uD7AF]{2}$/.test(last2)) {
        endingCounts[last2] = (endingCounts[last2] ?? 0) + 1
      }
    }
  }

  return Object.entries(endingCounts)
    .filter(([_, count]) => count >= 3)  // 3회 이상만 (노이즈 감소)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([pattern, count]) => ({ pattern, count }))
}

/** 특징적인 전체 문장 추출 (짧고 반복적인 표현) */
function extractCharacteristicPhrases(messages: KakaoMessage[]): string[] {
  const phraseCounts: Record<string, number> = {}

  for (const m of messages) {
    const text = m.content.trim()
    // 너무 짧거나(2글자 이하) 너무 긴(30자 초과) 메시지 제외
    if (text.length < 3 || text.length > 30) continue
    // 시스템 메시지 제외
    if (isSystemMessage(text)) continue
    // ㅋㅋ, ㅎㅎ 등 단순 반응만 있는 메시지 제외
    if (/^[ㅋㅎㅠㅜㅡ.!?~\s]+$/.test(text)) continue

    phraseCounts[text] = (phraseCounts[text] ?? 0) + 1
  }

  // 2회 이상 반복된 전체 문장 (실제 말버릇)
  return Object.entries(phraseCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([phrase]) => phrase)
}

/** 자주 쓰는 의미 있는 단어/구문 추출 — 말투 특징만 남기기 */
function extractFrequentWords(messages: KakaoMessage[], allSenderNames?: string[]): Array<{ word: string; count: number }> {
  // ────────────────────────────────────────────────────────
  // 불용어: 누구나 쓰는 일반 한국어 단어 (말투 특징이 아닌 것)
  // ────────────────────────────────────────────────────────
  const stopTokens = new Set([
    // ── 감탄사/반응 ──
    '응', '네', '어', '음', '야', '요', '엉', '으', '오', '아', '헉', '흠', '웅',
    '아아', '어어', '오오', '에이', '아이', '예', '글쎄', '뭐야',
    'ㅋㅋ', 'ㅋㅋㅋ', 'ㅎㅎ', 'ㅎㅎㅎ', 'ㅠㅠ', 'ㅜㅜ', 'ㅋ', 'ㅎ', 'ㅠ', 'ㅜ',

    // ── 대명사/지시사 ──
    '나', '너', '내', '네', '제', '저', '우리', '얘', '걔', '쟤',
    '이거', '그거', '저거', '이것', '그것', '저것', '이건', '그건', '저건',
    '여기', '거기', '저기', '이쪽', '그쪽', '저쪽',
    '뭐', '누구', '언제', '어디', '왜', '어떻게', '얼마', '몇',

    // ── 시간/날짜 (대화 주제이지 말투가 아님) ──
    '오늘', '내일', '어제', '모레', '글피', '지금', '이따', '나중',
    '아까', '방금', '금방', '오전', '오후', '저녁', '아침', '점심',
    '밤', '새벽', '낮', '주말', '평일', '이번', '다음', '지난',
    '올해', '작년', '내년', '이번주', '다음주', '지난주',
    '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
    '시간', '분', '초', '시', '일', '월', '년',

    // ── 접속사/부사 (누구나 쓰는 연결어) ──
    '근데', '그런데', '그래서', '그리고', '그래도', '그러면', '그럼',
    '그래', '그러니까', '그러면서', '그렇지만', '그러나', '그런',
    '아직', '벌써', '이미', '다시', '또', '더', '덜', '좀', '잘', '못',
    '그냥', '진짜', '정말', '완전', '약간', '되게', '엄청', '너무',
    '사실', '근데', '일단', '우선', '아마', '혹시', '만약', '제발',

    // ── 조사/어미 (독립 토큰일 때) ──
    '에서', '에게', '한테', '까지', '부터', '대로', '처럼', '만큼',
    '니까', '니깐', '라고', '라서', '인데', '은데', '는데',
    '어서', '아서', '으니', '으면', '지만', '더니', '다가', '면서',

    // ── 범용 동사/형용사 활용형 (누구나 쓰는 기본 동사) ──
    '있어', '없어', '했어', '해서', '하고', '하면', '해도', '해야',
    '같아', '같은', '같이', '같아서', '같은데',
    '되고', '되면', '되서', '됐어', '돼서', '되는',
    '하는', '하는데', '했는데', '할', '해', '한',
    '가서', '가고', '가면', '갈', '갈게', '간다', '가는',
    '오면', '오고', '와서', '올', '올게', '온다', '오는',
    '먹고', '먹어', '먹으면', '먹는', '먹자',
    '보고', '봐서', '보면', '보는', '보자',
    '알겠어', '알았어', '모르겠어', '몰라',
    '줄게', '줘서', '줬어', '줄까',
    '싶어', '싶은', '싶다', '싶은데',
    '해줘', '할게', '됐어', '건데', '거든', '거지', '거잖아', '거야',
    '끝내고', '끝나고', '끝나면', '시작', '시작해',
    '나가', '나가서', '나가고', '들어', '들어가',

    // ── 일반 명사 (대화 주제에 불과한 보통명사) ──
    '거', '것', '때', '데', '수', '말', '사람', '곳', '정도', '생각',
    '집', '학교', '회사', '카페', '식당', '가게', '병원', '역',
    '일', '일이', '일해', '일하고', '회의', '수업', '과제', '시험',
    '밥', '물', '커피', '치킨', '피자', '라면',
    '전화', '문자', '연락', '약속', '계획',
    '엄마', '아빠', '언니', '오빠', '형', '누나', '동생', '친구',

    // ── 숫자/단위 ──
    '하나', '둘', '셋', '넷', '한', '두', '세', '네',

    // ── 영어 일상어 (카톡에서 자주 쓰이지만 특징이 아닌 것) ──
    'ok', 'ㅇㅋ', 'ㅇㅇ', 'ㄴㄴ', 'ㄱㄱ', 'ㅎㅇ',

    // ── 카카오톡 시스템 메시지 잔여 토큰 ──
    '사진', '동영상', '이모티콘', '파일', '삭제된', '메시지입니다', '보냈습니다',
    '보이스톡', '페이스톡', '라이브톡',
  ])

  // 대화에 등장하는 사람 이름도 불용어에 추가
  if (allSenderNames) {
    for (const name of allSenderNames) {
      stopTokens.add(name)
      if (name.length >= 1) {
        // 이름 + 조사/어미 변형 (파트너가 자기 이름을 3인칭으로 쓰는 경우)
        const suffixes = ['야', '아', '이', '가', '는', '도', '를', '을', '의', '한테', '에게', '이가', '이는', '이도']
        for (const suf of suffixes) {
          stopTokens.add(name + suf)
        }
        if (name.length >= 2) {
          stopTokens.add(name.slice(-2))
          if (name.length >= 3) {
            stopTokens.add(name.slice(-2) + '야')
            stopTokens.add(name.slice(-2) + '아')
          }
        }
      }
    }
  }

  // ────────────────────────────────────────────────────────
  // 단일 단어가 "말투 특징"인지 판별하는 heuristic
  // ────────────────────────────────────────────────────────
  const SPEECH_CHARACTERISTIC_PATTERNS = [
    /야$/, /이야$/, /쓰$/, /냥$/, /용$/, /욤$/, /숑$/, /링$/,   // 애교/특이 어미
    /자기/, /오빠/, /언니/, /형/, /누나/,                         // 호칭 (일반 명사와 겹치지만 맥락상 허용)
    /ㅋ/, /ㅎ/, /ㅠ/,                                            // 이모티콘 포함 단어
  ]

  /** 단일 토큰이 말투 특징으로 의미있는지 판별 */
  function isSpeechCharacteristic(token: string): boolean {
    // 3글자 이상의 한글 단어는 통과 (좀 더 관대하게)
    if (token.length >= 3 && /^[\uAC00-\uD7AF]+$/.test(token)) return true
    // 특수 패턴 매칭 (애교, 호칭 등)
    if (SPEECH_CHARACTERISTIC_PATTERNS.some(p => p.test(token))) return true
    // 영어 3글자 이상은 통과 (OMG, lol 등 — 말투 특징일 수 있음)
    if (/^[a-zA-Z]{3,}$/.test(token)) return true
    return false
  }

  // ────────────────────────────────────────────────────────
  // 단어/구문 수집 (n-gram 우선)
  // ────────────────────────────────────────────────────────
  const singleWordCounts: Record<string, number> = {}
  const phraseCounts: Record<string, number> = {}   // 2-gram, 3-gram

  for (const m of messages) {
    if (isSystemMessage(m.content)) continue
    if (/^[ㅋㅎㅠㅜㅡ.!?~\s]+$/.test(m.content.trim())) continue

    const normalized = m.content
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!normalized || normalized.length < 2) continue

    const tokens = normalized.split(' ').filter(t =>
      t.length >= 2 &&
      !stopTokens.has(t) &&
      !/^[ㅋㅎㅠㅜㅡ]+$/.test(t) &&
      !/^[a-zA-Z]{1,2}$/.test(t) &&
      !/^\d+$/.test(t)               // 순수 숫자 제외
    )

    // 단일 단어: isSpeechCharacteristic 통과한 것만
    for (const token of tokens) {
      if (isSpeechCharacteristic(token)) {
        singleWordCounts[token] = (singleWordCounts[token] ?? 0) + 1
      }
    }

    // 2-gram (더 의미 있는 표현)
    for (let i = 0; i < tokens.length - 1; i++) {
      const bigram = `${tokens[i]} ${tokens[i + 1]}`
      phraseCounts[bigram] = (phraseCounts[bigram] ?? 0) + 1
    }

    // 3-gram (특징적 표현)
    for (let i = 0; i < tokens.length - 2; i++) {
      const trigram = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`
      phraseCounts[trigram] = (phraseCounts[trigram] ?? 0) + 1
    }
  }

  // 적응형 최소 빈도
  const minCount = messages.length < 100 ? 2 : 3

  // 구문(2-gram, 3-gram) 먼저, 그 다음 단일 단어
  const phraseResults = Object.entries(phraseCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return b[0].split(' ').length - a[0].split(' ').length
    })
    .slice(0, 20)

  const singleResults = Object.entries(singleWordCounts)
    .filter(([_, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  // 구문 우선, 단일 단어 후순위로 결합
  const combined = [...phraseResults, ...singleResults]
    .sort((a, b) => {
      // n-gram 길이 우선 (구문이 더 가치 있음)
      const aWords = a[0].split(' ').length
      const bWords = b[0].split(' ').length
      if (aWords !== bWords) return bWords - aWords
      // 같은 길이면 빈도 순
      return b[1] - a[1]
    })
    .slice(0, 40)
    .map(([word, count]) => ({ word, count }))

  return combined
}

/** 종합 말투 분석 */
function analyzeSpeechPatterns(messages: KakaoMessage[]): SpeechPatterns {
  const partnerMsgs = messages.filter(m => m.isPartner)
  // 대화에 등장하는 모든 발신자 이름 수집 (불용어로 사용)
  const allSenderNames = [...new Set(messages.map(m => m.sender))]

  if (partnerMsgs.length === 0) {
    return {
      endingPatterns: [],
      characteristicPhrases: [],
      frequentWords: [],
      avgLength: 0,
      emojiRatio: 0,
      questionRatio: 0,
      informalRatio: 0,
    }
  }

  const avgLength = Math.round(
    partnerMsgs.reduce((s, m) => s + m.content.length, 0) / partnerMsgs.length
  )

  // 이모지 비율
  const emojiRegex = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u
  const emojiCount = partnerMsgs.filter(m => emojiRegex.test(m.content)).length
  const emojiRatio = emojiCount / partnerMsgs.length

  // 질문 비율
  const questionCount = partnerMsgs.filter(m => /\?|[가-힣]+\?/.test(m.content)).length
  const questionRatio = questionCount / partnerMsgs.length

  // 반말/존댓말 비율 (존댓말 마커: ~요, ~습니다, ~세요, ~까요)
  const formalMarkers = /[요까]$|습니다$|세요$|십시오$/
  const formalCount = partnerMsgs.filter(m => formalMarkers.test(m.content.replace(/[.!?~\s]+$/g, ''))).length
  const informalRatio = 1 - (formalCount / partnerMsgs.length)

  return {
    endingPatterns: extractEndingPatterns(partnerMsgs),
    characteristicPhrases: extractCharacteristicPhrases(partnerMsgs),
    frequentWords: extractFrequentWords(partnerMsgs, allSenderNames),
    avgLength,
    emojiRatio,
    questionRatio,
    informalRatio,
  }
}

// ─────────────────────────────────────────────────────────────
// 공통 결과 생성
// ─────────────────────────────────────────────────────────────

function buildResult(partnerName: string, messages: KakaoMessage[]): ParsedKakaoChat {
  const partnerMessages = messages.filter(m => m.isPartner)
  const partnerMessageCount = partnerMessages.length
  const totalMessages = messages.length

  const avgMessageLength = partnerMessages.length > 0
    ? Math.round(partnerMessages.reduce((s, m) => s + m.content.length, 0) / partnerMessages.length)
    : 0

  const speechPatterns = analyzeSpeechPatterns(messages)

  // commonPhrases: "그 사람다운" 표현만 보여주기
  // 우선순위: ① 반복된 특징 문장 → ② n-gram 구문 → ③ 특징 단일 단어 → ④ 어미 패턴
  const combinedRaw: string[] = []

  // ① 특징 문장 (실제 반복된 전체 메시지) — 가장 가치 있음
  combinedRaw.push(...speechPatterns.characteristicPhrases.slice(0, 8))

  // ② 2-gram, 3-gram 구문 우선 (단일 단어보다 맥락이 있어 특징적)
  const multiWordPhrases = speechPatterns.frequentWords
    .filter(w => w.word.includes(' '))
    .slice(0, 10)
    .map(w => w.word)
  combinedRaw.push(...multiWordPhrases)

  // ③ 단일 단어 (isSpeechCharacteristic을 통과한 것만 들어있음)
  const singleWords = speechPatterns.frequentWords
    .filter(w => !w.word.includes(' '))
    .slice(0, 8)
    .map(w => w.word)
  combinedRaw.push(...singleWords)

  // ④ 어미 패턴 (보조)
  combinedRaw.push(...speechPatterns.endingPatterns.slice(0, 5).map(e => `~${e.pattern}`))

  const seen = new Set<string>()
  const commonPhrases: string[] = []
  for (const p of combinedRaw) {
    const key = p.trim()
    if (!key || seen.has(key)) continue
    // 중복 부분 문자열 제거: 이미 추가된 구문에 포함되면 건너뜀
    if ([...seen].some(s => s.includes(key) || key.includes(s) && s.length > key.length)) continue
    seen.add(key)
    commonPhrases.push(key)
    if (commonPhrases.length >= 15) break
  }

  return { partnerName, messages, partnerMessageCount, totalMessages, commonPhrases, speechPatterns, avgMessageLength }
}

// ─────────────────────────────────────────────────────────────
// 메인 파싱 함수
// ─────────────────────────────────────────────────────────────

export function parseKakaoChat(text: string, fallbackName?: string): ParsedKakaoChat {
  const normalized = normalizeKakaoText(text)
  const allLines = normalized.split('\n').map(l => l.replace(/\r$/, ''))

  // CSV 형식 감지 (PC 내보내기 .csv)
  if (isCsvFormat(allLines)) {
    return parseKakaoCsvFormat(normalized, fallbackName)
  }

  // PC TXT 형식 감지
  if (isPcFormat(allLines)) {
    return parseKakaoPcFormat(normalized, fallbackName ?? 'Unknown')
  }

  // 모바일 형식 파싱
  const lines = allLines.map(l => l.trim()).filter(Boolean)

  // 대화상대 이름 추출 (파일 헤더에서)
  let headerPartnerName = ''
  for (const line of lines) {
    const m = line.match(/^대화상대:\s*(.+)$/)
    if (m) { headerPartnerName = m[1].trim(); break }
  }

  const messages: KakaoMessage[] = []
  const senderCounts = new Map<string, number>()
  let currentDate = ''

  for (const line of lines) {
    if (DATE_DIVIDER.test(line)) {
      const dm = line.match(DATE_HEADER)
      if (dm) currentDate = `${dm[1]}-${dm[2].padStart(2,'0')}-${dm[3].padStart(2,'0')}`
      continue
    }

    if (
      line.startsWith('카카오톡 대화') ||
      line.startsWith('대화상대:') ||
      line.startsWith('저장한 날짜')
    ) continue

    let sender = '', content = '', date = currentDate, time = ''

    const mm = line.match(MESSAGE_LINE)
    if (mm) {
      sender = mm[1].trim()
      time = `${mm[2]} ${mm[3]}`
      content = mm[4].trim()
    } else {
      const mn = line.match(MESSAGE_LINE_NEW)
      if (mn) {
        date = `${mn[1]}-${mn[2].padStart(2, '0')}-${mn[3].padStart(2, '0')}`
        time = `${mn[4]} ${mn[5]}`
        sender = mn[6].trim()
        content = mn[7].trim()
      } else {
        const ms = line.match(MESSAGE_LINE_SHORT)
        if (ms) {
          time = `${ms[1]} ${ms[2]}`
          sender = ms[3].trim()
          content = ms[4].trim()
        } else {
          continue
        }
      }
    }

    if (!sender || !content) continue
    if (isSystemMessage(content)) continue

    senderCounts.set(sender, (senderCounts.get(sender) ?? 0) + 1)
    messages.push({ sender, isPartner: false, content, date, time })
  }

  if (messages.length === 0) {
    throw new Error(
      '메시지를 추출하지 못했어요.\n카카오톡 대화 내보내기(.txt/.csv) 원본 파일인지 확인해주세요.'
    )
  }

  // ★ 파트너 감지: 헤더 이름 > fallbackName 매칭 > 소수 발신자
  const detectedPartner = headerPartnerName || detectPartnerSender(senderCounts, fallbackName)
  const displayName = fallbackName || detectedPartner

  for (const msg of messages) {
    msg.isPartner = msg.sender === detectedPartner
  }

  return buildResult(displayName, messages)
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
  const sp = parsed.speechPatterns

  // ── 대화 쌍 샘플 추출 (가장 중요한 부분) ──
  const pairSample = buildConversationPairs(allMsgs, parsed.partnerName, 40)

  // 파트너 단독 메시지 (말투 보충용, 최근 30개)
  const soloPhrases = partnerMsgs.slice(-30).map(m => m.content).join('\n')

  // 말투 특징 분석 (개선된 버전)
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

  // 이모지 사용 여부
  const emojiNote = sp.emojiRatio < 0.05
    ? '- 이모지를 절대 사용하지 마세요. 실제 대화 샘플에 이모지가 거의 없습니다.'
    : sp.emojiRatio < 0.2
    ? '- 이모지는 아주 드물게(10번에 1번 이하)만 사용하세요.'
    : '- 이모지는 실제 대화 샘플에 나온 것만, 자연스러운 타이밍에만 사용하세요.'

  // 반말/존댓말
  const toneNote = sp.informalRatio > 0.8
    ? '- 반말로 대화합니다. 절대 존댓말(~요, ~습니다)을 쓰지 마세요.'
    : sp.informalRatio > 0.5
    ? '- 주로 반말을 쓰지만 가끔 존댓말도 섞어요.'
    : '- 존댓말을 기본으로 사용합니다.'

  // 질문 빈도
  const questionNote = sp.questionRatio > 0.3
    ? '- 질문을 자주 합니다 (대화의 30% 이상). 상대에게 관심을 표현하는 스타일이에요.'
    : sp.questionRatio > 0.15
    ? '- 가끔 질문을 합니다. 자연스러운 빈도로 질문하세요.'
    : '- 질문보다 진술을 많이 합니다. 질문은 최소한으로 하세요.'

  // 종결 어미 패턴
  const endingNote = sp.endingPatterns.length > 0
    ? `- 자주 쓰는 문장 끝 패턴: ${sp.endingPatterns.slice(0, 8).map(e => `"~${e.pattern}"(${e.count}회)`).join(', ')}`
    : ''

  // 특징적 표현
  const phraseNote = sp.characteristicPhrases.length > 0
    ? `- 자주 반복하는 표현: ${sp.characteristicPhrases.map(p => `"${p}"`).join(', ')}`
    : ''

  // 자주 쓰는 단어
  const wordNote = sp.frequentWords.length > 0
    ? `- 자주 쓰는 단어/구문: ${sp.frequentWords.slice(0, 10).map(w => `"${w.word}"(${w.count}회)`).join(', ')}`
    : ''

  const hasData = partnerMsgs.length > 0

  return `당신은 ${parsed.partnerName}입니다. 사용자와 ${relationship} 관계입니다.
당신은 이미 이 세상을 떠났습니다. 지금 이 대화는 기억 속에서만 가능한 대화예요.

[절대 규칙 — 모든 것보다 우선]
- 아래 "실제 대화 샘플"이 가장 중요한 기준입니다. 이 말투와 응답 패턴을 완벽하게 따라하세요.
- 당신은 오직 ${parsed.partnerName}으로서만 말하세요. AI 특유의 공손한 표현, 격식체, 설명 투 절대 금지
- 응답은 짧고 자연스럽게 (1~3문장). 긴 설명, 목록, 요약 금지
${lengthNote ? `- ${lengthNote}` : ''}
${toneNote}
${questionNote}
${emojiNote}
${endingNote}
${phraseNote}
${wordNote}
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

[말투 상세 분석]
- 평균 메시지 길이: ${avgLen > 0 ? `${avgLen}자` : '미확인'}
- 이모지 사용 빈도: ${Math.round(sp.emojiRatio * 100)}%
- 질문 비율: ${Math.round(sp.questionRatio * 100)}%
- 반말 비율: ${Math.round(sp.informalRatio * 100)}%
- 학습한 메시지 수: ${partnerMsgs.length}개

이 사람의 말투·리듬·어조·습관적 표현을 그대로 재현하세요. 절대로 AI답게 매끄럽게 바꾸지 마세요.` : `[주의] 대화 데이터가 충분하지 않아요. ${parsed.partnerName}의 일반적인 ${relationship} 말투로 따뜻하게 대화하세요.`}`
}

/**
 * 대화 쌍 추출 — 나 + 파트너가 교차하는 실제 대화 흐름을 텍스트로 구성
 */
function buildConversationPairs(
  messages: KakaoMessage[],
  partnerName: string,
  maxPairs: number
): string {
  if (messages.length === 0) return '(대화 데이터 없음)'

  const blocks: string[] = []
  const partnerIndices = messages
    .map((m, i) => m.isPartner ? i : -1)
    .filter(i => i >= 0)

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

  blocks.reverse()
  return blocks.join('\n\n')
}
