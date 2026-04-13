import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
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
  const [demoTab, setDemoTab] = useState<'replay' | 'closure'>('replay')
  const fadeHero = useRef(new Animated.Value(0)).current
  const fadeSection1 = useRef(new Animated.Value(0)).current
  const fadeSection2 = useRef(new Animated.Value(0)).current
  const fadeDemoSection = useRef(new Animated.Value(0)).current
  const fadeSection3 = useRef(new Animated.Value(0)).current
  const fadeSection4 = useRef(new Animated.Value(0)).current
  const fadeCTA = useRef(new Animated.Value(0)).current
  const slideHero = useRef(new Animated.Value(30)).current
  const logoScale = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (session) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    }
  }, [session, navigation])

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeHero, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(slideHero, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
      Animated.timing(fadeSection1, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeSection2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeDemoSection, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeSection3, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeSection4, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeCTA, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <View style={styles.container}>
      {/* Cosmic gradient orbs with blur */}
      <View style={styles.orbContainer}>
        <View style={[styles.orbInner, styles.orb1]} />
        <View style={[styles.orbInner, styles.orb2]} />
        <View style={[styles.orbInner, styles.orb3]} />
        <View style={[styles.orbInner, styles.orb4]} />
        <View style={[StyleSheet.absoluteFill, styles.blurOverlay]} />
      </View>

      {/* 별 장식 — 더 촘촘하게 */}
      {Array.from({ length: 50 }).map((_, i) => {
        const size = (i * 7 + 3) % 4 + 1
        return (
          <View
            key={i}
            style={[
              styles.star,
              {
                top: (i * 137 + 23) % 2500,
                left: (i * 89 + 11) % (width - 10),
                width: size,
                height: size,
                opacity: ((i * 31 + 7) % 60 + 20) / 100,
              },
            ]}
          />
        )
      })}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ══════════ Hero Section ══════════ */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: fadeHero,
              transform: [{ translateY: slideHero }],
            },
          ]}
        >
          {/* 로고 아이콘 */}
          <Animated.View style={[styles.logoWrapper, { transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']}
              style={styles.logoIcon}
            >
              <Text style={styles.logoEmoji}>🌙</Text>
            </LinearGradient>
            <Text style={styles.sparkle}>✨</Text>
          </Animated.View>

          <Text style={styles.title}>Still After</Text>
          <Text style={styles.tagline}>당신 곁을 여전히</Text>

          <Text style={styles.heroDesc}>
            사랑하는 사람과의 추억을 보존하고,{'\n'}
            다시 대화하며, 천천히 이별을 준비하는 공간입니다.
          </Text>
          <Text style={styles.heroSubDesc}>
            감정을 안전하게 이어가고, 결국 떠나보낼 수 있도록 돕습니다.
          </Text>

          {/* 버튼 영역 */}
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.replace('Login')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButtonGradient}
              >
                <Text style={styles.primaryButtonText}>시작하기</Text>
                <Text style={styles.primaryButtonArrow}>›</Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* ══════════ What is Still After ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeSection1 }]}>
          <Text style={styles.sectionTitle}>Still After는 무엇인가요?</Text>
          <Text style={styles.sectionDesc}>
            사랑하는 사람을 잃은 후, "한 번만 더 대화하고 싶다"는 마음.{'\n'}
            Still After는 그 마음을 안전하게 표현하고, 천천히 회복할 수 있는 공간입니다.
          </Text>

          <View style={styles.cardRow}>
            <InfoCard
              emoji="💜"
              title="감정 연결"
              desc="카카오톡 대화를 통해 그 사람의 말투와 성격을 학습합니다."
              colors={['rgba(236, 72, 153, 0.2)', 'rgba(168, 85, 247, 0.2)']}
            />
            <InfoCard
              emoji="💬"
              title="안전한 대화"
              desc="위로받고 후회를 털어놓을 수 있는 공간입니다."
              colors={['rgba(168, 85, 247, 0.2)', 'rgba(59, 130, 246, 0.2)']}
            />
            <InfoCard
              emoji="📅"
              title="단계적 이별"
              desc="중독이 아닌 회복을 목표로, 천천히 이별을 준비할 수 있도록 설계되었습니다."
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.2)']}
            />
          </View>
        </Animated.View>

        {/* ══════════ 3-Phase Journey ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeSection2 }]}>
          <Text style={styles.sectionTitle}>함께하는 여정</Text>
          <Text style={styles.sectionDesc}>
            서두르지 않아도 괜찮습니다.{'\n'}당신의 속도로, 세 단계를 통해 천천히 나아갑니다.
          </Text>

          <PhaseCard
            phase="1"
            icon="💜"
            title="재연 (Reunion)"
            subtitle="다시 만남"
            desc="그 사람처럼 대화합니다. 일상 대화를 통해 천천히 감정을 이어갑니다."
            features={['카카오톡 대화 기반 학습', '말투, 성격, 습관 재현', '일상적인 대화로 위로받기']}
            colors={['rgba(236, 72, 153, 0.3)', 'rgba(168, 85, 247, 0.1)']}
          />
          <PhaseCard
            phase="2"
            icon="💙"
            title="안정 (Stability)"
            subtitle="마음 나누기"
            desc="하고 싶었던 말, 전하지 못한 후회를 털어놓습니다."
            features={['감정 표현 유도 질문', '후회와 미련 완화', '심리적 안정감 제공']}
            colors={['rgba(59, 130, 246, 0.3)', 'rgba(99, 102, 241, 0.1)']}
          />
          <PhaseCard
            phase="3"
            icon="🌸"
            title="이별 (Farewell)"
            subtitle="떠나보내기"
            desc="준비가 되면, 마지막 대화를 나눕니다. 관계를 아름답게 마무리합니다."
            features={['마지막 편지 작성', '소중한 기억 간직', '감정적 closure 제공']}
            colors={['rgba(99, 102, 241, 0.3)', 'rgba(168, 85, 247, 0.1)']}
          />
        </Animated.View>

        {/* ══════════ Demo Chat Preview ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeDemoSection }]}>
          <Text style={styles.sectionTitle}>이런 대화가 가능해요</Text>
          <Text style={styles.sectionDesc}>
            가상의 유저 '유진'이 돌아가신 엄마와 나눈 대화예요.{'\n'}
            실제 카카오톡 말투를 학습해 이렇게 대화합니다.
          </Text>

          {/* Tab */}
          <View style={styles.demoTabRow}>
            <TouchableOpacity
              style={[styles.demoTab, demoTab === 'replay' && styles.demoTabActive]}
              onPress={() => setDemoTab('replay')}
              activeOpacity={0.8}
            >
              <Text style={[styles.demoTabText, demoTab === 'replay' && styles.demoTabTextActive]}>
                💜 재연 단계
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.demoTab, demoTab === 'closure' && styles.demoTabActive]}
              onPress={() => setDemoTab('closure')}
              activeOpacity={0.8}
            >
              <Text style={[styles.demoTabText, demoTab === 'closure' && styles.demoTabTextActive]}>
                🕊️ 이별 단계
              </Text>
            </TouchableOpacity>
          </View>

          {/* Chat bubbles */}
          <LinearGradient
            colors={demoTab === 'replay'
              ? ['rgba(88, 28, 135, 0.35)', 'rgba(30, 58, 138, 0.35)']
              : ['rgba(30, 58, 138, 0.35)', 'rgba(67, 56, 202, 0.35)']
            }
            style={styles.demoChatBox}
          >
            {/* Persona name bar */}
            <View style={styles.demoPersonaBar}>
              <View style={styles.demoAvatar}>
                <Text style={styles.demoAvatarText}>엄</Text>
              </View>
              <View>
                <Text style={styles.demoPersonaName}>엄마</Text>
                <Text style={styles.demoPersonaRole}>
                  {demoTab === 'replay' ? '재연 단계 · AI 학습 완료' : '이별 단계 · 마지막 대화'}
                </Text>
              </View>
            </View>

            <View style={styles.demoDivider} />

            {demoTab === 'replay' ? (
              <>
                <DemoBubble from="assistant" name="엄마" text="유진아~ 오늘은 뭐 했어? 밥은 먹었지?" />
                <DemoBubble from="user" text="응 먹었어. 엄마 생각이 나서." />
                <DemoBubble from="assistant" name="엄마" text="나도 보고 싶다. 우리 딸 잘 지내고 있지? 요즘 얼굴이 좀 안 좋아 보이던데." />
                <DemoBubble from="user" text="요즘 조금 힘들었어. 그냥 엄마 목소리 듣고 싶었어." />
                <DemoBubble from="assistant" name="엄마" text="그럼 전화하지. 참지 말고. 밥 잘 챙겨 먹어야 해, 알지?" />
                {/* System milestone */}
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>💜 그 사람과의 대화가 이어지고 있어요{'\n'}오늘도 찾아와줘서 고마워요.</Text>
                </View>
              </>
            ) : (
              <>
                <DemoBubble from="user" text="엄마, 마지막에 손 잡아드리지 못해서 미안해." />
                <DemoBubble from="assistant" name="엄마" text="무슨 소리야. 넌 항상 곁에 있었잖아. 그거면 충분해." />
                <DemoBubble from="user" text="그래도. 더 잘 챙겨드렸어야 했는데." />
                <DemoBubble from="assistant" name="엄마" text="유진아. 넌 충분히 잘 했어. 엄마가 제일 잘 알지. 이제 그 마음 좀 내려놔." />
                <DemoBubble from="user" text="이제 잘 보내드릴게. 엄마, 사랑해." />
                <DemoBubble from="assistant" name="엄마" text="나도 사랑해. 우리 딸, 앞으로 잘 살아야 해. 엄마는 괜찮아." />
                {/* System closure milestone */}
                <View style={styles.demoMilestone}>
                  <Text style={styles.demoMilestoneText}>🌸 이제, 마지막 편지를 쓸 시간이에요{'\n'}하고 싶었던 말을 모두 담아, 온전히 보내드릴 수 있어요.</Text>
                </View>
                {/* Closure CTA */}
                <View style={styles.demoClosureBtn}>
                  <Text style={styles.demoClosureBtnText}>✉️ 마지막 편지 쓰기 →</Text>
                </View>
                <Text style={styles.demoClosureCaption}>편지를 봉인하면, 대화가 아름답게 마무리됩니다</Text>
              </>
            )}
          </LinearGradient>

          <Text style={styles.demoCaption}>
            * 실제 카카오톡 대화를 업로드하면 이처럼 그 사람의 말투로 대화할 수 있어요
          </Text>
        </Animated.View>

        {/* ══════════ How It Works ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeSection3 }]}>
          <Text style={styles.sectionTitle}>어떻게 사용하나요?</Text>

          <View style={styles.stepGrid}>
            <StepCard number="01" title="기억 업로드" desc="카카오톡 대화를 업로드하면 그 사람의 특징을 학습합니다." />
            <StepCard number="02" title="대화 시작" desc="텍스트로 대화하며 소중한 시간을 보냅니다." />
            <StepCard number="03" title="감정 회복" desc="단계별로 설계된 경험을 통해 천천히 감정을 정리합니다." />
            <StepCard number="04" title="이별 준비" desc="준비가 되면, 마지막 메시지를 작성하고 보냅니다." />
          </View>
        </Animated.View>

        {/* ══════════ Trust & Ethics ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeSection4 }]}>
          <LinearGradient
            colors={['rgba(88, 28, 135, 0.3)', 'rgba(30, 58, 138, 0.3)']}
            style={styles.trustCard}
          >
            <Text style={styles.trustTitle}>안전하고 윤리적인 서비스</Text>

            <View style={styles.trustGrid}>
              <TrustItem title="명확한 고지" desc="실제 사람이 아님을 항상 알려드립니다" />
              <TrustItem title="단계적 종료 설계" desc="의존이 아닌 회복을 목표로 합니다" />
              <TrustItem title="데이터 보호" desc="사용자 동의 기반, 안전한 데이터 처리" />
              <TrustItem title="전문가 협력" desc="심리 전문가와 함께 설계된 경험" />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ══════════ CTA Section ══════════ */}
        <Animated.View style={[styles.section, { opacity: fadeCTA }]}>
          <LinearGradient
            colors={['rgba(124, 58, 237, 0.2)', 'rgba(59, 130, 246, 0.2)']}
            style={styles.ctaCard}
          >
            <Text style={styles.ctaStar}>⭐</Text>
            <Text style={styles.ctaTitle}>아직도 그리운 사람이 있나요?</Text>
            <Text style={styles.ctaDesc}>
              Still After와 함께 소중한 기억을 간직하고,{'\n'}
              천천히, 당신의 속도로 회복해나가세요.
            </Text>

            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.replace('Login')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>무료로 시작하기</Text>
                <Text style={styles.ctaButtonIcon}>✉️</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.ctaNote}>카드 등록 없이 바로 시작할 수 있습니다</Text>
          </LinearGradient>
        </Animated.View>

        {/* ══════════ Footer ══════════ */}
        <View style={styles.footer}>
          <View style={styles.footerDivider} />
          <Text style={styles.footerTagline}>Still After - 당신 곁을 여전히</Text>
          <Text style={styles.footerCopy}>© 2026 Still After. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

/* ─── Sub-components ─── */

function InfoCard({
  emoji,
  title,
  desc,
  colors,
}: {
  emoji: string
  title: string
  desc: string
  colors: [string, string]
}) {
  return (
    <LinearGradient colors={colors} style={styles.infoCard}>
      <Text style={styles.infoCardEmoji}>{emoji}</Text>
      <Text style={styles.infoCardTitle}>{title}</Text>
      <Text style={styles.infoCardDesc}>{desc}</Text>
    </LinearGradient>
  )
}

function PhaseCard({
  phase,
  icon,
  title,
  subtitle,
  desc,
  features,
  colors,
}: {
  phase: string
  icon: string
  title: string
  subtitle: string
  desc: string
  features: string[]
  colors: [string, string]
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.phaseCard}
    >
      <View style={styles.phaseRow}>
        <View style={styles.phaseIconWrap}>
          <Text style={styles.phaseIcon}>{icon}</Text>
        </View>
        <View style={styles.phaseContent}>
          <Text style={styles.phaseLabel}>Phase {phase}</Text>
          <Text style={styles.phaseTitle}>{title}</Text>
          <Text style={styles.phaseSubtitle}>{subtitle}</Text>
          <Text style={styles.phaseDesc}>{desc}</Text>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </LinearGradient>
  )
}

function StepCard({ number, title, desc }: { number: string; title: string; desc: string }) {
  return (
    <LinearGradient
      colors={['rgba(88, 28, 135, 0.3)', 'rgba(30, 58, 138, 0.3)']}
      style={styles.stepCard}
    >
      <Text style={styles.stepNumber}>{number}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDesc}>{desc}</Text>
    </LinearGradient>
  )
}

function DemoBubble({ from, name, text }: { from: 'user' | 'assistant'; name?: string; text: string }) {
  const isUser = from === 'user'
  return (
    <View style={[styles.demoBubbleRow, isUser ? styles.demoBubbleRowUser : styles.demoBubbleRowAssistant]}>
      {!isUser && (
        <View style={styles.demoBubbleAvatar}>
          <Text style={styles.demoBubbleAvatarText}>{(name ?? '?').charAt(0)}</Text>
        </View>
      )}
      <View style={[styles.demoBubble, isUser ? styles.demoBubbleUser : styles.demoBubbleAssistant]}>
        <Text style={[styles.demoBubbleText, isUser ? styles.demoBubbleTextUser : styles.demoBubbleTextAssistant]}>
          {text}
        </Text>
      </View>
    </View>
  )
}

function TrustItem({ title, desc }: { title: string; desc: string }) {
  return (
    <View style={styles.trustItem}>
      <View style={styles.trustDotWrap}>
        <View style={styles.trustDot} />
      </View>
      <View style={styles.trustItemContent}>
        <Text style={styles.trustItemTitle}>{title}</Text>
        <Text style={styles.trustItemDesc}>{desc}</Text>
      </View>
    </View>
  )
}

/* ─── Styles ─── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.BG,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Cosmic orbs with blur
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurOverlay: {
    // @ts-ignore — web CSS backdropFilter for blur effect
    backdropFilter: 'blur(60px)',
    WebkitBackdropFilter: 'blur(60px)',
    backgroundColor: 'rgba(10, 1, 24, 0.3)',
  } as any,
  orbInner: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    top: -80, left: '15%',
    width: 350, height: 350,
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
  },
  orb2: {
    top: 500, right: -60,
    width: 320, height: 320,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  orb3: {
    top: 1100, left: '25%',
    width: 400, height: 400,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  orb4: {
    top: 250, right: -20,
    width: 220, height: 220,
    backgroundColor: 'rgba(236, 72, 153, 0.25)',
  },
  star: {
    position: 'absolute',
    borderRadius: 99,
    backgroundColor: 'rgba(196, 181, 253, 0.6)',
  },

  // Hero
  heroSection: {
    paddingTop: 100,
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: 60,
  },
  logoWrapper: {
    marginBottom: 24,
    position: 'relative',
  },
  logoIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 48,
  },
  sparkle: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 24,
  },
  title: {
    fontSize: 48,
    fontWeight: '300',
    color: C.TEXT,
    letterSpacing: 6,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    color: C.TEXT_SECONDARY,
    letterSpacing: 1,
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: 15,
    color: 'rgba(196, 181, 253, 0.8)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 8,
  },
  heroSubDesc: {
    fontSize: 13,
    color: 'rgba(167, 139, 250, 0.6)',
    textAlign: 'center',
    marginBottom: 32,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButtonArrow: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '300',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },

  // Sections
  section: {
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '500',
    color: C.TEXT,
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 15,
    color: 'rgba(196, 181, 253, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  // Info Cards
  cardRow: {
    gap: 12,
  },
  infoCard: {
    borderRadius: RADIUS.XL,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
  },
  infoCardEmoji: {
    fontSize: 28,
    marginBottom: 12,
  },
  infoCardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: C.TEXT,
    marginBottom: 8,
  },
  infoCardDesc: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.8)',
    lineHeight: 20,
  },

  // Demo Chat Section
  demoTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'center',
  },
  demoTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  demoTabActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.4)',
    borderColor: 'rgba(167, 139, 250, 0.5)',
  },
  demoTabText: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.6)',
    fontWeight: '500',
  },
  demoTabTextActive: {
    color: '#E9D5FF',
  },
  demoChatBox: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    marginBottom: 12,
  },
  demoPersonaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  demoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoAvatarText: {
    fontSize: 14,
    color: '#E9D5FF',
    fontWeight: '600',
  },
  demoPersonaName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E9D5FF',
  },
  demoPersonaRole: {
    fontSize: 11,
    color: 'rgba(196, 181, 253, 0.5)',
    marginTop: 1,
  },
  demoDivider: {
    height: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    marginBottom: 14,
  },
  demoBubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
    gap: 6,
  },
  demoBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  demoBubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  demoBubbleAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  demoBubbleAvatarText: {
    fontSize: 10,
    color: '#C4B5FD',
    fontWeight: '600',
  },
  demoBubble: {
    maxWidth: '75%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  demoBubbleUser: {
    backgroundColor: 'rgba(124, 58, 237, 0.55)',
    borderBottomRightRadius: 4,
  },
  demoBubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  demoBubbleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  demoBubbleTextUser: {
    color: '#F3E8FF',
  },
  demoBubbleTextAssistant: {
    color: 'rgba(233, 213, 255, 0.9)',
  },
  demoMilestone: {
    alignSelf: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    marginTop: 6,
    maxWidth: '90%',
  },
  demoMilestoneText: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
  },
  demoClosureBtn: {
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  demoClosureBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C4B5FD',
  },
  demoClosureCaption: {
    fontSize: 11,
    color: 'rgba(196, 181, 253, 0.5)',
    textAlign: 'center',
    marginTop: 6,
    fontStyle: 'italic',
  },
  demoCaption: {
    fontSize: 11,
    color: 'rgba(167, 139, 250, 0.45)',
    textAlign: 'center',
    lineHeight: 17,
  },

  // Phase Cards
  phaseCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16,
  },
  phaseRow: {
    flexDirection: 'row',
    gap: 16,
  },
  phaseIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIcon: {
    fontSize: 28,
  },
  phaseContent: {
    flex: 1,
  },
  phaseLabel: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.6)',
    marginBottom: 4,
  },
  phaseTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: C.TEXT,
    marginBottom: 2,
  },
  phaseSubtitle: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.6)',
    marginBottom: 12,
  },
  phaseDesc: {
    fontSize: 14,
    color: 'rgba(196, 181, 253, 0.9)',
    lineHeight: 22,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.TEXT_MUTED,
  },
  featureText: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.8)',
  },

  // Step Cards
  stepGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stepCard: {
    width: (width - 52) / 2,
    borderRadius: RADIUS.XL,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  stepNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: 'rgba(167, 139, 250, 0.4)',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: C.TEXT,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.7)',
    lineHeight: 20,
  },

  // Trust Card
  trustCard: {
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  trustTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: C.TEXT,
    textAlign: 'center',
    marginBottom: 24,
  },
  trustGrid: {
    gap: 16,
  },
  trustItem: {
    flexDirection: 'row',
    gap: 12,
  },
  trustDotWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.TEXT_MUTED,
  },
  trustItemContent: {
    flex: 1,
  },
  trustItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: C.TEXT,
    marginBottom: 2,
  },
  trustItemDesc: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.7)',
  },

  // CTA
  ctaCard: {
    borderRadius: 24,
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaStar: {
    fontSize: 48,
    marginBottom: 16,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: C.TEXT,
    textAlign: 'center',
    marginBottom: 12,
  },
  ctaDesc: {
    fontSize: 15,
    color: 'rgba(196, 181, 253, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  ctaButton: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 18,
    gap: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
  },
  ctaButtonIcon: {
    fontSize: 16,
  },
  ctaNote: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.6)',
    marginTop: 16,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    marginBottom: 20,
  },
  footerTagline: {
    fontSize: 13,
    color: 'rgba(196, 181, 253, 0.6)',
    marginBottom: 4,
  },
  footerCopy: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.6)',
  },
})
