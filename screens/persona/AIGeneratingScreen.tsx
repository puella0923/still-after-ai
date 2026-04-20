import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AIGenerating'>
  route: RouteProp<RootStackParamList, 'AIGenerating'>
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Star dots for cosmic background
const STAR_DOTS = Array.from({ length: 30 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.2 + (i % 5) * 0.1,
}))

export default function AIGeneratingScreen({ navigation, route }: Props) {
  const { name, personaId } = route.params
  const { t } = useLanguage()
  const STEPS = [t.aiGenerating.steps[1], t.aiGenerating.steps[2], t.aiGenerating.steps[3]]

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.8)).current
  const pulseAnim = useRef(new Animated.Value(1)).current
  const dot1 = useRef(new Animated.Value(0.3)).current
  const dot2 = useRef(new Animated.Value(0.3)).current
  const dot3 = useRef(new Animated.Value(0.3)).current
  const [currentStep, setCurrentStep] = React.useState(0)

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Pulse animation for the circle
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    )
    pulseLoop.start()

    // Dot animation loop
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: true }),
        ]),
      ])
    )
    dotLoop.start()

    // Step text changes
    const step1Timer = setTimeout(() => setCurrentStep(1), 1000)
    const step2Timer = setTimeout(() => setCurrentStep(2), 2200)

    // Navigate to chat after 3.5s
    const navTimer = setTimeout(() => {
      dotLoop.stop()
      pulseLoop.stop()
      navigation.replace('Chat', { personaId })
    }, 3500)

    return () => {
      dotLoop.stop()
      pulseLoop.stop()
      clearTimeout(step1Timer)
      clearTimeout(step2Timer)
      clearTimeout(navTimer)
    }
  }, [])

  return (
    <View style={styles.container}>
      {/* Cosmic gradient background */}
      <LinearGradient
        colors={['#1a0118', '#200a2e', '#0f0520']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Gradient orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      {/* Star dots */}
      {STAR_DOTS.map((star, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: star.top as any,
            left: star.left as any,
            width: star.size,
            height: star.size,
            borderRadius: star.size / 2,
            backgroundColor: '#fff',
            opacity: star.opacity,
          }}
        />
      ))}

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Pulsing circle */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={['rgba(168, 85, 247, 0.3)', 'rgba(219, 39, 119, 0.2)']}
            style={styles.circleOuter}
          >
            <View style={styles.circleInner}>
              <Text style={styles.circleEmoji}>✨</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main text */}
        <Text style={styles.mainText}>
          {(t.aiGenerating.steps[0] as (name: string) => string)(name)}
        </Text>

        {/* Step text */}
        <Text style={styles.stepText}>{STEPS[currentStep]}</Text>

        {/* Dot animation */}
        <View style={styles.dotsRow}>
          {[dot1, dot2, dot3].map((dot, i) => (
            <Animated.View key={i}>
              <LinearGradient
                colors={['#a855f7', '#db2777']}
                style={[styles.dot]}
              >
                <Animated.View
                  style={[StyleSheet.absoluteFillObject, { opacity: dot }]}
                />
              </LinearGradient>
            </Animated.View>
          ))}
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <Animated.View style={styles.progressFill}>
            <LinearGradient
              colors={['#a855f7', '#db2777']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        </View>

        <Text style={styles.notice}>
          {t.aiGenerating.waitNote}
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orb1: {
    width: 300,
    height: 300,
    top: '10%',
    right: '-15%',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: '10%',
    left: '-10%',
    backgroundColor: 'rgba(219, 39, 119, 0.12)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 28,
  },
  circleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  circleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any
      : {}),
  },
  circleEmoji: {
    fontSize: 40,
  },
  mainText: {
    fontSize: 26,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: 0.3,
  },
  stepText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressBg: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  notice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    marginTop: 8,
  },
})
