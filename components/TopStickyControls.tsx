import React, { ReactNode } from 'react'
import { TouchableOpacity, Text, StyleSheet, ViewStyle, StyleProp, View } from 'react-native'
import LanguageToggle from './LanguageToggle'
import StepIndicator from './StepIndicator'
import { Z } from '../screens/theme'

export const TOP_STICKY_HEADER_HEIGHT = 51
export const TOP_STICKY_WITH_STEP_HEIGHT = 96

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
  const hasStep = typeof stepCurrent === 'number' && typeof stepTotal === 'number'

  const rightContent = rightSlot ?? (showLanguageToggle ? <LanguageToggle style={style} /> : null)

  return (
    <View style={[
      styles.stickyHeader,
      hasStep && styles.stickyHeaderWithStep,
      containerStyle,
    ]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Text style={styles.backText}>{backLabel}</Text>
        </TouchableOpacity>
        {title ? (
          <View style={styles.titleOverlay} pointerEvents="none">
            <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
          </View>
        ) : null}
        {rightContent ? (
          <View style={styles.rightSlot}>{rightContent}</View>
        ) : (
          <View style={styles.rightSpacer} />
        )}
      </View>
      {hasStep && (
        <StepIndicator current={stepCurrent} total={stepTotal} />
      )}
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
    zIndex: Z.HEADER,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    backgroundColor: 'rgba(16, 8, 30, 0.72)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  } as any,
  stickyHeaderWithStep: {
    height: TOP_STICKY_WITH_STEP_HEIGHT,
    justifyContent: 'flex-start',
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    minHeight: 27,
  },
  backButton: { zIndex: 1, justifyContent: 'center' },
  backText: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  titleOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 72,
  },
  titleText: { fontSize: 17, fontWeight: '600', color: '#fff', textAlign: 'center' },
  rightSlot: { marginLeft: 'auto', zIndex: 1 },
  rightSpacer: { width: 1 },
})
