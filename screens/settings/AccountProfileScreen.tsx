import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import LanguageToggle from '../../components/LanguageToggle'
import CosmicBackground from '../../components/CosmicBackground'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountProfile'>
}

const ACCOUNT_ORBS = [
  { top: '-5%', right: '-15%', color: 'rgba(168, 85, 247, 0.1)', size: 280 },
  { bottom: '15%', left: '-10%', color: 'rgba(219, 39, 119, 0.06)', size: 200 },
]

const glass = Platform.OS === 'web'
  ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any
  : {}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function formatDate(iso: string | undefined, language: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (language === 'en') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function AccountProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth()
  const { t, language } = useLanguage()

  const [personaCount, setPersonaCount] = useState<number | null>(null)
  const [conversationCount, setConversationCount] = useState<number | null>(null)

  // ── Delete account flow ──
  // step 0: idle, 1: choose reason, 2: final confirm
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteCustomReason, setDeleteCustomReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Feedback modal ──
  const [feedbackVisible, setFeedbackVisible] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  // ── Logout confirm ──
  const [logoutVisible, setLogoutVisible] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('personas').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_active', true)
      .then(({ count }) => setPersonaCount(count ?? 0))
    supabase.from('conversations').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setConversationCount(count ?? 0))
  }, [user])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try { await signOut() } catch { setIsLoggingOut(false) }
  }

  const handleDeleteFinal = async () => {
    if (!user) return
    setDeleting(true)
    const finalReason = deleteReason === t.account.deleteReasons[t.account.deleteReasons.length - 1]
      ? deleteCustomReason.trim()
      : deleteReason
    try {
      // Optionally record the reason before deleting
      await supabase.from('user_feedback').insert({
        user_id: user.id,
        type: 'account_deletion',
        content: finalReason || 'No reason provided',
      }).then(() => {})  // fire-and-forget, table may not exist
    } catch { /* no-op */ }
    try {
      await supabase.from('conversations').delete().eq('user_id', user.id)
      await supabase.from('personas').delete().eq('user_id', user.id)
      await signOut()
    } catch {
      setDeleting(false)
      setDeleteStep(0)
    } finally {
      setDeleting(false)
    }
  }

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return
    setFeedbackLoading(true)
    try {
      await supabase.from('user_feedback').insert({
        user_id: user?.id,
        type: 'general',
        content: feedbackText.trim(),
      }).then(() => {})
    } catch { /* no-op — table may not exist yet */ }
    setFeedbackLoading(false)
    setFeedbackSent(true)
    setTimeout(() => {
      setFeedbackVisible(false)
      setFeedbackText('')
      setFeedbackSent(false)
    }, 2000)
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const email = user?.email ?? ''
  const createdAt = formatDate((user as any)?.created_at, language) ?? t.account.joinDateUnknown
  const reasons = t.account.deleteReasons
  const isOtherReason = deleteReason === reasons[reasons.length - 1]
  const canProceedDelete = !!deleteReason && (!isOtherReason || deleteCustomReason.trim().length > 0)

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={ACCOUNT_ORBS} starCount={20} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backText, Platform.OS === 'web' ? { whiteSpace: 'nowrap' } as any : {}]}>{t.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.account.header}</Text>
        <LanguageToggle style={styles.langToggle} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={['rgba(168,85,247,0.4)', 'rgba(219,39,119,0.3)']} style={styles.avatar}>
            <Text style={styles.avatarText}>{email.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.avatarEmail}>{email}</Text>
          <Text style={styles.avatarSub}>{t.account.memberLabel}</Text>
        </View>

        {/* Account info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.account.accountInfoTitle}</Text>
          <InfoRow label={t.account.emailLabel} value={email} />
          <View style={styles.rowDivider} />
          <InfoRow label={t.account.loginMethodLabel} value={t.account.loginMethodEmail} />
          <View style={styles.rowDivider} />
          <InfoRow label={t.account.joinDateLabel} value={createdAt} />
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.account.usageTitle}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{personaCount !== null ? personaCount : '—'}</Text>
              <Text style={styles.statLabel}>{t.account.memoriesSaved}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{conversationCount !== null ? conversationCount : '—'}</Text>
              <Text style={styles.statLabel}>{t.account.conversationsShared}</Text>
            </View>
          </View>
        </View>

        {/* Feedback card */}
        <TouchableOpacity style={styles.feedbackCard} onPress={() => setFeedbackVisible(true)} activeOpacity={0.8}>
          <View style={styles.feedbackCardInner}>
            <View>
              <Text style={styles.feedbackCardTitle}>💬 {t.account.feedbackTitle}</Text>
              <Text style={styles.feedbackCardDesc}>{t.account.feedbackCardDesc}</Text>
            </View>
            <Text style={styles.feedbackChevron}>›</Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 28 }} />

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>{t.account.logoutBtn}</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerNote}>{t.account.deleteWarning}</Text>
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteStep(1)} activeOpacity={0.7}>
            <Text style={styles.deleteAccountText}>{t.account.deleteBtn}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* ── Logout confirm modal ── */}
      <Modal visible={logoutVisible} transparent animationType="fade" onRequestClose={() => setLogoutVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setLogoutVisible(false)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t.account.logoutConfirmTitle}</Text>
            <Text style={styles.modalMessage}>{t.account.logoutConfirmMsg}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setLogoutVisible(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>{t.account.logoutCancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, isLoggingOut && { opacity: 0.6 }]}
                onPress={handleLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                {isLoggingOut
                  ? <ActivityIndicator size="small" color="#fff" style={{ paddingVertical: 13 }} />
                  : <LinearGradient colors={['#a855f7', '#db2777']} style={styles.modalConfirmGrad}>
                      <Text style={styles.modalConfirmText}>{t.account.logoutConfirm}</Text>
                    </LinearGradient>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Delete step 1: choose reason ── */}
      <Modal visible={deleteStep === 1} transparent animationType="fade" onRequestClose={() => setDeleteStep(0)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDeleteStep(0)}>
            <TouchableOpacity style={[styles.modalBox, styles.modalBoxWide]} activeOpacity={1} onPress={() => {}}>
              <Text style={styles.modalTitle}>{t.account.deleteReasonTitle}</Text>
              <Text style={styles.modalMessage}>{t.account.deleteReasonSubtitle}</Text>

              {/* Reason chips */}
              <View style={styles.reasonList}>
                {reasons.map((reason) => (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonChip, deleteReason === reason && styles.reasonChipSelected]}
                    onPress={() => { setDeleteReason(reason); if (reason !== reasons[reasons.length - 1]) setDeleteCustomReason('') }}
                    activeOpacity={0.75}
                  >
                    {deleteReason === reason
                      ? <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.reasonChipGrad}>
                          <Text style={styles.reasonChipTextSelected}>{reason}</Text>
                        </LinearGradient>
                      : <Text style={styles.reasonChipText}>{reason}</Text>
                    }
                  </TouchableOpacity>
                ))}
              </View>

              {/* "기타" custom input */}
              {isOtherReason && (
                <TextInput
                  style={styles.reasonInput}
                  placeholder={t.account.deleteReasonOtherPlaceholder}
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={deleteCustomReason}
                  onChangeText={setDeleteCustomReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteStep(0)} activeOpacity={0.7}>
                  <Text style={styles.modalCancelText}>{language === 'ko' ? '취소' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, !canProceedDelete && { opacity: 0.4 }]}
                  disabled={!canProceedDelete}
                  onPress={() => setDeleteStep(2)}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.modalConfirmGrad}>
                    <Text style={styles.modalConfirmText}>{t.account.deleteReasonNext}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Delete step 2: final confirm ── */}
      <Modal visible={deleteStep === 2} transparent animationType="fade" onRequestClose={() => setDeleteStep(0)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setDeleteStep(0)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t.account.deleteStep2Title}</Text>
            <Text style={styles.modalMessage}>{t.account.deleteStep2Msg}</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleteStep(0)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>{t.account.deleteStep2Cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, deleting && { opacity: 0.6 }]}
                onPress={handleDeleteFinal}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting
                  ? <ActivityIndicator size="small" color="#fff" style={{ paddingVertical: 13 }} />
                  : <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.modalConfirmGrad}>
                      <Text style={styles.modalConfirmText}>{t.account.deleteStep2Confirm}</Text>
                    </LinearGradient>
                }
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Feedback modal ── */}
      <Modal visible={feedbackVisible} transparent animationType="fade" onRequestClose={() => { if (!feedbackLoading) { setFeedbackVisible(false); setFeedbackText('') } }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => { if (!feedbackLoading) { setFeedbackVisible(false); setFeedbackText(''); setFeedbackSent(false) } }}>
            <TouchableOpacity style={[styles.modalBox, styles.modalBoxWide]} activeOpacity={1} onPress={() => {}}>
              <Text style={styles.modalTitle}>💬 {t.account.feedbackTitle}</Text>

              {feedbackSent ? (
                <View style={styles.feedbackSuccessWrap}>
                  <Text style={styles.feedbackSentText}>{t.account.feedbackSent}</Text>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.feedbackInput}
                    placeholder={t.account.feedbackPlaceholder}
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    autoFocus
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => { setFeedbackVisible(false); setFeedbackText('') }}
                      activeOpacity={0.7}
                      disabled={feedbackLoading}
                    >
                      <Text style={styles.modalCancelText}>{language === 'ko' ? '취소' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalConfirmBtn, (!feedbackText.trim() || feedbackLoading) && { opacity: 0.4 }]}
                      disabled={!feedbackText.trim() || feedbackLoading}
                      onPress={handleSubmitFeedback}
                      activeOpacity={0.8}
                    >
                      {feedbackLoading
                        ? <ActivityIndicator size="small" color="#fff" style={{ paddingVertical: 13 }} />
                        : <LinearGradient colors={['#a855f7', '#db2777']} style={styles.modalConfirmGrad}>
                            <Text style={styles.modalConfirmText}>{t.account.feedbackSend}</Text>
                          </LinearGradient>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { height: 36, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },
  langToggle: { minWidth: 100, alignItems: 'flex-end' },

  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 20 },

  avatarSection: { alignItems: 'center', marginBottom: 28, gap: 6 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 28, fontWeight: '600', color: '#fff' },
  avatarEmail: { fontSize: 15, fontWeight: '600', color: '#fff' },
  avatarSub: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },

  card: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  cardTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  infoLabel: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  infoValue: { fontSize: 14, color: '#fff', fontWeight: '500', flex: 1, textAlign: 'right' },
  rowDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  feedbackCard: {
    borderRadius: 16, marginBottom: 12,
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', ...glass,
  },
  feedbackCardInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16,
  },
  feedbackCardTitle: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 4 },
  feedbackCardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 18 },
  feedbackChevron: { fontSize: 22, color: 'rgba(255,255,255,0.4)', marginLeft: 8 },

  logoutBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },

  dangerSection: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 24, alignItems: 'center', gap: 12,
  },
  dangerNote: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  deleteAccountBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  deleteAccountText: { fontSize: 13, color: '#f87171' },

  // Modal shared
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  modalBox: {
    width: '100%', maxWidth: 420, borderRadius: 20, padding: 24,
    backgroundColor: 'rgba(30,15,50,0.97)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  modalBoxWide: { maxWidth: 480 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalConfirmGrad: { paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },

  // Delete reason
  reasonList: { gap: 8, marginBottom: 4 },
  reasonChip: {
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  reasonChipSelected: { borderColor: 'transparent' },
  reasonChipGrad: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  reasonChipText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', paddingVertical: 12, paddingHorizontal: 16 },
  reasonChipTextSelected: { fontSize: 14, color: '#fff', fontWeight: '600' },
  reasonInput: {
    marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, fontSize: 14, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', minHeight: 80,
  },

  // Feedback
  feedbackInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, fontSize: 14, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', minHeight: 120,
    marginBottom: 4,
  },
  feedbackSuccessWrap: { alignItems: 'center', paddingVertical: 24 },
  feedbackSentText: { fontSize: 16, color: '#c084fc', fontWeight: '600', textAlign: 'center' },
})
