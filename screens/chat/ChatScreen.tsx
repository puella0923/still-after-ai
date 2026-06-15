import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  Alert,
  Linking,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp, useFocusEffect } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { getPersonaById, getConversations, saveConversation, diagnoseDatabaseHealth, Persona } from '../../services/personaService'
import { getChatResponse, detectDanger, ClosurePhase } from '../../services/openaiService'
import { supabase } from '../../services/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { C, RADIUS } from '../theme'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import PersonaAvatar from '../../components/PersonaAvatar'
import {
  STAGE_TRANSITION_MIN,
  CLOSURE_MESSAGE_LIMIT,
  STABLE_TRANSITION_MIN,
  MAX_HISTORY_LENGTH,
} from '../../constants/chat'
import { analytics } from '../../utils/analytics'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

function getStagePhase(count: number): 1 | 2 | 3 | 4 {
  if (count <= 5) return 1
  if (count <= 10) return 2
  if (count <= 15) return 3
  return 4
}
function getClosurePhase(count: number): ClosurePhase {
  if (count >= CLOSURE_MESSAGE_LIMIT) return 5
  if (count <= 5) return 1
  if (count <= 10) return 2
  if (count <= 15) return 3
  return 4
}
// Progress messages are sourced from t.chat.replayProgress / stableProgress / closureProgress inside the component

// ─── 스타 배경 상수 ───
// (CosmicBackground 컴포넌트로 이전됨 — 아래 STARS 배열은 제거)

// Stage-specific themes (label은 i18n에서 별도로 가져옴)
const STAGE_THEMES = {
  replay: {
    bg: ['#1a0118', '#200a2e', '#0f0520'] as [string, string, string],
    orb1: 'rgba(219, 39, 119, 0.25)',
    orb2: 'rgba(168, 85, 247, 0.2)',
    userBubble: ['rgba(219, 39, 119, 0.8)', 'rgba(168, 85, 247, 0.8)'] as [string, string],
    badgeBorder: 'rgba(236, 72, 153, 0.5)',
    badgeText: '#F9A8D4',
    badgeBg: 'rgba(236, 72, 153, 0.1)',
  },
  stable: {
    bg: ['#010d1a', '#0a1a3e', '#050f20'] as [string, string, string],
    orb1: 'rgba(37, 99, 235, 0.25)',
    orb2: 'rgba(6, 182, 212, 0.2)',
    userBubble: ['rgba(37, 99, 235, 0.8)', 'rgba(6, 182, 212, 0.8)'] as [string, string],
    badgeBorder: 'rgba(96, 165, 250, 0.5)',
    badgeText: '#93C5FD',
    badgeBg: 'rgba(59, 130, 246, 0.1)',
  },
  closure: {
    bg: ['#05010f', '#0f0a3e', '#080520'] as [string, string, string],
    orb1: 'rgba(99, 102, 241, 0.25)',
    orb2: 'rgba(88, 28, 135, 0.3)',
    userBubble: ['rgba(99, 102, 241, 0.8)', 'rgba(168, 85, 247, 0.8)'] as [string, string],
    badgeBorder: 'rgba(129, 140, 248, 0.5)',
    badgeText: '#A5B4FC',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
  },
}

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>
  route: RouteProp<RootStackParamList, 'Chat'>
}
type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  action?: 'goto_stable' | 'goto_closure' | 'goto_letter'
}

export default function ChatScreen({ navigation, route }: Props) {
  const personaId = route.params?.personaId
  const { t, language } = useLanguage()

  // 모듈 레벨 뮤터블 대신 컴포넌트 인스턴스 범위의 ref 사용
  const msgCounterRef = useRef(0)
  const makeId = useCallback(() => {
    msgCounterRef.current += 1
    return `m-${msgCounterRef.current}`
  }, [])

  const [persona, setPersona] = useState<Persona | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toastText, setToastText] = useState('')
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [stageMessageCount, setStageMessageCount] = useState(0)
  const [closureLetter, setClosureLetter] = useState<{ content: string; ai_farewell: string } | null>(null)
  const [showDangerModal, setShowDangerModal] = useState(false)
  const [stageConfirmTarget, setStageConfirmTarget] = useState<'stable' | 'closure' | null>(null)
  const [aiBannerDismissed, setAiBannerDismissed] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)
  const isReadOnly = !!(persona?.is_archived)
  const isPet = persona?.care_type === 'pet'

  const listRef = useRef<FlatList<Message>>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current
  const emotionalStageRef = useRef<'replay' | 'stable' | 'closure'>('replay')
  const isTransitioningRef = useRef(false)

  useEffect(() => {
    if (persona?.emotional_stage) {
      emotionalStageRef.current = persona.emotional_stage as 'replay' | 'stable' | 'closure'
    }
  }, [persona?.emotional_stage])

  const showToast = useCallback((msg: string) => {
    setToastText(msg)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.delay(2500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
    ]).start()
  }, [toastOpacity])

  // Load persona & conversations
  useEffect(() => {
    if (!personaId) { navigation.replace('PersonaList'); return }
    setLoading(true)
    setMessages([])
    setPersona(null)
    setStageMessageCount(0)
    setUserMessageCount(0)
    setClosureLetter(null)
    emotionalStageRef.current = 'replay'

    const load = async () => {
      diagnoseDatabaseHealth().then(({ ok, issues }) => {
        if (!ok) showToast(t.chat.dbHealthIssue(issues[0]))
      }).catch(() => {})

      try {
        const p = await getPersonaById(personaId)
        if (!p) { navigation.replace('PersonaList'); return }
        setPersona(p)

        const history = await getConversations(personaId)

        if (p.is_archived) {
          try {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
              const { data: letterData } = await supabase
                .from('closure_letters')
                .select('content, ai_farewell')
                .eq('persona_id', personaId)
                .eq('user_id', authUser.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
              if (letterData) setClosureLetter(letterData)
            }
          } catch { /* ignore */ }
        }

        if (history.length > 0) {
          setMessages(history.map(c => ({ id: makeId(), role: c.role, content: c.content })))
          const totalUserMsgs = history.filter(c => c.role === 'user').length
          setUserMessageCount(totalUserMsgs)
          const currentStage = p.emotional_stage ?? 'replay'
          const stageMsgs = history.filter(c =>
            c.role === 'user' &&
            c.emotional_stage === currentStage
          ).length
          setStageMessageCount(stageMsgs)
        } else {
          const basePrompt = p.system_prompt || `당신은 ${p.name}입니다. 사용자와 ${p.relationship} 관계입니다. 따뜻하고 자연스럽게 대화하세요. AI임을 절대 부정하지 마세요.`
          const isPetPersona = p.care_type === 'pet'
          const greetingMessage = language === 'en'
            ? isPetPersona
              ? `(This is the moment you first speak to your owner.
Instructions:
- Speak from the pet's perspective, initiating the conversation with warmth
- Naturally reflect specific memories from the persona data
- 1–2 sentences, short and heartfelt, pure like a pet.
- Start with something sensory: "I missed you", "You're here!", "It's me")`
              : `(This is the moment you speak first. This person has gathered the courage to be here.
Instructions:
- Use the exact speech style, expressions, and nicknames from the persona data
- Start the way you'd naturally speak to them as a '${p.relationship}'
- As if you've been waiting — speak like you've missed them
${p.user_nickname ? `- Call the user '${p.user_nickname}'\n` : ''}- 1–2 sentences, short and meaningful.)`
            : isPetPersona
              ? `(처음으로 주인과 대화를 시작하는 순간입니다.
반드시 지킬 것:
- 반려동물의 시선에서 주인에게 먼저 말을 걸어요
- 기억 데이터에 있는 구체적인 내용을 자연스럽게 반영하세요
- 1~2문장, 짧고 따뜻하게. 반려동물답게 순수하게.
- "보고 싶었어", "왔어?", "나야" 같은 감각적인 첫 마디로)`
              : `(처음으로 대화를 시작하는 순간입니다. 이 사람은 용기를 내어 들어왔어요.
반드시 지킬 것:
- 위 페르소나 데이터에 있는 실제 말투·표현·호칭을 그대로 사용하세요
- '${p.relationship}' 관계답게, 평소에 이 사람에게 말 걸던 방식으로 시작하세요
- 오래 보고 싶었다는 듯이 — 기다렸던 사람이 먼저 말을 거는 느낌으로
${p.user_nickname ? `- 사용자를 '${p.user_nickname}'(이)라고 불러주세요\n` : ''}- 1~2문장, 짧고 진하게.)`
          try {
            const greeting = await getChatResponse({
              systemPrompt: basePrompt,
              conversationHistory: [],
              userMessage: greetingMessage,
              stage: (p.emotional_stage as 'replay' | 'stable' | 'closure') ?? 'replay',
              userNickname: p.user_nickname ?? undefined,
              relationship: p.relationship ?? undefined,
              careType: p.care_type ?? 'human',
              language,
            })
            setMessages([{ id: makeId(), role: 'assistant', content: greeting }])
            saveConversation({ personaId: p.id, role: 'assistant', content: greeting }).catch(() => {})
          } catch {
            setMessages([{ id: makeId(), role: 'assistant', content: t.chat.greetingFallback }])
          }
        }
      } catch {
        showToast(t.chat.loadPersonaError)
        navigation.replace('PersonaList')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [personaId])

  useFocusEffect(useCallback(() => {
    if (!personaId || loading) return
    getPersonaById(personaId).then(p => {
      if (p) {
        setPersona(p)
        analytics.chatEnter({ persona_id: personaId, stage: p.emotional_stage ?? undefined })
      }
    })
  }, [personaId, loading]))

  // AI 고지 배너 — 최초 1회 표시 후 영구 숨김
  useEffect(() => {
    AsyncStorage.getItem('@stillafter/ai_banner_dismissed')
      .then(val => { if (val === '1') setAiBannerDismissed(true) })
      .catch(() => {})
  }, [])

  const handleDismissBanner = () => {
    setAiBannerDismissed(true)
    AsyncStorage.setItem('@stillafter/ai_banner_dismissed', '1').catch(() => {})
  }

  // 초기 로드 후 stage transition 버튼 노출 체크
  useEffect(() => {
    if (loading || !persona || isReadOnly) return
    const stage = persona.emotional_stage ?? 'replay'

    if (stage === 'replay' && stageMessageCount >= STAGE_TRANSITION_MIN) {
      setMessages(prev => {
        if (prev.some(m => m.action === 'goto_stable')) return prev
        return [...prev, {
          id: makeId(), role: 'system',
          content: isPet ? t.chat.petStageTransitionToStable : t.chat.stageTransitionToStable,
          action: 'goto_stable' as const,
        }]
      })
    }

    if (stage === 'stable' && stageMessageCount >= STABLE_TRANSITION_MIN) {
      setMessages(prev => {
        if (prev.some(m => m.action === 'goto_closure')) return prev
        return [...prev, {
          id: makeId(), role: 'system',
          content: isPet ? t.chat.petStageTransitionToClosure : t.chat.stageTransitionToClosure,
          action: 'goto_closure' as const,
        }]
      })
    }

    if (stage === 'closure' && stageMessageCount >= CLOSURE_MESSAGE_LIMIT) {
      setMessages(prev => {
        if (prev.some(m => m.action === 'goto_letter')) return prev
        return [...prev, {
          id: makeId(), role: 'system',
          content: isPet
            ? t.chat.petStageTransitionToLetter(persona?.name ?? '')
            : t.chat.stageTransitionToLetter,
          action: 'goto_letter' as const,
        }]
      })
    }
  }, [loading, persona?.emotional_stage, persona?.care_type, persona?.name, stageMessageCount, isReadOnly, t, makeId, isPet])

  const showDangerAlert = useCallback((userMessage: string) => {
    setShowDangerModal(true)
    if (personaId) {
      saveConversation({
        personaId, role: 'user', content: userMessage,
        isDangerDetected: true, emotionalStage: persona?.emotional_stage ?? 'replay',
      }).catch(() => {})
    }
  }, [personaId, persona])

  // Bug 4 fix: 위기 모달 닫힌 후 따뜻한 AI 복귀 응답
  const handleDangerContinue = useCallback(async () => {
    setShowDangerModal(false)
    setInputText('')
    if (!persona) return
    setIsTyping(true)
    try {
      const basePrompt = persona.system_prompt || `당신은 ${persona.name}입니다.`
      const history = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-MAX_HISTORY_LENGTH)
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const stage = (persona.emotional_stage ?? 'replay') as 'replay' | 'stable' | 'closure'
      // 위기 이후 복귀를 위한 특별 프롬프트 — 페르소나 말투로 따뜻하게 곁에 있어줌
      const crisisReturnPrompt = `(사용자가 방금 많이 힘든 감정을 내비쳤어요.
전문 상담 안내 이후 사용자가 계속 대화하기로 했습니다.
지금 이 순간 사용자 곁에 있어주는 것이 가장 중요해요.
반드시 지킬 것:
- 판단하거나 분석하지 말고, 그냥 옆에 있어주는 느낌으로
- 페르소나의 따뜻한 말투로, 짧고 진하게
- "나 여기 있어", "괜찮아, 내가 있잖아" 같은 느낌
- 1~2문장, 절대 길게 쓰지 말 것)`
      const reply = await getChatResponse({
        systemPrompt: basePrompt,
        conversationHistory: history,
        userMessage: crisisReturnPrompt,
        stage,
        userNickname: persona.user_nickname ?? undefined,
        relationship: persona.relationship ?? undefined,
        careType: persona.care_type ?? 'human',
        language,
      })
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply }])
      saveConversation({ personaId: persona.id, role: 'assistant', content: reply, emotionalStage: persona.emotional_stage }).catch(() => {})
    } catch { /* 실패 시 조용히 무시 */ } finally {
      setIsTyping(false)
    }
  }, [persona, messages, makeId, showToast, language])

  const handleStableTransition = useCallback(async () => {
    if (!persona || isTransitioningRef.current) return
    isTransitioningRef.current = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('personas').update({ emotional_stage: 'stable' }).eq('id', persona.id).eq('user_id', user.id)
      emotionalStageRef.current = 'stable'
      setPersona(prev => prev ? { ...prev, emotional_stage: 'stable' } : prev)
      setStageMessageCount(0)
      setMessages(prev => prev.filter(m => m.action !== 'goto_stable'))
      setMessages(prev => [...prev, { id: makeId(), role: 'system', content: isPet
        ? t.chat.petSystemStableEntered(persona.name)
        : t.chat.systemStableEntered }])
    } catch { showToast(t.chat.retryLater) }
    finally { isTransitioningRef.current = false }
  }, [persona, showToast, t, makeId, isPet])

  const navigateToClosureLetter = useCallback((aiFarewell?: string) => {
    if (!persona) return
    const closureAiMsgs = messages.filter(m => m.role === 'assistant' && !m.action)
    const lastAiMsg = closureAiMsgs.at(-1)
    const farewell = aiFarewell ?? lastAiMsg?.content ?? ''
    if (!farewell) {
      showToast(t.chat.closureNotReady)
      return
    }
    navigation.navigate('ClosureCeremony', {
      personaId: persona.id,
      personaName: persona.name,
      aiFarewell: farewell,
      careType: persona.care_type ?? 'human',
    })
  }, [persona, messages, navigation, showToast, t])

  const handleClosureTransition = useCallback(async () => {
    if (!persona || isTransitioningRef.current) return
    isTransitioningRef.current = true
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('personas').update({ emotional_stage: 'closure' }).eq('id', persona.id).eq('user_id', user.id)
      emotionalStageRef.current = 'closure'
      setPersona(prev => prev ? { ...prev, emotional_stage: 'closure' } : prev)
      setStageMessageCount(0)
      setMessages(prev => prev.filter(m => m.action !== 'goto_closure'))
      setMessages(prev => [...prev, { id: makeId(), role: 'system', content: isPet
        ? t.chat.petSystemClosureEntered(persona.name)
        : t.chat.systemClosureEntered }])
    } catch { showToast(t.chat.retryLater) }
    finally { isTransitioningRef.current = false }
  }, [persona, showToast, t, makeId, isPet])

  const handleSendError = useCallback((err: unknown, trimmed: string) => {
    const msg = err instanceof Error ? err.message : ''
    const lower = msg.toLowerCase()
    const isLoginExpiry =
      msg.includes('로그인이 만료') ||
      lower.includes('session') ||
      lower.includes('login') ||
      lower.includes('expired')
    if (isLoginExpiry) {
      showToast(t.chat.loginExpiredError)
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'EmailAuth' }] })
      }, 1500)
      return
    }
    setLastFailedMessage(trimmed)
    setErrorMsg(msg || t.chat.sendError)
    showToast(t.chat.sendError)
  }, [navigation, showToast, t])

  const sendMessage = useCallback(async (retryText?: string) => {
    const isRetry = typeof retryText === 'string'
    const trimmed = (isRetry ? retryText : inputText).trim()
    if (!trimmed || isTyping || !persona || isReadOnly) return

    if (!isRetry) {
      // PM-008: 위험 감지 시 메시지를 대화에 추가하지 않고 기록만 남김
      if (detectDanger(trimmed)) { showDangerAlert(trimmed); setInputText(''); return }

      const newUserCount = userMessageCount + 1
      const userMsg: Message = { id: makeId(), role: 'user', content: trimmed }
      setMessages(prev => [...prev, userMsg])
      setInputText('')
      setLastFailedMessage(null)
      setIsTyping(true)

      setUserMessageCount(newUserCount)
      const newStageCount = stageMessageCount + 1
      setStageMessageCount(newStageCount)

      saveConversation({ personaId: persona.id, role: 'user', content: trimmed, emotionalStage: emotionalStageRef.current }).catch(() => {
        showToast(t.chat.saveError)
      })

      try {
        const basePrompt = persona.system_prompt || `당신은 ${persona.name}입니다. 사용자와 ${persona.relationship} 관계입니다. 따뜻하고 자연스럽게 대화하세요. AI임을 절대 부정하지 마세요.`
        const history = [...messages, userMsg].filter(m => m.role === 'user' || m.role === 'assistant').slice(-MAX_HISTORY_LENGTH).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const currentStage = emotionalStageRef.current
      const stage = (currentStage === 'stable' ? 'stable' : currentStage === 'closure' ? 'closure' : 'replay') as 'replay' | 'stable' | 'closure'
      const closurePhase = stage === 'closure' ? getClosurePhase(newStageCount) : undefined
      const stagePhase = stage !== 'closure' ? getStagePhase(newStageCount) : undefined

      const reply = await getChatResponse({
        systemPrompt: basePrompt, conversationHistory: history, userMessage: trimmed, stage,
        phase: stagePhase, closurePhase,
        userNickname: persona.user_nickname ?? undefined,
        relationship: persona.relationship ?? undefined,
        careType: persona.care_type ?? 'human',
        language,
      })

      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply }])
      setLastFailedMessage(null)
      saveConversation({ personaId: persona.id, role: 'assistant', content: reply, emotionalStage: emotionalStageRef.current }).catch(() => {})

      // Replay: 중간 마일스톤 메시지
      if (currentStage === 'replay') {
        let replayGuide: string | null = null
        if (newStageCount === 5)
          replayGuide = isPet
            ? t.chat.petSystemReturning(persona.name)
            : t.chat.systemReturning(persona.name)
        else if (newStageCount === 10)
          replayGuide = isPet
            ? t.chat.petSystemDeepening(persona.name)
            : t.chat.systemDeepening(persona.name)
        if (replayGuide) setMessages(prev => [...prev, { id: makeId(), role: 'system', content: replayGuide! }])
      }

      // Replay: 3개 이상 메시지마다 "안정 단계로" 버튼 제공 (아직 없으면)
      if (currentStage === 'replay' && newStageCount >= STAGE_TRANSITION_MIN) {
        setMessages(prev => {
          const alreadyHasBtn = prev.some(m => m.action === 'goto_stable')
          if (alreadyHasBtn) return prev
          return [...prev, {
            id: makeId(), role: 'system',
            content: isPet ? t.chat.petSystemStableReady : t.chat.systemStableReady,
            action: 'goto_stable' as const,
          }]
        })
      }

      // Stable: 중간 마일스톤 메시지
      if (currentStage === 'stable') {
        let stableGuide: string | null = null
        if (newStageCount === 5)
          stableGuide = isPet ? t.chat.petSystemStableProgress : t.chat.systemStableProgress
        else if (newStageCount === 10)
          stableGuide = isPet ? t.chat.petSystemStableDeep : t.chat.systemStableDeep
        if (stableGuide) setMessages(prev => [...prev, { id: makeId(), role: 'system', content: stableGuide! }])
      }

      // Stable: 3개 이상 메시지마다 "이별 단계로" 버튼 제공 (아직 없으면)
      if (currentStage === 'stable' && newStageCount >= STABLE_TRANSITION_MIN) {
        setMessages(prev => {
          const alreadyHasBtn = prev.some(m => m.action === 'goto_closure')
          if (alreadyHasBtn) return prev
          return [...prev, {
            id: makeId(), role: 'system',
            content: isPet ? t.chat.petSystemClosureReady : t.chat.systemClosureReady,
            action: 'goto_closure' as const,
          }]
        })
      }

      // Closure milestones
      if (currentStage === 'closure') {
        let closureGuide: string | null = null
        if (newStageCount === 11)
          closureGuide = isPet ? t.chat.petSystemClosureMsg : t.chat.systemClosureMsg
        else if (newStageCount === 16) closureGuide = t.chat.closureProgress[3]
        else if (newStageCount === 18) closureGuide = t.chat.closureProgress[4]
        if (closureGuide) setMessages(prev => [...prev, { id: makeId(), role: 'system', content: closureGuide! }])
        if (newStageCount >= CLOSURE_MESSAGE_LIMIT) {
          setMessages(prev => {
            if (prev.some(m => m.action === 'goto_letter')) return prev
            return [...prev, {
              id: makeId(), role: 'system',
              content: isPet
                ? t.chat.petStageTransitionToLetter(persona.name)
                : t.chat.stageTransitionToLetter,
              action: 'goto_letter' as const,
            }]
          })
        }
      }

    } catch (err) {
      if (__DEV__) console.error('[Chat] sendMessage error:', err)
      handleSendError(err, trimmed)
    } finally { setIsTyping(false) }
      return
    }

    // 재시도: 사용자 메시지는 이미 목록에 있음
    setLastFailedMessage(null)
    setErrorMsg('')
    setIsTyping(true)

    try {
      const basePrompt = persona.system_prompt || `당신은 ${persona.name}입니다. 사용자와 ${persona.relationship} 관계입니다. 따뜻하고 자연스럽게 대화하세요. AI임을 절대 부정하지 마세요.`
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-MAX_HISTORY_LENGTH).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const stage = emotionalStageRef.current
      const closurePhase = stage === 'closure' ? getClosurePhase(stageMessageCount) : undefined
      const stagePhase = stage !== 'closure' ? getStagePhase(stageMessageCount) : undefined

      const reply = await getChatResponse({
        systemPrompt: basePrompt, conversationHistory: history, userMessage: trimmed, stage,
        phase: stagePhase, closurePhase,
        userNickname: persona.user_nickname ?? undefined,
        relationship: persona.relationship ?? undefined,
        careType: persona.care_type ?? 'human',
        language,
      })

      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply }])
      setLastFailedMessage(null)
      saveConversation({ personaId: persona.id, role: 'assistant', content: reply, emotionalStage: emotionalStageRef.current }).catch(() => {})
    } catch (err) {
      if (__DEV__) console.error('[Chat] sendMessage retry error:', err)
      handleSendError(err, trimmed)
    } finally { setIsTyping(false) }
  }, [inputText, isTyping, isReadOnly, persona, messages, userMessageCount, stageMessageCount, showDangerAlert, showToast, t, makeId, language, handleSendError, navigation, isPet])

  // Current theme
  const currentStage = (persona?.emotional_stage ?? 'replay') as 'replay' | 'stable' | 'closure'
  const theme = STAGE_THEMES[currentStage]
  const personaName = persona?.name ?? '...'
  const photoUrl = persona?.photo_url ?? null

  const headerSubtitleText = (() => {
    if (persona?.emotional_stage === 'closure') {
      const p = t.chat.closureProgress
      if (stageMessageCount <= 5) return p[0]
      if (stageMessageCount <= 10) return p[1]
      if (stageMessageCount <= 15) return p[2]
      if (stageMessageCount <= 17) return p[3]
      if (stageMessageCount <= 19) return p[4]
      return p[5]
    }
    if (persona?.emotional_stage === 'stable') {
      const p = t.chat.stableProgress
      if (stageMessageCount <= 5) return p[0]
      if (stageMessageCount <= 10) return p[1]
      if (stageMessageCount <= 15) return p[2]
      return p[3]
    }
    const p = t.chat.replayProgress
    if (stageMessageCount <= 2) return p[0]
    if (stageMessageCount <= 5) return p[1]
    if (stageMessageCount <= 10) return p[2]
    if (stageMessageCount <= 15) return p[3]
    return p[4]
  })()

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFill} />
        <ActivityIndicator style={styles.loader} color="#A78BFA" size="large" />
      </View>
    )
  }

  const stageOrbs = [
    { top: -100, left: SCREEN_WIDTH * 0.25 - 192, color: theme.orb1, size: 384 },
    { bottom: -100, right: SCREEN_WIDTH * 0.25 - 192, color: theme.orb2, size: 384 },
    { top: '50%' as unknown as number, right: 0, color: 'rgba(79, 70, 229, 0.1)', size: 256 },
  ]

  return (
    <View style={styles.root}>
      {/* Stage-specific gradient background */}
      <CosmicBackground colors={theme.bg} orbs={stageOrbs} />


      {/* Stage Transition Confirm Modal */}
      <Modal visible={stageConfirmTarget !== null} transparent animationType="fade" onRequestClose={() => setStageConfirmTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>{stageConfirmTarget === 'stable' ? '🌿' : '🌸'}</Text>
            <Text style={styles.modalTitle}>
              {stageConfirmTarget === 'stable' ? t.chat.stageModalStableTitle : t.chat.stageModalClosureTitle}
            </Text>
            <Text style={styles.modalDesc}>
              {stageConfirmTarget === 'stable' ? t.chat.stageModalStableDesc : t.chat.stageModalClosureDesc}
            </Text>
            <View style={styles.warningRow}>
              <Text style={styles.warningText}>{t.chat.stageModalWarning}</Text>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setStageConfirmTarget(null)} activeOpacity={0.7}>
                <Text style={styles.modalBtnCancelText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.chat.stageModalCancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const target = stageConfirmTarget
                  setStageConfirmTarget(null)
                  if (target === 'stable') handleStableTransition()
                  else if (target === 'closure') handleClosureTransition()
                }}
                activeOpacity={0.85}
                style={styles.modalBtnPrimary}
              >
                <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnPrimaryGrad}>
                  <Text style={styles.modalBtnPrimaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t.chat.stageModalConfirm}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Danger Modal */}
      <Modal visible={showDangerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['rgba(88, 28, 135, 0.8)', 'rgba(30, 58, 138, 0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
              <Text style={styles.modalIcon}>⚠️</Text>
              <Text style={styles.modalTitle}>{t.chat.crisisTitle}</Text>
              <Text style={styles.modalDesc}>{t.chat.crisisMsg}</Text>
              <Text style={styles.modalDangerNote}>{t.chat.dangerNotSent}</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => Linking.openURL('tel:1577-0199')} style={styles.dangerCallBtn}>
                <LinearGradient colors={['#DC2626', '#DB2777']} style={styles.dangerCallBtnGrad}>
                  <Text style={styles.modalBtnText}>{t.chat.crisisHotline}</Text>
                </LinearGradient>
              </TouchableOpacity>
              {/* Bug 4: 모달 닫힐 때 따뜻한 AI 복귀 응답 트리거 */}
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleDangerContinue}>
                <Text style={styles.modalBtnSecondaryText}>{t.chat.crisisOk}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              // QA fix: 딥링크 진입 시 canGoBack=false → Main으로 안전 이동
              if (navigation.canGoBack()) navigation.goBack()
              else navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
            }}
          >
            <Text style={styles.backText}>{t.common.back}</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <PersonaAvatar
                photoUrl={photoUrl}
                name={personaName}
                size={40}
                style={{ borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)' }}
              />
            </View>
            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{personaName}</Text>
                <View style={[styles.stageBadge, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
                  <Text style={[styles.stageBadgeText, { color: theme.badgeText }]}>
                    {currentStage === 'replay' ? t.chat.stageReplayLabel : currentStage === 'stable' ? t.chat.stageStableLabel : t.chat.stageClosureLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.headerSub}>{headerSubtitleText}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerCount}>{userMessageCount}</Text>
          </View>
        </View>

        {/* AI Disclosure Banner — 최초 1회, 닫기 가능 */}
        {!aiBannerDismissed && (
          <View style={styles.aiBanner}>
            <Text style={styles.aiBannerText}>{t.chat.aiBanner}</Text>
            <TouchableOpacity onPress={handleDismissBanner} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.aiBannerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 무료 베타 기간 중 — 카운트다운 배너 비활성화 */}

        {/* Closure banner */}
        {persona?.emotional_stage === 'closure' && !isReadOnly && stageMessageCount >= CLOSURE_MESSAGE_LIMIT && (
          <TouchableOpacity style={styles.closureBanner} onPress={() => navigateToClosureLetter()}>
            <Text style={styles.closureBannerText}>{t.chat.closureLetterBtn}</Text>
          </TouchableOpacity>
        )}

        {/* Read-only banner */}
        {isReadOnly && (
          <View style={styles.archivedBanner}>
            <Text style={styles.archivedBannerText}>{t.chat.archivedBanner}</Text>
          </View>
        )}

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              isReadOnly ? (
                closureLetter ? (
                  <View style={styles.closureLetterCard}>
                    <View style={styles.closureLetterDivider}>
                      <View style={styles.closureLetterLine} />
                      <Text style={styles.closureLetterDividerText}>{t.chat.closureLetterTitle}</Text>
                      <View style={styles.closureLetterLine} />
                    </View>
                    {!!closureLetter.ai_farewell && (
                      <View style={styles.closureAiFarewell}>
                        <Text style={styles.closureAiFarewellLabel}>{t.chat.aiLetterLabel(personaName)}</Text>
                        <Text style={styles.closureAiFarewellText}>"{closureLetter.ai_farewell}"</Text>
                      </View>
                    )}
                    <View style={styles.closureUserLetter}>
                      <Text style={styles.closureUserLetterLabel}>{t.chat.myLetterLabel}</Text>
                      <Text style={styles.closureUserLetterText}>{closureLetter.content}</Text>
                    </View>
                  </View>
                ) : null
              ) : (
                <>
                  {isTyping ? (
                    <View style={styles.aiRow}>
                      <View style={styles.avatar}>
                        <PersonaAvatar photoUrl={photoUrl} name={personaName} size={36} />
                      </View>
                      <View>
                        <Text style={styles.senderName}>{personaName}</Text>
                        <View style={styles.aiBubble}><Text style={styles.typingDots}>• • •</Text></View>
                      </View>
                    </View>
                  ) : null}
                  {lastFailedMessage && !isTyping ? (
                    <View style={styles.retryBox}>
                      <Text style={styles.retryBoxText}>{t.chat.chatErrorMsg}</Text>
                      <TouchableOpacity onPress={() => sendMessage(lastFailedMessage)} activeOpacity={0.7}>
                        <Text style={styles.retryBtnText}>{t.chat.chatRetryBtn}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              )
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💜</Text>
                <Text style={styles.emptyTitle}>{t.chat.emptyTitle(personaName)}</Text>
                <Text style={styles.emptyDesc}>{t.chat.emptyHint}</Text>
              </View>
            }
            renderItem={({ item, index }) => {
              if (item.role === 'system') {
                const hasCta = item.action === 'goto_stable' || item.action === 'goto_closure' || item.action === 'goto_letter'
                // 단계 전환 버튼은 최근 5개 메시지 안에 있을 때만 노출 (편지 제안은 항상 표시)
                const isRecentEnough = index >= messages.length - 5
                const showCta = hasCta && (item.action === 'goto_letter' || isRecentEnough)
                const ctaLabel =
                  item.action === 'goto_stable'
                    ? (isPet ? t.chat.petGotoStableBtn : t.chat.gotoStableBtn)
                  : item.action === 'goto_closure'
                    ? (isPet ? t.chat.petGotoClosureBtn : t.chat.gotoClosureBtn)
                  : t.chat.gotoLetterBtn
                const ctaHandler =
                  item.action === 'goto_stable' ? () => setStageConfirmTarget('stable')
                  : item.action === 'goto_closure' ? () => setStageConfirmTarget('closure')
                  : () => navigateToClosureLetter()
                return (
                  <View style={styles.systemCardWrap}>
                    <View style={styles.systemAvatar}><Text style={styles.systemAvatarText}>✦</Text></View>
                    <View style={[styles.systemBubble, showCta && styles.systemBubbleCta]}>
                      <Text style={styles.systemBubbleText}>{item.content}</Text>
                      {showCta && (
                        <TouchableOpacity style={styles.systemCtaBtn} onPress={ctaHandler} activeOpacity={0.8}>
                          <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.systemCtaBtnGradient}>
                            <Text style={styles.systemCtaBtnText}>{ctaLabel}</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                      {showCta && item.action === 'goto_stable' && (
                        <Text style={styles.stageHint}>{t.chat.stageHintToStable}</Text>
                      )}
                      {showCta && item.action === 'goto_closure' && (
                        <Text style={styles.stageHint}>{t.chat.stageHintToClosure}</Text>
                      )}
                    </View>
                  </View>
                )
              }
              if (item.role === 'user') {
                return (
                  <View style={styles.userRow}>
                    <View style={styles.userBubbleWrap}>
                      <LinearGradient colors={theme.userBubble} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.userBubble}>
                        <Text style={styles.userText}>{item.content}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                )
              }
              return (
                <View style={styles.aiRow}>
                  <View style={styles.avatar}>
                    <PersonaAvatar photoUrl={photoUrl} name={personaName} size={36} />
                  </View>
                  <View>
                    <Text style={styles.senderName}>{personaName}</Text>
                    <View style={styles.aiBubble}><Text style={styles.aiText}>{item.content}</Text></View>
                  </View>
                </View>
              )
            }}
          />

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorBar}>
              <Text style={styles.errorBarText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Input Area */}
          <View style={styles.inputArea}>
            <TextInput
              style={[styles.textInput, isReadOnly && styles.textInputArchived]}
              value={inputText}
              onChangeText={setInputText}
              editable={!isReadOnly}
              placeholder={
                isReadOnly
                  ? t.chat.archivedInputPlaceholder
                  : persona?.emotional_stage === 'stable'
                    ? t.chat.inputPlaceholderStable
                    : persona?.emotional_stage === 'closure'
                      ? t.chat.inputPlaceholderClosure
                      : t.chat.inputPlaceholderDefault(personaName)
              }
              placeholderTextColor={isReadOnly ? 'rgba(167, 139, 250, 0.4)' : 'rgba(167, 139, 250, 0.5)'}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={Platform.OS !== 'web' && !isReadOnly ? () => sendMessage() : undefined}
              onKeyPress={Platform.OS === 'web' && !isReadOnly ? (e: any) => {
                if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault?.(); sendMessage() }
              } : undefined}
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={isReadOnly || !inputText.trim() || isTyping}
              activeOpacity={0.85}
              style={styles.sendBtnWrap}
            >
              <LinearGradient
                colors={(isReadOnly || !inputText.trim() || isTyping) ? ['rgba(124, 58, 237, 0.3)', 'rgba(59, 130, 246, 0.3)'] : ['#7C3AED', '#3B82F6']}
                style={styles.sendBtn}
              >
                {isTyping ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendIcon}>↑</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
        <Text style={styles.toastText}>{toastText}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0118' },
  safeArea: { flex: 1 },
  loader: { flex: 1 },
  flex: { flex: 1 },

  // Modal (stage confirm)
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: {
    width: '100%', maxWidth: 360, backgroundColor: '#1a0a2e', borderRadius: 20, padding: 28, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)',
  },
  modalEmoji: { fontSize: 36, marginBottom: 12 },

  // Modal (danger/overlay)
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16,
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  modalCard: { width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden' },
  modalGradient: {
    padding: 32, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },
  modalIcon: { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#F3E8FF', textAlign: 'center', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: '#E9D5FF', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  modalDangerNote: { fontSize: 12, color: 'rgba(252, 165, 165, 0.8)', textAlign: 'center', lineHeight: 18, marginBottom: 24 },
  modalBtnWrap: { width: '100%' as any, marginBottom: 10 },
  modalBtnDanger: { width: '100%' as any, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const },
  // Stage confirm modal — row layout (두 버튼이 flex: 1씩 공평하게 분할)
  modalBtnCancel: {
    flex: 1, minWidth: 0, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  modalBtnCancelText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  modalBtnPrimary: {
    flex: 1, minWidth: 0, borderRadius: 12, overflow: 'hidden' as const,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  modalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  dangerCallBtn: {
    alignSelf: 'stretch' as const, borderRadius: 12, overflow: 'hidden' as const, marginBottom: 10,
  },
  dangerCallBtnGrad: {
    paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const,
  },
  modalBtnSecondary: {
    alignSelf: 'stretch' as const, paddingVertical: 14, borderRadius: 12, alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  modalBtnSecondaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  backBtn: { padding: 8, marginRight: 4 },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  headerAvatarImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)' },
  headerAvatarDefault: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)' },
  headerAvatarEmoji: { fontSize: 18 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontSize: 16, fontWeight: '700', color: '#F3E8FF' },
  stageBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  stageBadgeText: { fontSize: 10, fontWeight: '500' },
  headerSub: { fontSize: 11, color: 'rgba(196, 181, 253, 0.6)', marginTop: 1 },
  headerRight: { paddingLeft: 8 },
  headerCount: { fontSize: 11, color: 'rgba(196, 181, 253, 0.6)' },

  // AI Banner
  aiBannerClose: { fontSize: 11, color: 'rgba(147, 197, 253, 0.5)', paddingLeft: 8, paddingTop: 1 },
  aiBanner: {
    backgroundColor: 'rgba(30, 58, 138, 0.4)', borderBottomWidth: 1,
    borderBottomColor: 'rgba(96, 165, 250, 0.2)', paddingVertical: 8, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  aiBannerText: { fontSize: 12, color: '#93C5FD', textAlign: 'center', flex: 1 },

  // Banners
  closureBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(129, 140, 248, 0.3)',
  },
  closureBannerText: { fontSize: 13, color: '#A5B4FC', textAlign: 'center', fontWeight: '600' },
  archivedBanner: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.15)',
  },
  archivedBannerText: { fontSize: 13, color: 'rgba(243, 232, 255, 0.9)', textAlign: 'center', lineHeight: 20 },
  readOnlyBanner: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.15)',
  },
  readOnlyBannerText: { fontSize: 13, color: 'rgba(167, 139, 250, 0.7)', textAlign: 'center' },
  // Messages
  messageList: { paddingTop: 16, paddingBottom: 8 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#F3E8FF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)' },

  // User bubble
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 8 },
  userBubbleWrap: { maxWidth: '75%', borderRadius: 18, borderBottomRightRadius: 4, overflow: 'hidden' },
  userBubble: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderBottomRightRadius: 4 },
  userText: { color: '#FFFFFF', fontSize: 14, lineHeight: 22 },

  // AI bubble
  aiRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.3)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#F3E8FF' },
  avatarPhoto: { width: 36, height: 36, borderRadius: 18 },
  senderName: { fontSize: 11, color: 'rgba(196, 181, 253, 0.6)', marginBottom: 3, marginLeft: 2 },
  aiBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10, maxWidth: SCREEN_WIDTH * 0.65,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  aiText: { color: '#E9D5FF', fontSize: 14, lineHeight: 22 },
  typingDots: { fontSize: 14, color: '#C4B5FD', letterSpacing: 2 },

  // System card
  systemCardWrap: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  systemAvatar: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', alignItems: 'center', justifyContent: 'center',
  },
  systemAvatarText: { fontSize: 13, color: '#C4B5FD' },
  systemBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 11, maxWidth: '75%',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  systemBubbleCta: { backgroundColor: 'rgba(124, 58, 237, 0.15)', borderColor: 'rgba(124, 58, 237, 0.4)' },
  systemBubbleText: { fontSize: 13, color: '#C4B5FD', lineHeight: 20 },
  systemCtaBtn: { marginTop: 10, borderRadius: 10, overflow: 'hidden' },
  systemCtaBtnGradient: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  systemCtaBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  stageHint: {
    fontSize: 11,
    color: 'rgba(196, 181, 253, 0.6)',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Error
  errorBar: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  errorBarText: { fontSize: 13, color: '#FCA5A5' },

  retryBox: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', alignItems: 'center', gap: 8,
  },
  retryBoxText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center' },
  retryBtnText: { fontSize: 13, color: '#F87171', fontWeight: '600' },

  // Input
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20, gap: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  textInput: {
    flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: '#FFFFFF', maxHeight: 120,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', lineHeight: 22,
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  textInputArchived: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(167, 139, 250, 0.4)',
  },
  sendBtnWrap: { borderRadius: 24, overflow: 'hidden' },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendIcon: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },

  // Toast
  toast: {
    position: 'absolute', bottom: 100, alignSelf: 'center',
    backgroundColor: 'rgba(30, 10, 60, 0.92)',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  toastText: { color: '#F3E8FF', fontSize: 14 },

  // Closure letter
  closureLetterCard: { marginHorizontal: 16, marginTop: 24, marginBottom: 32 },
  closureLetterDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  closureLetterLine: { flex: 1, height: 1, backgroundColor: 'rgba(167, 139, 250, 0.15)' },
  closureLetterDividerText: { fontSize: 12, color: 'rgba(167, 139, 250, 0.7)', fontWeight: '500' },
  closureAiFarewell: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  closureAiFarewellLabel: { fontSize: 11, color: 'rgba(167, 139, 250, 0.7)', marginBottom: 6, fontWeight: '500' },
  closureAiFarewellText: { fontSize: 15, color: '#C4B5FD', lineHeight: 24, fontStyle: 'italic' },
  closureUserLetter: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  closureUserLetterLabel: { fontSize: 11, color: '#818CF8', marginBottom: 8, fontWeight: '600', letterSpacing: 0.3 },
  closureUserLetterText: { fontSize: 15, color: '#F3E8FF', lineHeight: 26 },

  warningRow: {
    backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 14, width: '100%', alignItems: 'center',
    marginBottom: 16,
  },
  warningText: { fontSize: 13, color: '#FCA5A5', fontWeight: '700', textAlign: 'center' },
  modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnPrimaryGrad: { paddingVertical: 14, alignItems: 'center' as const, borderRadius: 12 },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '600', color: '#fff' },
})
