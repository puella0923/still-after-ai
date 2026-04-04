import React, { useState, useRef, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Animated, Modal, Dimensions, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../../navigation/RootNavigator'
import { supabase } from '../../services/supabase'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ClosureCeremony'>
  route: RouteProp<RootStackParamList, 'ClosureCeremony'>
}

const { width: W, height: H } = Dimensions.get('window')
const PARTICLE_COUNT = 14

const PARTICLE_DATA = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  startX: W / 2 + (Math.sin(i * 2.4) * 80),
  driftX: Math.sin(i * 1.8) * 100,
  driftY: -(70 + Math.abs(Math.cos(i * 1.3)) * 130),
  size: 3 + (i % 4),
  delay: i * 80,
}))

const STAR_DOTS = Array.from({ length: 30 }, (_, i) => ({
  top: `${(i * 37 + 13) % 100}%`,
  left: `${(i * 53 + 7) % 100}%`,
  size: (i % 3) + 1,
  opacity: 0.15 + (i % 5) * 0.08,
}))

export default function ClosureCeremonyScreen({ navigation, route }: Props) {
  const { personaId, personaName, aiFarewell } = route.params

  const [letter, setLetter] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const overlayOpacity = useRef(new Animated.Value(0)).current
  const letterOpacity = useRef(new Animated.Value(1)).current
  const letterScale = useRef(new Animated.Value(1)).current
  const letterTransY = useRef(new Animated.Value(0)).current
  const completedOpacity = useRef(new Animated.Value(0)).current

  const particleAnims = useRef(
    PARTICLE_DATA.map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
    }))
  ).current

  const saveLetterToDb = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('closure_letters').insert({
        user_id: user.id, persona_id: personaId,
        content: letter.trim(), ai_farewell: aiFarewell || '',
      })
      await supabase.from('personas').update({
        is_active: false, is_archived: true, archived_at: new Date().toISOString(),
      }).eq('id', personaId)
    } catch (err) { console.error('[ClosureCeremony] 저장 중 예외:', err) }
  }, [personaId, letter, aiFarewell])

  const runFarewellAnimation = useCallback(() => {
    setShowConfirm(false)
    setIsAnimating(true)
    saveLetterToDb()

    Animated.timing(overlayOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start()

    Animated.parallel([
      Animated.timing(letterTransY, { toValue: -60, duration: 600, useNativeDriver: true }),
      Animated.timing(letterScale, { toValue: 1.06, duration: 600, useNativeDriver: true }),
    ]).start()

    setTimeout(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(letterScale, { toValue: 1.13, duration: 380, useNativeDriver: true }),
          Animated.timing(letterScale, { toValue: 1.06, duration: 300, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(letterOpacity, { toValue: 0, duration: 750, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(letterTransY, { toValue: -150, duration: 850, useNativeDriver: true }),
        ]),
      ]).start()
    }, 700)

    setTimeout(() => {
      Animated.parallel(
        particleAnims.map((anim, i) => {
          const data = PARTICLE_DATA[i]
          return Animated.sequence([
            Animated.delay(data.delay),
            Animated.parallel([
              Animated.timing(anim.opacity, { toValue: 0.9, duration: 250, useNativeDriver: true }),
              Animated.timing(anim.translateY, { toValue: data.driftY, duration: 1500, useNativeDriver: true }),
              Animated.timing(anim.translateX, { toValue: data.driftX, duration: 1500, useNativeDriver: true }),
              Animated.sequence([
                Animated.delay(600),
                Animated.timing(anim.opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
              ]),
            ]),
          ])
        })
      ).start()
    }, 900)

    setTimeout(() => {
      setCompleted(true)
      Animated.timing(completedOpacity, { toValue: 1, duration: 1100, useNativeDriver: true }).start()
    }, 1900)
  }, [saveLetterToDb])

  // ─── Animation overlay ───
  if (isAnimating) {
    const letterPreview = letter.length > 140 ? letter.slice(0, 140).trimEnd() + '…' : letter

    return (
      <View style={styles.fullScreen}>
        <LinearGradient colors={['#05010f', '#0f0a3e', '#080520']} style={StyleSheet.absoluteFillObject} />
        {STAR_DOTS.map((s, i) => (
          <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
        ))}
        <Animated.View style={[styles.overlayBg, { opacity: overlayOpacity }]}>
          {PARTICLE_DATA.map((data, i) => (
            <Animated.View key={data.id} style={[styles.particle, {
              left: data.startX, bottom: H * 0.35,
              width: data.size, height: data.size, borderRadius: data.size / 2,
              opacity: particleAnims[i].opacity,
              transform: [{ translateY: particleAnims[i].translateY }, { translateX: particleAnims[i].translateX }],
            }]} />
          ))}

          {!completed && (
            <Animated.View style={[styles.letterFloat, {
              opacity: letterOpacity, transform: [{ translateY: letterTransY }, { scale: letterScale }],
            }]}>
              <Text style={styles.letterFloatText}>{letterPreview}</Text>
            </Animated.View>
          )}

          {completed && (
            <Animated.View style={[styles.completedContainer, { opacity: completedOpacity }]}>
              <Text style={styles.completedEmoji}>🌸</Text>
              <Text style={styles.completedTitle}>잘 해내셨어요</Text>
              <Text style={styles.completedSub}>
                그 기억은 언제까지나 당신 안에 남아있어요.{'\n'}
                마음에 담아두었던 것들, 이제 조금 가벼워졌으면 해요.{'\n\n'}
                편지와 대화 기록은 언제든 다시 읽을 수 있어요.
              </Text>
              <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })} activeOpacity={0.85}>
                <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.homeBtn}>
                  <Text style={styles.homeBtnText}>홈으로 돌아가기</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
    )
  }

  // ─── Letter writing screen ───
  return (
    <View style={styles.root}>
      <LinearGradient colors={['#05010f', '#0f0a3e', '#080520']} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />
      {STAR_DOTS.map((s, i) => (
        <View key={i} style={{ position: 'absolute', top: s.top as any, left: s.left as any, width: s.size, height: s.size, borderRadius: s.size / 2, backgroundColor: '#fff', opacity: s.opacity }} />
      ))}

      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>마지막 편지</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.content}>
          {!!aiFarewell && (
            <View style={styles.farewellCard}>
              <Text style={styles.farewellLabel}>{personaName}의 마지막 말</Text>
              <Text style={styles.farewellText}>"{aiFarewell}"</Text>
            </View>
          )}

          <Text style={styles.intro}>
            이제 당신이 답할 차례예요.{'\n'}
            담아두셨던 말씀을 꺼내보세요.{'\n'}
            서두르지 않아도 돼요. 준비될 때 써주세요.
          </Text>

          <TextInput
            style={styles.letterInput}
            multiline
            numberOfLines={12}
            placeholder={`사랑하는 ${personaName}에게,\n\n...`}
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={letter}
            onChangeText={setLetter}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{letter.length}자</Text>

          <TouchableOpacity
            onPress={() => setShowConfirm(true)}
            disabled={letter.trim().length < 10}
            activeOpacity={0.85}
            style={[styles.completeBtn, letter.trim().length < 10 && styles.completeBtnDisabled]}
          >
            {letter.trim().length >= 10 ? (
              <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.completeBtnGrad}>
                <Text style={styles.completeBtnText}>편지 봉인하기 — 작별 인사 🌸</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.completeBtnText, { color: 'rgba(255,255,255,0.3)' }]}>편지 봉인하기 — 작별 인사 🌸</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.notice}>
            편지를 봉인하면 새 대화는 마무리되지만,{'\n'}
            기록과 편지는 언제든 다시 읽을 수 있어요.
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowConfirm(false)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalEmoji}>🌸</Text>
            <Text style={styles.modalTitle}>천천히 보내드릴게요</Text>
            <Text style={styles.modalMessage}>
              {personaName}에게 쓴 편지를 간직하고{'\n'}
              대화를 조심스럽게 마무리할게요.{'\n\n'}
              봉인 후에도 편지와 대화 기록은{'\n'}
              언제든 다시 읽을 수 있어요.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowConfirm(false)} activeOpacity={0.7}>
                <Text style={styles.modalCancelText}>아직은 아니에요</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={runFarewellAnimation} activeOpacity={0.85}>
                <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.modalConfirmGrad}>
                  <Text style={styles.modalConfirmText}>네, 잘 보내드릴게요</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const glass = Platform.OS === 'web' ? { backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as any : {}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  orb: { position: 'absolute', borderRadius: 999 },
  orb1: { width: 280, height: 280, top: '5%', right: '-15%', backgroundColor: 'rgba(99, 102, 241, 0.12)' },
  orb2: { width: 220, height: 220, bottom: '15%', left: '-10%', backgroundColor: 'rgba(168, 85, 247, 0.08)' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#fff', lineHeight: 36, marginTop: -4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#fff' },
  content: { padding: 28, gap: 16 },

  farewellCard: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', borderRadius: 14, padding: 18,
    borderLeftWidth: 3, borderLeftColor: 'rgba(168, 85, 247, 0.5)', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', ...glass,
  },
  farewellLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(168, 85, 247, 0.8)',
    letterSpacing: 0.6, textTransform: 'uppercase',
  },
  farewellText: { fontSize: 15, color: 'rgba(255,255,255,0.8)', lineHeight: 24, fontStyle: 'italic' },

  intro: { fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 24 },
  letterInput: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 18,
    fontSize: 15, lineHeight: 24, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: 200, ...glass,
  },
  charCount: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right' },
  completeBtn: {
    borderRadius: 14, overflow: 'hidden', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 16,
  },
  completeBtnDisabled: {},
  completeBtnGrad: { width: '100%', paddingVertical: 16, alignItems: 'center', borderRadius: 14 },
  completeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  notice: { fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 18, marginTop: 4 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalBox: {
    width: '82%', maxWidth: 400, borderRadius: 20, padding: 28, alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(30, 15, 50, 0.95)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', ...glass,
  },
  modalEmoji: { fontSize: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center' },
  modalMessage: { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8, width: '100%' },
  modalCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalCancelText: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  modalConfirmBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalConfirmGrad: { paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  modalConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  // Animation overlay
  fullScreen: { flex: 1, overflow: 'hidden' },
  overlayBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  letterFloat: { position: 'absolute', left: 32, right: 32, top: '35%', alignItems: 'center', padding: 24 },
  letterFloatText: {
    fontSize: 16, color: 'rgba(200, 180, 255, 0.92)',
    textAlign: 'center', lineHeight: 28, fontStyle: 'italic', letterSpacing: 0.3,
    textShadowColor: 'rgba(168, 85, 247, 0.6)',
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  particle: { position: 'absolute', backgroundColor: 'rgba(168, 85, 247, 0.85)' },
  completedContainer: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', padding: 40, gap: 18,
  },
  completedEmoji: { fontSize: 72 },
  completedTitle: { fontSize: 30, fontWeight: '300', color: 'rgba(255,255,255,0.95)', letterSpacing: 0.5 },
  completedSub: { fontSize: 16, color: 'rgba(200, 180, 255, 0.75)', textAlign: 'center', lineHeight: 27 },
  homeBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, marginTop: 12 },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '500' },
})
