import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>
  route: RouteProp<RootStackParamList, 'Paywall'>
}

const FREE_LIMIT = 10

// 테스트/개발 계정은 Paywall 우회
const TEST_EMAILS = ['dev@stillafter.com', 'test@stillafter.com', 'stillafter.test@gmail.com']
const isTestAccount = (email?: string | null) => !!email && TEST_EMAILS.includes(email.toLowerCase())

const STAR_DOTS = Array.from({ length: 30 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

export default function PaywallScreen({ navigation, route }: Props) {
  const { personaId, stage } = route.params
  const [freeUsed, setFreeUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => { loadFreeUsage() }, [])

  const loadFreeUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_usage')
        .select('message_count, is_paid').eq('user_id', user.id).eq('persona_id', personaId).single()
      if (data?.is_paid || isTestAccount(user.email)) { navigation.replace('Chat', { personaId }); return }
      setFreeUsed(data?.message_count ?? 0)
    } catch { setFreeUsed(0) }
    finally { setChecking(false) }
  }

  const handleFreeTrial = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('로그인 필요', '로그인 후 이용할 수 있어요.'); return }
      navigation.replace('Chat', { personaId })
    } catch { Alert.alert('오류', '잠시 후 다시 시도해주세요.') }
    finally { setLoading(false) }
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('로그인 필요', '로그인 후 이용할 수 있어요.'); return }

      // user_usage 테이블에서 is_paid = true 로 업데이트 (결제 완료 처리)
      const { data: existing } = await supabase
        .from('user_usage')
        .select('id')
        .eq('user_id', user.id)
        .eq('persona_id', personaId)
        .single()

      if (existing) {
        await supabase
          .from('user_usage')
          .update({ is_paid: true, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('persona_id', personaId)
      } else {
        await supabase
          .from('user_usage')
          .insert({ user_id: user.id, persona_id: personaId, message_count: 0, is_paid: true })
      }

      // 결제 완료 → 대화 화면으로 이동
      navigation.replace('Chat', { personaId })
    } catch (e) {
      Alert.alert('오류', '결제 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator style={{ flex: 1 }} color="#a855f7" />
      </View>
    )
  }

  const remaining = Math.max(0, FREE_LIMIT - freeUsed)

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <View style={styles.container}>
        <Text style={styles.title}>Still After</Text>
        <Text style={styles.subtitle}>이야기를 이어가도 괜찮아요.{'\n'}천천히, 준비될 때 함께할게요.</Text>

        {remaining > 0 && (
          <View style={styles.freeInfo}>
            <Text style={styles.freeInfoText}>
              아직 무료로 <Text style={styles.freeCount}>{remaining}번</Text> 더 대화할 수 있어요
            </Text>
          </View>
        )}

        {remaining > 0 ? (
          <TouchableOpacity style={styles.freeButton} onPress={handleFreeTrial} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.freeButtonText}>이어서 대화하기</Text>
                <Text style={styles.freeButtonSub}>{remaining}번 더 이야기할 수 있어요</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.freeExhausted}>
            <Text style={styles.exhaustedText}>무료 대화를 모두 사용했어요</Text>
          </View>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>또는</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity onPress={handlePayment} activeOpacity={0.85}>
          <LinearGradient colors={['#a855f7', '#db2777']} style={styles.payButton}>
            <Text style={styles.payButtonText}>결제하고 무제한 대화하기</Text>
            <Text style={styles.payButtonSub}>페르소나당 19,900원 (1회 결제)</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>돌아가기</Text>
        </TouchableOpacity>

        <Text style={styles.notice}>
          이 서비스는 실제 인물을 대체하지 않아요. 감정 회복을 위한 공간이에요.
        </Text>
      </View>
    </View>
  )
}

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '300', color: '#fff', letterSpacing: 2, marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  freeInfo: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12,
    marginBottom: 16, width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  freeInfoText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  freeCount: { fontWeight: '600', color: '#fff' },
  freeButton: {
    width: '100%', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', ...glass,
  },
  freeButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  freeButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  freeExhausted: {
    width: '100%', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  exhaustedText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { marginHorizontal: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  payButton: { width: '100%', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
  payButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  payButtonSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  backButton: { padding: 12 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  notice: { position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
})
