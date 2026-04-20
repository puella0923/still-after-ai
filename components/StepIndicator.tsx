import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type Props = {
  current: number   // 1-based
  total: number
  style?: object
}

export default function StepIndicator({ current, total, style }: Props) {
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1
        const isDone = stepNum < current
        const isActive = stepNum === current
        return (
          <React.Fragment key={stepNum}>
            {/* Dot */}
            {isActive ? (
              <LinearGradient colors={['#a855f7', '#db2777']} style={styles.dotActive}>
                <Text style={styles.dotActiveText}>{stepNum}</Text>
              </LinearGradient>
            ) : isDone ? (
              <View style={styles.dotDone}>
                <Text style={styles.dotDoneText}>✓</Text>
              </View>
            ) : (
              <View style={styles.dotInactive}>
                <Text style={styles.dotInactiveText}>{stepNum}</Text>
              </View>
            )}
            {/* Connector line */}
            {stepNum < total && (
              <View style={[styles.line, isDone && styles.lineDone]} />
            )}
          </React.Fragment>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  dotActive: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dotActiveText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  dotDone: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.35)',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)',
  },
  dotDoneText: { fontSize: 11, fontWeight: '700', color: '#c084fc' },
  dotInactive: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  dotInactiveText: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  line: {
    width: 32, height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  lineDone: {
    backgroundColor: 'rgba(168,85,247,0.45)',
  },
})
