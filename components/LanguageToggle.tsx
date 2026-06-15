import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View, ViewStyle, StyleProp } from 'react-native'
import { useLanguage } from '../context/LanguageContext'
import { LANG_LABEL_EN, LANG_LABEL_KO } from '../constants/language'

/** 모든 화면에서 동일한 pill 너비 유지 */
export const LANGUAGE_TOGGLE_WIDTH = 76

type Props = {
  style?: StyleProp<ViewStyle>
}

export default function LanguageToggle({ style }: Props) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={[styles.container, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityLabel={`Language: ${language === 'ko' ? LANG_LABEL_KO : LANG_LABEL_EN}`}
    >
      <Text style={[styles.label, language === 'ko' && styles.active]}>{LANG_LABEL_KO}</Text>
      <View style={styles.divider} />
      <Text style={[styles.label, language === 'en' && styles.active]}>{LANG_LABEL_EN}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: LANGUAGE_TOGGLE_WIDTH,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 6,
  },
  label: {
    width: 20,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.28)',
  },
  active: {
    color: '#fff',
  },
  divider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
})
