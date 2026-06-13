import { readFileSync } from 'fs'
import { parseKakaoChat, generateSystemPrompt } from '../services/kakaoParser.ts'

const file = process.argv[2]
const raw = readFileSync(file, 'utf8')
const parsed = parseKakaoChat(raw, '엄마')
const prompt = generateSystemPrompt(parsed, '부모님')
console.log(JSON.stringify({
  partnerMessageCount: parsed.partnerMessageCount,
  partnerName: parsed.partnerName,
  hasPrompt: prompt.includes('엄마'),
}))
