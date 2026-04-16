import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, LinkingOptions, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './context/AuthContext'
import RootNavigator, { RootStackParamList } from './navigation/RootNavigator'

// URL 딥링크 설정 — 웹에서 /Login, /PersonaCreate 등 URL이 직접 작동하도록
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'http://localhost:8081',
    'https://localhost:8081',
    'http://localhost:8082',
    'https://localhost:8082',
    'https://dist-alpha-six-89.vercel.app',
    'https://dist-5gsmr209l-puella0923-9626s-projects.vercel.app',
    'still-after://',
  ],
  config: {
    screens: {
      Onboarding:      '',
      Login:           'Login',
      EmailAuth:       {
        path: 'EmailAuth',
        alias: ['auth/callback', 'auth/reset-password'],
      },
      Main:            {
        path: 'Main',
        screens: { Home: '' },
      },
      PersonaList:     'PersonaList',
      PersonaCreate:   'PersonaCreate',
      PersonaEdit:     'PersonaEdit',
      AIGenerating:    'AIGenerating',
      Paywall:         'Paywall',
      Settings:        'Settings',
      AccountProfile:  'AccountProfile',
      PrivacyPolicy:   'PrivacyPolicy',
      Terms:           'Terms',
      CustomerSupport: 'CustomerSupport',
      ClosureCeremony: 'ClosureCeremony',
      Chat:            'Chat',
    },
  },
}

function AppContent() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2C2C2C" />
      </View>
    )
  }

  const isAuthed = !!session
  const initialRoute: keyof RootStackParamList = isAuthed ? 'Main' : 'Onboarding'

  // 비인증 상태에서는 딥링크로 인증 필요 화면에 진입하지 않도록
  // linking 설정을 비활성화 (URL이 /Main 등일 때 로그아웃 후에도 Main으로 이동하는 문제 방지)
  // 인증 상태별 딥링크 설정
  // - 로그인됨: 루트 URL('') → Main, Login/Onboarding URL 접근 시에도 Main으로
  // - 비인증: 루트 URL('') → Onboarding, 인증 화면만 URL 접근 허용
  const activeLinking = isAuthed ? {
    ...linking,
    config: {
      screens: {
        Main: { path: '', screens: { Home: '' } },
        PersonaList: 'PersonaList',
        PersonaCreate: 'PersonaCreate',
        PersonaEdit: 'PersonaEdit',
        AIGenerating: 'AIGenerating',
        Paywall: 'Paywall',
        Settings: 'Settings',
        AccountProfile: 'AccountProfile',
        PrivacyPolicy: 'PrivacyPolicy',
        Terms: 'Terms',
        CustomerSupport: 'CustomerSupport',
        ClosureCeremony: 'ClosureCeremony',
        Chat: 'Chat',
        // Login, EmailAuth, Onboarding 제외 → URL로 접근해도 Main으로 이동
      },
    },
  } : {
    ...linking,
    config: {
      screens: {
        Onboarding: '',
        Login: 'Login',
        EmailAuth: {
          path: 'EmailAuth',
          alias: ['auth/callback', 'auth/reset-password'],
        },
      },
    },
    // /Login 직접 접근 시 navigation 스택에 Onboarding을 앞에 삽입
    // → 브라우저/하드웨어 뒤로가기 시 Onboarding으로 이동 (탭/앱 종료 방지)
    getStateFromPath: (path, options) => {
      const state = defaultGetStateFromPath(path, options)
      if (path === '/Login' || path === 'Login') {
        return {
          routes: [{ name: 'Onboarding' }, { name: 'Login' }],
          index: 1,
        }
      }
      return state
    },
  }

  return (
    <NavigationContainer
      key={isAuthed ? 'authed' : 'guest'}
      linking={activeLinking}
    >
      <StatusBar style="dark" backgroundColor="#FAF8F5" />
      <RootNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
