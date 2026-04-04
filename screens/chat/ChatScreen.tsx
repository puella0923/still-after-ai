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
  Image,
  Modal,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { getPersonaById, getConversations, saveConversation, diagnoseDatabaseHealth, Persona } from '../../services/personaService'
import { getChatResponse, detectDanger, ClosurePhase } from '../../services/openaiService'
import { supabase } from '../../services/supabase'
import { C, RADIUS } from '../theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const FREE_MESSAGE_LIMIT = 10
const STAGE_TRANSITION_THRESHOLD = 20

// 테스트/개발 계정은 Paywall 우회 (무제한 대화)
const TEST_EMAILS = ['dev@stillafter.com', 'test@stillafter.com', 'stillafter.test@gmail.com']
const isTestAccount = (email?: string | null) => !!email && TEST_EMAILS.includes(email.toLowerCase())
const CLOSURE_MESSAGE_LIMIT = 20

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
function getReplayProgressMessage(count: number): string | null {
  const remaining = STAGE_TRANSITION_THRESHOLD - count
  if (remaining > 10) return null
  if (count <= 5) return '그때처럼, 이야기를 시작해보세요'
  if (count <= 10) return '익숙했던 대화를 이어가고 있어요'
  if (count <= 15) return '그 사람과 함께 있는 시간입니다'
  return '이 대화는 점점 깊어지고 있어요'
}
function getStableProgressMessage(count: number): string | null {
  if (count <= 5) return '이제, 당신의 이야기를 해도 괜찮아요'
  if (count <= 10) return '지금 느끼는 감정을 말해도 괜찮아요'
  if (count <= 15) return '당신의 마음을 조금씩 이해하고 있어요'
  return '이제, 천천히 준비하고 있어요'
}
function getClosureProgressMessage(count: number): string {
  if (count <= 5) return '이제, 마지막 이야기를 나눌 시간이에요'
  if (count <= 10) return '함께했던 시간들을, 천천히 떠올려볼까요?'
  if (count <= 15) return '전하고 싶었던 말을, 지금 해도 괜찮아요'
  if (count <= 17) return '이제, 마지막 이야기를 나눌 시간이 가까워졌어요'
  if (count <= 19) return '조금씩, 준비가 되어가고 있어요'
  return '전하고 싶은 말을, 지금 남겨도 괜찮아요'
}

// Stage-specific themes
const STAGE_THEMES = {
  replay: {
    bg: ['#1a0118', '#200a2e', '#0f0520'] as [string, string, string],
    orb1: 'rgba(219, 39, 119, 0.25)',
    orb2: 'rgba(168, 85, 247, 0.2)',
    userBubble: ['rgba(219, 39, 119, 0.8)', 'rgba(168, 85, 247, 0.8)'] as [string, string],
    badgeBorder: 'rgba(236, 72, 153, 0.5)',
    badgeText: '#F9A8D4',
    badgeBg: 'rgba(236, 72, 153, 0.1)',
    label: '재연',
  },
  stable: {
    bg: ['#010d1a', '#0a1a3e', '#050f20'] as [string, string, string],
    orb1: 'rgba(37, 99, 235, 0.25)',
    orb2: 'rgba(6, 182, 212, 0.2)',
    userBubble: ['rgba(37, 99, 235, 0.8)', 'rgba(6, 182, 212, 0.8)'] as [string, string],
    badgeBorder: 'rgba(96, 165, 250, 0.5)',
    badgeText: '#93C5FD',
    badgeBg: 'rgba(59, 130, 246, 0.1)',
    label: '안정',
  },
  closure: {
    bg: ['#05010f', '#0f0a3e', '#080520'] as [string, string, string],
    orb1: 'rgba(99, 102, 241, 0.25)',
    orb2: 'rgba(88, 28, 135, 0.3)',
    userBubble: ['rgba(99, 102, 241, 0.8)', 'rgba(168, 85, 247, 0.8)'] as [string, string],
    badgeBorder: 'rgba(129, 140, 248, 0.5)',
    badgeText: '#A5B4FC',
    badgeBg: 'rgba(99, 102, 241, 0.1)',
    label: '이별',
  },
}

// Stars
const STARS = Array.from({ length: 25 }, (_, i) => ({
  left: ((i * 97 + 31) % 100),
  top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5,
  opacity: 0.12 + (i % 5) * 0.08,
}))

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>
  route: RouteProp<RootStackParamList, 'Chat'>
}
type Message = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  action?: 'goto_closure'
}

let msgCounter = 0
function makeId() { msgCounter += 1; return `m-${msgCounter}` }

export default function ChatScreen({ navigation, route }: Props) {
  const personaId = route.params?.personaId

  const [persona, setPersona] = useState<Persona | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toastText, setToastText] = useState('')
  const [userMessageCount, setUserMessageCount] = useState(0)
  const [stageMessageCount, setStageMessageCount] = useState(0)
  const [freeUsageCount, setFreeUsageCount] = useState<number | null>(null)
  const [isPaidUser, setIsPaidUser] = useState(false)
  const [closureLetter, setClosureLetter] = useState<{ content: string; ai_farewell: string } | null>(null)
  const [showDangerModal, setShowDangerModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const isReadOnly = !!(persona?.is_archived)

  const listRef = useRef<FlatList<Message>>(null)
  const toastOpacity = useRef(new Animated.Value(0)).current

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
    const load = async () => {
      diagnoseDatabaseHealth().then(({ ok, issues }) => {
        if (!ok) showToast(`DB 문제: ${issues[0]}`)
      }).catch(() => {})

      try {
        const p = await getPersonaById(personaId)
        if (!p) { navigation.replace('PersonaList'); return }
        setPersona(p)

        const history = await getConversations(personaId)

        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            const { data: usage } = await supabase
              .from('user_usage')
              .select('message_count, is_paid')
              .eq('user_id', authUser.id)
              .eq('persona_id', personaId)
              .single()
            if (usage) {
              const paid = usage.is_paid ?? false
              setFreeUsageCount(usage.message_count ?? 0)
              setIsPaidUser(paid || isTestAccount(authUser.email))
            } else {
              setFreeUsageCount(0)
              setIsPaidUser(isTestAccount(authUser.email))
            }
          }
        } catch { /* ignore */ }

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
          const stageMsgs = history.filter(c => c.role === 'user' && c.emotional_stage === currentStage).length
          setStageMessageCount(stageMsgs)
        } else {
          const basePrompt = p.system_prompt || `당신은 ${p.name}입니다. 사용자와 ${p.relationship} 관계입니다. 따뜻하고 자연스럽게 대화하세요. AI임을 절대 부정하지 마세요.`
          try {
            const greeting = await getChatResponse({
              systemPrompt: basePrompt, conversationHistory: [], userMessage: `(사용자가 처음 대화를 시작했습니다. ${p.relationship}로서 먼저 따뜻하게 인사해주세요. 2-3문장으로 짧게.)`,
              stage: (p.emotional_stage as 'replay' | 'stable' | 'closure') ?? 'replay',
              userNickname: p.user_nickname ?? undefined,
            })
            setMessages([{ id: makeId(), role: 'assistant', content: greeting }])
            saveConversation({ personaId: p.id, role: 'assistant', content: greeting }).catch(() => {})
          } catch {
            setMessages([{ id: makeId(), role: 'assistant', content: `안녕, 나야 ${p.name}. 보고 싶었어.` }])
          }
        }
      } catch {
        showToast('페르소나를 불러올 수 없어요')
        navigation.replace('PersonaList')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [personaId])

  const showDangerAlert = useCallback((userMessage: string) => {
    setShowDangerModal(true)
    if (personaId) {
      saveConversation({
        personaId, role: 'user', content: userMessage,
        isDangerDetected: true, emotionalStage: persona?.emotional_stage ?? 'replay',
      }).catch(() => {})
    }
  }, [personaId, persona])

  const handleClosureTransition = useCallback(async () => {
    if (!persona) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('personas').update({ emotional_stage: 'closure' }).eq('id', persona.id).eq('user_id', user.id)
      setPersona(prev => prev ? { ...prev, emotional_stage: 'closure' } : prev)
      setStageMessageCount(0)
      setMessages(prev => [...prev, { id: makeId(), role: 'system', content: '이제, 마지막 이야기를 나눌 시간이에요\n\n서두르지 않아도 돼요.\n하고 싶은 말만 꺼내도 괜찮아요.' }])
    } catch { showToast('잠시 후 다시 시도해주세요.') }
  }, [persona, showToast])

  const sendMessage = useCallback(async () => {
    const trimmed = inputText.trim()
    if (!trimmed || isTyping || !persona) return

    if (detectDanger(trimmed)) { showDangerAlert(trimmed); setInputText(''); return }

    const userMsg: Message = { id: makeId(), role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsTyping(true)

    const newUserCount = userMessageCount + 1
    setUserMessageCount(newUserCount)
    const newStageCount = stageMessageCount + 1
    setStageMessageCount(newStageCount)

    saveConversation({ personaId: persona.id, role: 'user', content: trimmed, emotionalStage: persona.emotional_stage }).catch(err => {
      showToast('⚠️ 대화 저장 실패')
    })

    try {
      const basePrompt = persona.system_prompt || `당신은 ${persona.name}입니다. 사용자와 ${persona.relationship} 관계입니다. 따뜻하고 자연스럽게 대화하세요. AI임을 절대 부정하지 마세요.`
      const MAX_HISTORY = 20
      const history = messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-MAX_HISTORY).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const stage = (persona.emotional_stage === 'stable' ? 'stable' : persona.emotional_stage === 'closure' ? 'closure' : 'replay') as 'replay' | 'stable' | 'closure'
      const closurePhase = stage === 'closure' ? getClosurePhase(newStageCount) : undefined
      const stagePhase = stage !== 'closure' ? getStagePhase(newStageCount) : undefined

      const reply = await getChatResponse({
        systemPrompt: basePrompt, conversationHistory: history, userMessage: trimmed, stage,
        phase: stagePhase, closurePhase, userNickname: persona.user_nickname ?? undefined,
      })

      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: reply }])
      saveConversation({ personaId: persona.id, role: 'assistant', content: reply, emotionalStage: persona.emotional_stage }).catch(() => {})

      // Milestone cards
      if (persona.emotional_stage === 'replay' && newStageCount < STAGE_TRANSITION_THRESHOLD) {
        const milestoneContent: Record<number, string> = { 5: '그때처럼, 자연스럽게 이어가고 있어요', 10: '익숙한 대화를 이어가고 있어요', 15: '이 대화는 점점 깊어지고 있어요', 18: '조금 더 있으면, 감정을 정리하는 시간이 다가올 거예요' }
        if (milestoneContent[newStageCount]) setMessages(prev => [...prev, { id: makeId(), role: 'system', content: milestoneContent[newStageCount] }])
      }

      // Auto stage transition: replay → stable
      if (persona.emotional_stage === 'replay' && newStageCount >= STAGE_TRANSITION_THRESHOLD) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase.from('personas').update({ emotional_stage: 'stable' }).eq('id', persona.id).eq('user_id', user.id)
            setPersona(prev => prev ? { ...prev, emotional_stage: 'stable' } : prev)
            setStageMessageCount(0)
            setMessages(prev => [...prev, { id: makeId(), role: 'system', content: '🌙 안정 단계로 접어들었어요\n\n이제, 당신의 이야기를 해도 괜찮아요.\n있는 그대로의 마음을 꺼내보세요.' }])
          }
        } catch { /* ignore */ }
      }

      // Stable milestones
      if (persona.emotional_stage === 'stable') {
        type SM = { content: string; action?: 'goto_closure' }
        const stableMilestones: Record<number, SM> = { 5: { content: '이제, 당신의 이야기를 해도 괜찮아요' }, 10: { content: '지금 느끼는 감정을 말해도 괜찮습니다' }, 15: { content: '당신의 마음을 조금씩 이해하고 있어요' }, 18: { content: '이제, 천천히 준비하고 있어요\n\n전하고 싶었던 말이 정리됐다면\n이별 단계로 넘어가도 괜찮아요.', action: 'goto_closure' } }
        const isRepeatCta = newStageCount >= 20 && (newStageCount - 20) % 3 === 0
        if (isRepeatCta) {
          setMessages(prev => [...prev, { id: makeId(), role: 'system', content: '이별을 준비할 시간이 됐어요\n\n담아두셨던 말을, 이제 전해도 괜찮아요.', action: 'goto_closure' }])
        } else if (stableMilestones[newStageCount]) {
          const m = stableMilestones[newStageCount]
          setMessages(prev => [...prev, { id: makeId(), role: 'system', content: m.content, action: m.action }])
        }
      }

      // Closure milestones
      if (persona.emotional_stage === 'closure') {
        let closureGuide: string | null = null
        if (newStageCount === 1) closureGuide = '🌸 이별 단계가 시작됐어요\n\n이제, 마지막 이야기를 나눌 시간이에요.'
        else if (newStageCount === 11) closureGuide = '💬 이제, 전하고 싶었던 말을 해도 괜찮아요'
        else if (newStageCount === 16) closureGuide = '이제, 마지막 이야기를 나눌 시간이 가까워졌어요'
        else if (newStageCount === 18) closureGuide = '조금씩, 준비가 되어가고 있어요'
        if (closureGuide) setMessages(prev => [...prev, { id: makeId(), role: 'system', content: closureGuide! }])
        if (newStageCount >= CLOSURE_MESSAGE_LIMIT) {
          setTimeout(() => { navigation.navigate('ClosureCeremony', { personaId: persona.id, personaName: persona.name, aiFarewell: reply }) }, 3000)
        }
      }

      // Free usage tracking
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: usage } = await supabase.from('user_usage').select('message_count, is_paid').eq('user_id', user.id).eq('persona_id', persona.id).single()
          if (usage) {
            const newCount = (usage.message_count ?? 0) + 1
            await supabase.from('user_usage').update({ message_count: newCount, updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('persona_id', persona.id)
            if (!usage.is_paid && !isTestAccount(user.email) && newCount >= FREE_MESSAGE_LIMIT) {
              setFreeUsageCount(newCount)
              setShowPaywall(true)
            } else { setFreeUsageCount(newCount) }
          } else {
            await supabase.from('user_usage').insert({ user_id: user.id, persona_id: persona.id, message_count: 1, is_paid: false })
            setFreeUsageCount(1)
          }
        }
      } catch { /* ignore */ }
    } catch (err) {
      console.error('[Chat] sendMessage error:', err)
      setErrorMsg(err instanceof Error ? err.message : '메시지 전송에 실패했습니다.')
    } finally { setIsTyping(false) }
  }, [inputText, isTyping, persona, messages, userMessageCount, stageMessageCount, showDangerAlert, showToast])

  // Current theme
  const currentStage = (persona?.emotional_stage ?? 'replay') as 'replay' | 'stable' | 'closure'
  const theme = STAGE_THEMES[currentStage]
  const personaName = persona?.name ?? '...'
  const avatarChar = personaName.charAt(0)
  const photoUrl = persona?.photo_url ?? null
  const freeRemaining = (!isPaidUser && freeUsageCount !== null) ? Math.max(0, FREE_MESSAGE_LIMIT - freeUsageCount) : null

  const headerSubtitleText = (() => {
    if (persona?.emotional_stage === 'closure') return getClosureProgressMessage(stageMessageCount)
    if (persona?.emotional_stage === 'stable') return getStableProgressMessage(stageMessageCount) ?? theme.label
    return getReplayProgressMessage(stageMessageCount) ?? theme.label
  })()

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFill} />
        <ActivityIndicator style={styles.loader} color="#A78BFA" size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Stage-specific gradient background */}
      <LinearGradient colors={theme.bg} style={StyleSheet.absoluteFill} />
      <View style={styles.orbContainer}>
        <View style={[styles.orb, { top: -100, left: SCREEN_WIDTH * 0.25 - 192, backgroundColor: theme.orb1 }]} />
        <View style={[styles.orb, { bottom: -100, right: SCREEN_WIDTH * 0.25 - 192, backgroundColor: theme.orb2 }]} />
        <View style={[styles.orb, styles.orbSmall]} />
      </View>
      {STARS.map((star, i) => (
        <View key={i} style={[styles.star, { left: `${star.left}%` as any, top: `${star.top}%` as any, width: star.size, height: star.size, opacity: star.opacity, borderRadius: star.size }]} />
      ))}

      {/* Danger Modal */}
      <Modal visible={showDangerModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['rgba(88, 28, 135, 0.8)', 'rgba(30, 58, 138, 0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
              <Text style={styles.modalIcon}>⚠️</Text>
              <Text style={styles.modalTitle}>많이 힘드시군요</Text>
              <Text style={styles.modalDesc}>지금 많이 힘드시죠. 전문 상담사와 이야기 나눠보세요.</Text>
              <TouchableOpacity onPress={() => Linking.openURL('tel:1577-0199')} activeOpacity={0.85}>
                <LinearGradient colors={['#DC2626', '#DB2777']} style={styles.modalBtnDanger}>
                  <Text style={styles.modalBtnText}>정신건강위기상담전화 연결 (1577-0199)</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowDangerModal(false)}>
                <Text style={styles.modalBtnSecondaryText}>계속하기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Paywall Modal */}
      <Modal visible={showPaywall} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <LinearGradient colors={['rgba(88, 28, 135, 0.8)', 'rgba(30, 58, 138, 0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalGradient}>
              <Text style={styles.modalIcon}>✨</Text>
              <Text style={styles.modalTitle}>{personaName}와 더 대화하고 싶으신가요?</Text>
              <Text style={styles.modalDesc}>무료 체험은 페르소나당 10회입니다.{'\n'}결제 후 무제한 대화가 가능합니다.</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => { setShowPaywall(false); navigation.replace('Paywall', { personaId: persona?.id ?? '', stage: currentStage }) }}>
                <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnPrimary}>
                  <Text style={styles.modalBtnText}>결제하기</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowPaywall(false)}>
                <Text style={styles.modalBtnSecondaryText}>닫기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.headerAvatarImg} /> : (
                <LinearGradient colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']} style={styles.headerAvatarDefault}>
                  <Text style={styles.headerAvatarEmoji}>💜</Text>
                </LinearGradient>
              )}
            </View>
            <View>
              <View style={styles.headerNameRow}>
                <Text style={styles.headerName}>{personaName}</Text>
                <View style={[styles.stageBadge, { borderColor: theme.badgeBorder, backgroundColor: theme.badgeBg }]}>
                  <Text style={[styles.stageBadgeText, { color: theme.badgeText }]}>{theme.label}</Text>
                </View>
              </View>
              <Text style={styles.headerSub}>{headerSubtitleText}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerCount}>{userMessageCount} / {FREE_MESSAGE_LIMIT}</Text>
          </View>
        </View>

        {/* AI Disclosure Banner */}
        <View style={styles.aiBanner}>
          <Text style={styles.aiBannerText}>
            이 대화는 실제 인물이 아닌 기술 기반 서비스와 나누는 대화입니다.
          </Text>
        </View>

        {/* Closure banner */}
        {persona?.emotional_stage === 'closure' && !isReadOnly && (
          <TouchableOpacity style={styles.closureBanner} onPress={() => {
            const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant')
            navigation.navigate('ClosureCeremony', { personaId: persona.id, personaName: persona.name, aiFarewell: lastAiMsg?.content ?? '' })
          }}>
            <Text style={styles.closureBannerText}>🌸 천천히 보내드릴 준비가 되셨나요? 마지막 편지를 써볼게요 →</Text>
          </TouchableOpacity>
        )}

        {/* Read-only banner */}
        {isReadOnly && (
          <View style={styles.readOnlyBanner}>
            <Text style={styles.readOnlyBannerText}>🌸 이별을 마무리한 대화예요. 새 메시지를 보낼 수 없어요.</Text>
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
                      <Text style={styles.closureLetterDividerText}>🌸 마지막 편지</Text>
                      <View style={styles.closureLetterLine} />
                    </View>
                    {!!closureLetter.ai_farewell && (
                      <View style={styles.closureAiFarewell}>
                        <Text style={styles.closureAiFarewellLabel}>{personaName}의 마지막 말</Text>
                        <Text style={styles.closureAiFarewellText}>"{closureLetter.ai_farewell}"</Text>
                      </View>
                    )}
                    <View style={styles.closureUserLetter}>
                      <Text style={styles.closureUserLetterLabel}>내가 쓴 편지</Text>
                      <Text style={styles.closureUserLetterText}>{closureLetter.content}</Text>
                    </View>
                  </View>
                ) : null
              ) : isTyping ? (
                <View style={styles.aiRow}>
                  <View style={styles.avatar}>
                    {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatarPhoto} /> : <Text style={styles.avatarText}>{avatarChar}</Text>}
                  </View>
                  <View>
                    <Text style={styles.senderName}>{personaName}</Text>
                    <View style={styles.aiBubble}><Text style={styles.typingDots}>• • •</Text></View>
                  </View>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💜</Text>
                <Text style={styles.emptyTitle}>{personaName}와 대화를 시작하세요</Text>
                <Text style={styles.emptyDesc}>먼저 인사를 건네보세요.</Text>
              </View>
            }
            renderItem={({ item }) => {
              if (item.role === 'system') {
                const hasCta = item.action === 'goto_closure'
                return (
                  <View style={styles.systemCardWrap}>
                    <View style={styles.systemAvatar}><Text style={styles.systemAvatarText}>✦</Text></View>
                    <View style={[styles.systemBubble, hasCta && styles.systemBubbleCta]}>
                      <Text style={styles.systemBubbleText}>{item.content}</Text>
                      {hasCta && (
                        <TouchableOpacity style={styles.systemCtaBtn} onPress={handleClosureTransition} activeOpacity={0.8}>
                          <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.systemCtaBtnGradient}>
                            <Text style={styles.systemCtaBtnText}>이별 단계 시작하기 →</Text>
                          </LinearGradient>
                        </TouchableOpacity>
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
                    {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatarPhoto} /> : <Text style={styles.avatarText}>{avatarChar}</Text>}
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
          {!isReadOnly && (
            <View style={styles.inputArea}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder={persona?.emotional_stage === 'stable' ? '지금 어떤 마음인지 이야기해보세요...' : persona?.emotional_stage === 'closure' ? '담아두셨던 말씀을 꺼내보세요...' : `${personaName}에게 말하기...`}
                placeholderTextColor="rgba(167, 139, 250, 0.5)"
                multiline
                maxLength={500}
                returnKeyType="send"
                blurOnSubmit={false}
                onSubmitEditing={Platform.OS !== 'web' ? sendMessage : undefined}
                onKeyPress={Platform.OS === 'web' ? (e: any) => {
                  if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault?.(); sendMessage() }
                } : undefined}
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputText.trim() || isTyping}
                activeOpacity={0.85}
                style={styles.sendBtnWrap}
              >
                <LinearGradient
                  colors={(!inputText.trim() || isTyping) ? ['rgba(124, 58, 237, 0.3)', 'rgba(59, 130, 246, 0.3)'] : ['#7C3AED', '#3B82F6']}
                  style={styles.sendBtn}
                >
                  {isTyping ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendIcon}>↑</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
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

  // Background
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', width: 384, height: 384, borderRadius: 192 },
  orbSmall: { position: 'absolute', top: '50%' as any, right: 0, width: 256, height: 256, borderRadius: 128, backgroundColor: 'rgba(79, 70, 229, 0.1)' },
  star: { position: 'absolute', backgroundColor: '#E9D5FF' },

  // Modal
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
  modalDesc: { fontSize: 14, color: '#E9D5FF', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtnDanger: { width: '100%' as any, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  modalBtnPrimary: { width: '100%' as any, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 10,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  modalBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  modalBtnSecondary: {
    width: '100%' as any, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  modalBtnSecondaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  backBtn: { padding: 8, marginRight: 4 },
  backIcon: { fontSize: 18, color: 'rgba(196, 181, 253, 0.8)' },
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
  aiBanner: {
    backgroundColor: 'rgba(30, 58, 138, 0.4)', borderBottomWidth: 1,
    borderBottomColor: 'rgba(96, 165, 250, 0.2)', paddingVertical: 8, paddingHorizontal: 16,
  },
  aiBannerText: { fontSize: 12, color: '#93C5FD', textAlign: 'center' },

  // Banners
  closureBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(129, 140, 248, 0.3)',
  },
  closureBannerText: { fontSize: 13, color: '#A5B4FC', textAlign: 'center', fontWeight: '600' },
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

  // Error
  errorBar: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  errorBarText: { fontSize: 13, color: '#FCA5A5' },

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
})
