// @ts-nocheck — 미사용 레거시 화면 (PersonaCreateScreen으로 통합됨)
import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CareSelect'>
}

const { width: SW } = Dimensions.get('window')

const STAR_DOTS = Array.from({ length: 25 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

export default function CareSelectScreen({ navigation }: Props) {
  const handleSelect = (careType: 'person' | 'pet') => {
    navigation.navigate('RelationSetup', { careType })
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>누구를 그리워하시나요?</Text>
          <Text style={styles.subtitle}>
            소중한 분의 기억을 담고,{'\n'}천천히 마음을 정리할 수 있도록 함께할게요.
          </Text>
        </View>

        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.card} onPress={() => handleSelect('person')} activeOpacity={0.85}>
            <LinearGradient colors={['rgba(168, 85, 247, 0.15)', 'rgba(219, 39, 119, 0.1)']} style={styles.cardGrad}>
              <Text style={styles.cardEmoji}>🧑‍🤝‍🧑</Text>
              <Text style={styles.cardTitle}>사람</Text>
              <Text style={styles.cardDesc}>가족, 친구, 연인</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => handleSelect('pet')} activeOpacity={0.85}>
            <LinearGradient colors={['rgba(168, 85, 247, 0.15)', 'rgba(219, 39, 119, 0.1)']} style={styles.cardGrad}>
              <Text style={styles.cardEmoji}>🐾</Text>
              <Text style={styles.cardTitle}>반려동물</Text>
              <Text style={styles.cardDesc}>함께한 가족</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Text style={styles.notice}>
          이 서비스는 실제 인물·동물을 대체하지 않아요.{'\n'}감정 회복을 위한 공간이에요.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.08)' },
  container: { flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40, justifyContent: 'space-between' },
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
