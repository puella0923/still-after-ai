import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  current: number   // 1-based
  total: number
  style?: object
}

export default function StepIndicator({ current, total, style }: Props) {
  const { t } = useLanguage()

  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <Text style={styles.label}>{t.common.stepIndicator(current, total)}</Text>
      <View style={styles.dotsRow}>
        {Array.from({ length: total }, (_, i) => {
          const stepNum = i + 1
          const isActive = stepNum <= current
          return (
            <Text
              key={stepNum}
              style={[styles.dot, isActive ? styles.dotActive : styles.dotInactive]}
            >
              {isActive ? '●' : '○'}
            </Text>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    color: 'rgba(167, 139, 250, 0.7)',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    fontSize: 8,
    lineHeight: 10,
  },
  dotActive: {
    color: 'rgba(167, 139, 250, 0.9)',
  },
  dotInactive: {
    color: 'rgba(167, 139, 250, 0.25)',
  },
})
