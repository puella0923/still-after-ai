// @ts-nocheck — 미사용 레거시 화면 (PersonaCreateScreen으로 통합됨)
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ServiceConsent'>
  route: RouteProp<RootStackParamList, 'ServiceConsent'>
}

type CheckKey = 'terms' | 'privacy' | 'aiContent'

// Labels will be set from t.consent in the component body
const CONSENT_KEYS: CheckKey[] = ['terms', 'privacy', 'aiContent']

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

export default function ServiceConsentScreen({ navigation, route }: Props) {
  const { t } = useLanguage()
  const { name } = route.params
  const [checked, setChecked] = useState<Record<CheckKey, boolean>>({ terms: false, privacy: false, aiContent: false })
  const allChecked = Object.values(checked).every(Boolean)

  const CONSENT_ITEMS: { key: CheckKey; label: string; required: boolean }[] = [
    { key: 'terms',     label: t.consent.agreeTerms,   required: true },
    { key: 'privacy',   label: t.consent.agreePrivacy, required: true },
    { key: 'aiContent', label: t.consent.agreeAI,      required: true },
  ]

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
          <Text style={styles.backText}>{t.common.back}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{t.consent.title}</Text>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{t.consent.infoTitle}</Text>
          <Text style={styles.infoBody}>
            {t.consent.infoDesc(name)}{'\n\n'}
            {t.consent.bullets.map((b, i) => `• ${b}`).join('\n')}
          </Text>
        </View>

        {/* Consent items */}
        <View style={styles.consentSection}>
          <TouchableOpacity style={styles.allConsentRow} onPress={toggleAll} activeOpacity={0.8}>
            <View style={[styles.checkbox, allChecked && styles.checkboxChecked]}>
              {allChecked && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={styles.allConsentText}>{t.consent.agreeAll}</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {CONSENT_ITEMS.map((item) => (
            <TouchableOpacity key={item.key} style={styles.consentRow} onPress={() => toggleItem(item.key)} activeOpacity={0.8}>
              <View style={[styles.checkbox, checked[item.key] && styles.checkboxChecked]}>
                {checked[item.key] && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <View style={styles.consentLabelRow}>
                <Text style={styles.consentText}>{item.label}</Text>
                {item.required && <Text style={styles.requiredBadge}>{t.consent.requiredLabel}</Text>}
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
              <Text style={styles.startButtonText}>{t.consent.startBtn(name)}</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.startButtonText, { color: 'rgba(255,255,255,0.3)' }]}>{t.consent.startBtnDisabled}</Text>
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
