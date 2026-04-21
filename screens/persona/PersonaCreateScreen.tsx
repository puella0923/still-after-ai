import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, SafeAreaView, Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { parseKakaoChat, generateSystemPrompt, generatePetSystemPrompt, ParsedKakaoChat } from '../../services/kakaoParser'
import { createPersona, uploadPersonaPhoto } from '../../services/personaService'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { C, RADIUS } from '../theme'
import CosmicBackground from '../../components/CosmicBackground'
import TopStickyControls from '../../components/TopStickyControls'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PersonaCreate'>
  route: RouteProp<RootStackParamList, 'PersonaCreate'>
}

type KakaoParseResult = {
  parsed: ParsedKakaoChat
  rawText: string
  fileName: string
}

const RELATIONS = ['부모님', '배우자', '연인', '친구', '형제/자매', '자녀', '기타']
const PET_TYPES = ['강아지', '고양이', '앵무새', '햄스터', '토끼', '물고기', '기타']

/** 이름 마지막 글자 받침 유무에 따라 "이름아/이름야" 반환 */
function getCallingForm(name: string): string {
  if (!name) return ''
  const last = name[name.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xAC00 || code > 0xD7A3) return `${name}아` // 비한글
  const jongseong = (code - 0xAC00) % 28
  return jongseong === 0 ? `${name}야` : `${name}아`
}

export default function PersonaCreateScreen({ navigation, route }: Props) {
  const { user } = useAuth()
  const { t } = useLanguage()
  const { careType = 'human', relation: routeRelation, name: routeName, timing: routeTiming } = route.params ?? {}
  const isPet = careType === 'pet'
  const [name, setName] = useState(routeName ?? '')
  const [userNickname, setUserNickname] = useState('')
  const [relationship, setRelationship] = useState(routeRelation ?? '')
  const [activeTab, setActiveTab] = useState<'manual' | 'kakao'>('manual')
  const [manualText, setManualText] = useState('')
  const [kakaoRawText, setKakaoRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseResult, setParseResult] = useState<KakaoParseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [createErrorMsg, setCreateErrorMsg] = useState('')
  const [agreedToService, setAgreedToService] = useState(false)
  // 에러 스낵바 자동 3초 후 숨김
  React.useEffect(() => {
    if (!createErrorMsg) return
    const timer = setTimeout(() => setCreateErrorMsg(''), 3500)
    return () => clearTimeout(timer)
  }, [createErrorMsg])

  // 반려동물 종류 (RelationSetup에서 pre-filled)
  const [animalType, setAnimalType] = useState(isPet ? (routeRelation ?? '') : '')
  const [customAnimal, setCustomAnimal] = useState('')
  // 기타 관계 직접 입력 (사람 케어)
  const [customRelationship, setCustomRelationship] = useState('')
  // 사진 관련
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoFileName, setPhotoFileName] = useState('')
  // ── 펫 전용 질문지 필드 ──────────────────────────────────────────
  const PET_PERSONALITIES = ['활발해요', '차분해요', '애교가 많아요', '겁이 많아요', '장난꾸러기예요', '독립적이에요']
  const [petPersonality, setPetPersonality] = useState<string[]>([])
  const [petHabits, setPetHabits] = useState('')      // 특별한 습관/버릇
  const [petBond, setPetBond] = useState('')           // 나와 어떤 관계였나요?
  const [petFavorites, setPetFavorites] = useState('') // 제일 좋아하던 것
  const [petLastMemory, setPetLastMemory] = useState('') // 마지막 기억
  const [petUnsaid, setPetUnsaid] = useState('')       // 하고 싶었던 말 (선택)

  // 파일 파싱 처리 (공통)
  const processKakaoFile = (rawText: string, fName: string) => {
    setIsParsing(true)
    setErrorMsg('')
    setParseResult(null)

    try {
      if (!rawText || rawText.trim().length === 0) {
        throw new Error(t.personaCreate.errorEmptyFile)
      }

      const parsed = parseKakaoChat(rawText, name.trim() || undefined)

      setKakaoRawText(rawText)
      setFileName(fName)
      setParseResult({ parsed, rawText, fileName: fName })

      // 이름 필드가 비어있으면 파싱된 대화상대 이름으로 자동 채우기
      if (!name.trim() && parsed.partnerName) {
        setName(parsed.partnerName)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t.personaCreate.errorCannotAnalyze
      setErrorMsg(message)
      setKakaoRawText('')
      setFileName('')
      if (__DEV__) console.error('[PersonaCreate] 파싱 오류:', error)
    } finally {
      setIsParsing(false)
    }
  }

  // 이름이 바뀌면 카카오 파싱 결과를 재계산 (이미 업로드된 파일이 있을 때)
  // - 사용자가 "한솔"로 업로드 후 "마닷"으로 이름 변경 시, 파싱 결과가 새 이름 기준으로 갱신되어야 함
  // - 400ms 디바운싱으로 타이핑 중 과도한 재파싱 방지
  useEffect(() => {
    if (activeTab !== 'kakao') return
    if (!kakaoRawText) return
    const trimmed = name.trim()
    // 이미 현재 이름으로 파싱되어 있으면 스킵 (무한루프 방지)
    if (parseResult && parseResult.parsed.partnerName === trimmed) return

    const timer = setTimeout(() => {
      try {
        const parsed = parseKakaoChat(kakaoRawText, trimmed || undefined)
        setParseResult({ parsed, rawText: kakaoRawText, fileName })
        setErrorMsg('')
      } catch (e) {
        if (__DEV__) console.error('[PersonaCreate] 이름 변경 후 재파싱 오류:', e)
      }
    }, 400)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, kakaoRawText, activeTab])

  // 웹 파일 선택
  const handleWebFilePick = () => {
    if (Platform.OS !== 'web') return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.csv,text/plain,text/csv'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        document.body.removeChild(input)
        return
      }

      setIsParsing(true)
      setErrorMsg('')
      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (ev) => {
        const rawText = ev.target?.result as string
        processKakaoFile(rawText || '', file.name)
        document.body.removeChild(input)
      }
      reader.onerror = () => {
        setErrorMsg(t.personaCreate.errorCannotRead)
        setIsParsing(false)
        document.body.removeChild(input)
      }
      reader.readAsText(file, 'UTF-8')
    }
    input.click()
  }

  // 네이티브 파일 선택
  const handleNativeFilePick = async () => {
    try {
      const DocumentPicker = await import('expo-document-picker')
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'text/csv', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      })
      if (result.canceled || result.assets.length === 0) return
      const FileSystem = await import('expo-file-system')
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' as any })
      processKakaoFile(content, result.assets[0].name)
    } catch {
      setErrorMsg(t.personaCreate.errorCannotRead)
    }
  }

  // ─── 사진 선택 ───
  const handlePickPhotoWeb = () => {
    if (Platform.OS !== 'web') return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      document.body.removeChild(input)
      if (!file) return
      const uri = URL.createObjectURL(file)
      setPhotoUri(uri)
      setPhotoBlob(file)
      setPhotoFileName(file.name)
    }
    input.click()
  }

  const handlePickPhotoNative = async () => {
    try {
      const ImagePicker = await import('expo-image-picker')
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert(t.personaCreate.alertPermissionTitle, t.personaCreate.alertPermissionMsg)
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      setPhotoUri(asset.uri)
      setPhotoFileName(`photo_${Date.now()}.jpg`)
      // 네이티브에서 blob 변환 (실패 시 재시도 후 포기)
      let blobOk = false
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(asset.uri)
          const blob = await response.blob()
          if (blob && blob.size > 0) {
            setPhotoBlob(blob)
            blobOk = true
            break
          }
        } catch { /* 재시도 */ }
      }
      if (!blobOk) {
        // blob 변환 실패 → base64로 폴백
        try {
          const FileSystem = await import('expo-file-system')
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64' as any,
          })
          const byteChars = atob(base64)
          const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i))
          const blob = new Blob([new Uint8Array(byteNums)], { type: 'image/jpeg' })
          setPhotoBlob(blob)
        } catch {
          setPhotoBlob(null)
          if (__DEV__) console.warn('[Photo] blob 변환 완전 실패 — 사진 없이 진행')
        }
      }
    } catch {
      Alert.alert(t.personaCreate.alertPhotoErrorTitle, t.personaCreate.alertPhotoErrorMsg)
    }
  }

  const handlePickPhoto = () => {
    if (Platform.OS === 'web') {
      handlePickPhotoWeb()
    } else {
      handlePickPhotoNative()
    }
  }

  const resolvedAnimalType = animalType === '다른 동물' ? customAnimal.trim() : animalType
  const resolvedRelationship = relationship === '기타' ? customRelationship.trim() : relationship

  const canSubmit = (): boolean => {
    if (!name.trim() || !agreedToService) return false
    if (isPet) {
      // 펫: 마지막 기억만 필수 (나머지는 선택)
      return petLastMemory.trim().length >= 10
    }
    if (!relationship) return false
    if (relationship === '기타' && !customRelationship.trim()) return false
    if (activeTab === 'manual') return manualText.trim().length >= 20
    if (activeTab === 'kakao') return parseResult !== null && kakaoRawText.trim().length > 0
    return false
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
      return
    }

    // Direct entry or stack reset case: only navigate to TimingCheck when required params exist.
    if (routeRelation && routeName) {
      navigation.navigate('TimingCheck', {
        careType,
        relation: routeRelation,
        name: routeName,
      })
      return
    }

    navigation.navigate('CareSelect')
  }

  const handleCreate = async () => {
    if (!user) {
      Alert.alert(t.personaCreate.alertLoginTitle, t.personaCreate.alertLoginMsg, [
        { text: t.common.confirm, onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ])
      return
    }
    if (!canSubmit()) {
      setCreateErrorMsg(
        !name.trim()
          ? t.personaCreate.errorNameRequired
          : isPet && !resolvedAnimalType
          ? t.personaCreate.errorPetTypeRequired
          : !isPet && !relationship
          ? t.personaCreate.errorRelationRequired
          : !isPet && relationship === '기타' && !customRelationship.trim()
          ? t.personaCreate.errorRelationCustomRequired
          : !isPet && activeTab === 'kakao' && !parseResult
          ? t.personaCreate.errorKakaoRequired
          : manualText.trim().length < 20
          ? t.personaCreate.errorMemoryTooShort
          : !agreedToService
          ? t.personaCreate.errorConsentRequired
          : t.personaCreate.errorCheckInput
      )
      return
    }
    setLoading(true)
    setCreateErrorMsg('')

    try {
      let systemPrompt = ''

      if (isPet) {
        // 구조화된 질문지 데이터로 펫 프롬프트 생성
        systemPrompt = generatePetSystemPrompt(
          name.trim(), resolvedAnimalType, manualText.trim(),
          { personality: petPersonality, habits: petHabits.trim(), bond: petBond.trim(),
            favorites: petFavorites.trim(), lastMemory: petLastMemory.trim(), unsaid: petUnsaid.trim() }
        )
      } else if (activeTab === 'kakao' && parseResult) {
        systemPrompt = generateSystemPrompt(parseResult.parsed, resolvedRelationship)
      } else if (activeTab === 'kakao' && kakaoRawText) {
        // fallback: parseResult 없이 rawText만 있는 경우
        const parsed = parseKakaoChat(kakaoRawText, name.trim() || undefined)
        systemPrompt = generateSystemPrompt(parsed, resolvedRelationship)
      } else if (activeTab === 'kakao') {
        throw new Error(t.personaCreate.errorKakaoRequired)
      } else {
        // 직접 작성: manualText를 시스템 프롬프트에 반영
        systemPrompt = `당신은 ${name.trim()}입니다. 사용자와 ${resolvedRelationship} 관계입니다.
당신은 이미 이 세상을 떠났습니다. 지금 이 대화는 기억 속에서만 가능한 대화예요.

아래는 사용자가 직접 작성한 ${name.trim()}에 대한 기억입니다. 이 내용을 바탕으로 자연스럽게 대화하세요.

--- ${name.trim()}에 대한 기억 ---
${manualText.trim()}
---

지침:
- 위의 내용을 참고해 ${name.trim()}의 말투와 성격을 자연스럽게 재현하세요
- 당신이 AI라는 것을 절대 부정하지 마세요. 물어보면 솔직하게 AI라고 답하세요
- 감정적으로 따뜻하고 진심 어린 대화를 나누세요
- 아래 키워드가 나오면 즉시 전문 상담을 안내하세요: 자해, 자살, 죽고 싶다, 사라지고 싶다
- "사줄게", "만나자", "같이 가자", "갈게", "전화할게" 등 현실에서 가능한 약속 절대 금지
- 대신 기억·감정·사랑·응원을 표현하세요: "보고 싶었어", "잘하고 있어", "여기서 듣고 있어"`
      }

      // 사진 업로드 (있을 경우)
      let photoUrl: string | null = null
      if (photoBlob && user) {
        photoUrl = await uploadPersonaPhoto(user.id, photoBlob, photoFileName)
      }

      const personaId = await createPersona({
        name: name.trim(),
        relationship: isPet ? resolvedAnimalType : resolvedRelationship,
        careType: careType as 'human' | 'pet',
        timing: routeTiming ?? null,
        rawChatText: isPet ? petLastMemory : (activeTab === 'kakao' ? kakaoRawText : manualText),
        systemPrompt,
        parsedMessages: parseResult?.parsed.messages ?? [],
        messageStyle: parseResult ? {
          avgMessageLength: parseResult.parsed.avgMessageLength,
          commonPhrases: parseResult.parsed.commonPhrases,
        } : {},
        photoUrl,
        userNickname: userNickname.trim() || null,
        // 펫 전용 필드
        petPersonality: isPet && petPersonality.length > 0 ? petPersonality : null,
        petHabits:     isPet && petHabits.trim()     ? petHabits.trim()     : null,
        petBond:       isPet && petBond.trim()        ? petBond.trim()        : null,
        petFavorites:  isPet && petFavorites.trim()   ? petFavorites.trim()   : null,
        petLastMemory: isPet && petLastMemory.trim()  ? petLastMemory.trim()  : null,
        petUnsaid:     isPet && petUnsaid.trim()      ? petUnsaid.trim()      : null,
      })

      navigation.replace('AIGenerating', { name: name.trim(), personaId })
    } catch (err: unknown) {
      if (__DEV__) console.error('[PersonaCreate] 생성 오류:', err)
      const message = err instanceof Error ? err.message : t.personaCreate.errorCheckInput
      setCreateErrorMsg(message)
      Alert.alert(t.personaCreate.alertPausedTitle, message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.rootWrap}>
      <CosmicBackground starCount={20} />
      <SafeAreaView style={styles.safeArea}>
        <TopStickyControls
          backLabel={t.common.back}
          onBackPress={handleBack}
          title={t.personaCreate.headerTitle}
          showLanguageToggle={false}
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

        {/* 안내 */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {t.personaCreate.aiBanner}
          </Text>
        </View>

        {/* 사진 추가 (선택) */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoCircle} onPress={handlePickPhoto} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoHint}>{t.personaCreate.addPhoto}</Text>
                <Text style={styles.photoHintSub}>{t.personaCreate.photoOptional}</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoBlob(null) }}>
              <Text style={styles.photoRemove}>{t.personaCreate.removePhoto}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 이름 입력 */}
        <View style={styles.section}>
          <Text style={styles.label}>{isPet ? t.personaCreate.nameLabelPet : t.personaCreate.nameLabelHuman}</Text>
          <TextInput
            style={styles.input}
            placeholder={isPet ? t.personaCreate.namePlaceholderPet : t.personaCreate.namePlaceholderHuman}
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholderTextColor="#B0A89E"
          />
        </View>

        {/* 애칭 입력 (선택) — 사람 케어에서만 표시 */}
        {!isPet && (
          <View style={styles.section}>
            <Text style={styles.label}>
              {t.personaCreate.myNameLabel}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t.personaCreate.myNamePlaceholder}
              value={userNickname}
              onChangeText={setUserNickname}
              maxLength={20}
              placeholderTextColor="#B0A89E"
            />
            <Text style={styles.inputHint}>
              {t.personaCreate.myNameHint}
            </Text>
          </View>
        )}

        {/* 관계 선택 — 사람 케어에서만 표시 */}
        {!isPet && (
          <View style={styles.section}>
            <Text style={styles.label}>{t.personaCreate.relationLabel}</Text>
            <View style={styles.relationRow}>
              {RELATIONS.map(rel => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.relationBtn, relationship === rel && styles.relationBtnActive]}
                  onPress={() => { setRelationship(rel); if (rel !== '기타') setCustomRelationship('') }}
                >
                  <Text style={[styles.relationText, relationship === rel && styles.relationTextActive]}>
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {relationship === '기타' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder={t.personaCreate.relationOtherPlaceholder}
                value={customRelationship}
                onChangeText={setCustomRelationship}
                maxLength={20}
                placeholderTextColor="#B0A89E"
              />
            )}
          </View>
        )}

        {/* 반려동물 종류 선택 — 펫 케어에서만 표시 */}
        {isPet && (
          <View style={styles.section}>
            <Text style={styles.label}>{t.personaCreate.petTypeLabel}</Text>
            <View style={styles.relationRow}>
              {PET_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt}
                  style={[styles.relationBtn, animalType === pt && styles.relationBtnActive]}
                  onPress={() => { setAnimalType(pt); if (pt !== '다른 동물') setCustomAnimal('') }}
                >
                  <Text style={[styles.relationText, animalType === pt && styles.relationTextActive]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {animalType === '다른 동물' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder={t.personaCreate.petOtherPlaceholder}
                value={customAnimal}
                onChangeText={setCustomAnimal}
                maxLength={20}
                placeholderTextColor='#B0A89E'
              />
            )}
          </View>
        )}

        {/* ── 펫 질문지 (7개 구조화 필드) ─────────────────────────── */}
        {isPet && (
          <>
            {/* Q1: 성격 (복수 선택 칩) */}
            <View style={styles.section}>
              <Text style={styles.label}>어떤 성격이었나요? <Text style={styles.labelOptional}>(복수 선택)</Text></Text>
              <View style={styles.relationRow}>
                {PET_PERSONALITIES.map(p => {
                  const isOn = petPersonality.includes(p)
                  return (
                    <TouchableOpacity key={p} activeOpacity={0.8}
                      style={[styles.relationBtn, isOn && styles.relationBtnActive]}
                      onPress={() => setPetPersonality(prev => isOn ? prev.filter(x => x !== p) : [...prev, p])}>
                      <Text style={[styles.relationText, isOn && styles.relationTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Q2: 특별한 습관/버릇 */}
            <View style={styles.section}>
              <Text style={styles.label}>특별한 습관이나 버릇이 있었나요? <Text style={styles.labelOptional}>(선택)</Text></Text>
              <TextInput style={styles.input}
                placeholder={`예) 밥 먹을 때 항상 옆에 앉았어요\n산책 가자는 말만 들어도 빙글빙글 돌았어요`}
                value={petHabits} onChangeText={setPetHabits}
                multiline numberOfLines={3} placeholderTextColor="#B0A89E" textAlignVertical="top" />
            </View>

            {/* Q3: 나와의 관계/유대 */}
            <View style={styles.section}>
              <Text style={styles.label}>나를 어떻게 대했나요? <Text style={styles.labelOptional}>(선택)</Text></Text>
              <TextInput style={styles.input}
                placeholder={`예) 항상 현관까지 마중 나왔어요\n무서울 때마다 제 옆에 꼭 붙었어요`}
                value={petBond} onChangeText={setPetBond}
                multiline numberOfLines={3} placeholderTextColor="#B0A89E" textAlignVertical="top" />
            </View>

            {/* Q4: 제일 좋아하던 것 */}
            <View style={styles.section}>
              <Text style={styles.label}>제일 좋아하던 게 뭐였나요? <Text style={styles.labelOptional}>(선택)</Text></Text>
              <TextInput style={styles.input}
                placeholder={`예) 배 만져주기, 간식, 공원 산책`}
                value={petFavorites} onChangeText={setPetFavorites}
                placeholderTextColor="#B0A89E" />
            </View>

            {/* Q5: 마지막 기억 (필수) */}
            <View style={styles.section}>
              <Text style={styles.label}>마지막으로 기억하는 순간을 적어주세요 <Text style={styles.labelRequired}>*</Text></Text>
              <TextInput style={[styles.input, styles.inputTall]}
                placeholder={`예) 마지막에 제 손을 핥아줬어요\n눈을 마주치며 꼬리를 흔들었어요`}
                value={petLastMemory} onChangeText={setPetLastMemory}
                multiline numberOfLines={4} placeholderTextColor="#B0A89E" textAlignVertical="top" />
              <Text style={styles.charCount}>
                {petLastMemory.length}자 {petLastMemory.length < 10 ? '(10자 이상)' : '✓'}
              </Text>
            </View>

            {/* Q6: 하고 싶었던 말 */}
            <View style={styles.section}>
              <Text style={styles.label}>꼭 하고 싶었던 말이 있나요? <Text style={styles.labelOptional}>(선택)</Text></Text>
              <TextInput style={[styles.input, styles.inputTall]}
                placeholder={`예) 많이 사랑해\n좋은 곳에서 행복하게 지내길 바라`}
                value={petUnsaid} onChangeText={setPetUnsaid}
                multiline numberOfLines={4} placeholderTextColor="#B0A89E" textAlignVertical="top" />
            </View>
          </>
        )}

        {/* 탭 — 사람 케어만 */}
        {!isPet && (
        <View style={styles.section}>
          <Text style={styles.label}>
            {name ? t.personaCreate.memoryTitleWithName(name) : t.personaCreate.memoryTitle}
          </Text>
          <View style={styles.tabRow}>
            <Pressable style={[styles.tab, activeTab === 'manual' && styles.tabActive]} onPress={() => setActiveTab('manual')}>
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>{t.personaCreate.tabWrite}</Text>
            </Pressable>
            <Pressable style={[styles.tab, activeTab === 'kakao' && styles.tabActive]} onPress={() => setActiveTab('kakao')}>
              <Text style={[styles.tabText, activeTab === 'kakao' && styles.tabTextActive]}>{t.personaCreate.tabKakao}</Text>
            </Pressable>
          </View>

          {activeTab === 'manual' ? (
            <View>
              <TextInput
                style={styles.manualInput}
                placeholder={isPet
                  ? `${t.personaCreate.writePlaceholderPet(name || '그 아이')}\n\n${t.personaCreate.writeExamplePet}`
                  : `${t.personaCreate.writePlaceholder(name || '그분')}\n\n${t.personaCreate.writeExample}`}
                value={manualText} onChangeText={setManualText}
                multiline numberOfLines={12} placeholderTextColor="#B0A89E" textAlignVertical="top"
              />
              <Text style={styles.charCount}>{manualText.length}자 {manualText.length < 20 ? t.personaCreate.charCountHint : '✓'}</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.kakaoGuide}>
                {t.personaCreate.kakaoDesc}
              </Text>
              <Text style={styles.kakaoGuideSub}>
                {t.personaCreate.kakaoInstructions}
              </Text>
              <Text style={[styles.kakaoGuideSub, { color: '#F59E0B', marginTop: 4 }]}>
                {t.personaCreate.kakaoOnlyDirect}
              </Text>
              <Text style={styles.dataDeleteNote}>
                {t.personaCreate.dataDeleteNote}
              </Text>
              <Pressable
                style={[styles.uploadBtn, parseResult && styles.uploadBtnDone]}
                onPress={Platform.OS === 'web' ? handleWebFilePick : handleNativeFilePick}
                disabled={isParsing}
              >
                {isParsing ? (
                  <View style={styles.uploadBtnRow}>
                    <ActivityIndicator size="small" color="#2C2C2C" />
                    <Text style={styles.uploadBtnText}>{t.personaCreate.analyzing}</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadBtnText}>
                    {fileName ? `📄 ${fileName}` : t.personaCreate.uploadBtn}
                  </Text>
                )}
              </Pressable>

              {/* 에러 메시지 */}
              {errorMsg && !parseResult && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {/* 파싱 성공 미리보기 */}
              {parseResult && (
                <View style={styles.parseResultBox}>
                  <Text style={styles.parseResultTitle}>{t.personaCreate.memorySuccess}</Text>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>{t.personaCreate.parseResultPartner}</Text>
                    <Text style={styles.parseResultValue}>{parseResult.parsed.partnerName}</Text>
                  </View>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>{t.personaCreate.parseResultTotal}</Text>
                    <Text style={styles.parseResultValue}>{t.personaCreate.parseResultCount(parseResult.parsed.totalMessages)}</Text>
                  </View>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>{t.personaCreate.parseResultFrom(parseResult.parsed.partnerName)}</Text>
                    <Text style={styles.parseResultValue}>{t.personaCreate.parseResultCount(parseResult.parsed.partnerMessageCount)}</Text>
                  </View>
                  {parseResult.parsed.commonPhrases.length > 0 && (
                    <View style={styles.parseResultRow}>
                      <Text style={styles.parseResultLabel}>{t.personaCreate.parseResultPhrases}</Text>
                      <Text style={styles.parseResultValue}>
                        {parseResult.parsed.commonPhrases.slice(0, 8).join(', ')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.parseResultHint}>
                    {t.personaCreate.parseResultChangeHint}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        )}

        {/* 서비스 동의 */}
        <View style={styles.section}>
          <Pressable
            style={styles.consentRow}
            onPress={() => setAgreedToService(!agreedToService)}
          >
            <View style={[styles.checkbox, agreedToService && styles.checkboxChecked]}>
              {agreedToService && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              {t.personaCreate.consentLabel}
            </Text>
          </Pressable>
        </View>



        {/* 제출 */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleCreate}
          disabled={!canSubmit() || loading}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={(!canSubmit() || loading) ? ['rgba(124, 58, 237, 0.3)', 'rgba(59, 130, 246, 0.3)'] : ['#7C3AED', '#3B82F6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {loading ? (
              <View style={styles.uploadBtnRow}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>{t.personaCreate.submitting}</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>
                {canSubmit() ? t.personaCreate.submitBtn
                  : !name.trim() ? t.personaCreate.errorNameRequired
                  : isPet && petLastMemory.trim().length < 10 ? '마지막 기억을 10자 이상 적어주세요'
                  : !isPet && !relationship ? t.personaCreate.errorRelationRequired
                  : !isPet && manualText.trim().length < 20 ? t.personaCreate.errorMemoryTooShort
                  : !agreedToService ? t.personaCreate.errorConsentRequired
                  : t.personaCreate.submitBtn}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>

      {/* 에러 스낵바 — 화면 하단 고정 */}
      {!!createErrorMsg && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>⚠️ {createErrorMsg}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  rootWrap: { flex: 1 },
  snackbar: {
    position: 'absolute', bottom: 32, left: 24, right: 24,
    backgroundColor: 'rgba(239,68,68,0.92)', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 18, zIndex: 999,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  snackbarText: { color: '#fff', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  safeArea: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingTop: 51 },
  // ─── 사진 ───
  photoSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  photoCircle: {
    width: 100, height: 100, borderRadius: 50, overflow: 'hidden',
    backgroundColor: 'rgba(124, 58, 237, 0.2)', borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.4)',
  },
  photoImage: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  photoIcon: { fontSize: 24 },
  photoHint: { fontSize: 12, fontWeight: '500', color: 'rgba(196, 181, 253, 0.8)' },
  photoHintSub: { fontSize: 10, color: 'rgba(167, 139, 250, 0.5)' },
  photoRemove: { fontSize: 12, color: '#FCA5A5' },
  banner: {
    backgroundColor: 'rgba(120, 53, 15, 0.3)', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(251, 191, 36, 0.2)',
  },
  bannerText: { fontSize: 11, color: '#FDE68A', textAlign: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#F3E8FF', marginBottom: 12 },
  labelOptional: { fontSize: 13, fontWeight: '400', color: 'rgba(167,139,250,0.55)' },
  labelRequired: { fontSize: 13, fontWeight: '600', color: '#db2777' },
  inputTall: { minHeight: 100, paddingTop: 14 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 14, padding: 14, fontSize: 16, color: '#FFFFFF',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  inputHint: { fontSize: 12, color: 'rgba(167, 139, 250, 0.6)', marginTop: 6 },
  relationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relationBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  relationBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  relationText: { fontSize: 13, color: 'rgba(196, 181, 253, 0.8)' },
  relationTextActive: { color: '#FFFFFF', fontWeight: '600' },
  tabRow: {
    flexDirection: 'row', borderRadius: 999, backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 999 },
  tabActive: { backgroundColor: 'rgba(124, 58, 237, 0.5)' },
  tabText: { fontSize: 13, color: 'rgba(196, 181, 253, 0.7)' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  manualInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 14, padding: 14, fontSize: 14, color: '#FFFFFF', minHeight: 220,
  },
  charCount: { fontSize: 12, color: 'rgba(167, 139, 250, 0.6)', textAlign: 'right', marginTop: 4 },
  kakaoGuide: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)', marginBottom: 8, lineHeight: 20 },
  kakaoGuideSub: { fontSize: 12, color: 'rgba(167, 139, 250, 0.6)', marginBottom: 12, lineHeight: 18 },
  dataDeleteNote: { fontSize: 12, color: 'rgba(134, 239, 172, 0.75)', marginBottom: 10, lineHeight: 18, paddingHorizontal: 4 },
  uploadBtn: {
    backgroundColor: '#FEE500', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', marginBottom: 12,
  },
  uploadBtnDone: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  uploadBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#1a1a2e' },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', marginBottom: 12,
  },
  errorText: { fontSize: 13, color: '#FCA5A5', lineHeight: 20 },
  parseResultBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.3)', gap: 8, marginBottom: 12,
  },
  parseResultTitle: { fontSize: 14, fontWeight: '700', color: '#86EFAC', marginBottom: 4 },
  parseResultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  parseResultLabel: { fontSize: 13, color: 'rgba(196, 181, 253, 0.7)' },
  parseResultValue: { fontSize: 13, fontWeight: '600', color: '#F3E8FF' },
  parseResultHint: { fontSize: 11, color: 'rgba(167, 139, 250, 0.5)', textAlign: 'center', marginTop: 4 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.4)', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  consentText: { flex: 1, fontSize: 13, color: 'rgba(196, 181, 253, 0.7)', lineHeight: 20 },
  submitBtn: {
    marginHorizontal: 24, borderRadius: 14, overflow: 'hidden', marginTop: 8,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnGradient: { paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
})
