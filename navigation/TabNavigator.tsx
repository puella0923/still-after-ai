import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import HomeScreen from '../screens/home/HomeScreen'
import { useLanguage } from '../context/LanguageContext'

export type TabParamList = {
  Home: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()

export default function TabNavigator() {
  const { t } = useLanguage()

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        // 탭이 1개뿐이므로 탭바 숨김 (추후 탭 추가 시 제거)
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t.home.tabLabel,
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
    </Tab.Navigator>
  )
}
