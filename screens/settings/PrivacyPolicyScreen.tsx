import React from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PrivacyPolicy'>
}

const SECTIONS = [
  {
    title: '1. 수집하는 개인정보 항목',
    body: `Still After(이하 "서비스")는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.

• 필수 항목: 이메일 주소, 서비스 이용 기록, 기기 정보(기기 식별자, OS 버전)
• 선택 항목: 카카오톡 대화 내보내기 파일(본인이 직접 업로드), 페르소나 설명 텍스트, 프로필 사진

서비스 이용 과정에서 자동으로 생성되는 정보: IP 주소, 접속 일시, 앱 사용 기록, 오류 로그`,
  },
  {
    title: '2. 개인정보의 이용 목적',
    body: `수집한 개인정보는 다음 목적으로만 이용됩니다.

• 서비스 제공 및 운영: AI 페르소나 생성, 대화 서비스, 회원 식별 및 인증
• 서비스 개선: 오류 분석, 품질 개선, 신규 기능 개발
• 고객 지원: 문의 응대 및 분쟁 해결
• 안전 관리: 위험 대화 감지 및 위기 개입

수집 목적 외 용도로 이용하지 않으며, 이용 목적이 변경될 경우 사전 동의를 받습니다.`,
  },
  {
    title: '3. 개인정보 보유 및 이용 기간',
    body: `회원 탈퇴 시 지체 없이 파기합니다. 단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 아래와 같이 보존합니다.

• 계약 또는 청약철회 기록: 5년 (전자상거래법)
• 소비자 불만 및 분쟁 처리 기록: 3년 (전자상거래법)
• 접속 로그: 3개월 (통신비밀보호법)
• 결제 기록: 5년 (전자금융거래법)

업로드하신 카카오톡 대화 파일은 AI 페르소나 생성 완료 후 원본을 서버에 보관하지 않으며, 분석된 데이터만 저장됩니다.`,
  },
  {
    title: '4. 개인정보의 제3자 제공',
    body: `원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.

단, 아래 경우에는 예외로 합니다.
• 이용자가 사전에 동의한 경우
• 법령의 규정 또는 수사기관의 요청이 있는 경우

AI 서비스 제공을 위해 OpenAI API를 활용하며, OpenAI의 개인정보 처리방침에 따릅니다. 대화 내용은 AI 응답 생성 목적으로만 전달되며, OpenAI는 API를 통해 전달된 데이터를 서비스 학습에 사용하지 않습니다.`,
  },
  {
    title: '5. 개인정보의 파기',
    body: `개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 파기합니다.

• 전자적 파일: 복구 불가능한 방법으로 영구 삭제
• 종이 문서: 분쇄기로 파기 또는 소각

회원이 직접 요청하는 경우 앱 내 '설정 → 계정 삭제'를 통해 즉시 처리됩니다.`,
  },
  {
    title: '6. 이용자의 권리와 행사 방법',
    body: `이용자는 언제든지 아래 권리를 행사할 수 있습니다.

• 개인정보 열람 요청
• 오류가 있을 경우 정정 요청
• 삭제 요청 (단, 법령상 보존 의무가 있는 경우 제외)
• 처리 정지 요청

권리 행사는 앱 내 설정 화면 또는 이메일(ysk@soomukstudio.com)을 통해 할 수 있으며, 요청 후 10일 이내 처리합니다.

만 14세 미만 아동은 서비스를 이용할 수 없습니다.`,
  },
  {
    title: '7. 개인정보 보호책임자',
    body: `개인정보 처리에 관한 업무를 총괄하는 담당자는 아래와 같습니다.

• 성명: Still After 개인정보 보호팀
• 이메일: ysk@soomukstudio.com
• 연락처: ysk@soomukstudio.com

개인정보 침해 관련 신고나 상담은 아래 기관에 문의하실 수 있습니다.
• 개인정보침해 신고센터: privacy.kisa.or.kr (국번 없이 118)
• 개인정보 분쟁조정위원회: www.kopico.go.kr`,
  },
  {
    title: '8. 방침의 변경',
    body: `본 개인정보 처리방침은 관련 법령 및 내부 방침에 따라 변경될 수 있습니다.

변경 시 앱 내 공지 또는 이메일을 통해 사전에 안내드립니다.

• 현재 버전: 1.0
• 시행일: 2026년 1월 1일`,
  },
]

const STAR_DOTS = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.12 + (i % 5) * 0.06,
}))

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function PrivacyPolicyScreen({ navigation }: Props) {
  const { t } = useLanguage()
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>{t.common.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.intro}>
          <Text style={styles.introText}>
            Still After(이하 "회사")는 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」 및 관련 법령을 준수합니다.
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
          <Text style={styles.footerText}>
            본 방침에 동의하지 않으시면 서비스 이용을 중단하고 계정을 삭제하실 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '-5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  orb2: { width: 200, height: 200, bottom: '10%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.06)' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },

  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

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
