import React from 'react'
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { useLanguage } from '../context/LanguageContext'

type Props = {
  style?: object
}

export default function LanguageToggle({ style }: Props) {
  const { language, toggleLanguage } = useLanguage()

  return (
    <TouchableOpacity
      onPress={toggleLanguage}
      style={[styles.container, style]}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.label, language === 'ko' && styles.active]}>KO</Text>
      <View style={styles.divider} />
      <Text style={[styles.label, language === 'en' && styles.active]}>EN</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    gap: 5,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
