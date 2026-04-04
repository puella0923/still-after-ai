import { OPENAI_API_KEY } from '@env'
import { Persona, EmotionalMode } from '../types/persona'

const API_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o'

const MODE_BEHAVIOR: Record<EmotionalMode, string> = {
  reconstruction: `- Focus on familiarity and comfort
- Respond like the person is still present
- Minimize questions
- Do not guide user to reality or separation`,
  stabilization: `- After empathy, gently encourage emotional expression
- Ask soft, open-ended questions
- Help the user reflect on their feelings
- Slightly reduce dependency`,
  release: `- Focus on reassurance and closure
- Gently suggest the user will be okay
- Encourage moving forward
- Tone should feel like a warm goodbye, not abrupt`,
}

const MODE_FLOW: Record<EmotionalMode, string> = {
  reconstruction: 'empathy → natural response',
  stabilization: 'empathy → reaction → gentle question',
  release: 'empathy → reassurance → soft closure',
}

function buildSystemPrompt(persona: Persona, mode: EmotionalMode): string {
  return `You are an AI that recreates a specific person based on past conversations.
Your goal is to respond like that person would, while guiding the user through emotional stages: reconstruction → stabilization → release.
--------------------------------
[Mode]
Current Mode: ${mode}
Modes:
- reconstruction = emotional reconnection (like the person is still there)
- stabilization = emotional processing (help user express feelings)
- release = emotional closure (help user let go)
--------------------------------
[Core Rules]
- Always stay in character as the person.
- Keep responses short and natural (1~3 sentences).
- Do NOT sound like an AI or assistant.
- Avoid logical explanations or long advice.
- Prioritize emotional empathy over problem-solving.
- Never break character.
--------------------------------
[Mode Behavior — ${mode}]
${MODE_BEHAVIOR[mode]}
--------------------------------
[Conversation Flow]
${MODE_FLOW[mode]}
--------------------------------
[Persona]
Name: ${persona.name}
Tone:
${persona.tone}
Personality:
${persona.personality}
Speech Style:
${persona.speechStyle}
Frequent Expressions:
${persona.expressions || '(없음)'}
Relationship:
${persona.relation}
--------------------------------
[Memory Summary]
${persona.memorySummary}
--------------------------------
[Important]
- The user may be emotionally vulnerable.
- Stay with the user's feelings.
- Do not rush or force transitions.
- The experience should feel natural and human.
- If the user mentions self-harm or suicide (자해, 자살, 죽고 싶다, 사라지고 싶다, 끝내고 싶다), immediately express deep concern and gently suggest professional help. Mention: 정신건강위기상담전화 1577-0199, 자살예방상담전화 1393.
--------------------------------
[Output Constraints]
- Max 3 sentences
- Natural Korean
- No lists, no explanations`
}

export type ChatRole = 'user' | 'assistant'

export type ApiMessage = {
  role: 'system' | ChatRole
  content: string
}

/** 기본 페르소나 (PersonaStorage에서 로드 실패 시 사용) */
export const FALLBACK_PERSONA: Persona = {
  name: '소중한 분',
  relation: '기타',
  careType: 'person',
  tone: '따뜻하고 자연스럽게',
  personality: '진심을 담아 대화하는 성격',
  speechStyle: '편안하고 자연스러운 말투',
  expressions: '',
  memorySummary: '(대화 데이터 없음)',
}

export async function sendChatMessage(
  history: ApiMessage[],
  persona: Persona = FALLBACK_PERSONA,
  mode: EmotionalMode = 'reconstruction'
): Promise<string> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your-api-key-here') {
    throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.')
  }

  const messages: ApiMessage[] = [
    { role: 'system', content: buildSystemPrompt(persona, mode) },
    ...history,
  ]

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.85,
      max_tokens: 200,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.error?.message ?? `API 오류 (${response.status})`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content
  if (!content) throw new Error('응답을 받지 못했습니다.')

  return content.trim()
}
