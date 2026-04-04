import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, Modal,
  ActivityIndicator, Linking, Platform, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>
}

const NOTIF_KEY = '@stillafter/notifications_enabled'
const APP_VERSION = '1.0.0 (MVP)'
const { width: SW } = Dimensions.get('window')

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

// ─── Confirm Modal ──────────────────────────────────────────────────────────
type ConfirmStep = {
  title: string
  message: string
  cancelLabel?: string
  confirmLabel: string
  isDanger?: boolean
}

function ConfirmModal({
  visible, steps, currentStep, loading, onCancel, onConfirm,
}: {
  visible: boolean; steps: ConfirmStep[]; currentStep: number
  loading: boolean; onCancel: () => void; onConfirm: () => void
}) {
  if (!visible || currentStep >= steps.length) return null
  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
          {steps.length > 1 && (
            <View style={styles.modalSteps}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.modalStepDot, i <= currentStep && styles.modalStepDotActive]} />
              ))}
            </View>
          )}
          <Text style={styles.modalTitle}>{step.title}</Text>
          <Text style={styles.modalMessage}>{step.message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>{step.cancelLabel ?? '취소'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmBtn, (step.isDanger ?? false) && styles.modalConfirmBtnDanger, loading && { opacity: 0.6 }]}
              onPress={onConfirm} activeOpacity={0.8} disabled={loading}
            >
              {loading && isLastStep
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <LinearGradient colors={step.isDanger ? ['#ef4444', '#dc2626'] : ['#a855f7', '#db2777']} style={styles.gradBtnInner}>
                    <Text style={styles.modalConfirmText}>{step.confirmLabel}</Text>
                  </LinearGradient>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

// ─── Result Modal ───────────────────────────────────────────────────────────
function ResultModal({ visible, title, message, onClose }: {
  visible: boolean; title: string; message: string; onClose: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <LinearGradient colors={['#a855f7', '#db2777']} style={[styles.gradBtnInner, { paddingVertical: 13 }]}>
              <Text style={styles.modalConfirmText}>확인</Text>
            </LinearGradient>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

// ─── Setting Row ────────────────────────────────────────────────────────────
function SettingRow({ label, value, onPress, danger = false, rightEl, isFirst = false }: {
  label: string; value?: string; onPress?: () => void; danger?: boolean; rightEl?: React.ReactNode; isFirst?: boolean
}) {
  const rowStyle = [styles.row, isFirst && styles.rowFirst]
  if (!onPress) {
    return (
      <View style={rowStyle}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        {rightEl ?? (value !== undefined ? <Text style={styles.rowValue}>{value}</Text> : null)}
      </View>
    )
  }
  return (
    <TouchableOpacity style={rowStyle} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
      {rightEl ?? <Text style={styles.rowArrow}>›</Text>}
    </TouchableOpacity>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }: Props) {
  const { user } = useAuth()
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [personaCount, setPersonaCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeModal, setActiveModal] = useState<'logout' | null>(null)
  const [modalStep, setModalStep] = useState(0)
  const [resultModal, setResultModal] = useState<{ title: string; message: string } | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then(val => { if (val === 'true') setNotifEnabled(true) })
  }, [])

  useFocusEffect(useCallback(() => {
    if (!user) return
    supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .then(({ count }) => setPersonaCount(count ?? 0))
  }, [user]))

  const closeModal = () => { setActiveModal(null); setModalStep(0) }

  const handleNotifToggle = async (val: boolean) => {
    if (val && Platform.OS !== 'web') {
      try {
        const Notifications = await import('expo-notifications').catch(() => null)
        if (Notifications) {
          const { status } = await Notifications.requestPermissionsAsync()
          if (status !== 'granted') {
            setResultModal({ title: '알림 권한 필요', message: '기기 설정에서 Still After의 알림을 허용해주세요.' })
            Linking.openSettings().catch(() => {})
            return
          }
        }
      } catch {}
    }
    if (val && Platform.OS === 'web') {
      setResultModal({ title: '앱에서 알림을 받을 수 있어요', message: '앱을 설치하면 기기 알림을 받을 수 있어요.\n지금은 웹 미리보기 중이에요.' })
      return
    }
    setNotifEnabled(val)
    await AsyncStorage.setItem(NOTIF_KEY, val ? 'true' : 'false')
  }

  const logoutSteps: ConfirmStep[] = [{
    title: '로그아웃', message: '로그아웃해도 기억과 대화 기록은\n그대로 유지돼요.', confirmLabel: '로그아웃', isDanger: false,
  }]

  const handleLogoutConfirm = async () => {
    setLoading(true)
    try { await supabase.auth.signOut() }
    catch { closeModal(); setResultModal({ title: '오류', message: '로그아웃에 실패했어요. 다시 시도해주세요.' }) }
    finally { setLoading(false) }
  }

  const handleModalConfirm = () => { if (activeModal === 'logout') handleLogoutConfirm() }
  const currentSteps = activeModal === 'logout' ? logoutSteps : []

  return (
    <View style={styles.root}>
      {/* Cosmic background */}
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>설정</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* AI Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>💜</Text>
          <Text style={styles.bannerText}>
            Still After는 실제 인물을 대체하지 않아요. 감정을 조심스럽게 이어가는 공간이에요.
          </Text>
        </View>

        {/* Account Card */}
        <TouchableOpacity style={styles.accountCard} onPress={() => navigation.navigate('AccountProfile')} activeOpacity={0.8}>
          <LinearGradient colors={['rgba(168, 85, 247, 0.3)', 'rgba(219, 39, 119, 0.2)']} style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>{user?.email?.charAt(0).toUpperCase() ?? '?'}</Text>
          </LinearGradient>
          <View style={styles.accountInfo}>
            <Text style={styles.accountEmail}>{user?.email ?? '로그인 필요'}</Text>
            <Text style={styles.accountMeta}>기억 {personaCount !== null ? personaCount : '—'}개 저장됨</Text>
          </View>
          <Text style={styles.accountChevron}>›</Text>
        </TouchableOpacity>

        {/* Notification Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>알림</Text>
          <SettingRow label="대화 알림" isFirst rightEl={
            <Switch value={notifEnabled} onValueChange={handleNotifToggle}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#a855f7' }} thumbColor="#FFFFFF" />
          } />
          {notifEnabled && (
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>앱이 설치된 기기에서 대화 리마인더 알림을 받을 수 있어요.</Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>데이터 관리</Text>
          <SettingRow label="기억 관리" isFirst onPress={() => navigation.navigate('PersonaList')} />
        </View>

        {/* Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>정보</Text>
          <SettingRow label="개인정보 처리방침" isFirst onPress={() => navigation.navigate('PrivacyPolicy')} />
          <SettingRow label="이용약관" onPress={() => navigation.navigate('Terms')} />
          <SettingRow label="고객 지원" onPress={() => navigation.navigate('CustomerSupport')} />
          <SettingRow label="앱 버전" value={APP_VERSION} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { setModalStep(0); setActiveModal('logout') }} activeOpacity={0.8}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmModal visible={activeModal !== null} steps={currentSteps} currentStep={modalStep}
        loading={loading} onCancel={closeModal} onConfirm={handleModalConfirm} />
      <ResultModal visible={resultModal !== null} title={resultModal?.title ?? ''} message={resultModal?.message ?? ''} onClose={() => setResultModal(null)} />
    </View>
  )
}

const glass = {
  backgroundColor: 'rgba(255, 255, 255, 0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}),
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '-5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#fff', lineHeight: 36, marginTop: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },

  // Banner
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  bannerIcon: { fontSize: 14 },
  bannerText: { flex: 1, fontSize: 12, color: 'rgba(253, 230, 138, 0.9)', lineHeight: 18 },

  // Account Card
  accountCard: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, padding: 16, borderRadius: 16, gap: 12,
    ...glass,
  },
  accountAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { fontSize: 20, fontWeight: '600', color: '#fff' },
  accountInfo: { flex: 1 },
  accountEmail: { fontSize: 14, fontWeight: '600', color: '#fff' },
  accountMeta: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  accountChevron: { fontSize: 20, color: 'rgba(255,255,255,0.3)' },

  // Section Card
  sectionCard: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14, overflow: 'hidden',
    ...glass,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 15,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  rowFirst: { borderTopWidth: 0 },
  rowLabel: { fontSize: 15, color: '#fff' },
  rowArrow: { fontSize: 20, color: 'rgba(255,255,255,0.3)' },
  rowValue: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  dangerText: { color: '#f87171' },

  // Info note
  infoNote: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
  },
  infoNoteText: { fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  // Logout
  logoutBtn: {
    margin: 16, marginTop: 4, padding: 16, borderRadius: 14,
    alignItems: 'center',
    ...glass,
  },
  logoutText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500' },

  // Modal
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalBox: {
    width: '100%', maxWidth: 400, borderRadius: 20, padding: 24,
    backgroundColor: 'rgba(30, 15, 50, 0.95)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as any : {}),
  },
  modalSteps: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  modalStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  modalStepDotActive: { backgroundColor: '#a855f7' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 10 },
  modalMessage: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalConfirmBtnDanger: {},
  gradBtnInner: { paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
})
