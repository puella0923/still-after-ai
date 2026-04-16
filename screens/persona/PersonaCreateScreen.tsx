import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform, SafeAreaView, Image,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { parseKakaoChat, generateSystemPrompt, generatePetSystemPrompt, ParsedKakaoChat } from '../../services/kakaoParser'
import { createPersona, uploadPersonaPhoto } from '../../services/personaService'
import { useAuth } from '../../context/AuthContext'
import { C, RADIUS } from '../theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PersonaCreate'>
}

type KakaoParseResult = {
  parsed: ParsedKakaoChat
  rawText: string
  fileName: string
}

const RELATIONS = ['부모님', '배우자', '연인', '친구', '형제/자매', '자녀', '반려동물', '기타']

/** 이름 마지막 글자 받침 유무에 따라 "이름아/이름야" 반환 */
function getCallingForm(name: string): string {
  if (!name) return ''
  const last = name[name.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xAC00 || code > 0xD7A3) return `${name}아` // 비한글
  const jongseong = (code - 0xAC00) % 28
  return jongseong === 0 ? `${name}야` : `${name}아`
}

export default function PersonaCreateScreen({ navigation }: Props) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [userNickname, setUserNickname] = useState('')  // 페르소나가 나를 부르던 애칭
  const [relationship, setRelationship] = useState('')
  const [activeTab, setActiveTab] = useState<'manual' | 'kakao'>('manual')
  const [manualText, setManualText] = useState('')
  const [kakaoRawText, setKakaoRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [parseResult, setParseResult] = useState<KakaoParseResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')       // 파싱 오류
  const [createErrorMsg, setCreateErrorMsg] = useState('') // 생성 오류
  const [agreedToService, setAgreedToService] = useState(false)
  // 반려동물 종류
  const PET_TYPES = ['강아지', '고양이', '햄스터', '토끼', '앵무새', '다른 동물']
  const [animalType, setAnimalType] = useState('')
  const [customAnimal, setCustomAnimal] = useState('')
  // 사진 관련
  const [photoUri, setPhotoUri] = useState<string | null>(null)   // 로컬 미리보기 URI
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)   // 업로드용 blob
  const [photoFileName, setPhotoFileName] = useState('')

  // 파일 파싱 처리 (공통)
  const processKakaoFile = (rawText: string, fName: string) => {
    setIsParsing(true)
    setErrorMsg('')
    setParseResult(null)

    try {
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('빈 파일입니다.')
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
      const message = error instanceof Error ? error.message : '파일을 분석할 수 없습니다.'
      setErrorMsg(message)
      setKakaoRawText('')
      setFileName('')
      console.error('[PersonaCreate] 파싱 오류:', error)
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
        console.error('[PersonaCreate] 이름 변경 후 재파싱 오류:', e)
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
        setErrorMsg('파일을 읽을 수 없습니다. 다시 시도해주세요.')
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
      setErrorMsg('파일을 읽을 수 없습니다. 다시 시도해주세요.')
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
        Alert.alert('권한 필요', '사진 접근 권한이 필요해요.')
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
          console.warn('[Photo] blob 변환 완전 실패 — 사진 없이 진행')
        }
      }
    } catch {
      Alert.alert('오류', '사진을 불러올 수 없어요.')
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

  const canSubmit = (): boolean => {
    if (!name.trim() || !relationship || !agreedToService) return false
    if (relationship === '반려동물' && !resolvedAnimalType) return false
    if (activeTab === 'manual') return manualText.trim().length >= 20
    if (activeTab === 'kakao') return parseResult !== null && kakaoRawText.trim().length > 0
    return false
  }

  const handleCreate = async () => {
    if (!user) {
      Alert.alert('로그인이 필요해요', '다시 로그인 후 기억 만들기를 진행해주세요.', [
        { text: '확인', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ])
      return
    }
    if (!canSubmit()) {
      setCreateErrorMsg(
        !name.trim()
          ? '이름을 입력해주세요.'
          : !relationship
          ? '관계를 선택해주세요.'
          : relationship === '반려동물' && !resolvedAnimalType
          ? '어떤 동물이었는지 선택해주세요.'
          : activeTab === 'kakao' && !parseResult
          ? '카카오톡 파일을 먼저 업로드해주세요.'
          : activeTab === 'manual' && manualText.trim().length < 20
          ? '기억을 20자 이상 입력해주세요.'
          : !agreedToService
          ? '서비스 동의가 필요해요.'
          : '입력 정보를 다시 확인해주세요.'
      )
      return
    }
    setLoading(true)
    setCreateErrorMsg('')

    try {
      let systemPrompt = ''

      if (activeTab === 'kakao' && parseResult) {
        systemPrompt = generateSystemPrompt(parseResult.parsed, relationship)
      } else if (activeTab === 'kakao' && kakaoRawText) {
        // fallback: parseResult 없이 rawText만 있는 경우
        const parsed = parseKakaoChat(kakaoRawText, name.trim() || undefined)
        systemPrompt = generateSystemPrompt(parsed, relationship)
      } else if (activeTab === 'kakao') {
        throw new Error('카카오톡 파일 분석 결과가 없어 기억을 만들 수 없어요. 파일을 다시 업로드해주세요.')
      } else if (relationship === '반려동물') {
        // 반려동물 전용 프롬프트 (펫로스 특화)
        systemPrompt = generatePetSystemPrompt(name.trim(), resolvedAnimalType, manualText.trim())
      } else {
        // 직접 작성: manualText를 시스템 프롬프트에 반영
        systemPrompt = `당신은 ${name.trim()}입니다. 사용자와 ${relationship} 관계입니다.
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
        relationship,
        rawChatText: activeTab === 'kakao' ? kakaoRawText : manualText,
        systemPrompt,
        parsedMessages: parseResult?.parsed.messages ?? [],
        messageStyle: parseResult ? {
          avgMessageLength: parseResult.parsed.avgMessageLength,
          commonPhrases: parseResult.parsed.commonPhrases,
        } : {},
        photoUrl,
        userNickname: userNickname.trim() || null,
      })

      navigation.replace('AIGenerating', { name: name.trim(), personaId })
    } catch (err: unknown) {
      console.error('[PersonaCreate] 생성 오류:', err)
      const message = err instanceof Error ? err.message : '기억을 담는 중 문제가 생겼어요.'
      setCreateErrorMsg(message)
      Alert.alert('잠시 멈췄어요', message)
    } finally {
      setLoading(false)
    }
  }

  const SCREEN_WIDTH = Dimensions.get('window').width
  const STARS = Array.from({ length: 20 }, (_, i) => ({
    left: ((i * 97 + 31) % 100), top: ((i * 53 + 17) % 100),
    size: (i % 3) + 1.5, opacity: 0.12 + (i % 5) * 0.08,
  }))

  return (
    <View style={styles.rootWrap}>
      <LinearGradient colors={['#0a0118', '#1a0f3e', '#0f0520']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbContainer}>
        <View style={[styles.orb, { top: -100, left: SCREEN_WIDTH * 0.25 - 192, backgroundColor: 'rgba(124, 58, 237, 0.2)' }]} />
        <View style={[styles.orb, { bottom: -100, right: SCREEN_WIDTH * 0.25 - 192, backgroundColor: 'rgba(37, 99, 235, 0.2)' }]} />
      </View>
      {STARS.map((star, i) => (
        <View key={i} style={[styles.star, { left: `${star.left}%` as any, top: `${star.top}%` as any, width: star.size, height: star.size, opacity: star.opacity, borderRadius: star.size }]} />
      ))}
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>기억 만들기</Text>
          <View style={styles.headerRight} />
        </View>

        {/* 안내 */}
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            ⚠️ 그 분의 말투와 온기를 담지만, 실제 인물을 대체하지 않아요.
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
                <Text style={styles.photoHint}>사진 추가</Text>
                <Text style={styles.photoHintSub}>선택 사항이에요</Text>
              </View>
            )}
          </TouchableOpacity>
          {photoUri && (
            <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoBlob(null) }}>
              <Text style={styles.photoRemove}>사진 지우기</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 이름 입력 */}
        <View style={styles.section}>
          <Text style={styles.label}>{relationship === '반려동물' ? '이름이 뭐였나요?' : '어떻게 불렀나요?'}</Text>
          <TextInput
            style={styles.input}
            placeholder={relationship === '반려동물' ? '예: 초코, 보리, 콩이' : '예: 엄마, 지수, 준혁'}
            value={name}
            onChangeText={setName}
            maxLength={20}
            placeholderTextColor="#B0A89E"
          />
        </View>

        {/* 애칭 입력 (선택) */}
        <View style={styles.section}>
          <Text style={styles.label}>
            그 분이 나를 뭐라고 불렀나요?
            <Text style={styles.labelOptional}> (선택)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder='예: 연수야, 자기야, 우리 딸'
            value={userNickname}
            onChangeText={setUserNickname}
            maxLength={20}
            placeholderTextColor="#B0A89E"
          />
          <Text style={styles.inputHint}>
            입력하면 대화에서 그 분이 이 이름으로 불러드려요
          </Text>
        </View>

        {/* 관계 선택 */}
        <View style={styles.section}>
          <Text style={styles.label}>그리운 분과 어떤 사이였나요?</Text>
          <View style={styles.relationRow}>
            {RELATIONS.map(rel => (
              <TouchableOpacity
                key={rel}
                style={[styles.relationBtn, relationship === rel && styles.relationBtnActive]}
                onPress={() => { setRelationship(rel); if (rel !== '반려동물') { setAnimalType(''); setCustomAnimal('') } }}
              >
                <Text style={[styles.relationText, relationship === rel && styles.relationTextActive]}>
                  {rel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 반려동물 종류 선택 */}
        {relationship === '반려동물' && (
          <View style={styles.section}>
            <Text style={styles.label}>어떤 동물이었나요?</Text>
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
                placeholder='예: 페랿, 도마랜, 금붕어...'
                value={customAnimal}
                onChangeText={setCustomAnimal}
                maxLength={20}
                placeholderTextColor='#B0A89E'
              />
            )}
          </View>
        )}

        {/* 탭 */}
        <View style={styles.section}>
          <Text style={styles.label}>
            {name ? `"${name}"을(를) 기억할 수 있게 알려주세요` : '기억을 알려주세요'}
          </Text>
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, activeTab === 'manual' && styles.tabActive]}
              onPress={() => setActiveTab('manual')}
            >
              <Text style={[styles.tabText, activeTab === 'manual' && styles.tabTextActive]}>
                ✏️ 직접 작성
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'kakao' && styles.tabActive]}
              onPress={() => setActiveTab('kakao')}
            >
              <Text style={[styles.tabText, activeTab === 'kakao' && styles.tabTextActive]}>
                📱 카카오톡 업로드
              </Text>
            </Pressable>
          </View>

          {activeTab === 'manual' ? (
            <View>
              <TextInput
                style={styles.manualInput}
                placeholder={`${name || '그분'}의 말투, 자주 하던 말, 기억에 남는 순간들을\n자유롭게 적어주세요.\n\n예: 엄마는 항상 걱정이 많고 따뜻했어.\n밥 먹었냐고 자주 물어봤고,\n가끔 전화해서 잘 지내냐고 짧게 물어보곤 했지.`}
                value={manualText}
                onChangeText={setManualText}
                multiline
                numberOfLines={8}
                placeholderTextColor="#B0A89E"
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {manualText.length}자 {manualText.length < 20 ? '(20자 이상 입력해주세요)' : '✓'}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={styles.kakaoGuide}>
                함께 나눈 카카오톡 대화를 올려주세요.{'\n'}그 분만의 말투와 온기를 조심스럽게 담아낼게요.
              </Text>
              <Text style={styles.kakaoGuideSub}>
                카카오톡 앱 → 채팅방 → 우측 상단 메뉴(≡) → 대화 내보내기 → .txt 또는 .csv 파일 선택
              </Text>
              <Text style={[styles.kakaoGuideSub, { color: '#F59E0B', marginTop: 4 }]}>
                ⚠️ 1:1 대화방만 지원돼요. 단체 채팅방은 분석할 수 없어요.
              </Text>
              <Pressable
                style={[styles.uploadBtn, parseResult && styles.uploadBtnDone]}
                onPress={Platform.OS === 'web' ? handleWebFilePick : handleNativeFilePick}
                disabled={isParsing}
              >
                {isParsing ? (
                  <View style={styles.uploadBtnRow}>
                    <ActivityIndicator size="small" color="#2C2C2C" />
                    <Text style={styles.uploadBtnText}>대화 파일 분석 중...</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadBtnText}>
                    {fileName ? `📄 ${fileName}` : '📂 .txt / .csv 파일 선택'}
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
                  <Text style={styles.parseResultTitle}>✓ 기억이 담겼어요</Text>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>대화 상대</Text>
                    <Text style={styles.parseResultValue}>{parseResult.parsed.partnerName}</Text>
                  </View>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>전체 메시지</Text>
                    <Text style={styles.parseResultValue}>{parseResult.parsed.totalMessages}개</Text>
                  </View>
                  <View style={styles.parseResultRow}>
                    <Text style={styles.parseResultLabel}>{parseResult.parsed.partnerName}의 메시지</Text>
                    <Text style={styles.parseResultValue}>{parseResult.parsed.partnerMessageCount}개</Text>
                  </View>
                  {parseResult.parsed.commonPhrases.length > 0 && (
                    <View style={styles.parseResultRow}>
                      <Text style={styles.parseResultLabel}>자주 쓰는 표현</Text>
                      <Text style={styles.parseResultValue}>
                        {parseResult.parsed.commonPhrases.slice(0, 8).join(', ')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.parseResultHint}>
                    다른 파일로 바꾸려면 위 버튼을 다시 눌러주세요.
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

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
              이 서비스는 실제 인물을 대체하지 않으며, 감정 회복을 위한 공간임을 이해해요. 나눈 대화와 사진은 기억을 담는 데만 사용되며 외부에 공유되지 않아요.
            </Text>
          </Pressable>
        </View>

        {/* 생성 중 에러 메시지 */}
        {createErrorMsg ? (
          <View style={[styles.errorBox, { marginHorizontal: 24 }]}>
            <Text style={styles.errorText}>{createErrorMsg}</Text>
          </View>
        ) : null}

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
                <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>기억 생성 중...</Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>
                {canSubmit() ? '기억 만들기 →' : !name.trim() ? '이름을 입력해주세요' : !relationship ? '관계를 선택해주세요' : activeTab === 'kakao' && !parseResult ? '카카오톡 파일을 업로드해주세요' : activeTab === 'manual' && manualText.trim().length < 20 ? '기억을 20자 이상 적어주세요' : !agreedToService ? '서비스 동의가 필요해요' : '기억 만들기 →'}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  rootWrap: { flex: 1, backgroundColor: '#0a0118' },
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', width: 384, height: 384, borderRadius: 192 },
  star: { position: 'absolute', backgroundColor: '#E9D5FF' },
  safeArea: { flex: 1 },
  container: { flex: 1 },
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
  // ─── 헤더 ───
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: 'rgba(196, 181, 253, 0.8)' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F3E8FF' },
  headerRight: { width: 36 },
  banner: {
    backgroundColor: 'rgba(120, 53, 15, 0.3)', paddingHorizontal: 16, paddingVertical: 8, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(251, 191, 36, 0.2)',
  },
  bannerText: { fontSize: 11, color: '#FDE68A', textAlign: 'center' },
  section: { paddingHorizontal: 24, marginBottom: 24 },
  label: { fontSize: 15, fontWeight: '600', color: '#F3E8FF', marginBottom: 12 },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 14, padding: 14, fontSize: 16, color: '#FFFFFF',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  labelOptional: { fontSize: 13, fontWeight: '400', color: 'rgba(167, 139, 250, 0.7)' },
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
    borderRadius: 14, padding: 14, fontSize: 14, color: '#FFFFFF', minHeight: 160,
  },
  charCount: { fontSize: 12, color: 'rgba(167, 139, 250, 0.6)', textAlign: 'right', marginTop: 4 },
  kakaoGuide: { fontSize: 14, color: 'rgba(196, 181, 253, 0.8)', marginBottom: 8, lineHeight: 20 },
  kakaoGuideSub: { fontSize: 12, color: 'rgba(167, 139, 250, 0.6)', marginBottom: 12, lineHeight: 18 },
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
