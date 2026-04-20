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
import { useLanguage } from '../../context/LanguageContext'
import LanguageToggle from '../../components/LanguageToggle'

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
  const { user, signOut } = useAuth()
  const { t, language, toggleLanguage } = useLanguage()
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
            setResultModal({ title: t.settings.notificationPermissionNeeded, message: t.settings.notificationPermissionDesc })
            Linking.openSettings().catch(() => {})
            return
          }
        }
      } catch {}
    }
    if (val && Platform.OS === 'web') {
      setResultModal({ title: t.settings.notificationEnabled, message: t.settings.notificationWebNote })
      return
    }
    setNotifEnabled(val)
    await AsyncStorage.setItem(NOTIF_KEY, val ? 'true' : 'false')
  }

  const logoutSteps: ConfirmStep[] = [{
    title: t.settings.logout, message: t.settings.logoutNote, confirmLabel: t.settings.logout, isDanger: false,
  }]

  const handleLogoutConfirm = async () => {
    setLoading(true)
    try {
      closeModal()
      await signOut()
      // 네비게이션은 App.tsx의 key 변경으로 자동 처리
    } catch {
      setResultModal({ title: t.settings.errorTitle, message: t.settings.errorLogout })
    } finally {
      setLoading(false)
    }
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
            <Text style={styles.backText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.settings.header}</Text>
          <LanguageToggle />
        </View>

        {/* AI Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerIcon}>💜</Text>
          <Text style={styles.bannerText}>
            {t.settings.banner}
          </Text>
        </View>

        {/* Account Card */}
        <TouchableOpacity style={styles.accountCard} onPress={() => navigation.navigate('AccountProfile')} activeOpacity={0.8}>
          <LinearGradient colors={['rgba(168, 85, 247, 0.3)', 'rgba(219, 39, 119, 0.2)']} style={styles.accountAvatar}>
            <Text style={styles.accountAvatarText}>{user?.email?.charAt(0).toUpperCase() ?? '?'}</Text>
          </LinearGradient>
          <View style={styles.accountInfo}>
            <Text style={styles.accountEmail}>{user?.email ?? t.settings.loginRequired}</Text>
            <Text style={styles.accountMeta}>{t.settings.memoriesSaved(personaCount)}</Text>
          </View>
          <Text style={styles.accountChevron}>›</Text>
        </TouchableOpacity>

        {/* Notification Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t.settings.notificationTitle}</Text>
          <SettingRow label={t.settings.notificationLabel} isFirst rightEl={
            <Switch value={notifEnabled} onValueChange={handleNotifToggle}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#a855f7' }} thumbColor="#FFFFFF" />
          } />
          {notifEnabled && (
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteText}>{t.settings.notificationDesc}</Text>
            </View>
          )}
        </View>

        {/* Data Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t.settings.dataTitle}</Text>
          <SettingRow label={t.settings.memoryManage} isFirst onPress={() => navigation.navigate('PersonaList')} />
        </View>

        {/* Language Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t.settings.languageTitle}</Text>
          <SettingRow
            label={t.settings.languageLabel}
            isFirst
            rightEl={
              <TouchableOpacity onPress={toggleLanguage} activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6,
                  backgroundColor: 'rgba(168,85,247,0.15)', borderRadius: 20,
                  paddingHorizontal: 12, paddingVertical: 5,
                  borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)' }}>
                <Text style={{ fontSize: 13, color: language === 'ko' ? '#c084fc' : 'rgba(255,255,255,0.4)', fontWeight: language === 'ko' ? '600' : '400' }}>한</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>|</Text>
                <Text style={{ fontSize: 13, color: language === 'en' ? '#c084fc' : 'rgba(255,255,255,0.4)', fontWeight: language === 'en' ? '600' : '400' }}>EN</Text>
              </TouchableOpacity>
            }
          />
        </View>

        {/* Info Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t.settings.infoTitle}</Text>
          <SettingRow label={t.settings.privacyPolicy} isFirst onPress={() => navigation.navigate('PrivacyPolicy')} />
          <SettingRow label={t.settings.terms} onPress={() => navigation.navigate('Terms')} />
          <SettingRow label={t.settings.support} onPress={() => navigation.navigate('CustomerSupport')} />
          <SettingRow label={t.settings.appVersion} value={APP_VERSION} />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={() => { setModalStep(0); setActiveModal('logout') }} activeOpacity={0.8}>
          <Text style={styles.logoutText}>{t.settings.logout}</Text>
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
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
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
