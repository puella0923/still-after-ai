import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Platform, Dimensions, Linking,
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
const PRODUCT_PRICE = 19900

// íì¤í¸/ê°ë° ê³ì  Paywall ì°í
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
  const [paymentStep, setPaymentStep] = useState<'idle' | 'waiting' | 'verifying'>('idle')
  const [shopkey, setShopkey] = useState<string | null>(null)

  useEffect(() => { loadFreeUsage() }, [])

  // ê²°ì ì°½ ì´ë¦° í ì± ë³µê· ê°ì§ (ëª¨ë°ì¼/ì¹ ê³µíµ)
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
      if (!user) { Alert.alert('ë¡ê·¸ì¸ íì', 'ë¡ê·¸ì¸ í ì´ì©í  ì ìì´ì.'); return }
      navigation.replace('Chat', { personaId })
    } catch { Alert.alert('ì¤ë¥', 'ì ì í ë¤ì ìëí´ì£¼ì¸ì.') }
    finally { setLoading(false) }
  }

  // íì´ì± ê²°ì  ìì
  const handlePayment = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('ë¡ê·¸ì¸ íì', 'ë¡ê·¸ì¸ í ì´ì©í  ì ìì´ì.'); return }

      // Vercel API ë¼ì°í¸ë¡ íì´ì± ê²°ì  ìì²­ ì´ê¸°í
      const resp = await fetch('/api/payapp-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personaId,
          userId: user.id,
          userPhone: '',  // ì íì¬í­
        }),
      })

      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'ê²°ì  ìì²­ ì¤í¨')
      }

      const { shopkey: sk, payurl } = await resp.json()
      setShopkey(sk)
      setPaymentStep('waiting')

      // ê²°ì  íì´ì§ë¡ ì´ë (ì¹: ì í­, ì±: ë¸ë¼ì°ì  ì´ê¸°)
      if (Platform.OS === 'web') {
        window.open(payurl, '_blank')
      } else {
        await Linking.openURL(payurl)
      }
    } catch (err: any) {
      Alert.alert('ê²°ì  ì¤ë¥', err.message || 'ì ì í ë¤ì ìëí´ì£¼ì¸ì.')
    } finally {
      setLoading(false)
    }
  }

  // ê²°ì  ìë£ í ê²ì¦
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
        // ê²°ì  ë¯¸ìë£ ëë ì·¨ì
        setPaymentStep('idle')
        Alert.alert('ê²°ì  ë¯¸ìë£', 'ê²°ì ê° ìë£ëì§ ììì´ì. ê²°ì ì°½ì ë«ì¼ì¨ëì?')
      }
    } catch {
      setPaymentStep('idle')
      Alert.alert('ì¤ë¥', 'ê²°ì  íì¸ ì¤ ë¬¸ì ê° ë°ìíì´ì.')
    }
  }, [shopkey, paymentStep, personaId])

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

        {paymentStep === 'waiting' ? (
          // ê²°ì ì°½ ì´ë¦¼ ëê¸° ìí
          <View style={styles.waitingBox}>
            <ActivityIndicator color="#a855f7" size="large" style={{ marginBottom: 20 }} />
            <Text style={styles.waitingTitle}>ê²°ì ì°½ìì ì§íí´ì£¼ì¸ì</Text>
            <Text style={styles.waitingDesc}>ê²°ì ë¥¼ ìë£íë©´ ìëì¼ë¡ ì´ì´ì ¸ì.{'\n'}ì°½ì ë«ì¼ì¨ë¤ë©´ ìë ë²í¼ì ëë¬ì£¼ì¸ì.</Text>
            <TouchableOpacity style={styles.checkBtn} onPress={verifyPayment} disabled={paymentStep as string === 'verifying'}>
              <Text style={styles.checkBtnText}>
                {paymentStep === 'verifying' ? 'íì¸ ì¤...' : 'ê²°ì  ìë£íì´ì â'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPaymentStep('idle'); setShopkey(null) }}>
              <Text style={styles.cancelBtnText}>ì·¨ì</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>ì´ì¼ê¸°ë¥¼ ì´ì´ê°ë ê´ì°®ìì.{'\n'}ì²ì²í, ì¤ë¹ë  ë í¨ê»í ê²ì.</Text>

            {remaining > 0 && (
              <View style={styles.freeInfo}>
                <Text style={styles.freeInfoText}>
                  ìì§ ë¬´ë£ë¡ <Text style={styles.freeCount}>{remaining}ë²</Text> ë ëíí  ì ìì´ì
                </Text>
              </View>
            )}

            {remaining > 0 ? (
              <TouchableOpacity style={styles.freeButton} onPress={handleFreeTrial} disabled={loading} activeOpacity={0.85}>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.freeButtonText}>ì´ì´ì ëííê¸°</Text>
                    <Text style={styles.freeButtonSub}>{remaining}ë² ë ì´ì¼ê¸°í  ì ìì´ì</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.freeExhausted}>
                <Text style={styles.exhaustedText}>ð¬ ë¬´ë£ 10í ëíë¥¼ ëª¨ë ì¬ì©íì´ì</Text>
              </View>
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ëë</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity onPress={handlePayment} activeOpacity={0.85} disabled={loading} style={styles.payButtonWrap}>
              <LinearGradient colors={['#a855f7', '#db2777']} style={StyleSheet.absoluteFillObject} pointerEvents="none" />
              <View style={styles.payButtonContent} pointerEvents="none">
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={styles.payButtonText}>ê²°ì íê³  ë¬´ì í ëííê¸°</Text>
                    <Text style={styles.payButtonSub}>íë¥´ìëë¹ {PRODUCT_PRICE.toLocaleString()}ì (1í ê²°ì ) Â· íì´ì±</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.benefitRow}>
              {['â ë¬´ì í ëí', 'â 1í ê²°ì ', 'â íë¶ ë³´ì¥'].map(b => (
                <Text key={b} style={styles.benefitText}>{b}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>ëìê°ê¸°</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.notice}>
          ì´ ìë¹ì¤ë ì¤ì  ì¸ë¬¼ì ëì²´íì§ ììì. ê°ì  íë³µì ìí ê³µê°ì´ìì.
        </Text>
      </View>
    </View>
  )
}

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}
const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },
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
  // ê²°ì  ëê¸° ìí
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
