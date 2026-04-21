import React, { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RelationSetup'>
  route: RouteProp<RootStackParamList, 'RelationSetup'>
}

const PERSON_RELATIONS = ['부모님', '배우자', '자녀', '친구', '연인', '기타']
const PET_TYPES = ['강아지', '고양이', '앵무새', '햄스터', '토끼', '물고기', '기타']

const RELATION_ORBS = [
  { top: '5%', right: '-15%', color: 'rgba(168, 85, 247, 0.12)', size: 280 },
  { bottom: '20%', left: '-10%', color: 'rgba(219, 39, 119, 0.08)', size: 220 },
]

export default function RelationSetupScreen({ navigation, route }: Props) {
  const { t } = useLanguage()
  const { careType } = route.params
  const isPerson = careType === 'human'
  const [selectedRelation, setSelectedRelation] = useState<string | null>(null)
  const [customRelation, setCustomRelation] = useState('')
  const [name, setName] = useState('')

  const showCustomInput = selectedRelation === '기타'
  const resolvedRelation = showCustomInput ? customRelation.trim() : (selectedRelation ?? '')
  const canProceed = resolvedRelation.length > 0 && name.trim().length > 0

  const handleNext = () => {
    if (!canProceed) return
    navigation.navigate('TimingCheck', {
      careType,
      relation: resolvedRelation,
      name: name.trim(),
    })
  }

  const chips = isPerson ? PERSON_RELATIONS : PET_TYPES

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={RELATION_ORBS} starCount={25} />

      <TopStickyControls
        backLabel={t.common.back}
        onBackPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('CareSelect' as any)}
        stepCurrent={2}
        stepTotal={4}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>{isPerson ? t.relation.titleHuman : t.relation.titlePet}</Text>
            <Text style={styles.subtitle}>
              {isPerson ? t.relation.subtitleHuman : t.relation.subtitlePet}
            </Text>
          </View>

          {/* Chips */}
          <View style={styles.chipGrid}>
            {chips.map((item) => {
              const isSelected = selectedRelation === item
              return (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSelectedRelation(item)}
                  activeOpacity={0.8}
                  style={styles.chip}
                >
                  {isSelected ? (
                    <LinearGradient colors={['#a855f7', '#db2777']} style={styles.chipInner}>
                      <Text style={styles.chipTextSelected}>{item}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.chipInner}>
                      <Text style={styles.chipText}>{item}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>

          {/* 기타 선택 시 직접 입력 */}
          {showCustomInput && (
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                {isPerson ? '관계를 직접 입력해주세요' : '반려동물 종류를 직접 입력해주세요'}
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder={isPerson ? '예) 스승님, 직장 동료' : '예) 거북이, 도마뱀'}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={customRelation}
                onChangeText={setCustomRelation}
                maxLength={20}
                returnKeyType="done"
                autoFocus
              />
            </View>
          )}

          {/* Name input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{isPerson ? t.relation.nameLabel : t.relation.nameLabelPet}</Text>
            <TextInput
              style={styles.textInput}
              placeholder={isPerson ? t.relation.namePlaceholderHuman : t.relation.namePlaceholderPet}
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={name}
              onChangeText={setName}
              maxLength={20}
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={handleNext} disabled={!canProceed} activeOpacity={0.85}
            style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}>
            {canProceed ? (
              <LinearGradient colors={['#a855f7', '#db2777']} style={styles.nextGrad}>
                <Text style={styles.nextButtonText}>{t.relation.nextBtn}</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.nextButtonText, { color: 'rgba(255,255,255,0.3)' }]}>{t.relation.nextBtn}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scrollContent: { paddingHorizontal: 28, paddingTop: 110, paddingBottom: 20, gap: 32 },
  header: { gap: 10 },
  title: { fontSize: 24, fontWeight: '300', color: '#fff', letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  // 외부 컨테이너: 크기 고정 (패딩 없이 overflow hidden + border)
  chip: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // 내부 영역: 항상 같은 패딩 유지 → 선택해도 크기 불변
  chipInner: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  chipTextSelected: { fontSize: 15, color: '#fff', fontWeight: '500' },
  inputSection: { gap: 10 },
  inputLabel: { fontSize: 15, color: '#fff', fontWeight: '500' },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16,
    fontSize: 16, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  footer: { paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12 },
  nextButton: {
    borderRadius: 14, overflow: 'hidden', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16,
  },
  nextButtonDisabled: {},
  nextGrad: { width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
})
