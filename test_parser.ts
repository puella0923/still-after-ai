import { parseKakaoChat } from './services/kakaoParser'
import { readFileSync } from 'fs'

const base = '/sessions/tender-bold-darwin/mnt/Still After/practice_txt'
const files = [
  { path: `${base}/카카오톡_엄마.txt`, name: '엄마' },
  { path: `${base}/카카오톡_친구_지수.txt`, name: '지수' },
  { path: `${base}/카카오톡_연인_준혁.txt`, name: '준혁' },
]

for (const f of files) {
  try {
    const text = readFileSync(f.path, 'utf-8')
    const result = parseKakaoChat(text, f.name)
    console.log(`\n━━━ ${f.name} ━━━`)
    console.log(`전체: ${result.totalMessages}개 / 파트너: ${result.partnerMessageCount}개`)
    console.log(`자주 쓰는 표현: ${result.commonPhrases.join(', ')}`)
    console.log(`frequentWords top 15:`, result.speechPatterns.frequentWords.slice(0, 15).map(w => `${w.word}(${w.count})`).join(', '))
  } catch (e: any) {
    console.log(`${f.name} 파싱 실패:`, e.message)
  }
}
