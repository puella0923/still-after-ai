import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useLanguage } from '../context/LanguageContext'
import { openInExternalBrowser } from '../utils/inAppBrowser'
import { Z } from '../screens/theme'

type Props = {
  visible: boolean
  onClose: () => void
}

export default function InAppBrowserBanner({ visible, onClose }: Props) {
  const { t } = useLanguage()
  const [copied, setCopied] = useState(false)

  const handleOpenExternal = async () => {
    const opened = await openInExternalBrowser()
    if (!opened) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🌐</Text>
          <Text style={styles.title}>{t.login.inAppBrowserTitle}</Text>
          <Text style={styles.desc}>{t.login.inAppBrowserDesc}</Text>
          <Text style={styles.hint}>{t.login.inAppBrowserHint}</Text>

          <TouchableOpacity onPress={handleOpenExternal} activeOpacity={0.85} style={styles.btnWrap}>
            <LinearGradient
              colors={['#7C3AED', '#3B82F6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              <Text style={styles.btnText}>
                {copied ? t.login.inAppBrowserCopied : t.login.inAppBrowserOpen}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={styles.dismissBtn}>
            <Text style={styles.dismissText}>{t.login.inAppBrowserDismiss}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: Z.MODAL,
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' } as object
      : {}),
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1a0a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  emoji: { fontSize: 36, marginBottom: 12 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F3E8FF',
    textAlign: 'center',
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    color: 'rgba(196, 181, 253, 0.85)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(167, 139, 250, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  btnWrap: { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  btn: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  btnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 14, color: 'rgba(196, 181, 253, 0.7)' },
})
