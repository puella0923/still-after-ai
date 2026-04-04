// @ts-nocheck — 미사용 레거시 화면 (PersonaCreateScreen으로 통합됨)
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServiceConsent'>
  route: RouteProp<RootStackParamList, 'ServiceConsent'>
}

type CheckKey = 'terms' | 'privacy' | 'aiContent'

const CONSENT_ITEMS: { key: CheckKey; label: string; required: boolean }[] = [
  { key: 'terms',     label: '서비스 이용약관 동의',       required: true },
  { key: 'privacy',   label: '개인정보 처리방침 동의',     required: true },
  { key: 'aiContent', label: '서비스 생성 콘텐츠 고지 확인', required: true },
]

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

export default function ServiceConsentScreen({ navigation, route }: Props) {
  const { name } = route.params
  const [checked, setChecked] = useState<Record<CheckKey, boolean>>({ terms: false, privacy: false, aiContent: false })
  const allChecked = Object.values(checked).every(Boolean)

  const toggleItem = (key: CheckKey) => setChecked((p) => ({ ...p, [key]: !p[key] }))
  const toggleAll = () => { const n = !allChecked; setChecked({ terms: n, privacy: n, aiContent: n }) }

  const handleStart = () => {
    if (!allChecked) return
    navigation.navigate('DataUpload', { name })
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
          <Text style={styles.title}>함께하기 전에{'\n'}잠깐 확인해주세요.</Text>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📋 시작 전 안내</Text>
          <Text style={styles.infoBody}>
            Still After는{' '}
            <Text style={styles.bold}>{name}</Text>
            {' '}의 기억을 담아 그리움을 조심스럽게 이어갈 수 있도록 돕는{' '}
            <Text style={styles.bold}>감정 회복 서비스</Text>예요.{'\n\n'}
            • 대화는 실제 인물·동물이 아닌, <Text style={styles.bold}>기억을 바탕으로 한 응답</Text>이에요.{'\n'}
            • 이 서비스의 응답은 실제 그 분의 생각이나 말이 아니에요.{'\n'}
            • 심리치료나 의료 서비스를 대체하지 않아요.{'\n'}
            • 많이 힘드실 때는 전문 상담사와 연결해드릴게요.{'\n'}
            • 나눈 대화는 기억을 담는 데만 사용되며, 요청 시 즉시 삭제돼요.
          </Text>
        </View>

        {/* Consent items */}
        <View style={styles.consentSection}>
          <TouchableOpacity style={styles.allConsentRow} onPress={toggleAll} activeOpacity={0.8}>
            <View style={[styles.checkbox, allChecked && styles.checkboxChecked]}>
              {allChecked && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.allConsentText}>전체 동의</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {CONSENT_ITEMS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.consentRow} onPress={() => toggleItem(item.key)} activeOpacity={0.8}>
              <View style={[styles.checkbox, checked[item.key] && styles.checkboxChecked]}>
                {checked[item.key] && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.consentLabelRow}>
                <Text style={styles.consentText}>{item.label}</Text>
                {item.required && <Text style={styles.requiredBadge}>필수</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Start button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleStart} disabled={!allChecked} activeOpacity={0.85}
          style={[styles.startButton, !allChecked && styles.startButtonDisabled]}>
          {allChecked ? (
            <LinearGradient colors={['#a855f7', '#db2777']} style={styles.startGrad}>
              <Text style={styles.startButtonText}>{name}의 기억 담기</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.startButtonText, { color: 'rgba(255,255,255,0.3)' }]}>모두 확인 후 시작할 수 있어요</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const glass = (Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } : {}) as any

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '20%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 20, gap: 28 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  header: {},
  title: { fontSize: 26, fontWeight: '300', color: '#fff', lineHeight: 38, letterSpacing: 0.3 },
  infoBox: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  infoTitle: { fontSize: 15, fontWeight: '600', color: '#fff' },
  infoBody: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  bold: { fontWeight: '600', color: '#fff' },
  consentSection: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  allConsentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  allConsentText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: -18 },
  consentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  checkboxChecked: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  consentLabelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  consentText: { fontSize: 14, color: '#fff' },
  requiredBadge: {
    fontSize: 11, color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
  },
  footer: { paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12 },
  startButton: {
    borderRadius: 14, overflow: 'hidden', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16,
  },
  startButtonDisabled: {},
  startGrad: { width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  startButtonText: { color: '#fff', fontSize: 15, fontWeight: '500', letterSpacing: 0.3 },
})
