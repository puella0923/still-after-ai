import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useAuth } from '../../context/AuthContext'
import { C, RADIUS } from '../theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>
}

export default function OnboardingScreen({ navigation }: Props) {
  const { session } = useAuth()

  useEffect(() => {
    if (session) {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
    }
  }, [session, navigation])

  return (
    <View style={styles.container}>
      {/* 별 장식 */}
      <View style={styles.starDecor1} />
      <View style={styles.starDecor2} />
      <View style={styles.starDecor3} />

      <View style={styles.content}>
        {/* 로고 아이콘 */}
        <View style={styles.logoIcon}>
          <Text style={styles.logoIconText}>🌙</Text>
        </View>

        <Text style={styles.title}>Still After</Text>
        <Text style={styles.tagline}>당신 곁을 여전히</Text>

        <Text style={styles.subtitle}>
          누군가 생각나세요?{'\n'}
          기억이 아직 그 자리에 있다면,{'\n'}
          잠시 이야기를 나눠봐요.
        </Text>

        <View style={styles.aiNotice}>
          <Text style={styles.aiNoticeText}>
            이 서비스는 실제 인물을 대체하지 않아요.{'\n'}
            감정을 조심스럽게 이어가고,{'\n'}
            천천히 보내드리기 위한 공간이에요.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.replace('Login')}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>조심스럽게 시작하기  →</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.BG,
    paddingHorizontal: 32,
    paddingVertical: 60,
    justifyContent: 'space-between',
  },

  // 별 장식
  starDecor1: {
    position: 'absolute', top: 80, left: 40,
    width: 3, height: 3, borderRadius: 99,
    backgroundColor: 'rgba(196, 181, 253, 0.6)',
  },
  starDecor2: {
    position: 'absolute', top: 120, right: 60,
    width: 5, height: 5, borderRadius: 99,
    backgroundColor: 'rgba(167, 139, 250, 0.5)',
  },
  starDecor3: {
    position: 'absolute', top: 200, left: 80,
    width: 2, height: 2, borderRadius: 99,
    backgroundColor: 'rgba(243, 232, 255, 0.4)',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },

  // 로고
  logoIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1, borderColor: C.BORDER,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  logoIconText: { fontSize: 36 },

  title: {
    fontSize: 42,
    fontWeight: '300',
    color: C.TEXT,
    letterSpacing: 3,
  },
  tagline: {
    fontSize: 15,
    color: C.TEXT_SECONDARY,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: C.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
  },
  aiNotice: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    borderRadius: RADIUS.MD,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 12,
  },
  aiNoticeText: {
    fontSize: 12,
    color: C.TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },

  // 버튼
  button: {
    backgroundColor: C.BTN_PRIMARY,
    borderRadius: RADIUS.LG,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    color: C.TEXT,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
})
