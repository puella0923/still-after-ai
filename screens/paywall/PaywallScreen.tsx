import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Paywall'>
  route: RouteProp<RootStackParamList, 'Paywall'>
}

export default function PaywallScreen({ navigation, route }: Props) {
  const { t } = useLanguage()
  const { personaId } = route.params

  const handlePurchase = () => {
    // TODO: 포트원 결제 연동
    navigation.replace('Chat', { personaId })
  }

  return (
    <View style={styles.root}>
      <CosmicBackground />
      <View style={styles.content}>
        <Text style={styles.title}>{t.paywall.exhaustedMsg}</Text>
        <Text style={styles.desc}>{t.paywall.subtitle}</Text>
        <TouchableOpacity style={styles.btn} onPress={handlePurchase} activeOpacity={0.85}>
          <Text style={styles.btnText}>{t.paywall.premiumBtn}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>{t.paywall.backBtn}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center', lineHeight: 30 },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.7)', marginBottom: 32, textAlign: 'center', lineHeight: 22 },
  btn: { backgroundColor: '#a855f7', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  back: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
})
