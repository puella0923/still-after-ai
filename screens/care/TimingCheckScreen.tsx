import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import LanguageToggle from '../../components/LanguageToggle'
import StepIndicator from '../../components/StepIndicator'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TimingCheck'>
  route: RouteProp<RootStackParamList, 'TimingCheck'>
}

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

// timing 값 → AI가 톤을 조절하는 데 사용
const TIMING_OPTIONS = [
  { key: 'within_week',   ko: '1주일 이내',  en: 'Within a week',   desc_ko: '아직 믿기지 않는 시간', desc_en: 'Still feels unreal' },
  { key: 'within_month',  ko: '한 달 이내',  en: 'Within a month',  desc_ko: '조금씩 실감이 나고 있어요', desc_en: 'Slowly sinking in' },
  { key: 'within_3month', ko: '3개월 이내',  en: 'Within 3 months', desc_ko: '그리움이 물결치는 시간', desc_en: 'Waves of longing' },
  { key: 'within_6month', ko: '6개월 이내',  en: 'Within 6 months', desc_ko: '조금씩 일상으로 돌아가고 있어요', desc_en: 'Slowly returning to daily life' },
  { key: 'over_year',     ko: '1년 이상',    en: 'Over a year',     desc_ko: '여전히 마음 한켠에 있어요', desc_en: 'Still in a corner of my heart' },
]

export default function TimingCheckScreen({ navigation, route }: Props) {
  const { t, language } = useLanguage()
  const { careType, relation, name } = route.params
  const [selected, setSelected] = useState<string | null>(null)

  const canProceed = selected !== null

  const handleNext = () => {
    if (!canProceed) return
    navigation.navigate('PersonaCreate', { careType, relation, name, timing: selected })
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <LanguageToggle style={{ position: 'absolute', top: 56, right: 20, zIndex: 100 }} />
      <StepIndicator current={3} total={4} style={{ position: 'absolute', top: 62, left: 0, right: 0, zIndex: 90 }} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{t.common.back}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.emoji}>
            {careType === 'pet' ? t.timingCheck.emojiPet : t.timingCheck.emojiHuman}
          </Text>
          <Text style={styles.title}>
            {careType === 'pet'
              ? t.timingCheck.titlePet(name)
              : t.timingCheck.titleHuman(name)}
          </Text>
          <Text style={styles.subtitle}>
            {careType === 'pet'
              ? t.timingCheck.subtitlePet
              : t.timingCheck.subtitleHuman}
          </Text>
        </View>

        <View style={styles.options}>
          {TIMING_OPTIONS.map((opt) => {
            const isSelected = selected === opt.key
            return (
              <TouchableOpacity
                key={opt.key}
                onPress={() => setSelected(opt.key)}
                activeOpacity={0.8}
                style={styles.optionWrap}
              >
                {isSelected ? (
                  <LinearGradient colors={['rgba(168,85,247,0.25)', 'rgba(219,39,119,0.15)']} style={[styles.option, styles.optionSelected]}>
                    <View style={styles.optionInner}>
                      <Text style={styles.optionLabel}>{language === 'ko' ? opt.ko : opt.en}</Text>
                      <Text style={styles.optionDesc}>{language === 'ko' ? opt.desc_ko : opt.desc_en}</Text>
                    </View>
                    <View style={styles.optionCheck}>
                      <LinearGradient colors={['#a855f7', '#db2777']} style={styles.checkGrad}>
                        <Text style={styles.checkMark}>✓</Text>
                      </LinearGradient>
                    </View>
                  </LinearGradient>
                ) : (
                  <View style={styles.option}>
                    <View style={styles.optionInner}>
                      <Text style={styles.optionLabel}>{language === 'ko' ? opt.ko : opt.en}</Text>
                      <Text style={styles.optionDesc}>{language === 'ko' ? opt.desc_ko : opt.desc_en}</Text>
                    </View>
                    <View style={styles.optionCheckEmpty} />
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} disabled={!canProceed} activeOpacity={0.85}
          style={styles.nextButton}>
          {canProceed ? (
            <LinearGradient colors={['#a855f7', '#db2777']} style={styles.nextGrad}>
              <Text style={styles.nextText}>{t.relation.nextBtn}</Text>
            </LinearGradient>
          ) : (
            <Text style={[styles.nextText, { color: 'rgba(255,255,255,0.3)' }]}>{t.relation.nextBtn}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168,85,247,0.12)' },
  orb2: { width: 220, height: 220, bottom: '20%', left: '-10%', backgroundColor: 'rgba(219,39,119,0.08)' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 60, paddingBottom: 120, gap: 32 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  header: { alignItems: 'center', gap: 12 },
  emoji: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', letterSpacing: 0.3, textAlign: 'center', lineHeight: 34 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 22 },
  options: { gap: 12 },
  optionWrap: { borderRadius: 16, overflow: 'hidden' },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  optionSelected: {
    borderColor: 'rgba(168,85,247,0.5)',
  },
  optionInner: { flex: 1, gap: 4 },
  optionLabel: { fontSize: 16, color: '#fff', fontWeight: '500' },
  optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  optionCheck: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden', marginLeft: 12 },
  checkGrad: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  optionCheckEmpty: {
    width: 28, height: 28, borderRadius: 14, marginLeft: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12 },
  nextButton: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16 },
  nextGrad: { width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
})
