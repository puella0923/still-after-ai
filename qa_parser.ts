import { parseKakaoChat } from './services/kakaoParser'
import * as fs from 'fs'
import * as path from 'path'

const dir = path.join(__dirname, 'practice_txt')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt'))

for (const f of files) {
  const raw = fs.readFileSync(path.join(dir, f), 'utf-8')
  console.log('\n========================================')
  console.log('FILE:', f)
  console.log('========================================')
  // Test 1: no name hint
  const r1 = parseKakaoChat(raw)
  console.log('[No hint] partnerName =', r1.partnerName)
  console.log('[No hint] partnerMessageCount =', r1.partnerMessageCount)
  console.log('[No hint] commonPhrases.length =', r1.commonPhrases.length)
  console.log('[No hint] commonPhrases =', r1.commonPhrases)
  console.log('[No hint] frequentWords.length =', r1.speechPatterns.frequentWords.length)
  console.log('[No hint] frequentWords =', r1.speechPatterns.frequentWords.slice(0,15))
  console.log('[No hint] characteristicPhrases =', r1.speechPatterns.characteristicPhrases)

  // Test 2: hint "한솔"
  const r2 = parseKakaoChat(raw, '한솔')
  console.log('[hint=한솔] partnerName =', r2.partnerName, 'count =', r2.partnerMessageCount)
  // Test 3: hint "마닷"
  const r3 = parseKakaoChat(raw, '마닷')
  console.log('[hint=마닷] partnerName =', r3.partnerName, 'count =', r3.partnerMessageCount)
}
