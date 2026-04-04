import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { C, RADIUS } from '../theme'

const { width } = Dimensions.get('window')
type HomeNavProp = NativeStackNavigationProp<RootStackParamList>
type StageFilter = 'all' | 'replay' | 'stable' | 'closure'

interface Persona {
  id: string
  name: string
  relationship: string
  emotional_stage: 'replay' | 'stable' | 'closure'
  photo_url?: string | null
  created_at: string
}

const STAGE_INFO: Record<string, { label: string; colors: [string, string]; borderColor: string; textColor: string }> = {
  replay: { label: '재연', colors: ['rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.3)'], borderColor: 'rgba(236, 72, 153, 0.3)', textColor: '#F9A8D4' },
  stable: { label: '안정', colors: ['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.3)'], borderColor: 'rgba(96, 165, 250, 0.3)', textColor: '#93C5FD' },
  closure: { label: '이별', colors: ['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.3)'], borderColor: 'rgba(129, 140, 248, 0.3)', textColor: '#A5B4FC' },
}

const FILTER_OPTIONS: { key: StageFilter; label: string }[] = [
  { key: 'all', label: '모두' },
  { key: 'replay', label: '재연' },
  { key: 'stable', label: '안정' },
  { key: 'closure', label: '이별' },
]

// Stars
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: ((i * 97 + 31) % 100),
  top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5,
  opacity: 0.15 + (i % 5) * 0.1,
}))

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>()
  const { user, signOut } = useAuth()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StageFilter>('all')
  const [conversationCounts, setConversationCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start()
  }, [])

  const fetchData = useCallback(async () => {
    if (!user) return
    setError(false)
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('personas')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      const list: Persona[] = data ?? []
      setPersonas(list)

      if (list.length > 0) {
        const counts: Record<string, number> = {}
        for (const p of list) {
          const { count } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true })
            .eq('persona_id', p.id)
            .eq('role', 'user')
          counts[p.id] = count ?? 0

          // Auto stage transition: replay → stable at 30 conversations
          if (p.emotional_stage === 'replay' && (count ?? 0) >= 30) {
            await supabase.from('personas').update({ emotional_stage: 'stable' }).eq('id', p.id)
            setPersonas(prev => prev.map(pp => pp.id === p.id ? { ...pp, emotional_stage: 'stable' } : pp))
          }
        }
        setConversationCounts(counts)
      }
    } catch (err) {
      console.error('[Home] fetch error:', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [user])

  useFocusEffect(useCallback(() => { fetchData() }, [fetchData]))

  const handleLogout = async () => {
    if (signOut) await signOut()
    else await supabase.auth.signOut()
  }

  const handleStartClosure = async (personaId: string, personaName: string) => {
    Alert.alert(
      '이별 단계 전환',
      `"${personaName}"와의 대화를 마무리할 준비가 되셨나요?\n이별 단계로 전환됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전환하기',
          onPress: async () => {
            try {
              const { error: err } = await supabase
                .from('personas')
                .update({ emotional_stage: 'closure' })
                .eq('id', personaId)
              if (err) throw err
              setPersonas(prev => prev.map(p => p.id === personaId ? { ...p, emotional_stage: 'closure' } : p))
            } catch (e) {
              console.error('Stage update error:', e)
            }
          },
        },
      ]
    )
  }

  const filteredPersonas = filter === 'all'
    ? personas
    : personas.filter(p => p.emotional_stage === filter)

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0a0118', '#1a0f3e', '#0f0520']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbContainer}>
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbBlue]} />
      </View>
      {STARS.map((star, i) => (
        <View key={i} style={[styles.star, { left: `${star.left}%` as any, top: `${star.top}%` as any, width: star.size, height: star.size, opacity: star.opacity, borderRadius: star.size }]} />
      ))}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Still After</Text>
            <Text style={styles.headerEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>🚪 로그아웃</Text>
          </TouchableOpacity>
        </View>

        {/* AI Disclosure Banner */}
        <View style={styles.aiBanner}>
          <Text style={styles.aiBannerText}>
            ⚠️ 이 서비스의 모든 대화 상대는 기술 기반 서비스입니다. 실제 인물이 아닙니다.
          </Text>
        </View>

        {/* Section Header */}
        <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.sectionTitle}>소중한 기억들</Text>
            <Text style={styles.sectionCount}>
              {filteredPersonas.length}개의 대화가 저장되어 있습니다.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('PersonaCreate')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#3B82F6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.createBtnGradient}
            >
              <Text style={styles.createBtnIcon}>+</Text>
              <Text style={styles.createBtnText}>새로운 기억 만들기</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Stage Filter Pills */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setFilter(opt.key)}
              activeOpacity={0.85}
              style={styles.filterPillWrap}
            >
              {filter === opt.key ? (
                <LinearGradient
                  colors={['#7C3AED', '#3B82F6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.filterPillActive}
                >
                  <Text style={styles.filterPillTextActive}>{opt.label}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterPill}>
                  <Text style={styles.filterPillText}>{opt.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#A78BFA" />
          </View>
        ) : error ? (
          <TouchableOpacity style={styles.errorCard} onPress={fetchData} activeOpacity={0.7}>
            <Text style={styles.errorText}>대화 목록을 불러오지 못했어요. 탭하면 다시 시도해요.</Text>
          </TouchableOpacity>
        ) : filteredPersonas.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyCard}>
            <LinearGradient
              colors={['rgba(88, 28, 135, 0.3)', 'rgba(30, 58, 138, 0.3)']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.emptyCardGradient}
            >
              <Text style={styles.emptyEmoji}>💜</Text>
              <Text style={styles.emptyTitle}>아직 대화가 없네요</Text>
              <Text style={styles.emptyDesc}>
                카카오톡 대화를 업로드하면{'\n'}그 사람과 다시 대화할 수 있습니다.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('PersonaCreate')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#3B82F6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>+ 새로운 기억 만들기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ) : (
          /* Persona Cards */
          <View style={styles.cardGrid}>
            {filteredPersonas.map((persona, index) => {
              const stage = STAGE_INFO[persona.emotional_stage] || STAGE_INFO.replay
              const count = conversationCounts[persona.id]
              return (
                <Animated.View key={persona.id} style={[styles.personaCardWrap, { opacity: fadeAnim }]}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Chat', { personaId: persona.id })}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={stage.colors as [string, string]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[styles.personaCard, { borderColor: stage.borderColor }]}
                    >
                      {/* Avatar */}
                      <View style={styles.avatarWrap}>
                        {persona.photo_url ? (
                          <Image source={{ uri: persona.photo_url }} style={styles.avatarImg} />
                        ) : (
                          <LinearGradient
                            colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']}
                            style={styles.avatarDefault}
                          >
                            <Text style={styles.avatarEmoji}>💜</Text>
                          </LinearGradient>
                        )}
                      </View>

                      {/* Name & Relationship */}
                      <Text style={styles.personaName}>{persona.name}</Text>
                      <Text style={styles.personaRelation}>{persona.relationship}</Text>

                      {/* Stage badge */}
                      <View style={[styles.stageBadge, { borderColor: stage.borderColor }]}>
                        <Text style={[styles.stageBadgeText, { color: stage.textColor }]}>
                          {stage.label}
                        </Text>
                      </View>

                      {/* Conversation count */}
                      {count !== undefined && (
                        <Text style={styles.countText}>
                          대화 {count}회
                          {persona.emotional_stage === 'replay' && (
                            <Text style={styles.countSub}> / 안정 전환까지 {Math.max(0, 30 - count)}회</Text>
                          )}
                        </Text>
                      )}

                      {/* Date */}
                      <Text style={styles.dateText}>
                        {new Date(persona.created_at).toLocaleDateString('ko-KR')}
                      </Text>

                      {/* Closure button for stable */}
                      {persona.emotional_stage === 'stable' && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.()
                            handleStartClosure(persona.id, persona.name)
                          }}
                          activeOpacity={0.85}
                          style={styles.closureBtnWrap}
                        >
                          <LinearGradient
                            colors={['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.3)']}
                            style={styles.closureBtn}
                          >
                            <Text style={styles.closureBtnText}>🌸 이별 준비하기</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Background
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', width: 384, height: 384, borderRadius: 192 },
  orbPurple: { top: -100, left: width * 0.25 - 192, backgroundColor: 'rgba(124, 58, 237, 0.2)' },
  orbBlue: { bottom: -100, right: width * 0.25 - 192, backgroundColor: 'rgba(37, 99, 235, 0.2)' },
  star: { position: 'absolute', backgroundColor: '#E9D5FF' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  headerTitle: {
    fontSize: 22, fontWeight: '700', color: C.TEXT, letterSpacing: 1,
  },
  headerEmail: { fontSize: 12, color: 'rgba(196, 181, 253, 0.6)', marginTop: 2 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.MD,
  },
  logoutText: { fontSize: 13, color: 'rgba(196, 181, 253, 0.8)' },

  // AI Banner
  aiBanner: {
    backgroundColor: 'rgba(120, 53, 15, 0.3)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(251, 191, 36, 0.2)',
    paddingVertical: 8, paddingHorizontal: 16,
  },
  aiBannerText: {
    fontSize: 11, color: '#FDE68A', textAlign: 'center',
  },

  // Section Header
  sectionHeader: {
    paddingHorizontal: 20, paddingTop: 32, paddingBottom: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    flexWrap: 'wrap', gap: 12,
  },
  sectionTitle: {
    fontSize: 28, fontWeight: '700', color: C.TEXT, marginBottom: 6,
  },
  sectionCount: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)' },

  // Create button
  createBtn: { borderRadius: 999, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  createBtnGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,
  },
  createBtnIcon: { fontSize: 18, color: '#FFFFFF', fontWeight: '700' },
  createBtnText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },

  // Filter
  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 24,
    flexWrap: 'wrap',
  },
  filterPillWrap: { borderRadius: 999, overflow: 'hidden' },
  filterPillActive: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 3,
  },
  filterPillTextActive: { fontSize: 13, fontWeight: '500', color: '#FFFFFF' },
  filterPill: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  filterPillText: { fontSize: 13, fontWeight: '500', color: 'rgba(196, 181, 253, 0.8)' },

  // Loading
  loadingWrap: { paddingVertical: 60, alignItems: 'center' },

  // Error
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: RADIUS.MD, padding: 14,
    marginHorizontal: 20, borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: { fontSize: 13, color: '#FCA5A5', textAlign: 'center' },

  // Empty state
  emptyCard: {
    marginHorizontal: 20, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  emptyCardGradient: {
    padding: 40, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: C.TEXT, marginBottom: 10 },
  emptyDesc: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },

  // Persona Cards Grid
  cardGrid: {
    paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12,
  },
  personaCardWrap: {
    width: width > 700 ? '31%' : width > 480 ? '47%' : '100%',
    flexGrow: 0, flexShrink: 0,
  },
  personaCard: {
    borderRadius: 16, padding: 20, borderWidth: 1,
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },

  // Avatar
  avatarWrap: { marginBottom: 12 },
  avatarImg: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  avatarDefault: {
    width: 56, height: 56, borderRadius: 28,
    borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 26 },

  // Card info
  personaName: { fontSize: 18, fontWeight: '700', color: C.TEXT, marginBottom: 2 },
  personaRelation: { fontSize: 13, color: 'rgba(196, 181, 253, 0.8)', marginBottom: 12 },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3,
    marginBottom: 8,
  },
  stageBadgeText: { fontSize: 11, fontWeight: '500' },
  countText: { fontSize: 11, color: 'rgba(196, 181, 253, 0.5)', marginTop: 4 },
  countSub: { color: 'rgba(167, 139, 250, 0.4)' },
  dateText: { fontSize: 11, color: 'rgba(196, 181, 253, 0.5)', marginTop: 4 },

  // Closure button
  closureBtnWrap: { marginTop: 10, borderRadius: RADIUS.MD, overflow: 'hidden' },
  closureBtn: {
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.MD,
    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.3)',
    alignItems: 'center',
  },
  closureBtnText: { fontSize: 12, fontWeight: '500', color: '#A5B4FC' },
})
