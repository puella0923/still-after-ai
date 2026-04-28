import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
  Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { updatePersona, uploadPersonaPhoto } from '../../services/personaService'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PersonaEdit'>
  route: RouteProp<RootStackParamList, 'PersonaEdit'>
}

const RELATIONS = ['부모님', '배우자', '연인', '친구', '형제/자매', '자녀', '반려동물', '기타']

const EDIT_ORBS = [
  { top: '-5%', right: '-15%', color: 'rgba(168, 85, 247, 0.1)', size: 280 },
  { bottom: '15%', left: '-10%', color: 'rgba(219, 39, 119, 0.06)', size: 200 },
]

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function PersonaEditScreen({ navigation, route }: Props) {
  const { personaId, personaName, currentPhotoUrl, currentNickname, currentRelationship } = route.params
  const { user } = useAuth()
  const { t } = useLanguage()

  const [photoUri, setPhotoUri] = useState<string | null>(currentPhotoUrl ?? null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoFileName, setPhotoFileName] = useState('')
  const [name, setName] = useState(personaName)
  const [nickname, setNickname] = useState(currentNickname ?? '')
  const [relationship, setRelationship] = useState(currentRelationship ?? '')
  const [loading, setLoading] = useState(false)
  const [photoChanged, setPhotoChanged] = useState(false)

  const handlePickPhotoWeb = () => {
    if (Platform.OS !== 'web') return
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'; input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      document.body.removeChild(input)
      if (!file) return
      setPhotoUri(URL.createObjectURL(file)); setPhotoBlob(file)
      setPhotoFileName(file.name); setPhotoChanged(true)
    }
    input.click()
  }

  const handlePickPhotoNative = async () => {
    try {
      const ImagePicker = await import('expo-image-picker')
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') { Alert.alert(t.personaEdit.alertPermissionTitle, t.personaEdit.alertPermissionMsg); return }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      setPhotoUri(asset.uri); setPhotoFileName(`photo_${Date.now()}.jpg`); setPhotoChanged(true)
      let blobOk = false
      for (let attempt = 0; attempt < 2; attempt++) {
        try { const r = await fetch(asset.uri); const b = await r.blob(); if (b?.size > 0) { setPhotoBlob(b); blobOk = true; break } } catch {}
      }
      if (!blobOk) {
        try {
          const FileSystem = await import('expo-file-system')
          const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' as any })
          const byteChars = atob(base64)
          const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i))
          setPhotoBlob(new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' }))
        } catch { setPhotoBlob(null) }
      }
    } catch { Alert.alert(t.personaEdit.alertPhotoErrorTitle, t.personaEdit.alertPhotoErrorMsg) }
  }

  const handlePickPhoto = () => Platform.OS === 'web' ? handlePickPhotoWeb() : handlePickPhotoNative()
  const handleRemovePhoto = () => { setPhotoUri(null); setPhotoBlob(null); setPhotoChanged(true) }

  const handleSave = async () => {
    if (!user) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert(t.personaEdit.alertNameRequired, t.personaEdit.alertNameMsg)
      return
    }
    setLoading(true)
    try {
      let newPhotoUrl: string | null | undefined = undefined
      if (photoChanged) {
        newPhotoUrl = photoBlob && photoFileName ? await uploadPersonaPhoto(user.id, photoBlob, photoFileName) : null
      }
      await updatePersona(personaId, {
        ...(trimmedName !== personaName ? { name: trimmedName } : {}),
        ...(photoChanged ? { photoUrl: newPhotoUrl } : {}),
        userNickname: nickname.trim() || null,
        ...(relationship.trim() && relationship !== currentRelationship ? { relationship: relationship.trim() } : {}),
      })
      navigation.goBack()
    } catch (err) { Alert.alert(t.personaEdit.alertSaveError, err instanceof Error ? err.message : t.home.retryMsg) }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.root}>
      <CosmicBackground colors={['#1a0118', '#200a2e', '#0f0520']} orbs={EDIT_ORBS} starCount={20} />
      <TopStickyControls
        backLabel={t.common.back}
        onBackPress={() => {
          if (navigation.canGoBack()) navigation.goBack()
          else navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
        }}
        title={`${name || personaName} ${t.personaEdit.headerSuffix}`}
        showLanguageToggle={false}
        rightSlot={(
          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <LinearGradient colors={['#a855f7', '#db2777']} style={styles.saveBtnGrad}>
                  <Text style={styles.saveBtnText}>{t.personaEdit.saveBtn}</Text>
                </LinearGradient>
            }
          </TouchableOpacity>
        )}
      />

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoCircle} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <LinearGradient colors={['rgba(168, 85, 247, 0.3)', 'rgba(219, 39, 119, 0.2)']} style={styles.photoPlaceholder}>
                <Text style={styles.photoIconText}>{(name || personaName).charAt(0)}</Text>
              </LinearGradient>
            )}
            <View style={styles.photoEditOverlay}>
              <Text style={styles.photoEditIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>{t.personaEdit.changePhotoHint}</Text>
          {photoUri && (
            <TouchableOpacity onPress={handleRemovePhoto}>
              <Text style={styles.photoRemove}>{t.personaEdit.removePhoto}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.personaEdit.nameLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.personaEdit.namePlaceholder}
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
          <Text style={styles.inputHint}>{t.personaEdit.nameHint}</Text>
        </View>

        {/* Relationship */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.personaEdit.relationLabel(name || personaName)}</Text>
          <View style={styles.chipRow}>
            {RELATIONS.map(rel => {
              const selected = relationship === rel
              return (
                <TouchableOpacity
                  key={rel}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setRelationship(rel)}
                  activeOpacity={0.75}
                >
                  {selected ? (
                    <LinearGradient
                      colors={['#a855f7', '#db2777']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.chipGrad}
                    >
                      <Text style={styles.chipTextSelected}>{rel}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.chipText}>{rel}</Text>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
          <Text style={styles.inputHint}>{t.personaEdit.relationHint}</Text>
        </View>

        {/* Nickname */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.personaEdit.myNameLabel(name || personaName)}</Text>
          <TextInput
            style={styles.input}
            placeholder={t.personaEdit.myNamePlaceholder}
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
          <Text style={styles.inputHint}>{t.personaEdit.myNameHint(name || personaName)}</Text>
        </View>

        {/* 학습 데이터 안내 */}
        <View style={styles.lockedSection}>
          <Text style={styles.lockedTitle}>{t.personaEdit.lockedLabel}</Text>
          <Text style={styles.lockedText}>{t.personaEdit.lockedDesc}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },

  saveBtn: { borderRadius: 10, overflow: 'hidden', minWidth: 52 },
  saveBtnGrad: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  photoSection: { alignItems: 'center', paddingVertical: 28, paddingTop: 79, gap: 8 },
  photoCircle: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', position: 'relative' },
  photoImage: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 50 },
  photoIconText: { fontSize: 40, fontWeight: '600', color: '#fff' },
  photoEditOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 32,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  photoEditIcon: { fontSize: 14 },
  photoHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  photoRemove: { fontSize: 12, color: '#f87171' },

  section: { paddingHorizontal: 24, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 12 },
  labelOptional: { fontSize: 13, fontWeight: '400', color: 'rgba(255,255,255,0.4)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, padding: 14, fontSize: 16, color: '#fff',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}),
  },
  inputHint: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 },

  // Relationship chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  chip: {
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden',
  },
  chipSelected: { borderColor: 'transparent' },
  chipGrad: { paddingHorizontal: 16, paddingVertical: 8 },
  chipText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', paddingHorizontal: 16, paddingVertical: 8 },
  chipTextSelected: { fontSize: 14, color: '#fff', fontWeight: '600' },

  lockedSection: {
    marginHorizontal: 24, marginTop: 8, marginBottom: 24,
    padding: 16, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  lockedTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  lockedText: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 18 },
})
