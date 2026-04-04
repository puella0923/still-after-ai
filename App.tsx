import React from 'react'
import { View, ActivityIndicator } from 'react-native'
import { NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from './context/AuthContext'
import RootNavigator, { RootStackParamList } from './navigation/RootNavigator'

// URL 딥링크 설정 — 웹에서 /Login, /PersonaCreate 등 URL이 직접 작동하도록
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
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
      EmailAuth:       'EmailAuth',
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

  const initialRoute: keyof RootStackParamList = session ? 'Main' : 'Onboarding'

  return (
    <NavigationContainer linking={linking}>
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
