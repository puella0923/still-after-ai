import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, ActivityIndicator, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AccountProfile'>
}

const STAR_DOTS = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.12 + (i % 5) * 0.06,
}))

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

function ConfirmModal({ visible, title, message, cancelLabel = '취소', confirmLabel, isDanger = false, loading = false, onCancel, onConfirm }: {
  visible: boolean; title: string; message: string; cancelLabel?: string; confirmLabel: string
  isDanger?: boolean; loading?: boolean; onCancel: () => void; onConfirm: () => void
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalConfirmBtn, loading && { opacity: 0.6 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.8}>
              {loading
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <LinearGradient colors={isDanger ? ['#ef4444', '#dc2626'] : ['#a855f7', '#db2777']} style={styles.modalConfirmGrad}>
                    <Text style={styles.modalConfirmText}>{confirmLabel}</Text>
                  </LinearGradient>
              }
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '알 수 없음'
  const d = new Date(iso)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function AccountProfileScreen({ navigation }: Props) {
  const { user, signOut } = useAuth()
  const [personaCount, setPersonaCount] = useState<number | null>(null)
  const [conversationCount, setConversationCount] = useState<number | null>(null)
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('personas').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_active', true)
      .then(({ count }) => setPersonaCount(count ?? 0))
    supabase.from('conversations').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setConversationCount(count ?? 0))
  }, [user])

  const handleDeleteFinal = async () => {
    if (!user) return
    setDeleting(true)
    try {
      await supabase.from('conversations').delete().eq('user_id', user.id)
      await supabase.from('personas').delete().eq('user_id', user.id)
      await signOut()
    } catch { setDeleting(false); setDeleteStep(0) }
    finally { setDeleting(false) }
  }

  const email = user?.email ?? ''
  const createdAt = formatDate((user as any)?.created_at)

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>계정 정보</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={['rgba(168, 85, 247, 0.4)', 'rgba(219, 39, 119, 0.3)']} style={styles.avatar}>
            <Text style={styles.avatarText}>{email.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
          <Text style={styles.avatarEmail}>{email}</Text>
          <Text style={styles.avatarSub}>Still After 회원</Text>
        </View>

        {/* Account info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>가입 정보</Text>
          <InfoRow label="이메일" value={email} />
          <View style={styles.rowDivider} />
          <InfoRow label="로그인 방식" value="이메일" />
          <View style={styles.rowDivider} />
          <InfoRow label="가입일" value={createdAt} />
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>사용 현황</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{personaCount !== null ? personaCount : '—'}</Text>
              <Text style={styles.statLabel}>담긴 기억</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{conversationCount !== null ? conversationCount : '—'}</Text>
              <Text style={styles.statLabel}>나눈 대화</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 32 }} />

        {/* Danger zone */}
        <View style={styles.dangerSection}>
          <Text style={styles.dangerNote}>계정을 삭제하면 모든 기억, 대화 기록이 영구 삭제됩니다. 이 작업은 되돌릴 수 없어요.</Text>
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => setDeleteStep(1)} activeOpacity={0.7}>
            <Text style={styles.deleteAccountText}>계정 삭제</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmModal visible={deleteStep === 1} title="계정을 삭제할까요?"
        message={`모든 기억과 대화 기록이 영구 삭제돼요.\n삭제 후에는 복구할 수 없어요.`}
        confirmLabel="계속" isDanger onCancel={() => setDeleteStep(0)} onConfirm={() => setDeleteStep(2)} />
      <ConfirmModal visible={deleteStep === 2} title="정말 삭제할까요?"
        message="이 작업은 되돌릴 수 없어요." cancelLabel="아니요, 돌아갈게요"
        confirmLabel="네, 삭제할게요" isDanger loading={deleting}
        onCancel={() => setDeleteStep(0)} onConfirm={handleDeleteFinal} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '-5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  orb2: { width: 200, height: 200, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.06)' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#fff', lineHeight: 36, marginTop: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },
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

  dangerSection: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 24, alignItems: 'center', gap: 12,
  },
  dangerNote: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },
  deleteAccountBtn: {
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteAccountText: { fontSize: 13, color: '#f87171' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalBox: {
    width: '100%', maxWidth: 400, borderRadius: 20, padding: 24,
    backgroundColor: 'rgba(30, 15, 50, 0.95)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 10 },
  modalMessage: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalConfirmGrad: { paddingVertical: 13, alignItems: 'center', borderRadius: 12 },
  modalConfirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
})
