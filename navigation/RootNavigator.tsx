import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import OnboardingScreen from '../screens/onboarding/OnboardingScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import EmailAuthScreen from '../screens/auth/EmailAuthScreen'
import PersonaListScreen from '../screens/persona/PersonaListScreen'
import PersonaCreateScreen from '../screens/persona/PersonaCreateScreen'
import CareSelectScreen from '../screens/care/CareSelectScreen'
import RelationSetupScreen from '../screens/care/RelationSetupScreen'
import TimingCheckScreen from '../screens/care/TimingCheckScreen'
import AIGeneratingScreen from '../screens/persona/AIGeneratingScreen'
import PaywallScreen from '../screens/paywall/PaywallScreen'
import SettingsScreen from '../screens/settings/SettingsScreen'
import PrivacyPolicyScreen from '../screens/settings/PrivacyPolicyScreen'
import TermsScreen from '../screens/settings/TermsScreen'
import CustomerSupportScreen from '../screens/settings/CustomerSupportScreen'
import AccountProfileScreen from '../screens/settings/AccountProfileScreen'
import ClosureCeremonyScreen from '../screens/closure/ClosureCeremonyScreen'
import PersonaEditScreen from '../screens/persona/PersonaEditScreen'
import TabNavigator from './TabNavigator'
import ChatScreen from '../screens/chat/ChatScreen'

export type RootStackParamList = {
  Onboarding: undefined
  Login: undefined
  EmailAuth: undefined
  PersonaList: undefined
  CareSelect: undefined
  RelationSetup: { careType: 'human' | 'pet' }
  TimingCheck: { careType: 'human' | 'pet'; relation: string; name: string }
  PersonaCreate: { careType: 'human' | 'pet'; relation?: string; name?: string; timing?: string }
  PersonaEdit: {
    personaId: string
    personaName: string
    currentPhotoUrl?: string | null
    currentNickname?: string | null
    currentRelationship?: string | null
  }
  AIGenerating: { name: string; personaId: string }
  Paywall: { personaId: string; stage: string }
  Settings: undefined
  AccountProfile: undefined
  PrivacyPolicy: undefined
  Terms: undefined
  CustomerSupport: undefined
  ClosureCeremony: { personaId: string; personaName: string; aiFarewell: string; careType?: string }
  Main: undefined
  Chat: { personaId: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

type Props = {
  initialRouteName: keyof RootStackParamList
}

export default function RootNavigator({ initialRouteName }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding"      component={OnboardingScreen} />
      <Stack.Screen name="Login"           component={LoginScreen} />
      <Stack.Screen name="EmailAuth"       component={EmailAuthScreen} />
      <Stack.Screen name="PersonaList"     component={PersonaListScreen} />
      <Stack.Screen name="CareSelect"       component={CareSelectScreen} />
      <Stack.Screen name="RelationSetup"    component={RelationSetupScreen} />
      <Stack.Screen name="TimingCheck"      component={TimingCheckScreen} />
      <Stack.Screen name="PersonaCreate"   component={PersonaCreateScreen} />
      <Stack.Screen name="PersonaEdit"     component={PersonaEditScreen} />
      <Stack.Screen name="AIGenerating"    component={AIGeneratingScreen} />
      <Stack.Screen name="Paywall"          component={PaywallScreen} />
      <Stack.Screen name="Settings"         component={SettingsScreen} />
      <Stack.Screen name="AccountProfile"   component={AccountProfileScreen} />
      <Stack.Screen name="PrivacyPolicy"    component={PrivacyPolicyScreen} />
      <Stack.Screen name="Terms"            component={TermsScreen} />
      <Stack.Screen name="CustomerSupport"  component={CustomerSupportScreen} />
      <Stack.Screen name="ClosureCeremony"  component={ClosureCeremonyScreen} />
      <Stack.Screen name="Main"             component={TabNavigator} />
      <Stack.Screen name="Chat"             component={ChatScreen} />
    </Stack.Navigator>
  )
}
