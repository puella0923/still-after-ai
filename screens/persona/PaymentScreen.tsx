// @ts-nocheck — 미사용 레거시 화면
import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Payment'>
  route: RouteProp<RootStackParamList, 'Payment'>
}

const INCLUDES = [
  { icon: '✨', text: '맞춤 기억 생성 (1개)' },
  { icon: '💬', text: '무제한 텍스트 대화 (30일)' },
  { icon: '🔒', text: '대화 내용 암호화 저장' },
  { icon: '🗑', text: '데이터 삭제 요청 보장' },
  { icon: '🆘', text: '위기 상황 즉시 연결 지원' },
]

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.12 + (i % 5) * 0.06,
}))

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function PaymentScreen({ navigation, route }: Props) {
  const { name } = route.params

  const handlePayment = () => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>기억이 준비됐어요</Text>
          </View>
          <Text style={styles.title}>{name}와(과) 이야기를{'\n'}이어갈 준비가 됐어요.</Text>
          <Text style={styles.subtitle}>이어서 대화를 나눌 수 있어요. 천천히 해도 괜찮아요.</Text>
        </View>

        {/* Price card */}
        <View style={styles.priceCard}>
          <View style={styles.priceTop}>
            <View>
              <Text style={styles.planName}>페르소나 이용권</Text>
              <Text style={styles.planDesc}>무제한 대화 · 1회 결제</Text>
            </View>
            <View style={styles.priceRight}>
              <Text style={styles.price}>19,900원</Text>
              <Text style={styles.priceSub}>부가세 포함</Text>
            </View>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.includesList}>
            <Text style={styles.includesTitle}>포함된 내용</Text>
            {INCLUDES.map((item, i) => (
              <View key={i} style={styles.includeItem}>
                <Text style={styles.includeIcon}>{item.icon}</Text>
                <Text style={styles.includeText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>⚠️ 결제 전 확인사항</Text>
          <Text style={styles.noticeText}>
            • 이 서비스의 AI는 실제 {name}이(가) 아닙니다.{'\n'}
            • 정신건강 전문 치료를 대체하지 않습니다.{'\n'}
            • 1회 결제로 해당 페르소나와 무제한 대화할 수 있어요.{'\n'}
            • 심리적 위기 상황 시 즉시 전문 기관을 연결합니다.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handlePayment} activeOpacity={0.85}>
          <LinearGradient colors={['#a855f7', '#db2777']} style={styles.payButton}>
            <Text style={styles.payButtonText}>19,900원 결제하기</Text>
            <Text style={styles.payButtonSub}>카드 · 카카오페이 · 토스페이</Text>
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.footerNotice}>결제 시 서비스 이용약관 및 환불정책에 동의하게 됩니다.</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '20%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 20, gap: 24 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  header: { gap: 12 },
  badge: {
    alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(74, 222, 128, 0.15)', borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#4ade80' },
  title: { fontSize: 28, fontWeight: '300', color: '#fff', lineHeight: 40, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)' },
  priceCard: {
    borderRadius: 20, padding: 22, gap: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...glass,
  },
  priceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { fontSize: 17, fontWeight: '600', color: '#fff' },
  planDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  priceRight: { alignItems: 'flex-end' },
  price: { fontSize: 26, fontWeight: '700', color: '#fff' },
  priceSub: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  priceDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  includesList: { gap: 10 },
  includesTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: 4 },
  includeItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  includeIcon: { fontSize: 16 },
  includeText: { fontSize: 14, color: '#fff' },
  noticeBox: {
    borderRadius: 12, padding: 16, gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  noticeTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(253, 230, 138, 0.9)' },
  noticeText: { fontSize: 12, color: 'rgba(253, 230, 138, 0.7)', lineHeight: 20 },
  footer: { paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12, gap: 10 },
  payButton: { borderRadius: 14, paddingVertical: 18, alignItems: 'center', gap: 4 },
  payButtonText: { color: '#fff', fontSize: 18, fontWeight: '600', letterSpacing: 0.3 },
  payButtonSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  footerNotice: { fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
})
