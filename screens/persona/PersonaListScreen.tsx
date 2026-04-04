import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { getPersonas, getArchivedPersonas, deletePersona, Persona } from '../../services/personaService'
import { supabase } from '../../services/supabase'
import { C, RADIUS } from '../theme'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const STAGE_INFO: Record<string, { label: string; colors: [string, string]; borderColor: string; textColor: string }> = {
  replay: { label: '재연', colors: ['rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.3)'], borderColor: 'rgba(236, 72, 153, 0.3)', textColor: '#F9A8D4' },
  stable: { label: '안정', colors: ['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.3)'], borderColor: 'rgba(96, 165, 250, 0.3)', textColor: '#93C5FD' },
  closure: { label: '이별', colors: ['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.3)'], borderColor: 'rgba(129, 140, 248, 0.3)', textColor: '#A5B4FC' },
}

const FREE_MESSAGE_LIMIT = 10

// 테스트/개발 계정은 Paywall 우회 (무제한 대화)
const TEST_EMAILS = ['dev@stillafter.com', 'test@stillafter.com', 'stillafter.test@gmail.com']
const isTestAccount = (email?: string | null) => !!email && TEST_EMAILS.includes(email.toLowerCase())

const STARS = Array.from({ length: 25 }, (_, i) => ({
  left: ((i * 97 + 31) % 100), top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5, opacity: 0.12 + (i % 5) * 0.08,
}))

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'PersonaList'> }
type ModalState =
  | { type: 'none' }
  | { type: 'delete_step1'; persona: Persona }
  | { type: 'delete_step2'; persona: Persona }
  | { type: 'closure_confirm'; persona: Persona }

export default function PersonaListScreen({ navigation }: Props) {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [archivedPersonas, setArchivedPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [usageCounts, setUsageCounts] = useState<Record<string, { count: number; isPaid: boolean }>>({})
  const [modal, setModal] = useState<ModalState>({ type: 'none' })
  const [modalLoading, setModalLoading] = useState(false)

  const loadPersonas = useCallback(async () => {
    setLoading(true)
    try {
      const [list, archived] = await Promise.all([getPersonas(), getArchivedPersonas()])
      setPersonas(list)
      setArchivedPersonas(archived)
      if (list.length > 0) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: usages } = await supabase.from('user_usage').select('persona_id, message_count, is_paid').eq('user_id', user.id).in('persona_id', list.map(p => p.id))
            const map: Record<string, { count: number; isPaid: boolean }> = {}
            const testBypass = isTestAccount(user.email)
            for (const u of (usages ?? [])) { map[u.persona_id] = { count: u.message_count ?? 0, isPaid: (u.is_paid ?? false) || testBypass } }
            setUsageCounts(map)
          }
        } catch { /* ignore */ }
      }
    } catch { setPersonas([]); setArchivedPersonas([]) }
    finally { setLoading(false) }
  }, [])

  useFocusEffect(useCallback(() => { loadPersonas() }, [loadPersonas]))

  const handleDelete = (persona: Persona) => setModal({ type: 'delete_step1', persona })
  const handleDeleteStep2 = () => { if (modal.type === 'delete_step1') setModal({ type: 'delete_step2', persona: modal.persona }) }
  const handleDeleteConfirm = async () => {
    if (modal.type !== 'delete_step2') return
    setModalLoading(true)
    try { await deletePersona(modal.persona.id); setPersonas(prev => prev.filter(p => p.id !== modal.persona.id)); setModal({ type: 'none' }) }
    catch { setModal({ type: 'none' }) }
    finally { setModalLoading(false) }
  }
  const handleStartChat = (persona: Persona) => navigation.navigate('Chat', { personaId: persona.id })
  const handleClosureRequest = (persona: Persona) => setModal({ type: 'closure_confirm', persona })
  const handleClosureConfirm = async () => {
    if (modal.type !== 'closure_confirm') return
    setModalLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setModal({ type: 'none' }); return }
      await supabase.from('personas').update({ emotional_stage: 'closure' }).eq('id', modal.persona.id).eq('user_id', user.id)
      setModal({ type: 'none' })
      await loadPersonas()
      navigation.navigate('Chat', { personaId: modal.persona.id })
    } catch { setModal({ type: 'none' }) }
    finally { setModalLoading(false) }
  }
  const handleEdit = (persona: Persona) => navigation.navigate('PersonaEdit', { personaId: persona.id, personaName: persona.name, currentPhotoUrl: (persona as any).photo_url ?? null, currentNickname: (persona as any).user_nickname ?? null })

  if (loading) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0a0118', '#1a0f3e', '#0f0520']} style={StyleSheet.absoluteFill} />
        <ActivityIndicator style={styles.loader} color="#A78BFA" size="large" />
      </View>
    )
  }

  const renderPersonaCard = ({ item }: { item: Persona }) => {
    const stage = STAGE_INFO[item.emotional_stage] || STAGE_INFO.replay
    const usage = usageCounts[item.id]
    const isArchived = (item as any).is_archived
    const isPaid = usage?.isPaid ?? false
    const usedCount = usage?.count ?? 0
    const isStable = item.emotional_stage === 'stable'

    return (
      <TouchableOpacity onPress={() => handleStartChat(item)} activeOpacity={0.85} style={styles.cardWrap}>
        <LinearGradient
          colors={stage.colors as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: stage.borderColor }]}
        >
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            {(item as any).photo_url ? (
              <Image source={{ uri: (item as any).photo_url }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']} style={styles.avatarDefault}>
                <Text style={styles.avatarEmoji}>💜</Text>
              </LinearGradient>
            )}
          </View>

          {/* Info */}
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardRelation}>{item.relationship}</Text>

          {/* Stage badge */}
          <View style={[styles.stageBadge, { borderColor: stage.borderColor }]}>
            <Text style={[styles.stageBadgeText, { color: stage.textColor }]}>{stage.label}</Text>
          </View>

          {/* Status */}
          {isArchived ? (
            <Text style={styles.statusText}>🌸 이별 완료 · 기록 보기</Text>
          ) : isPaid ? (
            <Text style={[styles.statusText, { color: '#86EFAC' }]}>✓ 무제한 대화</Text>
          ) : usedCount > 0 ? (
            <Text style={styles.statusText}>대화 {usedCount}회 / {FREE_MESSAGE_LIMIT}회</Text>
          ) : null}

          {/* Actions row */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.actionBtnText}>수정</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.actionBtnText, { color: '#FCA5A5' }]}>삭제</Text>
            </TouchableOpacity>
          </View>

          {/* Closure button */}
          {isStable && !isArchived && (
            <TouchableOpacity onPress={() => handleClosureRequest(item)} activeOpacity={0.85} style={styles.closureBtnWrap}>
              <LinearGradient colors={['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.3)']} style={styles.closureBtn}>
                <Text style={styles.closureBtnText}>🌸 이별 준비하기</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

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

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기억 목록</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* AI Banner */}
        <View style={styles.aiBanner}>
          <Text style={styles.aiBannerText}>⚠️ 이 서비스는 실제 인물을 대체하지 않아요. 감정 회복을 위한 공간이에요.</Text>
        </View>

        <FlatList
          data={personas}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          numColumns={SCREEN_WIDTH > 600 ? 2 : 1}
          key={SCREEN_WIDTH > 600 ? 'two' : 'one'}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <LinearGradient colors={['rgba(88, 28, 135, 0.3)', 'rgba(30, 58, 138, 0.3)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyCardGradient}>
                <Text style={styles.emptyEmoji}>💜</Text>
                <Text style={styles.emptyTitle}>아직 담긴 기억이 없어요</Text>
                <Text style={styles.emptyDesc}>카카오톡 대화를 올리거나{'\n'}그 분의 이야기를 적어서 기억을 담아보세요.</Text>
              </LinearGradient>
            </View>
          }
          renderItem={renderPersonaCard}
          ListFooterComponent={
            <>
              {/* Archived section */}
              {archivedPersonas.length > 0 && (
                <View style={styles.archivedSection}>
                  <Text style={styles.archivedSectionTitle}>지난 기억</Text>
                  <Text style={styles.archivedSectionDesc}>이별을 마무리한 기억이에요. 대화 기록과 편지를 다시 읽을 수 있어요.</Text>
                  {archivedPersonas.map(item => {
                    const stageInfo = STAGE_INFO.closure
                    return (
                      <TouchableOpacity key={item.id} onPress={() => navigation.navigate('Chat', { personaId: item.id })} activeOpacity={0.85}>
                        <LinearGradient colors={stageInfo.colors as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.archivedCard}>
                          <View style={styles.archivedAvatar}>
                            {(item as any).photo_url ? (
                              <Image source={{ uri: (item as any).photo_url }} style={styles.archivedAvatarPhoto} />
                            ) : (
                              <Text style={styles.archivedAvatarText}>{item.name.charAt(0)}</Text>
                            )}
                          </View>
                          <View style={styles.archivedInfo}>
                            <Text style={styles.archivedName}>{item.name}</Text>
                            <Text style={styles.archivedMeta}>{item.relationship} · 이별 완료</Text>
                            <Text style={styles.archivedHint}>편지 & 대화 기록 보기 →</Text>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {/* New button */}
              <View style={styles.footer}>
                <TouchableOpacity onPress={() => navigation.navigate('PersonaCreate')} activeOpacity={0.85}>
                  <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtn}>
                    <Text style={styles.newBtnText}>+ 새 기억 만들기</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          }
        />
      </SafeAreaView>

      {/* Modal */}
      <Modal visible={modal.type !== 'none'} transparent animationType="fade" onRequestClose={() => !modalLoading && setModal({ type: 'none' })}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardWrap}>
            <LinearGradient colors={['rgba(88, 28, 135, 0.8)', 'rgba(30, 58, 138, 0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalCard}>
              {modal.type === 'delete_step1' && (
                <>
                  <Text style={styles.modalTitle}>기억을 지울까요?</Text>
                  <Text style={styles.modalDesc}>'{modal.persona.name}'과의 대화 기록이 모두 사라져요.{'\n'}정말 삭제하시겠어요?</Text>
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setModal({ type: 'none' })}><Text style={styles.modalBtnSecondaryText}>취소</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteStep2}>
                      <LinearGradient colors={['#DC2626', '#DB2777']} style={styles.modalBtnDanger}><Text style={styles.modalBtnPrimaryText}>다음</Text></LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {modal.type === 'delete_step2' && (
                <>
                  <Text style={styles.modalTitle}>마지막 확인이에요</Text>
                  <Text style={styles.modalDesc}>삭제하면 '{modal.persona.name}'의 기억과{'\n'}모든 대화 기록이 복구되지 않아요.{'\n\n'}그래도 지우시겠어요?</Text>
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setModal({ type: 'none' })} disabled={modalLoading}><Text style={styles.modalBtnSecondaryText}>취소</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleDeleteConfirm} disabled={modalLoading}>
                      <LinearGradient colors={['#DC2626', '#DB2777']} style={styles.modalBtnDanger}>
                        {modalLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>삭제하기</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              {modal.type === 'closure_confirm' && (
                <>
                  <Text style={styles.modalTitle}>이별을 준비할게요</Text>
                  <Text style={styles.modalDesc}>'{modal.persona.name}'과의 마지막 대화를{'\n'}함께 마무리할 준비가 되셨나요?{'\n\n'}이별 단계로 전환되면{'\n'}다시 이전 단계로 돌아올 수 없어요.</Text>
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setModal({ type: 'none' })} disabled={modalLoading}><Text style={styles.modalBtnSecondaryText}>아직은요</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleClosureConfirm} disabled={modalLoading}>
                      <LinearGradient colors={['#7C3AED', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.modalBtnPrimary}>
                        {modalLoading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalBtnPrimaryText}>준비됐어요</Text>}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0118' },
  safeArea: { flex: 1 },
  loader: { flex: 1 },

  // Background
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', width: 384, height: 384, borderRadius: 192 },
  orbPurple: { top: -100, left: SCREEN_WIDTH * 0.25 - 192, backgroundColor: 'rgba(124, 58, 237, 0.2)' },
  orbBlue: { bottom: -100, right: SCREEN_WIDTH * 0.25 - 192, backgroundColor: 'rgba(37, 99, 235, 0.2)' },
  star: { position: 'absolute', backgroundColor: '#E9D5FF' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  backBtn: { width: 60 },
  backText: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#F3E8FF' },

  // AI Banner
  aiBanner: {
    backgroundColor: 'rgba(120, 53, 15, 0.3)', borderBottomWidth: 1,
    borderBottomColor: 'rgba(251, 191, 36, 0.2)', paddingVertical: 8, paddingHorizontal: 16,
  },
  aiBannerText: { fontSize: 11, color: '#FDE68A', textAlign: 'center' },

  // List
  list: { padding: 16, gap: 12 },

  // Card
  cardWrap: { flex: 1, marginBottom: 4 },
  card: {
    borderRadius: 16, padding: 20, borderWidth: 1,
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  avatarWrap: { marginBottom: 12 },
  avatarImg: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.3)' },
  avatarDefault: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 26 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#F3E8FF', marginBottom: 2 },
  cardRelation: { fontSize: 13, color: 'rgba(196, 181, 253, 0.8)', marginBottom: 12 },
  stageBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 8,
  },
  stageBadgeText: { fontSize: 11, fontWeight: '500' },
  statusText: { fontSize: 11, color: 'rgba(196, 181, 253, 0.5)', marginTop: 4 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  actionBtn: { paddingVertical: 4 },
  actionBtnText: { fontSize: 12, color: 'rgba(196, 181, 253, 0.6)' },

  // Closure
  closureBtnWrap: { marginTop: 10, borderRadius: RADIUS.MD, overflow: 'hidden' },
  closureBtn: { paddingVertical: 8, borderRadius: RADIUS.MD, borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.3)', alignItems: 'center' },
  closureBtnText: { fontSize: 12, fontWeight: '500', color: '#A5B4FC' },

  // Empty
  emptyCard: { borderRadius: 24, overflow: 'hidden', marginTop: 40 },
  emptyCardGradient: {
    padding: 40, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#F3E8FF', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)', textAlign: 'center', lineHeight: 22 },

  // Archived
  archivedSection: { paddingHorizontal: 4, paddingTop: 20 },
  archivedSectionTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(167, 139, 250, 0.7)', letterSpacing: 0.5, marginBottom: 4 },
  archivedSectionDesc: { fontSize: 12, color: 'rgba(167, 139, 250, 0.5)', marginBottom: 12, lineHeight: 18 },
  archivedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(129, 140, 248, 0.3)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  archivedAvatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(129, 140, 248, 0.2)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  archivedAvatarPhoto: { width: 42, height: 42, borderRadius: 21 },
  archivedAvatarText: { fontSize: 18, fontWeight: '600', color: '#A5B4FC' },
  archivedInfo: { flex: 1, gap: 2 },
  archivedName: { fontSize: 15, fontWeight: '600', color: 'rgba(196, 181, 253, 0.7)' },
  archivedMeta: { fontSize: 12, color: 'rgba(167, 139, 250, 0.5)' },
  archivedHint: { fontSize: 11, color: '#818CF8', marginTop: 2 },

  // Footer
  footer: { paddingHorizontal: 4, paddingBottom: 32, paddingTop: 16 },
  newBtn: {
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24,
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  modalCardWrap: { width: '100%', maxWidth: 380, borderRadius: 24, overflow: 'hidden' },
  modalCard: {
    padding: 28, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#F3E8FF', marginBottom: 10, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#E9D5FF', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnSecondary: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  modalBtnSecondaryText: { fontSize: 15, color: 'rgba(196, 181, 253, 0.8)', fontWeight: '500' },
  modalBtnDanger: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  modalBtnPrimary: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  modalBtnPrimaryText: { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
})
