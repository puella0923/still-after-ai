import React, { ReactNode } from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp, View } from 'react-native'
import LanguageToggle from './LanguageToggle'
import StepIndicator from './StepIndicator'

export const TOP_STICKY_HEADER_HEIGHT = 51

type Props = {
  backLabel: string
  onBackPress: () => void
  title?: string
  stepCurrent?: number
  stepTotal?: number
  showLanguageToggle?: boolean
  rightSlot?: ReactNode
  containerStyle?: StyleProp<ViewStyle>
  style?: StyleProp<ViewStyle>
}

export default function TopStickyControls({
  backLabel,
  onBackPress,
  title,
  stepCurrent,
  stepTotal,
  showLanguageToggle = true,
  rightSlot,
  containerStyle,
  style,
}: Props) {
  return (
    <View style={[styles.stickyHeader, containerStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.sideSlot}>
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerSlot}>
          {title ? (
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          ) : typeof stepCurrent === 'number' && typeof stepTotal === 'number' ? (
            <StepIndicator current={stepCurrent} total={stepTotal} />
          ) : null}
        </View>
        <View style={[styles.sideSlot, styles.sideSlotRight]}>
          {rightSlot ?? (showLanguageToggle ? <LanguageToggle style={style} /> : null)}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: TOP_STICKY_HEADER_HEIGHT,
    zIndex: 100,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    backgroundColor: 'rgba(16, 8, 30, 0.72)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } as any,
  headerRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  sideSlot: { width: 140, justifyContent: 'center' },
  sideSlotRight: { alignItems: 'flex-end' },
  centerSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  titleText: { fontSize: 17, fontWeight: '600', color: '#fff' },
})
