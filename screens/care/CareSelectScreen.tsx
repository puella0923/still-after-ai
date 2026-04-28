import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CareSelect'>
}

const CARE_SCREEN_ORBS = [
  { top: '5%', right: '-15%', color: 'rgba(168, 85, 247, 0.12)', size: 280 },
  { bottom: '15%', left: '-10%', color: 'rgba(219, 39, 119, 0.08)', size: 220 },
]

export default function CareSelectScreen({ navigation }: Props) {
  const { t } = useLanguage()
  const handleSelect = (careType: 'human' | 'pet') => {
    navigation.navigate('RelationSetup', { careType })
  }

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={CARE_SCREEN_ORBS} starCount={25} />

      <TopStickyControls
        backLabel={t.common.back}
        onBackPress={() => {
          if (navigation.canGoBack()) navigation.goBack()
          else navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
        }}
        stepCurrent={1}
        stepTotal={4}
      />

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t.careSelect.title}</Text>
          <Text style={styles.subtitle}>
            {t.careSelect.subtitle}
          </Text>
        </View>

        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.card} onPress={() => handleSelect('human')} activeOpacity={0.85}>
            <LinearGradient colors={['rgba(168, 85, 247, 0.15)', 'rgba(219, 39, 119, 0.1)']} style={styles.cardGrad}>
              <Text style={styles.cardEmoji}>🧑‍🤝‍🧑</Text>
              <Text style={styles.cardTitle}>{t.careSelect.humanLabel}</Text>
              <Text style={styles.cardDesc}>{t.careSelect.humanSub}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => handleSelect('pet')} activeOpacity={0.85}>
            <LinearGradient colors={['rgba(168, 85, 247, 0.15)', 'rgba(219, 39, 119, 0.1)']} style={styles.cardGrad}>
              <Text style={styles.cardEmoji}>🐾</Text>
              <Text style={styles.cardTitle}>{t.careSelect.petLabel}</Text>
              <Text style={styles.cardDesc}>{t.careSelect.petSub}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>
          {t.careSelect.notice}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 110, paddingBottom: 40, justifyContent: 'space-between' },
  header: { alignItems: 'center', gap: 14 },
  title: { fontSize: 26, fontWeight: '300', color: '#fff', letterSpacing: 0.5, textAlign: 'center' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 24 },
  cardRow: { flexDirection: 'row', gap: 16 },
  card: {
    flex: 1, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}),
  },
  cardGrad: { paddingVertical: 36, alignItems: 'center', gap: 10 },
  cardEmoji: { fontSize: 40 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  notice: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 18 },
})
