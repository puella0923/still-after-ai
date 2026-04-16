import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
  Linking,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { C, RADIUS } from '../theme'
import { signInWithGoogle } from '../../services/authService'

const { width, height } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>
}

// Deterministic star positions
const STARS = Array.from({ length: 40 }, (_, i) => ({
  left: ((i * 97 + 31) % 100),
  top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5,
  opacity: 0.2 + (i % 5) * 0.12,
}))

export default function LoginScreen({ navigation }: Props) {
  const { session } = useAuth()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const iconScale = useRef(new Animated.Value(0)).current

  const handleGoogleSignIn = async (): Promise<void> => {
    const result = await signInWithGoogle()
    if (!result.success) {
      Alert.alert('구글 로그인', result.error ?? '구글 로그인에 실패했습니다.')
    }
  }

  useEffect(() => {
    if (session) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    }
  }, [session, navigation])


  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 600, useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1, delay: 200, friction: 6, useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <View style={styles.root}>
      {/* Gradient background */}
      <LinearGradient
        colors={['#0a0118', '#1a0f3e', '#0f0520']}
        style={StyleSheet.absoluteFill}
      />

      {/* Cosmic gradient orbs */}
      <View style={styles.orbContainer}>
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbBlue]} />
      </View>

      {/* Stars */}
      {STARS.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              borderRadius: star.size,
            },
          ]}
        />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerWrap}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Glassmorphism card */}
            <LinearGradient
              colors={['rgba(88, 28, 135, 0.4)', 'rgba(30, 58, 138, 0.4)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Header */}
              <View style={styles.header}>
                <Animated.View
                  style={[
                    styles.iconWrap,
                    { transform: [{ scale: iconScale }] },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']}
                    style={styles.iconGradient}
                  >
                    <Text style={styles.iconText}>💜</Text>
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.title}>Still After</Text>
                <Text style={styles.tagline}>당신 곁을 여전히</Text>
              </View>

              {/* Google login button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.85}
              >
                <View style={styles.googleButtonInner}>
                  <Text style={styles.googleButtonIcon}>G</Text>
                  <Text style={styles.googleButtonText}>구글로 시작하기</Text>
                </View>
              </TouchableOpacity>

              {/* Email login button */}
              <TouchableOpacity
                style={styles.emailButton}
                onPress={() => navigation.navigate('EmailAuth')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emailButtonGradient}
                >
                  <Text style={styles.emailButtonIcon}>✉️</Text>
                  <Text style={styles.emailButtonText}>이메일로 시작하기</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Free trial notice */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💳 카드 등록 없이 바로 시작할 수 있어요{'\n'}
                  <Text style={styles.infoTextHighlight}>첫 10번의 대화는 무료예요</Text>
                </Text>
              </View>

              {/* AI Notice */}
              <Text style={styles.aiNotice}>
                Still After는 실제 인물을 복원하지 않아요.{'\n'}감정이 자연스럽게 자리 잡을 수 있도록{'\n'}조심스럽게 함께하는 공간이에요.
              </Text>

              {/* Back */}
              <TouchableOpacity
                onPress={() => {
                  if (navigation.canGoBack()) navigation.goBack()
                  else navigation.navigate('Onboarding')
                }}
                style={styles.backButton}
              >
                <Text style={styles.backText}>← 돌아가기</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  safeArea: { flex: 1 },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  // Orbs
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: {
    position: 'absolute',
    width: 384,
    height: 384,
    borderRadius: 192,
  },
  orbPurple: {
    top: -100,
    left: width * 0.25 - 192,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
  },
  orbBlue: {
    bottom: -100,
    right: width * 0.25 - 192,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
  },

  // Stars
  star: {
    position: 'absolute',
    backgroundColor: '#E9D5FF',
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  cardGradient: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    // CSS backdropFilter for web
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  iconText: { fontSize: 28 },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: C.TEXT,
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(196, 181, 253, 0.8)',
  },

  // Google button
  googleButton: {
    borderRadius: RADIUS.MD,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  googleButtonIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '700',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Email button
  emailButton: {
    borderRadius: RADIUS.MD,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  emailButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: RADIUS.MD,
    gap: 8,
  },
  emailButtonIcon: { fontSize: 18 },
  emailButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Feature mini cards
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  featureCard: {
    flex: 1,
    backgroundColor: 'rgba(88, 28, 135, 0.25)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  featureEmoji: { fontSize: 20, marginBottom: 6 },
  featureLabel: {
    fontSize: 10,
    color: 'rgba(196, 181, 253, 0.8)',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Info box
  infoBox: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderRadius: RADIUS.MD,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    marginBottom: 16,
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
  infoTextHighlight: {
    color: 'rgba(196, 181, 253, 1)',
    fontWeight: '600',
  },

  // AI notice
  aiNotice: {
    fontSize: 11,
    color: C.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },

  // Footer links
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 11,
    color: 'rgba(167, 139, 250, 0.6)',
    textDecorationLine: 'underline',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  footerDot: {
    fontSize: 11,
    color: 'rgba(167, 139, 250, 0.3)',
  },

  // Back
  backButton: { alignItems: 'center', paddingVertical: 4 },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(196, 181, 253, 0.8)',
  },
})
