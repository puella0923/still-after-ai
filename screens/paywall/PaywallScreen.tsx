import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>
  route: RouteProp<RootStackParamList, 'Paywall'>
}

const FREE_LIMIT = 10
const PRODUCT_PRICE = 19900

// 테스트/개발 계정 Paywall 우회
const TEST_EMAILS = ['dev@stillafter.com', 'test@stillafter.com', 'stillafter.test@gmail.com']
const isTestAccount = (email?: string | null) => !!email && TEST_EMAILS.includes(email.toLowerCase())

const PAYWALL_ORBS = [
  { top: '5%', right: '-15%', color: 'rgba(168, 85, 247, 0.12)', size: 280 },
  { bottom: '15%', left: '-10%', color: 'rgba(219, 39, 119, 0.08)', size: 220 },
]

export default function PaywallScreen({ navigation, route }: Props) {
  const { personaId, stage } = route.params
  const { t } = useLanguage()
  const [freeUsed, setFreeUsed] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [paymentStep, setPaymentStep] = useState<'idle' | 'waiting' | 'verifying'>('idle')
  const [shopkey, setShopkey] = useState<string | null>(null)

  useEffect(() => { loadFreeUsage() }, [])

  // 결제창 열린 후 앱 복귀 감지 (모바일/웹 공통)
  useEffect(() => {
    if (paymentStep !== 'waiting') return
    const handleFocus = () => {
      if (paymentStep === 'waiting') verifyPayment()
    }
    if (Platform.OS === 'web') {
      window.addEventListener('focus', handleFocus)
      return () => window.removeEventListener('focus', handleFocus)
    }
    const sub = Linking.addEventListener('url', ({ url }) => {
      if (url.includes('payment/callback') || url.includes('paycomplete=Y')) {
        verifyPayment()
      }
    })
    return () => sub.remove()
  }, [paymentStep, shopkey])

  const loadFreeUsage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('user_usage')
        .select('message_count, is_paid').eq('user_id', user.id).eq('persona_id', personaId).single()
      if (data?.is_paid || isTestAccount(user.email)) {
        navigation.replace('Chat', { personaId })
        return
      }
      setFreeUsed(data?.message_count ?? 0)
    } catch { setFreeUsed(0) }
    finally { setChecking(false) }
  }

  const handleFreeTrial = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert(t.paywall.loginRequiredTitle, t.paywall.loginRequiredMsg); return }
      navigation.replace('Chat', { personaId })
    } catch { Alert.alert(t.paywall.errorTitle, t.home.retryMsg) }
    finally { setLoading(false) }
  }

  // 페이앱 결제 시작
  const handlePayment = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert(t.paywall.loginRequiredTitle, t.paywall.loginRequiredMsg); return }

      // Vercel API 라우트로 페이앱 결제 요청 초기화
      const resp = await fetch('/api/payapp-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          userId: user.id,
          userPhone: '',  // 선택사항
        }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || '결제 요청 실패')
      }

      const { shopkey: sk, payurl } = await resp.json()
      setShopkey(sk)
      setPaymentStep('waiting')

      // 결제 페이지로 이동 (웹: 새 탭, 앱: 브라우저 열기)
      if (Platform.OS === 'web') {
        window.open(payurl, '_blank')
      } else {
        await Linking.openURL(payurl)
      }
    } catch (err: unknown) {
      Alert.alert(t.paywall.paymentErrorTitle, err instanceof Error ? err.message : t.home.retryMsg)
    } finally {
      setLoading(false)
    }
  }

  // 결제 완료 후 검증
  const verifyPayment = useCallback(async () => {
    if (!shopkey || paymentStep !== 'waiting') return
    setPaymentStep('verifying')
    try {
      const resp = await fetch('/api/payapp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopkey }),
      })
      const data = await resp.json()

      if (resp.ok && data.success) {
        navigation.replace('Chat', { personaId })
      } else {
        // 결제 미완료 또는 취소
        setPaymentStep('idle')
        Alert.alert(t.paywall.incompleteTitle, t.paywall.incompleteMsg)
      }
    } catch {
      setPaymentStep('idle')
      Alert.alert(t.paywall.errorTitle, t.paywall.paymentErrorMsg)
    }
  }, [shopkey, paymentStep, personaId])

  if (checking) {
    return (
      <View style={styles.root}>
        <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={PAYWALL_ORBS} starCount={30} />
        <ActivityIndicator style={{ flex: 1 }} color="#a855f7" />
      </View>
    )
  }

  const remaining = Math.max(0, FREE_LIMIT - freeUsed)

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={PAYWALL_ORBS} starCount={30} />

      <View style={styles.container}>
        <Text style={styles.title}>Still After</Text>

        {paymentStep === 'waiting' ? (
          // 결제창 열림 대기 상태
          <View style={styles.waitingBox}>
            <ActivityIndicator color="#a855f7" size="large" style={{ marginBottom: 20 }} />
            <Text style={styles.waitingTitle}>{t.paywall.paymentWaiting}</Text>
            <Text style={styles.waitingDesc}>{t.paywall.paymentWaitingDesc}</Text>
            <TouchableOpacity style={styles.checkBtn} onPress={verifyPayment} disabled={paymentStep as string === 'verifying'}>
              <Text style={styles.checkBtnText}>
                {(paymentStep as string) === 'verifying' ? t.paywall.verifying : t.paywall.paymentCompleteBtn}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPaymentStep('idle'); setShopkey(null) }}>
              <Text style={styles.cancelBtnText}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>{t.paywall.subtitle}</Text>

            {remaining > 0 && (
              <View style={styles.freeInfo}>
                <Text style={styles.freeInfoText}>
                  {t.paywall.freeRemaining(remaining)}
                </Text>
              </View>
            )}

            {remaining > 0 ? (
              <TouchableOpacity style={styles.freeButton} onPress={handleFreeTrial} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.freeButtonText}>{t.paywall.continueBtn}</Text>
                    <Text style={styles.freeButtonSub}>{t.paywall.continueBtnSub(remaining)}</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.freeExhausted}>
                <Text style={styles.exhaustedText}>{t.paywall.exhaustedMsg}</Text>
              </View>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.paywall.orDivider}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={handlePayment} activeOpacity={0.85} disabled={loading} style={styles.payButtonWrap}>
              <LinearGradient colors={['#a855f7', '#db2777']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={styles.payButtonContent} pointerEvents="none">
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.payButtonText}>{t.paywall.premiumBtn}</Text>
                    <Text style={styles.payButtonSub}>{t.paywall.premiumBtnSub(PRODUCT_PRICE)}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.benefitRow}>
              {[t.paywall.benefitUnlimited, t.paywall.benefitOneTime, t.paywall.benefitRefund].map(b => (
                <Text key={b} style={styles.benefitText}>{b}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>{t.paywall.backBtn}</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.notice}>
          {t.paywall.notice}
        </Text>
      </View>
    </View>
  )
}

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 28, fontWeight: '300', color: '#fff', letterSpacing: 2, marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
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
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  exhaustedText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  divider: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { marginHorizontal: 12, color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  payButtonWrap: { width: '100%', borderRadius: 14, overflow: 'hidden', marginBottom: 12, position: 'relative' as const },
  payButtonContent: { padding: 20, alignItems: 'center' as const },
  payButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  payButtonSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  benefitRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  benefitText: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  backButton: { padding: 12 },
  backText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  // 결제 대기 상태
  waitingBox: { alignItems: 'center', width: '100%' },
  waitingTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 12 },
  waitingDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  checkBtn: {
    width: '100%', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12,
    backgroundColor: 'rgba(168,85,247,0.25)', borderWidth: 1, borderColor: '#a855f7',
  },
  checkBtnText: { fontSize: 16, fontWeight: '600', color: '#a855f7' },
  cancelBtn: { padding: 12 },
  cancelBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  notice: { position: 'absolute', bottom: 24, fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },
})
