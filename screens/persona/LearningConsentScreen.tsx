// @ts-nocheck — 미사용 레거시 화면
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'LearningConsent'>
  route: RouteProp<RootStackParamList, 'LearningConsent'>
}

const STAR_DOTS = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.12 + (i % 5) * 0.06,
}))

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function LearningConsentScreen({ navigation, route }: Props) {
  const { name, fileName } = route.params
  const [agreed, setAgreed] = useState(false)

  const handleNext = () => {
    if (!agreed) return
    navigation.navigate('AIGenerating', { name, personaId: '' })
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
          <Text style={styles.title}>나눈 이야기를{'\n'}어떻게 사용하나요?</Text>
        </View>

        <View style={styles.fileConfirm}>
          <Text style={styles.fileConfirmLabel}>업로드된 파일</Text>
          <View style={styles.fileRow}>
            <Text style={styles.fileEmoji}>📄</Text>
            <Text style={styles.fileNameText}>{fileName}</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>📋 이야기를 어떻게 담나요</Text>

          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>담는 것</Text>
            {[`${name}의 말투와 표현 방식`, '자주 쓰던 단어·문체 패턴', '대화 주제·관심사'].map((item, i) => (
              <Text key={i} style={styles.infoItem}>• {item}</Text>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>하지 않는 것</Text>
            {['제3자 공유 또는 판매', '광고·마케팅 목적 사용', '원본 대화 내용 외부 노출'].map((item, i) => (
              <Text key={i} style={[styles.infoItem, styles.infoItemNeg]}>• {item}</Text>
            ))}
          </View>

          <View style={styles.divider} />

          <Text style={styles.infoRetention}>
            🗑 이야기는 서비스 이용 기간 동안 안전하게 보관돼요.{'\n'}
            계정 삭제 또는 요청 시 즉시 삭제돼요.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.8}>
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Text style={styles.checkMark}>✓</Text>}
          </View>
          <Text style={styles.agreeText}>나눈 이야기가 기억을 담는 데만 사용된다는 걸 이해했어요.</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNext} disabled={!agreed} activeOpacity={0.85}
          style={[styles.nextButton, !agreed && styles.nextButtonDisabled]}>
          {agreed ? (
            <LinearGradient colors={['#a855f7', '#db2777']} style={styles.nextGrad}>
              <Text style={styles.nextButtonText}>{name}의 기억 담기</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.nextButtonText, { color: 'rgba(255,255,255,0.3)' }]}>확인 후 진행할 수 있어요</Text>
          )}
        </TouchableOpacity>
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
  header: {},
  title: { fontSize: 26, fontWeight: '300', color: '#fff', lineHeight: 38, letterSpacing: 0.3 },
  fileConfirm: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 16, gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  fileConfirmLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileEmoji: { fontSize: 18 },
  fileNameText: { fontSize: 14, fontWeight: '500', color: '#fff' },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}),
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  infoSection: { gap: 8 },
  infoSectionTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 2 },
  infoItem: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 22, paddingLeft: 4 },
  infoItemNeg: { color: 'rgba(255,255,255,0.4)' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  infoRetention: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 20 },
  footer: { paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12, gap: 14 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  agreeText: { flex: 1, fontSize: 14, color: '#fff', lineHeight: 22 },
  nextButton: {
    borderRadius: 14, overflow: 'hidden', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16,
  },
  nextButtonDisabled: {},
  nextGrad: { width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },
})
