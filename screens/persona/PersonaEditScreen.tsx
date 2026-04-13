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

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PersonaEdit'>
  route: RouteProp<RootStackParamList, 'PersonaEdit'>
}

const RELATIONS = ['부모님', '배우자', '자녀', '친구', '연인', '기타']

const STAR_DOTS = Array.from({ length: 20 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.12 + (i % 5) * 0.06,
}))

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

export default function PersonaEditScreen({ navigation, route }: Props) {
  const { personaId, personaName, currentPhotoUrl, currentNickname, currentRelationship } = route.params
  const { user } = useAuth()

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
      if (status !== 'granted') { Alert.alert('권한 필요', '사진 접근 권한이 필요해요.'); return }
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
    } catch { Alert.alert('오류', '사진을 불러올 수 없어요.') }
  }

  const handlePickPhoto = () => Platform.OS === 'web' ? handlePickPhotoWeb() : handlePickPhotoNative()
  const handleRemovePhoto = () => { setPhotoUri(null); setPhotoBlob(null); setPhotoChanged(true) }

  const handleSave = async () => {
    if (!user) return
    const trimmedName = name.trim()
    if (!trimmedName) {
      Alert.alert('이름을 입력해주세요', '이 사람을 어떻게 부를지 알려주세요.')
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
    } catch (err) { Alert.alert('저장 실패', err instanceof Error ? err.message : '잠시 후 다시 시도해주세요.') }
    finally { setLoading(false) }
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#1a0118', '#200a2e', '#0f0520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{(name || personaName)} 수정</Text>
          <TouchableOpacity style={[styles.saveBtn, loading && { opacity: 0.6 }]} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#FFFFFF" />
              : <LinearGradient colors={['#a855f7', '#db2777']} style={styles.saveBtnGrad}>
                  <Text style={styles.saveBtnText}>저장</Text>
                </LinearGradient>
            }
          </TouchableOpacity>
        </View>

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
          <Text style={styles.photoHint}>사진을 눌러 변경하거나 추가하세요</Text>
          {photoUri && (
            <TouchableOpacity onPress={handleRemovePhoto}>
              <Text style={styles.photoRemove}>사진 지우기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.label}>이 사람을 어떻게 부를까요?</Text>
          <TextInput
            style={styles.input}
            placeholder='예: 엄마, 지수, 준혁'
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
          <Text style={styles.inputHint}>대화 목록과 말풍선에 이 이름이 표시돼요</Text>
        </View>

        {/* Relationship */}
        <View style={styles.section}>
          <Text style={styles.label}>{(name || personaName)}과의 관계</Text>
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
          <Text style={styles.inputHint}>관계를 바꾸면 AI가 그에 맞는 어투로 대화해요</Text>
        </View>

        {/* Nickname */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {(name || personaName)}이(가) 나를 뭐라고 불렀나요?
            <Text style={styles.labelOptional}> (선택)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder='예: 연수야, 자기야, 우리 딸'
            value={nickname}
            onChangeText={setNickname}
            maxLength={20}
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
          <Text style={styles.inputHint}>입력하면 대화에서 {(name || personaName)}이(가) 이 이름으로 불러줘요</Text>
        </View>

        {/* 학습 데이터 안내 */}
        <View style={styles.lockedSection}>
          <Text style={styles.lockedTitle}>대화 학습 내용은 바꿀 수 없어요</Text>
          <Text style={styles.lockedText}>
            카카오톡 대화나 작성한 설명은 이 사람의 말투 그 자체예요.{'\n'}
            다시 만들고 싶다면 새 기억을 만들어 주세요.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '-5%', right: '-15%', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
  orb2: { width: 200, height: 200, bottom: '15%', left: '-10%', backgroundColor: 'rgba(219, 39, 119, 0.06)' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#fff', lineHeight: 36, marginTop: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },
  saveBtn: { borderRadius: 10, overflow: 'hidden', minWidth: 52 },
  saveBtnGrad: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  photoSection: { alignItems: 'center', paddingVertical: 28, gap: 8 },
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
