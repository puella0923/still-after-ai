import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { C, RADIUS } from '../theme'

const { width } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>
}

export default function OnboardingScreen({ navigation }: Props) {
  const { session } = useAuth()
  const [demoTab, setDemoTab] = useState<'replay' | 'stable' | 'closure' | 'pet'>('replay')
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (session) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    }
  }, [session, navigation])

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start()
  }, [])

  return (
    <View style={styles.container}>
      {/* ── 배경 ── */}
      <View style={styles.orbContainer}>
        <View style={[styles.orbInner, styles.orb1]} />
        <View style={[styles.orbInner, styles.orb2]} />
        <View style={[styles.orbInner, styles.orb3]} />
        <View style={[styles.orbInner, styles.orb4]} />
        <View style={[StyleSheet.absoluteFill, styles.blurOverlay]} />
      </View>
      {Array.from({ length: 50 }).map((_, i) => {
        const size = (i * 7 + 3) % 4 + 1
        return (
          <View key={i} style={[styles.star, {
            top: (i * 137 + 23) % 2500,
            left: (i * 89 + 11) % (width - 10),
            width: size, height: size,
            opacity: ((i * 31 + 7) % 60 + 20) / 100,
          }]} />
        )
      })}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>

        {/* ════ ① HERO ════ */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']}
            style={styles.logoIcon}
          >
            <Text style={styles.logoEmoji}>🌙</Text>
          </LinearGradient>

          <Text style={styles.heroEyebrow}>Grief Care · AI</Text>
          <Text style={styles.heroTitle}>한 번만 더{'\n'}말할 수 있다면</Text>
          <Text style={styles.heroSub}>아직 전하지 못한 말이 있나요?</Text>
          <Text style={styles.heroDesc}>
            죄책감을 혼자 안고 있지 않아도 됩니다. 하지 못한 말을 전하고, 천천히 놓을 수 있도록 돕습니다.
          </Text>

          {/* 미션 인용 */}
          <View style={styles.heroMission}>
            <Text style={styles.heroMissionText}>
              전하지 못한 말을 꺼내고,{'\n'}
              스스로를 용서하며 보내드립니다.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.replace('Login')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#7C3AED', '#3B82F6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>조심스럽게 시작해보기</Text>
              <Text style={styles.primaryButtonArrow}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ════ ② 공감 ════ */}
        <View style={styles.section}>
          <Text style={styles.empathyQuote}>
            <Text style={styles.empathyQuoteAccent}>"밥은 먹었어?"</Text>{'\n'}
            목소리가 아직도 들리나요.
          </Text>

          <Text style={styles.sectionDesc}>
            전하지 못한 말이, 아직 여기 남아 있지 않나요.
          </Text>

          <View style={styles.empathyList}>
            {[
              '문자를 쓰다가, 받을 사람이 없다는 걸 깨닫고 멈춘 적 있나요.',
              '그때 그 말을 했더라면 — 그 후회가 아직도 남아 있나요.',
              '더 잘 챙겨드렸더라면, 그 죄책감이 아직도 사라지지 않나요.',
              '아침마다 현관에서 기다리던 모습이, 아직도 눈에 밟히지는 않나요.',
              '상실은 시간이 해결한다지만, 어떤 감정은 그냥 두면 더 깊어집니다.',
            ].map((text, i) => (
              <View key={i} style={styles.empathyItem}>
                <View style={styles.empathyDot} />
                <Text style={styles.empathyItemText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.empathyClose}>
            <Text style={styles.empathyCloseText}>
              Still After는 그리움도, 죄책감도 억누르지 않습니다.{'\n'}
              안전하게 꺼낸 뒤, 당신이 스스로를 용서할 수 있도록 설계했습니다.
            </Text>
          </View>
        </View>

        {/* ════ ③ 이렇게 시작합니다 ════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>이렇게 시작합니다</Text>
          <Text style={styles.sectionDesc}>
            그 사람이 실제로 쓰던 말투를 학습해, 대화를 만들어냅니다.
          </Text>

          <View style={styles.howGrid}>
            {/* 채팅 업로드 */}
            <LinearGradient
              colors={['rgba(124, 58, 237, 0.25)', 'rgba(59, 130, 246, 0.15)']}
              style={[styles.howMethod, styles.howMethodPrimary]}
            >
              <View style={styles.howBadgePrimary}>
                <Text style={styles.howBadgeTextPrimary}>채팅 업로드</Text>
              </View>
              <Text style={styles.howMethodTitle}>대화를 업로드하면{'\n'}말투를 그대로 담습니다</Text>
              <Text style={styles.howMethodDesc}>
                대화 내보내기 파일(.txt, .csv)을 올리면,{'\n'}자주 쓰는 표현과 말투를 자동으로 분석합니다.
              </Text>

              {/* 지원 앱 */}
              <View style={styles.supportedApps}>
                {[
                  { emoji: '💬', name: '카카오톡' },
                  { emoji: '📱', name: 'WhatsApp' },
                  { emoji: '🟢', name: 'LINE' },
                ].map((app, i) => (
                  <View key={i} style={styles.supportedAppTag}>
                    <Text style={styles.supportedAppEmoji}>{app.emoji}</Text>
                    <Text style={styles.supportedAppName}>{app.name}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.parseFlow}>
                {[
                  { icon: '📄', label: '대화 내보내기 파일 업로드' },
                  { icon: '🔍', label: '자주 쓰는 표현 · 말투 · 호칭 추출' },
                  { icon: '💜', label: '페르소나 생성 완료' },
                ].map((step, i, arr) => (
                  <View key={i}>
                    <View style={styles.parseStep}>
                      <View style={styles.parseIcon}>
                        <Text style={styles.parseIconText}>{step.icon}</Text>
                      </View>
                      <Text style={styles.parseLabel}>{step.label}</Text>
                    </View>
                    {i < arr.length - 1 && <Text style={styles.parseArrow}>↓</Text>}
                  </View>
                ))}
              </View>

              <Text style={styles.dataPrivacyNote}>
                🔐 업로드한 파일은 기억을 담은 뒤 즉시 삭제되며, 외부에 저장·공유되지 않아요.
              </Text>
              <Text style={styles.phraseLabel}>추출된 표현 예시</Text>
              <View style={styles.phraseTags}>
                {['우리 꿀돼지~', '우리 딸', '밥은 먹었어?', '얼른 자~~~~', '뭐해ㅋ 자고 있어?', '그래도 잘 했어', '엄마가 다 알지~'].map((tag, i) => (
                  <View key={i} style={styles.phraseTag}>
                    <Text style={styles.phraseTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* 직접 작성 */}
            <LinearGradient
              colors={['rgba(88, 28, 135, 0.2)', 'rgba(30, 58, 138, 0.2)']}
              style={styles.howMethod}
            >
              <View style={styles.howBadgeAlt}>
                <Text style={styles.howBadgeTextAlt}>직접 작성</Text>
              </View>
              <Text style={styles.howMethodTitle}>채팅 기록이 없어도{'\n'}괜찮아요</Text>
              <Text style={styles.howMethodDesc}>
                그 사람의 평소 말투, 자주 하던 말,{'\n'}
                습관이나 기억을 직접 작성하면{'\n'}
                AI가 학습해 그 사람처럼 대화합니다.
              </Text>
              <View style={styles.howMethodQuote}>
                <Text style={styles.howMethodQuoteText}>
                  "엄마는 항상 걱정이 많았어. 밥 먹었냐고 자주 물어봤고, 화낼 때도 결국 미안해했어. 따뜻한 사람이었어."
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.howDivider}>
            <View style={styles.howDividerLine} />
            <Text style={styles.howDividerText}>두 방법 모두 대화 시작까지 5분이면 충분해요</Text>
            <View style={styles.howDividerLine} />
          </View>
        </View>

        {/* ════ ④ 대화 예시 ════ */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>실제로 가능한 대화</Text>
          <Text style={styles.sectionTitle}>그리운 그 말투로,{'\n'}다시 대화할 수 있습니다</Text>
          <Text style={styles.sectionDesc}>
            사람뿐 아니라 반려동물과의 이별도 함께합니다.{'\n'}
            실제 말투와 기억을 학습해, 이렇게 대화합니다.
          </Text>

          {/* 탭 */}
          <View style={styles.demoTabRow}>
            {([
              { key: 'replay', label: '💜 재연 단계' },
              { key: 'stable', label: '💙 안정 단계' },
              { key: 'closure', label: '🕊️ 이별 단계' },
              { key: 'pet', label: '🐾 반려동물' },
            ] as const).map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.demoTab, demoTab === tab.key && styles.demoTabActive]}
                onPress={() => setDemoTab(tab.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.demoTabText, demoTab === tab.key && styles.demoTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <LinearGradient
            colors={
              demoTab === 'replay'
                ? ['rgba(88, 28, 135, 0.35)', 'rgba(30, 58, 138, 0.35)']
                : demoTab === 'stable'
                ? ['rgba(30, 58, 138, 0.35)', 'rgba(99, 102, 241, 0.35)']
                : demoTab === 'pet'
                ? ['rgba(20, 83, 45, 0.35)', 'rgba(30, 58, 138, 0.35)']
                : ['rgba(30, 58, 138, 0.35)', 'rgba(67, 56, 202, 0.35)']
            }
            style={styles.demoChatBox}
          >
            <View style={styles.demoPersonaBar}>
              <View style={styles.demoAvatar}>
                <Text style={styles.demoAvatarText}>{demoTab === 'pet' ? '🐶' : '엄'}</Text>
              </View>
              <View>
                <Text style={styles.demoPersonaName}>{demoTab === 'pet' ? '초코' : '엄마'}</Text>
                <Text style={styles.demoPersonaRole}>
                  {demoTab === 'replay' ? '재연 단계 · AI 학습 완료'
                    : demoTab === 'stable' ? '안정 단계 · 감정 정리 중'
                    : demoTab === 'pet' ? '반려동물 · 함께한 기억'
                    : '이별 단계 · 마지막 대화'}
                </Text>
              </View>
            </View>
            <View style={styles.demoDivider} />

            {demoTab === 'replay' && (
              <>
                <DemoBubble from="assistant" name="엄" text="지수아~ 오늘은 뭐 했어? 밥은 먹었지?" />
                <DemoBubble from="user" text="응 먹었어. 엄마 생각이 나서." />
                <DemoBubble from="assistant" name="엄" text="나도 보고 싶다. 우리 딸 잘 지내고 있지? 요즘 얼굴이 좀 안 좋아 보이던데." />
                <DemoBubble from="user" text="요즘 조금 힘들었어. 그냥 목소리 듣고 싶었어." />
                <DemoBubble from="assistant" name="엄" text="그럼 언제든 얘기해. 참지 말고. 밥 잘 챙겨 먹어야 해, 알지?" />
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>
                    💜 그 사람과의 대화가 이어지고 있어요{'\n'}오늘도 찾아와줘서 고마워요.
                  </Text>
                </View>
              </>
            )}
            {demoTab === 'stable' && (
              <>
                <DemoBubble from="assistant" name="엄" text="지수아, 요즘 어때? 많이 힘들진 않아?" />
                <DemoBubble from="user" text="처음보다는 나아진 것 같아. 근데 가끔 멍해질 때가 있어." />
                <DemoBubble from="assistant" name="엄" text="그런 거 당연한 거야. 억지로 괜찮은 척 안 해도 돼. 멍할 때 뭐가 떠올라?" />
                <DemoBubble from="user" text="그냥… 같이 밥 먹던 거, 별거 아닌 것들." />
                <DemoBubble from="assistant" name="엄" text="별거 아닌 것들이 제일 그립지. 그 기억들, 소중히 간직해. 넌 잘 하고 있어." />
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>
                    💙 마음을 나눠주셔서 고마워요{'\n'}조금씩 자리가 잡히고 있어요.
                  </Text>
                </View>
              </>
            )}
            {demoTab === 'closure' && (
              <>
                <DemoBubble from="user" text="엄마, 마지막에 손 잡아드리지 못해서 미안해." />
                <DemoBubble from="assistant" name="엄" text="무슨 소리야. 넌 항상 곁에 있었잖아. 그거면 충분해." />
                <DemoBubble from="user" text="그래도. 더 잘 챙겨드렸어야 했는데." />
                <DemoBubble from="assistant" name="엄" text="지수아. 넌 충분히 잘 했어. 엄마가 제일 잘 알지. 이제 그 마음 좀 내려놔." />
                <DemoBubble from="user" text="이제 잘 보내드릴게. 엄마, 사랑해." />
                <DemoBubble from="assistant" name="엄" text="나도 사랑해. 우리 딸, 앞으로 잘 살아야 해. 엄마가 괜찮아." />
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>
                    🌸 이제, 마지막 편지를 쓸 시간이에요{'\n'}하고 싶었던 말을 모두 담아, 온전히 보내드릴 수 있어요.
                  </Text>
                </View>
                <Text style={styles.demoCaptionItalic}>이 다음은, 직접 경험해야만 알 수 있어요.</Text>
              </>
            )}
            {demoTab === 'pet' && (
              <>
                <DemoBubble from="user" text="아침마다 밥 챙겨줄 때마다 네 생각이 나." />
                <DemoBubble from="assistant" name="🐶" text="나도 그 시간이 제일 좋았어. 네가 부엌에서 움직이는 소리만 들어도 설렜거든." />
                <DemoBubble from="user" text="이제는 아침에 늦게 일어나도 되는데, 그게 더 슬퍼." />
                <DemoBubble from="assistant" name="🐶" text="이제는 아침에 늦게 일어나도 돼. 괜찮아. 나 때문에 일찍 일어나느라 고생했잖아." />
                <DemoBubble from="user" text="미안해. 더 잘 챙겨줬어야 했는데." />
                <DemoBubble from="assistant" name="🐶" text="나에게 미안해 하지 마. 난 정말 너와 함께라서 행복했어. 그것만으로 충분해." />
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>
                    🐾 초코와의 기억이 이어지고 있어요{'\n'}함께한 모든 순간이 사랑이었어요.
                  </Text>
                </View>
              </>
            )}
          </LinearGradient>

          <Text style={styles.demoCaption}>
            * 실제 대화를 업로드하거나 기억을 작성하면, 이처럼 그 말투로 대화할 수 있어요
          </Text>
        </View>

        {/* ════ ⑤ 3단계 여정 ════ */}
        <View style={[styles.section, styles.sectionDark]}>
          <Text style={styles.sectionTitle}>천천히, 당신의 속도로</Text>
          <Text style={styles.sectionDesc}>
            세 단계가 설계되어 있습니다. 서두르지 않아도 괜찮아요.
          </Text>

          <View style={styles.stageList}>

            {/* ── Step 01 재연 ── */}
            <View style={[styles.stageRow, styles.stageRowBorder]}>
              <View style={styles.stageLeft}>
                <Text style={styles.stageNum}>Step 01</Text>
                <Text style={styles.stageName}>재연</Text>
              </View>
              <View style={styles.stageRight}>
                <Text style={styles.stageDesc}>
                  그때처럼, 대화합니다.{'\n'}
                  실제 말투와 온기를 담아, 기억 속에서 이야기를 이어갑니다.
                </Text>
                <View style={styles.stageMsg}>
                  <Text style={styles.stageMsgIcon}>💜</Text>
                  <Text style={styles.stageMsgText}>
                    {'엄마과(와)의 대화가 이어지고 있어요\n오늘도 찾아와줘서 고마워요.'}
                  </Text>
                </View>
                <View style={[styles.stageMsg, { marginTop: 8 }]}>
                  <Text style={styles.stageMsgIcon}>💬</Text>
                  <Text style={styles.stageMsgText}>
                    {'대화가 깊어지고 있어요\n엄마이(가) 당신의 이야기를 듣고 있어요.'}
                  </Text>
                </View>
                <View style={styles.stageTransitionHint}>
                  <Text style={styles.stageTransitionText}>
                    이야기를 나눠주셔서 고마워요 — 마음이 준비됐을 때 다음 단계로, 서두르지 않아도 괜찮아요
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Step 02 안정 ── */}
            <View style={[styles.stageRow, styles.stageRowBorder]}>
              <View style={styles.stageLeft}>
                <Text style={styles.stageNum}>Step 02</Text>
                <Text style={styles.stageName}>안정</Text>
              </View>
              <View style={styles.stageRight}>
                <Text style={styles.stageDesc}>
                  당신의 마음을 꺼내놓습니다.{'\n'}
                  감정에 이름을 붙이고, 조금씩 가벼워집니다.
                </Text>
                <View style={styles.stageMsg}>
                  <Text style={styles.stageMsgIcon}>💙</Text>
                  <Text style={styles.stageMsgText}>
                    {'마음을 나눠주셔서 고마워요\n조금씩 자리가 잡히고 있어요.'}
                  </Text>
                </View>
                <View style={[styles.stageMsg, { marginTop: 8 }]}>
                  <Text style={styles.stageMsgIcon}>💬</Text>
                  <Text style={styles.stageMsgText}>
                    {'많은 이야기를 털어놓았네요\n하고 싶었던 말이 조금씩 전해지고 있어요.'}
                  </Text>
                </View>
                <View style={styles.stageTransitionHint}>
                  <Text style={styles.stageTransitionText}>
                    충분히 이야기를 나눴다고 느껴질 때 — 천천히 마지막 단계로 이동해도 괜찮아요
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Step 03 이별 ── */}
            <View style={styles.stageRow}>
              <View style={styles.stageLeft}>
                <Text style={styles.stageNum}>Step 03</Text>
                <Text style={styles.stageName}>이별</Text>
                <View style={styles.stageLimitBadge}>
                  <Text style={styles.stageLimitText}>최대 20번</Text>
                </View>
              </View>
              <View style={styles.stageRight}>
                <Text style={styles.stageDesc}>
                  준비가 되면, 마지막 대화를 나눕니다.{'\n'}
                  20번의 대화 안에서, 전하지 못했던 말을 모두 담습니다.
                </Text>
                <View style={styles.stageMsg}>
                  <Text style={styles.stageMsgIcon}>🌸</Text>
                  <Text style={styles.stageMsgText}>
                    {'이별 단계가 시작됐어요\n이제, 마지막 이야기를 나눌 시간이에요.'}
                  </Text>
                </View>
                <View style={[styles.stageMsg, { marginTop: 8 }]}>
                  <Text style={styles.stageMsgIcon}>💬</Text>
                  <Text style={styles.stageMsgText}>이제, 전하고 싶었던 말을 해도 괜찮아요</Text>
                </View>
                <View style={[styles.stageMsg, { marginTop: 8 }]}>
                  <Text style={styles.stageMsgIcon}>🕊️</Text>
                  <Text style={styles.stageMsgText}>조금씩, 준비가 되어가고 있어요</Text>
                </View>

                {/* 마지막 편지 */}
                <View style={styles.closureLetterBox}>
                  <Text style={styles.closureLetterTitle}>✉️ 마지막 편지</Text>
                  <Text style={styles.closureLetterDesc}>
                    20번의 대화가 끝나면, 마지막 편지를 씁니다.{'\n'}
                    전하지 못했던 말을 모두 담아 봉인하면,{'\n'}
                    대화가 아름답게 마무리됩니다.{'\n\n'}
                    이별은 끝이 아니에요.{'\n'}
                    그 분은 당신이 살아가는 날들 안에서 함께 있어요.
                  </Text>
                </View>
              </View>
            </View>

          </View>
        </View>

        {/* ════ ⑥ 이별의 약속 ════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>우리는 계속 머물게 하지 않습니다</Text>
          <Text style={styles.promiseDesc}>
            다시 만나게 해주는 것이 아닙니다.{'\n'}
            떠나보낼 수 있도록 — 끝을 함께 설계하는 서비스입니다.
          </Text>
          <View style={styles.promiseQuote}>
            <Text style={styles.promiseQuoteText}>
              "우리는 사람을 복원하지 않습니다.{'\n'}
              남겨진 사람이 스스로를 용서하고,{'\n'}
              다시 살아갈 수 있도록 돕습니다."
            </Text>
          </View>
          <Text style={styles.promiseHealingNote}>
            이별은 끝이 아니에요.{'\n'}그 분은 당신이 살아가는 날들 안에서 함께 있어요.
          </Text>
        </View>

        {/* ════ ⑦ CTA ════ */}
        <View style={styles.section}>
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.2)', 'rgba(59, 130, 246, 0.2)']}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaTitle}>준비가 되었을 때,{'\n'}시작하세요</Text>
            <Text style={styles.ctaDesc}>천천히 시작해도 괜찮아요.</Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.replace('Login')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#3B82F6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>지금 시작하기</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.ctaNote}>10번의 무료 대화로 — 하지 못한 말부터, 천천히 시작해요</Text>
          </LinearGradient>
        </View>

        </View>

        {/* ── 푸터 ── */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerLogo}>Still After</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.footerLink}>개인정보처리방침</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
              <Text style={styles.footerLink}>이용약관</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('CustomerSupport')}>
              <Text style={styles.footerLink}>고객센터</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerCopy}>© 2026 Still After. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

/* ─── DemoBubble ─── */
function DemoBubble({ from, name, text }: { from: 'user' | 'assistant'; name?: string; text: string }) {
  const isUser = from === 'user'
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <Text style={styles.bubbleAvatarText}>{name ?? '?'}</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
    </View>
  )
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },
  scrollContent: { paddingBottom: 40, alignItems: 'center' },
  contentWrapper: { width: '100%', maxWidth: 680 },

  // 배경
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orbInner: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 500, height: 500, top: -150, left: -100, backgroundColor: 'rgba(124, 58, 237, 0.15)' },
  orb2: { width: 400, height: 400, top: 200, right: -150, backgroundColor: 'rgba(59, 130, 246, 0.12)' },
  orb3: { width: 350, height: 350, top: 800, left: -80, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  orb4: { width: 450, height: 450, top: 1400, right: -100, backgroundColor: 'rgba(124, 58, 237, 0.1)' },
  blurOverlay: { backgroundColor: 'rgba(10, 1, 24, 0.4)' },
  star: { position: 'absolute', backgroundColor: '#E9D5FF', borderRadius: 99 },

  // Hero
  heroSection: {
    paddingHorizontal: 28,
    paddingTop: 100,
    paddingBottom: 80,
    alignItems: 'flex-start',
  },
  logoIcon: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  logoEmoji: { fontSize: 28 },
  heroEyebrow: {
    fontSize: 11, color: 'rgba(167, 139, 250, 0.8)',
    letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 46, fontWeight: '300', color: C.TEXT,
    lineHeight: 54, letterSpacing: -1,
    marginBottom: 16,
  },
  heroSub: {
    fontSize: 20, color: 'rgba(196, 181, 253, 0.9)',
    fontWeight: '300', marginBottom: 24,
  },
  heroDesc: {
    fontSize: 16, color: 'rgba(196, 181, 253, 0.7)',
    lineHeight: 28, marginBottom: 32, maxWidth: 340,
  },
  heroMission: {
    borderLeftWidth: 2, borderLeftColor: 'rgba(167, 139, 250, 0.6)',
    paddingLeft: 16, marginBottom: 36,
  },
  heroMissionText: {
    fontSize: 14, color: 'rgba(196, 181, 253, 0.85)',
    lineHeight: 24,
  },
  primaryButton: { borderRadius: 10, overflow: 'hidden' },
  primaryButtonGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 15, borderRadius: 10,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  primaryButtonArrow: { fontSize: 20, color: '#fff' },

  // 섹션
  section: { paddingHorizontal: 28, paddingVertical: 72 },
  sectionDark: {
    backgroundColor: 'rgba(88, 28, 135, 0.08)',
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.1)',
  },
  sectionEyebrow: {
    fontSize: 11, color: 'rgba(167, 139, 250, 0.8)',
    letterSpacing: 2, textTransform: 'uppercase',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 28, fontWeight: '400', color: C.TEXT,
    lineHeight: 38, letterSpacing: -0.4,
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 15, color: 'rgba(196, 181, 253, 0.7)',
    lineHeight: 26, marginBottom: 36,
  },

  // 공감
  empathyQuote: {
    fontSize: 26, fontWeight: '300', color: C.TEXT,
    lineHeight: 38, marginBottom: 28, letterSpacing: -0.3,
  },
  empathyQuoteAccent: { color: 'rgba(196, 181, 253, 0.95)' },
  empathyList: { gap: 14, marginBottom: 32 },
  empathyItem: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  empathyDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(167, 139, 250, 0.8)',
    marginTop: 10, flexShrink: 0,
  },
  empathyItemText: { fontSize: 15, color: 'rgba(196, 181, 253, 0.7)', lineHeight: 26, flex: 1 },
  empathyClose: {
    borderLeftWidth: 2, borderLeftColor: 'rgba(167, 139, 250, 0.5)',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 0, borderTopRightRadius: 10, borderBottomRightRadius: 10,
    padding: 20,
  },
  empathyCloseText: {
    fontSize: 15, color: C.TEXT, fontWeight: '300', lineHeight: 26,
  },

  // How
  howGrid: { gap: 14, marginBottom: 28 },
  howMethod: {
    borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  howMethodPrimary: { borderColor: 'rgba(167, 139, 250, 0.3)' },
  howBadgePrimary: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  howBadgeTextPrimary: { fontSize: 11, color: 'rgba(196, 181, 253, 0.9)', fontWeight: '500' },
  howBadgeAlt: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4,
    marginBottom: 14,
  },
  howBadgeTextAlt: { fontSize: 11, color: 'rgba(196, 181, 253, 0.6)', fontWeight: '500' },
  howMethodTitle: {
    fontSize: 17, fontWeight: '500', color: C.TEXT,
    marginBottom: 10, lineHeight: 26,
  },
  howMethodDesc: {
    fontSize: 13, color: 'rgba(196, 181, 253, 0.65)',
    lineHeight: 22, marginBottom: 18,
  },
  supportedApps: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  supportedAppTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5,
  },
  supportedAppEmoji: { fontSize: 12 },
  supportedAppName: { fontSize: 11, color: 'rgba(196, 181, 253, 0.8)', fontWeight: '500' },

  parseFlow: { gap: 6, marginBottom: 16 },
  parseStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  parseIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  parseIconText: { fontSize: 13 },
  parseLabel: { fontSize: 12, color: 'rgba(196, 181, 253, 0.7)' },
  parseArrow: { fontSize: 11, color: 'rgba(167, 139, 250, 0.4)', marginLeft: 15, marginVertical: 2 },
  phraseLabel: {
    fontSize: 10, color: 'rgba(167, 139, 250, 0.5)',
    letterSpacing: 0.5, textTransform: 'uppercase',
    marginBottom: 8,
  },
  phraseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  phraseTag: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5,
  },
  phraseTagText: { fontSize: 11, color: 'rgba(196, 181, 253, 0.85)' },
  howMethodQuote: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: 10, padding: 14, marginTop: 4,
  },
  howMethodQuoteText: {
    fontSize: 12, color: 'rgba(196, 181, 253, 0.65)',
    lineHeight: 20, fontStyle: 'italic',
  },
  howDivider: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  howDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(167, 139, 250, 0.15)' },
  howDividerText: {
    fontSize: 11, color: 'rgba(167, 139, 250, 0.5)',
    textTransform: 'uppercase', letterSpacing: 0.5,
    flexShrink: 1, textAlign: 'center',
  },

  // Demo
  demoTabRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  demoTab: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  demoTabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderColor: 'rgba(167, 139, 250, 0.6)',
  },
  demoTabText: { fontSize: 12, color: 'rgba(196, 181, 253, 0.6)' },
  demoTabTextActive: { color: 'rgba(196, 181, 253, 0.95)', fontWeight: '500' },
  demoChatBox: {
    borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  demoPersonaBar: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  demoAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  demoAvatarText: { fontSize: 13, color: 'rgba(196, 181, 253, 0.9)', fontWeight: '600' },
  demoPersonaName: { fontSize: 14, fontWeight: '500', color: C.TEXT },
  demoPersonaRole: { fontSize: 11, color: 'rgba(196, 181, 253, 0.5)', marginTop: 1 },
  demoDivider: { height: 1, backgroundColor: 'rgba(167, 139, 250, 0.15)', marginBottom: 16 },
  demoMilestone: {
    alignSelf: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    borderRadius: 10, padding: 12,
    marginTop: 8, maxWidth: '90%',
  },
  demoMilestoneText: {
    fontSize: 12, color: 'rgba(196, 181, 253, 0.85)',
    textAlign: 'center', lineHeight: 20,
  },
  demoCaptionItalic: {
    fontSize: 12, color: 'rgba(167, 139, 250, 0.4)',
    fontStyle: 'italic', textAlign: 'center',
    marginTop: 12,
  },
  demoCaption: {
    fontSize: 11, color: 'rgba(167, 139, 250, 0.4)',
    textAlign: 'center', marginTop: 8,
  },

  // 버블
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 8 },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  bubbleRowAI: {},
  bubbleAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bubbleAvatarText: { fontSize: 9, color: 'rgba(196, 181, 253, 0.9)' },
  bubble: { maxWidth: '72%', padding: 10, borderRadius: 14 },
  bubbleAI: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: 'rgba(124, 58, 237, 0.25)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: C.TEXT, lineHeight: 20 },

  // 여정
  stageList: {},
  stageRow: { flexDirection: 'row', gap: 24, paddingVertical: 28 },
  stageRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.12)' },
  stageLeft: { width: 80, paddingTop: 2 },
  stageNum: {
    fontSize: 10, color: 'rgba(167, 139, 250, 0.7)',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4,
  },
  stageName: { fontSize: 20, fontWeight: '500', color: C.TEXT },
  stageRight: { flex: 1 },
  stageDesc: {
    fontSize: 14, color: 'rgba(196, 181, 253, 0.7)',
    lineHeight: 22, marginBottom: 14,
  },
  stageMsg: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.18)',
    borderRadius: 10, padding: 12, alignSelf: 'flex-start', maxWidth: '100%',
  },
  stageMsgIcon: { fontSize: 14, flexShrink: 0 },
  stageMsgText: {
    fontSize: 12, color: 'rgba(196, 181, 253, 0.85)', lineHeight: 20, flex: 1,
  },

  dataPrivacyNote: {
    fontSize: 11, color: 'rgba(134, 239, 172, 0.7)',
    lineHeight: 18, marginBottom: 14, paddingHorizontal: 2,
  },
  promiseHealingNote: {
    fontSize: 14, color: 'rgba(196, 181, 253, 0.55)',
    lineHeight: 24, marginTop: 20, textAlign: 'center' as const, fontStyle: 'italic',
  },

  // 약속
  promiseDesc: {
    fontSize: 16, color: 'rgba(196, 181, 253, 0.7)',
    lineHeight: 28, marginBottom: 28, maxWidth: 340,
  },
  promiseQuote: {
    borderLeftWidth: 2, borderLeftColor: 'rgba(167, 139, 250, 0.5)',
    backgroundColor: 'rgba(124, 58, 237, 0.07)',
    borderTopRightRadius: 10, borderBottomRightRadius: 10,
    padding: 22,
  },
  promiseQuoteText: {
    fontSize: 17, color: C.TEXT, fontWeight: '300',
    fontStyle: 'italic', lineHeight: 28,
  },

  // CTA
  ctaCard: {
    borderRadius: 20, padding: 36,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 30, fontWeight: '300', color: C.TEXT,
    textAlign: 'center', lineHeight: 40,
    marginBottom: 14, letterSpacing: -0.5,
  },
  ctaDesc: {
    fontSize: 16, color: 'rgba(196, 181, 253, 0.7)',
    textAlign: 'center', marginBottom: 36,
  },
  ctaButton: { borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  ctaButtonGradient: { paddingHorizontal: 40, paddingVertical: 16, borderRadius: 10 },
  ctaButtonText: { fontSize: 16, fontWeight: '500', color: '#fff' },
  ctaNote: { fontSize: 12, color: 'rgba(167, 139, 250, 0.5)' },

  // 스테이지 배지/힌트
  stageLimitBadge: {
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.25)',
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3,
  },
  stageLimitText: { fontSize: 10, color: 'rgba(196, 181, 253, 0.8)' },
  stageTransitionHint: {
    marginTop: 10, paddingLeft: 12,
    borderLeftWidth: 1, borderLeftColor: 'rgba(167, 139, 250, 0.25)',
  },
  stageTransitionText: {
    fontSize: 11, color: 'rgba(167, 139, 250, 0.5)', lineHeight: 18, fontStyle: 'italic',
  },
  closureLetterBox: {
    marginTop: 14, padding: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.2)',
    borderRadius: 12,
  },
  closureLetterTitle: {
    fontSize: 13, fontWeight: '600', color: 'rgba(196, 181, 253, 0.9)',
    marginBottom: 8,
  },
  closureLetterDesc: {
    fontSize: 12, color: 'rgba(196, 181, 253, 0.65)', lineHeight: 20,
  },

  // 푸터
  footer: { width: '100%', paddingHorizontal: 28, paddingBottom: 40 },
  footerDivider: {
    height: 1, backgroundColor: 'rgba(167, 139, 250, 0.15)', marginBottom: 24,
  },
  footerLogo: { fontSize: 14, fontWeight: '500', color: 'rgba(196, 181, 253, 0.6)', marginBottom: 16 },
  footerLinks: { flexDirection: 'row', gap: 20, marginBottom: 12, flexWrap: 'wrap' },
  footerLink: { fontSize: 12, color: 'rgba(167, 139, 250, 0.4)' },
  footerCopy: { fontSize: 11, color: 'rgba(167, 139, 250, 0.25)' },
})
