import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { C, RADIUS } from '../theme'

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
                    <Text style={styles.iconText}>🔒</Text>
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.title}>Still After</Text>
                <Text style={styles.tagline}>당신 곁을 여전히</Text>
              </View>

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

              {/* Info box */}
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💳 카드 등록 없이 바로 시작할 수 있습니다.{'\n'}
                  10회 이후 결제 화면으로 이동합니다.
                </Text>
              </View>

              {/* AI Notice */}
              <Text style={styles.aiNotice}>
                Still After는 실제 인물을 대체하지 않아요.{'\n'}
                감정을 조심스럽게 이어가고{'\n'}
                천천히 보내드리기 위한 공간이에요.
              </Text>

              {/* Footer links */}
              <Text style={styles.footerLinks}>
                서비스 이용약관 · 개인정보처리방침
              </Text>

              {/* Back */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
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

  // Info box
  infoBox: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)',
    borderRadius: RADIUS.MD,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    marginBottom: 20,
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(196, 181, 253, 0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // AI notice
  aiNotice: {
    fontSize: 11,
    color: C.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },

  // Footer
  footerLinks: {
    fontSize: 11,
    color: 'rgba(167, 139, 250, 0.5)',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 16,
  },

  // Back
  backButton: { alignItems: 'center', paddingVertical: 4 },
  backText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(196, 181, 253, 0.8)',
  },
})
