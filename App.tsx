import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, LinkingOptions, getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import RootNavigator, { RootStackParamList } from './navigation/RootNavigator'
import VercelAnalytics from './components/VercelAnalytics'

// URL 딥링크 설정 — 웹에서 /Login, /PersonaCreate 등 URL이 직접 작동하도록
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'http://localhost:8081',
    'https://localhost:8081',
    'http://localhost:8082',
    'https://localhost:8082',
    'https://stillafter.com',
    'https://www.stillafter.com',
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
      CareSelect:      'CareSelect',
      RelationSetup:   'RelationSetup',
      TimingCheck:     'TimingCheck',
      PersonaCreate:   'PersonaCreate',
      PersonaEdit:     'PersonaEdit',
      AIGenerating:    'AIGenerating',
      Settings:        'Settings',
      AccountProfile:  'AccountProfile',
      PrivacyPolicy:   'PrivacyPolicy',
      Terms:           'Terms',
      CustomerSupport: 'CustomerSupport',
      ClosureCeremony: 'ClosureCeremony',
      Chat: {
        path: 'Chat/:personaId?',
        parse: { personaId: String },
      },
    },
  },
}

function AppContent() {
  const { loading, session, pendingPasswordRecovery } = useAuth()
  const needsPasswordReset = pendingPasswordRecovery && !!session
  const isAuthed = !!session && !needsPasswordReset

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF8F5', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2C2C2C" />
      </View>
    )
  }
  const initialRoute: keyof RootStackParamList = needsPasswordReset
    ? 'EmailAuth'
    : isAuthed
      ? 'Main'
      : 'Onboarding'

  // Strip /ko or /en language prefix from URL path before routing
  // e.g.  /ko/Login → /Login,  /en/AccountProfile → /AccountProfile
  const stripLangPrefix = (path: string) =>
    path.replace(/^\/(ko|en)(\/|$)/, '/').replace(/^\/\//, '/') || '/'

  // 인증 상태별 딥링크 설정
  // - 로그인됨: 루트 URL('') → Main, Login/Onboarding URL 접근 시에도 Main으로
  // - 비인증: 루트 URL('') → Onboarding, 인증 화면만 URL 접근 허용
  const activeLinking = needsPasswordReset ? {
    ...linking,
    config: {
      screens: {
        EmailAuth: {
          path: '',
          alias: ['auth/callback', 'auth/reset-password', 'EmailAuth'],
        },
      },
    },
    getStateFromPath: (path: string, options: any) =>
      defaultGetStateFromPath(stripLangPrefix(path), options),
  } : isAuthed ? {
    ...linking,
    config: {
      screens: {
        Main: { path: '', screens: { Home: '' } },
        PersonaList: 'PersonaList',
        CareSelect: 'CareSelect',
        RelationSetup: 'RelationSetup',
        TimingCheck: 'TimingCheck',
        PersonaCreate: 'PersonaCreate',
        PersonaEdit: 'PersonaEdit',
        AIGenerating: 'AIGenerating',
        Settings: 'Settings',
        AccountProfile: 'AccountProfile',
        PrivacyPolicy: 'PrivacyPolicy',
        Terms: 'Terms',
        CustomerSupport: 'CustomerSupport',
        ClosureCeremony: 'ClosureCeremony',
        Chat: {
          path: 'Chat/:personaId?',
          parse: { personaId: String },
        },
        // Login, EmailAuth, Onboarding 제외 → URL로 접근해도 Main으로 이동
      },
    },
    getStateFromPath: (path: string, options: any) =>
      defaultGetStateFromPath(stripLangPrefix(path), options),
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
    getStateFromPath: (path: string, options: any) => {
      const clean = stripLangPrefix(path)
      const state = defaultGetStateFromPath(clean, options)
      if (clean === '/Login' || clean === 'Login') {
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
      key={needsPasswordReset ? 'recovery' : isAuthed ? 'authed' : 'guest'}
      linking={activeLinking}
      documentTitle={{
        // 모든 화면에서 일관된 브랜드 title을 노출.
        // 기본 동작은 화면 이름(예: "Onboarding", "Login")으로 document.title을 덮어쓰는데,
        // 이 결과를 구글이 색인해서 검색결과 제목이 "Onboarding"으로 표시되는 문제가 발생.
        formatter: () => 'Still After — 아직 전하지 못한 말이 있다면',
      }}
    >
      <StatusBar style="dark" backgroundColor="#FAF8F5" />
      <RootNavigator initialRouteName={initialRoute} />
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
          <VercelAnalytics />
        </AuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  )
}
