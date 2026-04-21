import React from 'react'
import { Animated, Dimensions, Easing, Platform, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type Props = {
  triggerKey?: number
}

export default function ShootingMeteor({ triggerKey }: Props) {
  const meteorProgress = React.useRef(new Animated.Value(0)).current
  const meteorOpacity = React.useRef(new Animated.Value(0)).current
  const meteorTailScale = React.useRef(new Animated.Value(0.7)).current
  const meteorHeadGlow = React.useRef(new Animated.Value(0.75)).current
  const meteorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const meteorStartXRef = React.useRef(-220)
  const meteorStartYRef = React.useRef(-220)
  const meteorTravelRef = React.useRef(760)
  const meteorAngleRef = React.useRef(315)

  React.useEffect(() => {
    const randomInRange = (min: number, max: number) => min + Math.random() * (max - min)
    const useNativeDriver = Platform.OS !== 'web'

    const scheduleMeteor = () => {
      const waitMs = randomInRange(7000, 17000)
      meteorTimerRef.current = setTimeout(() => {
        const startX = randomInRange(SCREEN_WIDTH * 0.08, SCREEN_WIDTH * 0.92)
        const startY = randomInRange(8, SCREEN_HEIGHT * 0.12)
        const travel = randomInRange(620, 980)
        const travelDuration = randomInRange(730, 1060)
        const isLeftToRight = Math.random() > 0.5
        const angleDeg = isLeftToRight ? randomInRange(20, 30) : randomInRange(150, 160)

        meteorStartXRef.current = startX
        meteorStartYRef.current = startY
        meteorTravelRef.current = travel
        meteorAngleRef.current = angleDeg
        meteorProgress.setValue(0)
        meteorOpacity.setValue(0)
        meteorTailScale.setValue(0.7)
        meteorHeadGlow.setValue(0.75)

        Animated.parallel([
          Animated.sequence([
            Animated.timing(meteorOpacity, { toValue: 0.12, duration: 55, easing: Easing.linear, useNativeDriver }),
            Animated.timing(meteorOpacity, { toValue: 1, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver }),
            Animated.timing(meteorOpacity, { toValue: 0.15, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver }),
            Animated.delay(Math.max(80, travelDuration * 0.36)),
            Animated.timing(meteorOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver }),
          ]),
          Animated.sequence([
            Animated.timing(meteorTailScale, { toValue: 1, duration: Math.max(90, travelDuration * 0.22), easing: Easing.out(Easing.cubic), useNativeDriver }),
            Animated.timing(meteorTailScale, { toValue: 0.02, duration: Math.max(220, travelDuration * 0.78), easing: Easing.in(Easing.quad), useNativeDriver }),
          ]),
          Animated.sequence([
            Animated.timing(meteorHeadGlow, { toValue: 1.8, duration: 95, easing: Easing.out(Easing.quad), useNativeDriver }),
            Animated.timing(meteorHeadGlow, { toValue: 0.78, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver }),
          ]),
          Animated.timing(meteorProgress, { toValue: 1, duration: travelDuration, easing: Easing.linear, useNativeDriver }),
        ]).start(() => scheduleMeteor())
      }, waitMs)
    }

    scheduleMeteor()
    return () => {
      if (meteorTimerRef.current) clearTimeout(meteorTimerRef.current)
    }
  }, [meteorHeadGlow, meteorOpacity, meteorProgress, meteorTailScale])

  React.useEffect(() => {
    if (typeof triggerKey !== 'number') return
    const useNativeDriver = Platform.OS !== 'web'

    meteorStartXRef.current = SCREEN_WIDTH * 0.5
    meteorStartYRef.current = SCREEN_HEIGHT * 0.1
    meteorTravelRef.current = 760
    meteorAngleRef.current = 45
    meteorProgress.setValue(0)
    meteorOpacity.setValue(0)
    meteorTailScale.setValue(0.7)
    meteorHeadGlow.setValue(0.75)

    Animated.parallel([
      Animated.sequence([
        Animated.timing(meteorOpacity, { toValue: 0.12, duration: 55, easing: Easing.linear, useNativeDriver }),
        Animated.timing(meteorOpacity, { toValue: 1, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver }),
        Animated.timing(meteorOpacity, { toValue: 0.15, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver }),
        Animated.delay(280),
        Animated.timing(meteorOpacity, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(meteorTailScale, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver }),
        Animated.timing(meteorTailScale, { toValue: 0.02, duration: 620, easing: Easing.in(Easing.quad), useNativeDriver }),
      ]),
      Animated.sequence([
        Animated.timing(meteorHeadGlow, { toValue: 1.8, duration: 95, easing: Easing.out(Easing.quad), useNativeDriver }),
        Animated.timing(meteorHeadGlow, { toValue: 0.78, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver }),
      ]),
      Animated.timing(meteorProgress, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver }),
    ]).start()
  }, [meteorHeadGlow, meteorOpacity, meteorProgress, meteorTailScale, triggerKey])

  const meteorTranslateX = meteorProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, meteorTravelRef.current],
  })

  return (
    <Animated.View
      style={[
        styles.meteorWrap,
        {
          transform: [
            { translateX: meteorStartXRef.current },
            { translateY: meteorStartYRef.current },
            { rotate: `${meteorAngleRef.current}deg` },
            { translateX: meteorTranslateX },
          ],
          opacity: meteorOpacity,
        },
      ]}
    >
      <Animated.View style={[styles.meteorTailWrap, { transform: [{ scaleX: meteorTailScale }] }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.98)', 'rgba(216, 180, 255, 0.24)', 'rgba(255,255,255,0)']}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={styles.meteorTailMain}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 1, y: 0.5 }}
          end={{ x: 0, y: 0.5 }}
          style={styles.meteorTailCore}
        />
      </Animated.View>
      <Animated.View style={[styles.meteorHeadGlow, { transform: [{ scale: meteorHeadGlow }], opacity: meteorOpacity }]} />
      <LinearGradient
        colors={['#FFFFFF', '#F5ECFF']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.meteorHead}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  meteorWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
  },
  meteorTailWrap: {
    width: 100,
    height: 8,
    justifyContent: 'center',
  },
  meteorTailMain: {
    width: 100,
    height: 3,
    borderRadius: 999,
  },
  meteorTailCore: {
    position: 'absolute',
    right: 0,
    width: 62,
    height: 1.2,
    borderRadius: 999,
  },
  meteorHeadGlow: {
    position: 'absolute',
    right: 3,
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(234, 213, 255, 0.48)',
  },
  meteorHead: {
    width: 8,
    height: 3.2,
    borderRadius: 999,
    marginLeft: -2,
    shadowColor: '#E9D5FF',
    shadowOpacity: 0.9,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
})
