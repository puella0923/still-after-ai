import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AIGenerating'>
  route: RouteProp<RootStackParamList, 'AIGenerating'>
}

const AI_GENERATING_ORBS = [
  { top: '10%', right: '-15%', color: 'rgba(168, 85, 247, 0.15)', size: 300 },
  { bottom: '10%', left: '-10%', color: 'rgba(219, 39, 119, 0.12)', size: 250 },
]

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
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start()

    // Pulse animation for the circle
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    )
    pulseLoop.start()

    // Dot animation loop
    const dotLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(dot2, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(dot3, { toValue: 1, duration: 300, useNativeDriver: Platform.OS !== 'web' }),
        Animated.delay(200),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.3, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dot2, { toValue: 0.3, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(dot3, { toValue: 0.3, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      ])
    )
    dotLoop.start()

    // Step text changes
    const step1Timer = setTimeout(() => setCurrentStep(1), 1000)
    const step2Timer = setTimeout(() => setCurrentStep(2), 2200)

    // Navigate to chat after 3.5s
    // QA fix: reset stack to [Main, Chat] so back from Chat goes to Home
    // (instead of leaking the persona create flow: CareSelect → RelationSetup → TimingCheck)
    const navTimer = setTimeout(() => {
      dotLoop.stop()
      pulseLoop.stop()
      navigation.reset({
        index: 1,
        routes: [
          { name: 'Main' },
          { name: 'Chat', params: { personaId } },
        ],
      })
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
      <CosmicBackground
        colors={['#1a0118', '#200a2e', '#0f0520']}
        orbs={AI_GENERATING_ORBS}
        starCount={30}
      />

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
          {typeof t.aiGenerating.steps[0] === 'function' ? (t.aiGenerating.steps[0] as (name: string) => string)(name) : String(t.aiGenerating.steps[0])}
        </Text>

        {/* Step text */}
        <Text style={styles.stepText}>{typeof STEPS[currentStep] === 'function' ? (STEPS[currentStep] as (name: string) => string)(name) : String(STEPS[currentStep] ?? '')}</Text>

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
