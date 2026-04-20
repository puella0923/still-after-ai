import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabase'
import { deletePersona } from '../../services/personaService'
import { C, RADIUS } from '../theme'
import { useLanguage } from '../../context/LanguageContext'
import LanguageToggle from '../../components/LanguageToggle'

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

// Filter labels will be set from translations in the component
const FILTER_KEYS: StageFilter[] = ['all', 'replay', 'stable', 'closure']

// Stars
const STARS = Array.from({ length: 30 }, (_, i) => ({
  left: ((i * 97 + 31) % 100),
  top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5,
  opacity: 0.15 + (i % 5) * 0.1,
}))

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StageFilter>('all')
  const [conversationCounts, setConversationCounts] = useState<Record<string, number>>({})
  const [error, setError] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

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

  const handleEditPersona = (persona: Persona) => {
    setOpenMenuId(null)
    navigation.navigate('PersonaEdit', {
      personaId: persona.id,
      personaName: persona.name,
      currentPhotoUrl: persona.photo_url ?? null,
      currentNickname: (persona as any).user_nickname ?? null,
      currentRelationship: persona.relationship ?? null,
    })
  }

  const handleDeletePersona = (persona: Persona) => {
    setOpenMenuId(null)
    const title = t.home.deleteTitle
    const msg = t.home.deleteMsg(persona.name)
    const doDelete = async () => {
      try {
        await deletePersona(persona.id)
        setPersonas(prev => prev.filter(p => p.id !== persona.id))
      } catch (err) {
        const m = err instanceof Error ? err.message : t.home.retryMsg
        if (Platform.OS === 'web') window.alert(`${t.home.deleteError}: ${m}`)
        else Alert.alert(t.home.deleteError, m)
      }
    }
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}`)) doDelete()
    } else {
      Alert.alert(title, msg, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.home.deleteBtn, style: 'destructive', onPress: doDelete },
      ])
    }
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

      {/* 메뉴 외부 탭 시 닫기 */}
      {openMenuId !== null && (
        <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setOpenMenuId(null)} />
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Still After</Text>
            <Text style={styles.headerEmail}>{user?.email}</Text>
          </View>
          <View style={styles.headerRight}>
            <LanguageToggle />
            <Pressable
              onPress={() => navigation.navigate('AccountProfile')}
              style={({ pressed }) => [styles.profileBtn, pressed && { opacity: 0.7 }]}
            >
              <LinearGradient
                colors={['rgba(168,85,247,0.4)', 'rgba(219,39,119,0.3)']}
                style={styles.profileAvatar}
              >
                <Text style={styles.profileAvatarText}>
                  {(user?.email ?? 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* AI Disclosure Banner */}
        <View style={styles.aiBanner}>
          <Text style={styles.aiBannerText}>
            {t.home.aiBanner}
          </Text>
        </View>

        {/* Section Header */}
        <Animated.View style={[styles.sectionHeader, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.sectionTitle}>{t.home.sectionTitle}</Text>
            <Text style={styles.sectionCount}>
              {t.home.savedCount(filteredPersonas.length)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => navigation.navigate('CareSelect')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#3B82F6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.createBtnGradient}
            >
              <Text style={styles.createBtnIcon}>+</Text>
              <Text style={styles.createBtnText}>{t.home.createNew}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Stage Filter Pills */}
        <View style={styles.filterRow}>
          {FILTER_KEYS.map(key => {
            const label = key === 'all' ? t.home.filterAll : key === 'replay' ? t.home.filterReplay : key === 'stable' ? t.home.filterStable : t.home.filterClosure
            return (
              <TouchableOpacity
                key={key}
                onPress={() => setFilter(key)}
                activeOpacity={0.85}
                style={styles.filterPillWrap}
              >
                {filter === key ? (
                  <LinearGradient
                    colors={['#7C3AED', '#3B82F6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.filterPillActive}
                  >
                    <Text style={styles.filterPillTextActive}>{label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.filterPill}>
                    <Text style={styles.filterPillText}>{label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#A78BFA" />
          </View>
        ) : error ? (
          <TouchableOpacity style={styles.errorCard} onPress={fetchData} activeOpacity={0.7}>
            <Text style={styles.errorText}>{t.home.loadError}</Text>
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
              <Text style={styles.emptyTitle}>{t.home.emptyTitle}</Text>
              <Text style={styles.emptyDesc}>{t.home.emptyDesc}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('CareSelect')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#3B82F6']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <Text style={styles.emptyBtnText}>{t.home.createNewPlus}</Text>
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
                        <Text style={styles.countText}>{t.home.conversationCount(count)}</Text>
                      )}

                      {/* Date */}
                      <Text style={styles.dateText}>
                        {new Date(persona.created_at).toLocaleDateString('ko-KR')}
                      </Text>

                      {/* ⋯ 메뉴 버튼 */}
                      <View style={styles.menuWrap}>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.()
                            setOpenMenuId(openMenuId === persona.id ? null : persona.id)
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          style={styles.menuDotBtn}
                        >
                          <Text style={styles.menuDotText}>⋯</Text>
                        </TouchableOpacity>
                        {openMenuId === persona.id && (
                          <View style={styles.dropdown}>
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={(e) => { e.stopPropagation?.(); handleEditPersona(persona) }}
                            >
                              <Text style={styles.dropdownItemText}>{t.home.menuEdit}</Text>
                            </TouchableOpacity>
                            <View style={styles.dropdownDivider} />
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={(e) => { e.stopPropagation?.(); handleDeletePersona(persona) }}
                            >
                              <Text style={[styles.dropdownItemText, { color: '#FCA5A5' }]}>{t.home.menuDelete}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {/* 이별 단계: 마지막 편지 쓰기 버튼 */}
                      {persona.emotional_stage === 'closure' && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation?.()
                            navigation.navigate('ClosureCeremony', { personaId: persona.id, personaName: persona.name, aiFarewell: '' })
                          }}
                          activeOpacity={0.85}
                          style={styles.closureLetterBtnWrap}
                        >
                          <LinearGradient
                            colors={['rgba(99, 102, 241, 0.4)', 'rgba(168, 85, 247, 0.4)']}
                            style={styles.closureLetterBtn}
                          >
                            <Text style={styles.closureLetterBtnText}>{t.home.closureBtn}</Text>
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileBtn: {},
  profileAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  profileAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },

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

  menuWrap: { position: 'absolute', top: 12, right: 12 },
  menuDotBtn: { padding: 4 },
  menuDotText: { fontSize: 18, color: 'rgba(196, 181, 253, 0.6)', letterSpacing: 1 },
  dropdown: {
    position: 'absolute', top: 28, right: 0, zIndex: 100,
    backgroundColor: '#1e1030', borderRadius: 10, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    minWidth: 100,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 11 },
  dropdownItemText: { fontSize: 13, color: 'rgba(196, 181, 253, 0.9)', fontWeight: '500' },
  dropdownDivider: { height: 1, backgroundColor: 'rgba(167, 139, 250, 0.12)' },


  // Closure letter button (이별 단계)
  closureLetterBtnWrap: { marginTop: 10, borderRadius: RADIUS.MD, overflow: 'hidden' },
  closureLetterBtn: {
    paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.MD,
    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.3)',
    alignItems: 'center',
  },
  closureLetterBtnText: { fontSize: 13, fontWeight: '600', color: '#C4B5FD' },
})
