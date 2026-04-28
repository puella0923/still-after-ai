import React from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Terms'>
}

const SECTIONS = [
  { title: '제1조 (목적)', body: `본 약관은 Still After(이하 "회사")가 제공하는 감정 회복 AI 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.` },
  { title: '제2조 (서비스 정의)', body: `"서비스"란 회사가 운영하는 Still After 앱을 통해 제공하는 AI 기반 감정 회복 대화 서비스를 의미합니다.\n\n본 서비스는 사랑하는 사람이나 반려동물을 잃은 이용자가 감정을 안전하게 정리하고 심리적 종결(closure)을 경험할 수 있도록 돕는 것을 목적으로 합니다.\n\n⚠️ 서비스 내 AI 응답은 실제 인물·동물의 생각이나 말을 대변하지 않습니다. 모든 응답은 AI가 생성한 내용입니다.` },
  { title: '제3조 (이용 자격)', body: `서비스는 만 14세 이상의 이용자에게 제공됩니다.\n\n만 14세 미만은 서비스를 이용할 수 없으며, 이에 해당함을 발견한 경우 즉시 계정을 삭제합니다.\n\n정신건강 위기 상태(자해·자살 충동 등)에 있는 분은 전문 의료기관 또는 위기상담전화(1577-0199)를 먼저 이용하시길 권고드립니다. 본 서비스는 정신건강의학과 치료나 전문 심리상담을 대체하지 않습니다.` },
  { title: '제4조 (계정 및 가입)', body: `이용자는 이메일 또는 소셜 로그인을 통해 계정을 생성할 수 있습니다.\n\n이용자는 계정 정보를 정확하게 유지할 의무가 있으며, 계정을 타인과 공유하거나 양도할 수 없습니다.\n\n타인의 정보를 도용하거나 허위 정보로 가입한 경우 계정이 즉시 삭제될 수 있습니다.` },
  { title: '제5조 (유료 서비스 및 결제)', body: `AI 페르소나 생성은 무료로 제공됩니다.\n\n무료 체험: 페르소나당 10회 대화 무료 제공\n유료 전환: 10회 초과 시 결제 후 무제한 이용 가능\n\n결제는 포트원(아임포트)을 통해 처리되며, 결제 후 즉시 서비스가 활성화됩니다.\n\n환불 정책:\n• 결제 후 7일 이내, 추가 대화를 이용하지 않은 경우: 전액 환불\n• 이용 중인 경우: 환불 불가\n• 서비스 오류로 인한 문제: 개별 협의 후 처리\n\n환불 문의: support@stillafter.app` },
  { title: '제6조 (이용자 의무)', body: `이용자는 다음 행위를 해서는 안 됩니다.\n\n• 타인을 사칭하거나 허위 정보를 제공하는 행위\n• 서비스를 비정상적으로 이용하거나 시스템에 무리를 가하는 행위\n• AI 응답 내용을 실제 고인의 말인 것처럼 타인에게 배포하는 행위\n• 관련 법령을 위반하는 행위\n• 타인의 권리를 침해하는 행위\n\n위반 시 서비스 이용이 제한되거나 계정이 삭제될 수 있습니다.` },
  { title: '제7조 (AI 콘텐츠 관련)', body: `서비스 내 AI 생성 콘텐츠와 관련하여 이용자는 다음 사항에 동의합니다.\n\n• AI 응답은 실제 인물·동물의 생각이나 의도를 반영하지 않습니다\n• AI는 이용자가 제공한 정보를 바탕으로 응답을 생성합니다\n• AI 응답의 정확성, 적절성을 완전히 보장할 수 없습니다\n• 이용자는 AI 응답을 비판적으로 이해하고 이용할 책임이 있습니다\n\n감정적으로 취약한 상태일 경우 전문 상담사와 함께 이용하시길 권장합니다.` },
  { title: '제8조 (서비스 제한 및 중단)', body: `회사는 다음 경우 서비스 이용을 제한하거나 중단할 수 있습니다.\n\n• 이용자가 본 약관을 위반한 경우\n• 서비스 시스템 점검, 교체, 고장 등\n• 국가비상사태, 정전, 천재지변 등 불가항력적 사유\n\n서비스 중단 시 가능한 한 사전에 공지하며, 불가피한 경우 사후에 안내합니다.` },
  { title: '제9조 (책임의 한계)', body: `회사는 다음에 대해 책임을 지지 않습니다.\n\n• AI 응답으로 인한 감정적 불편함이나 심리적 영향\n• 이용자의 부주의로 발생한 손해\n• 서비스 중단으로 인한 손해\n• 이용자가 게시한 정보의 정확성\n\n본 서비스는 전문 심리치료·의료 서비스가 아니며, 이를 대체하지 않습니다.` },
  { title: '제10조 (약관의 변경)', body: `회사는 관련 법령 변경 또는 서비스 개선을 위해 약관을 변경할 수 있습니다.\n\n변경 시 적용 7일 전 앱 내 공지 또는 이메일을 통해 안내합니다.\n\n• 현재 버전: 1.0\n• 시행일: 2026년 1월 1일\n• 준거법: 대한민국 법률` },
]

const STATIC_ORBS = [
  { top: '-5%', right: '-15%', color: 'rgba(168, 85, 247, 0.1)', size: 280 },
  { bottom: '10%', left: '-10%', color: 'rgba(219, 39, 119, 0.06)', size: 200 },
]

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function TermsScreen({ navigation }: Props) {
  const { t } = useLanguage()
  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={STATIC_ORBS} starCount={20} />

      <TopStickyControls
        backLabel={t.common.back}
        onBackPress={() => {
          if (navigation.canGoBack()) navigation.goBack()
          else navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] })
        }}
        title={t.settings.terms}
        showLanguageToggle={false}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Still After 서비스를 이용하시기 전에 아래 이용약관을 주의 깊게 읽어주세요.
          </Text>
        </View>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <View style={styles.sectionBodyBox}>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>문의사항이 있으시면 ysk@soomukstudio.com으로 연락해 주세요.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  content: { paddingHorizontal: 20, paddingTop: 71, paddingBottom: 40 },
  intro: {
    marginBottom: 24, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...glass,
  },
  introText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 22 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 8 },
  sectionBodyBox: {
    borderRadius: 12, padding: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', ...glass,
  },
  sectionBody: { fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 22 },
  footer: {
    marginTop: 8, padding: 16, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  footerText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 20 },
})
