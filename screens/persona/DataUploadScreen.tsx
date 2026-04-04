// @ts-nocheck — 미사용 레거시 화면 (PersonaCreateScreen으로 통합됨)
import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { parseKakaoChat, generateSystemPrompt, ParsedKakaoChat } from '../../services/kakaoParser'
import { createPersona } from '../../services/personaService'
import { loadPersona } from '../../services/personaStorage'
import { C, RADIUS } from '../theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DataUpload'>
  route: RouteProp<RootStackParamList, 'DataUpload'>
}

type ParsePreview = {
  partnerName: string
  totalMessages: number
  partnerMessageCount: number
  fileName: string
  parsed: ParsedKakaoChat
  rawText: string
}

export default function DataUploadScreen({ navigation, route }: Props) {
  const name = route.params?.name ?? '소중한 분'
  const personaId = route.params?.personaId  // 기존 페르소나에 업로드 시

  const [preview, setPreview] = useState<ParsePreview | null>(null)
  const [isParsing, setIsParsing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // 웹 환경: HTML FileReader로 파일 읽기
  const pickFileWeb = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,text/plain'
    input.style.display = 'none'
    document.body.appendChild(input)

    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) { document.body.removeChild(input); return }

      setIsParsing(true)
      setPreview(null)

      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const rawText = ev.target?.result as string
          if (!rawText) throw new Error('빈 파일입니다.')

          const parsed = parseKakaoChat(rawText, name)
          setPreview({
            partnerName: parsed.partnerName,
            totalMessages: parsed.totalMessages,
            partnerMessageCount: parsed.partnerMessageCount,
            fileName: file.name,
            parsed,
            rawText,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : '파일을 읽을 수 없습니다.'
          Alert.alert('파일 오류', message)
        } finally {
          setIsParsing(false)
          document.body.removeChild(input)
        }
      }
      reader.onerror = () => {
        Alert.alert('파일 오류', '파일을 읽을 수 없습니다.')
        setIsParsing(false)
        document.body.removeChild(input)
      }
      reader.readAsText(file, 'UTF-8')
    }

    input.click()
  }

  // 네이티브 환경: expo-document-picker + expo-file-system
  const pickFileNative = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/plain',
        copyToCacheDirectory: true,
      })
      if (result.canceled || result.assets.length === 0) return

      const asset = result.assets[0]
      setIsParsing(true)
      setPreview(null)

      const FileSystem = await import('expo-file-system')
      const rawText = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'utf8' as any,
      })

      const parsed = parseKakaoChat(rawText)

      setPreview({
        partnerName: parsed.partnerName,
        totalMessages: parsed.totalMessages,
        partnerMessageCount: parsed.partnerMessageCount,
        fileName: asset.name,
        parsed,
        rawText,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '파일을 읽을 수 없습니다.'
      Alert.alert('파일 오류', message)
    } finally {
      setIsParsing(false)
    }
  }

  const handlePickFile = () => {
    if (Platform.OS === 'web') {
      pickFileWeb()
    } else {
      pickFileNative()
    }
  }

  const handleCreate = async () => {
    if (!preview) return
    setIsCreating(true)

    try {
      // AsyncStorage에서 관계 정보 로드 (온보딩에서 저장된 값)
      const localPersona = await loadPersona()
      const relationship = localPersona?.relation ?? '기타'

      const systemPrompt = generateSystemPrompt(preview.parsed, relationship)

      const newPersonaId = await createPersona({
        name: preview.partnerName,
        relationship,
        rawChatText: preview.rawText,
        systemPrompt,
        parsedMessages: preview.parsed.messages,
        messageStyle: {
          avgMessageLength: preview.parsed.avgMessageLength,
          commonPhrases: preview.parsed.commonPhrases,
        },
      })

      navigation.replace('AIGenerating', { name: preview.partnerName, personaId: newPersonaId })
    } catch (error) {
      const message = error instanceof Error ? error.message : '기억을 담는 데 실패했어요.'
      Alert.alert('잠시 멈췄어요', message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>{name}의 기억을{'\n'}함께 담아볼게요.</Text>
          <Text style={styles.subtitle}>
            더 잘 기억하기 위해,{'\n'}
            함께 나눈 대화를 조금 나눠주세요.{'\n'}
            건너뛰어도 괜찮아요.
          </Text>
        </View>

        {/* 업로드 버튼 */}
        <TouchableOpacity
          style={[styles.uploadBox, preview && styles.uploadBoxFilled]}
          onPress={handlePickFile}
          activeOpacity={0.8}
          disabled={isParsing || isCreating}
        >
          {isParsing ? (
            <>
              <ActivityIndicator color="#9B8F85" />
              <Text style={styles.uploadTitle}>나눈 이야기들을 읽고 있어요...</Text>
              <Text style={styles.uploadSub}>잠시만 기다려주세요</Text>
            </>
          ) : preview ? (
            <>
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={styles.fileName}>{preview.fileName}</Text>
              <Text style={styles.fileSub}>다른 파일을 선택하려면 탭하세요</Text>
            </>
          ) : (
            <>
              <Text style={styles.uploadIcon}>📂</Text>
              <Text style={styles.uploadTitle}>카카오톡 대화 파일 선택</Text>
              <Text style={styles.uploadSub}>.txt 파일 · 건너뛰어도 괜찮아요</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 파싱 결과 미리보기 */}
        {preview && (
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>✓ 이야기를 담았어요</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>대화 상대</Text>
              <Text style={styles.previewValue}>{preview.partnerName}</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>전체 메시지</Text>
              <Text style={styles.previewValue}>{preview.totalMessages}개</Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>{preview.partnerName}의 메시지</Text>
              <Text style={styles.previewValue}>{preview.partnerMessageCount}개</Text>
            </View>
          </View>
        )}

        {/* 내보내기 안내 */}
        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}>📱 카카오톡 대화 내보내기 방법</Text>
          <View style={styles.guideSteps}>
            {[
              '카카오톡 앱을 열어주세요',
              '그리워하는 분과의 채팅방에 들어가세요',
              '우측 상단 ≡ 메뉴 → 대화 내용 내보내기',
              '.txt 파일로 공유 후 업로드',
            ].map((step, i) => (
              <View key={i} style={styles.guideStep}>
                <Text style={styles.guideStepNum}>{i + 1}</Text>
                <Text style={styles.guideStepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.safetyNote}>
          <Text style={styles.safetyText}>
            🔒 나눈 대화는 기억을 담는 데만 사용되며, 요청 시 즉시 삭제돼요.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, (!preview || isCreating) && styles.nextButtonDisabled]}
          onPress={handleCreate}
          disabled={!preview || isCreating}
          activeOpacity={0.85}
        >
          {isCreating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>
              {preview ? '기억 담기' : '파일을 선택해주세요'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.BG },
  scrollContent: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 20, gap: 28 },
  backButton: { alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: C.TEXT_MUTED },
  header: { gap: 12 },
  title: { fontSize: 28, fontWeight: '400', color: C.TEXT, lineHeight: 40, letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: C.TEXT_MUTED, lineHeight: 24 },
  uploadBox: {
    backgroundColor: C.BG_INPUT,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: C.BORDER,
    borderStyle: 'dashed',
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  uploadBoxFilled: { borderColor: C.TEXT, borderStyle: 'solid', backgroundColor: '#F7F4F0' },
  uploadIcon: { fontSize: 36 },
  uploadTitle: { fontSize: 16, fontWeight: '500', color: C.TEXT },
  uploadSub: { fontSize: 13, color: C.TEXT_MUTED },
  fileIcon: { fontSize: 36 },
  fileName: { fontSize: 15, fontWeight: '500', color: C.TEXT, textAlign: 'center', paddingHorizontal: 20 },
  fileSub: { fontSize: 12, color: C.TEXT_MUTED },
  previewBox: {
    backgroundColor: C.BG_INPUT,
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#D4E8D4',
  },
  previewTitle: { fontSize: 14, fontWeight: '600', color: '#2C7D32', marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: 13, color: C.TEXT_SECONDARY },
  previewValue: { fontSize: 13, fontWeight: '600', color: C.TEXT },
  guideBox: {
    backgroundColor: C.BG_INPUT,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E8E3DD',
  },
  guideTitle: { fontSize: 14, fontWeight: '600', color: C.TEXT },
  guideSteps: { gap: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guideStepNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.BTN_PRIMARY, color: C.BG_INPUT,
    fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 20,
  },
  guideStepText: { flex: 1, fontSize: 13, color: C.TEXT_SECONDARY, lineHeight: 20 },
  safetyNote: { backgroundColor: C.BG_CARD, borderRadius: 12, padding: 14 },
  safetyText: { fontSize: 12, color: C.TEXT_MUTED, lineHeight: 20, textAlign: 'center' },
  footer: { paddingHorizontal: 28, paddingBottom: 32, paddingTop: 12 },
  nextButton: { backgroundColor: C.BTN_PRIMARY, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextButtonDisabled: { backgroundColor: C.BORDER },
  nextButtonText: { color: C.BG_INPUT, fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },
})
