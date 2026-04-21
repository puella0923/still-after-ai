/**
 * CosmicBackground — 우주 테마 배경 컴포넌트
 * 별(stars) + 오브(orbs) 배경을 재사용 가능한 컴포넌트로 추출
 */

import React from 'react'
import { View, StyleSheet, Dimensions, Animated, Platform } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import ShootingMeteor from './ShootingMeteor'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

/** 별 데이터를 결정론적으로 생성 (count 기본값: 25) */
function generateStars(count = 25) {
  return Array.from({ length: count }, (_, i) => ({
    left: (i * 97 + 31) % 100,
    top: (i * 53 + 17) % 100,
    size: (i % 3) + 1.5,
    opacity: 0.12 + (i % 5) * 0.08,
  }))
}

const DEFAULT_STARS = generateStars(25)

type OrbConfig = {
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
  color: string
  size?: number
}

type Props = {
  /** 그라데이션 배경색 (3개) */
  colors?: [string, string, string]
  /** orb 설정 목록 */
  orbs?: OrbConfig[]
  /** 별 개수 (기본 25) */
  starCount?: number
  /** 값이 바뀔 때마다 별똥별 1회 강제 재생 (이스터에그 테스트용) */
  meteorTriggerKey?: number
}

/** 기본 퍼플 테마 orb */
const DEFAULT_ORBS: OrbConfig[] = [
  { top: -100, left: SCREEN_WIDTH * 0.25 - 192, color: 'rgba(124, 58, 237, 0.2)', size: 384 },
  { bottom: -100, right: SCREEN_WIDTH * 0.25 - 192, color: 'rgba(37, 99, 235, 0.2)', size: 384 },
]

export default function CosmicBackground({
  colors = ['#0a0118', '#1a0f3e', '#0f0520'],
  orbs = DEFAULT_ORBS,
  starCount = 25,
  meteorTriggerKey,
}: Props) {
  const stars = starCount === 25 ? DEFAULT_STARS : generateStars(starCount)
  const starOpacitiesRef = React.useRef<Animated.Value[]>([])
  const starLoopsRef = React.useRef<Animated.CompositeAnimation[]>([])

  React.useEffect(() => {
    // 별 개수가 바뀌더라도 기존 값 재사용해 불필요한 점프를 줄임
    starOpacitiesRef.current = stars.map((star, i) => (
      starOpacitiesRef.current[i] ?? new Animated.Value(star.opacity)
    ))

    const randomInRange = (min: number, max: number) => min + Math.random() * (max - min)

    starLoopsRef.current.forEach(loop => loop.stop())
    const useNativeDriver = Platform.OS !== 'web'

    starLoopsRef.current = stars.map((star, i) => {
      const opacityValue = starOpacitiesRef.current[i]
      // 웹 미리보기에서 반짝임이 안 보이지 않도록 최소 대비를 조금 더 확보
      const pulseRange = Platform.OS === 'web' ? randomInRange(0.1, 0.2) : randomInRange(0.06, 0.16)
      const lowOpacity = Math.max(0.06, star.opacity - pulseRange)
      const highOpacity = Math.min(0.52, star.opacity + pulseRange * randomInRange(0.8, 1.15))
      const upDuration = randomInRange(2400, 5200)
      const downDuration = randomInRange(2600, 6200)
      const initialDelay = randomInRange(300, 3800)

      return Animated.loop(
        Animated.sequence([
          Animated.delay(initialDelay),
          Animated.timing(opacityValue, {
            toValue: highOpacity,
            duration: upDuration,
            useNativeDriver,
          }),
          Animated.timing(opacityValue, {
            toValue: lowOpacity,
            duration: downDuration,
            useNativeDriver,
          }),
        ])
      )
    })

    starLoopsRef.current.forEach(loop => loop.start())

    return () => {
      starLoopsRef.current.forEach(loop => loop.stop())
      starLoopsRef.current = []
    }
  }, [stars])

  return (
    <View style={styles.backgroundRoot} pointerEvents="none">
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} />
      <View style={styles.orbContainer}>
        {orbs.map((orb, i) => {
          const size = orb.size ?? 384
          return (
            <View
              key={i}
              style={[
                styles.orb,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: orb.color,
                  ...(orb.top !== undefined ? { top: orb.top } : {}),
                  ...(orb.bottom !== undefined ? { bottom: orb.bottom } : {}),
                  ...(orb.left !== undefined ? { left: orb.left } : {}),
                  ...(orb.right !== undefined ? { right: orb.right } : {}),
                },
              ]}
            />
          )
        })}
      </View>
      <View style={StyleSheet.absoluteFill}>
        {stars.map((star, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              {
                left: `${star.left}%` as unknown as number,
                top: `${star.top}%` as unknown as number,
                width: star.size,
                height: star.size,
                opacity: starOpacitiesRef.current[i] ?? star.opacity,
                borderRadius: star.size,
              },
            ]}
          />
        ))}
        <ShootingMeteor triggerKey={meteorTriggerKey} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  backgroundRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -100,
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#E9D5FF',
  },
})
