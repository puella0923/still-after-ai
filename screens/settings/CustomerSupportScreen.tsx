import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomerSupport'>
}

const FAQ_ITEMS = [
  { q: '서비스 내 AI는 실제 고인인가요?', a: 'AI가 생성하는 응답입니다. 이용자가 제공한 카카오톡 대화나 설명을 바탕으로 말투와 성격을 학습하지만, 실제 고인의 생각이나 의도를 반영하지 않습니다.' },
  { q: '카카오톡 파일을 업로드하면 어떻게 되나요?', a: '업로드한 파일은 AI 페르소나 생성에만 사용됩니다. 분석 완료 후 원본 파일은 서버에 저장되지 않으며, 추출된 말투 패턴 데이터만 보관됩니다.' },
  { q: '감정 단계(재연→안정→이별)란 무엇인가요?', a: '재연 단계에서는 그 사람과 다시 대화하는 느낌을 제공합니다. 안정 단계에서는 감정을 정리하고 표현하는 것을 돕습니다. 이별 단계에서는 심리적 종결(closure)을 경험합니다.' },
  { q: '결제 후 환불이 가능한가요?', a: '결제 후 7일 이내, 추가 대화를 이용하지 않으셨다면 전액 환불이 가능합니다. 서비스 오류로 인한 문제는 고객 지원 이메일로 문의해 주세요.' },
  { q: '대화 도중 너무 힘들면 어떻게 하나요?', a: '언제든지 앱을 닫고 쉬실 수 있습니다. 자해나 자살에 관한 생각이 드신다면 정신건강위기상담전화(1577-0199, 24시간)에 연락하시길 권고드립니다.' },
  { q: '기억(페르소나)은 몇 개까지 만들 수 있나요?', a: '현재 이용자당 제한 없이 여러 기억을 만들 수 있습니다. 각 기억은 독립적으로 관리됩니다.' },
  { q: '계정을 삭제하면 모든 데이터가 사라지나요?', a: '네, 계정 삭제 시 모든 기억, 대화 기록, 개인 정보가 영구 삭제됩니다. 삭제 후에는 복구할 수 없습니다.' },
  { q: '앱이 갑자기 오류가 나거나 작동하지 않아요.', a: '앱을 완전히 종료 후 다시 시작해보세요. 문제가 지속된다면 고객 지원 이메일로 문의해 주세요.' },
]

const SUPPORT_ORBS = [
  { top: '-5%', right: '-15%', color: 'rgba(168, 85, 247, 0.1)', size: 280 },
  { bottom: '10%', left: '-10%', color: 'rgba(219, 39, 119, 0.06)', size: 200 },
]

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function CustomerSupportScreen({ navigation }: Props) {
  const { t } = useLanguage()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const openEmail = () => {
    Linking.openURL('mailto:ysk@soomukstudio.com?subject=Still After 고객 지원 문의').catch(() => {
      Alert.alert('이메일 앱을 열 수 없어요', 'ysk@soomukstudio.com으로 직접 이메일을 보내주세요.')
    })
  }

  const openCrisisLine = () => {
    Alert.alert('정신건강위기상담전화', '1577-0199로 연결됩니다.\n24시간 운영합니다.', [
      { text: '취소', style: 'cancel' },
      { text: '전화 연결', onPress: () => Linking.openURL('tel:15770199') },
    ])
  }

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={SUPPORT_ORBS} starCount={20} />

      <TopStickyControls
        backLabel={t.common.back}
        onBackPress={() => navigation.goBack()}
        title="고객 지원"
        showLanguageToggle={false}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View style={styles.heroBanner}>
            <Text style={styles.heroEmoji}>💬</Text>
            <Text style={styles.heroTitle}>무엇을 도와드릴까요?</Text>
            <Text style={styles.heroSubtitle}>자주 묻는 질문을 먼저 확인해보세요.{'\n'}해결이 안 된다면 이메일로 문의해 주세요.</Text>
          </View>

          {/* Crisis */}
          <TouchableOpacity style={styles.crisisBanner} onPress={openCrisisLine} activeOpacity={0.8}>
            <View style={styles.crisisLeft}>
              <Text style={styles.crisisEmoji}>🆘</Text>
              <View>
                <Text style={styles.crisisTitle}>지금 많이 힘드신가요?</Text>
                <Text style={styles.crisisSubtitle}>정신건강위기상담전화 1577-0199 (24시간)</Text>
              </View>
            </View>
            <Text style={styles.crisisArrow}>›</Text>
          </TouchableOpacity>

          {/* FAQ */}
          <Text style={styles.sectionLabel}>자주 묻는 질문</Text>
          <View style={styles.faqCard}>
            {FAQ_ITEMS.map((item, i) => {
              const isExpanded = expandedIndex === i
              const isLast = i === FAQ_ITEMS.length - 1
              return (
                <View key={i}>
                  <TouchableOpacity style={styles.faqItem} onPress={() => setExpandedIndex(isExpanded ? null : i)} activeOpacity={0.7}>
                    <View style={styles.faqQuestion}>
                      <LinearGradient colors={['#a855f7', '#db2777']} style={styles.faqQ}>
                        <Text style={styles.faqQText}>Q</Text>
                      </LinearGradient>
                      <Text style={styles.faqQuestionText}>{item.q}</Text>
                    </View>
                    <Text style={[styles.faqChevron, isExpanded && styles.faqChevronOpen]}>{isExpanded ? '∧' : '∨'}</Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{item.a}</Text>
                    </View>
                  )}
                  {!isLast && <View style={styles.faqDivider} />}
                </View>
              )
            })}
          </View>

          {/* Contact */}
          <Text style={styles.sectionLabel}>직접 문의</Text>
          <View style={styles.contactCard}>
            <View style={styles.contactInfo}>
              <Text style={styles.contactInfoTitle}>이메일 문의</Text>
              <Text style={styles.contactInfoDesc}>평일 오전 10시 ~ 오후 6시 운영{'\n'}문의 후 1-2 영업일 내 답변드립니다.</Text>
              <Text style={styles.contactEmail}>ysk@soomukstudio.com</Text>
            </View>
            <TouchableOpacity onPress={openEmail} activeOpacity={0.85}>
              <LinearGradient colors={['#a855f7', '#db2777']} style={styles.emailBtn}>
                <Text style={styles.emailBtnText}>이메일 보내기</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.appInfoRow}>
            <Text style={styles.appInfoText}>Still After v1.0.0</Text>
            <Text style={styles.appInfoText}>©2026 Still After</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { paddingHorizontal: 16, paddingTop: 71, paddingBottom: 40 },

  heroBanner: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 20, marginBottom: 16,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  heroEmoji: { fontSize: 36, marginBottom: 10 },
  heroTitle: { fontSize: 20, fontWeight: '600', color: '#fff', marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },

  crisisBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 16, marginBottom: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  crisisLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  crisisEmoji: { fontSize: 24 },
  crisisTitle: { fontSize: 14, fontWeight: '600', color: '#f87171' },
  crisisSubtitle: { fontSize: 12, color: 'rgba(248, 113, 113, 0.7)', marginTop: 2 },
  crisisArrow: { fontSize: 20, color: '#f87171' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginLeft: 4,
  },

  faqCard: {
    borderRadius: 16, overflow: 'hidden', marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  faqItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16,
  },
  faqQuestion: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 10 },
  faqQ: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  faqQText: { fontSize: 13, fontWeight: '700', color: '#fff', lineHeight: 22, textAlign: 'center' },
  faqQuestionText: { fontSize: 14, color: '#fff', flex: 1, lineHeight: 20 },
  faqChevron: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginLeft: 8, paddingTop: 2 },
  faqChevronOpen: { color: '#fff' },
  faqAnswer: {
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  faqAnswerText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 21 },
  faqDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },

  contactCard: {
    borderRadius: 16, padding: 20, marginBottom: 24, gap: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  contactInfo: { gap: 4 },
  contactInfoTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
  contactInfoDesc: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  contactEmail: { fontSize: 14, color: '#fff', fontWeight: '500', marginTop: 4 },
  emailBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  emailBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  appInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  appInfoText: { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
})
