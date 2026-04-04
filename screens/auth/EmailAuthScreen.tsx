import React, { useState, useCallback, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../navigation/RootNavigator'
import {
  signInWithEmail,
  signUpWithEmail,
  resendConfirmationEmail,
  sendPasswordReset,
} from '../../services/authService'
import { C, RADIUS } from '../theme'

const { width } = Dimensions.get('window')

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailAuth'>
}

type Tab = 'login' | 'signup'

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const isValidNickname = (v: string) => /^[가-힣a-zA-Z0-9]{2,10}$/.test(v)
const isValidPassword = (v: string) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(v)

// Deterministic star positions
const STARS = Array.from({ length: 35 }, (_, i) => ({
  left: ((i * 97 + 31) % 100),
  top: ((i * 53 + 17) % 100),
  size: (i % 3) + 1.5,
  opacity: 0.15 + (i % 5) * 0.1,
}))

export default function EmailAuthScreen({ navigation }: Props) {
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [nickname, setNickname] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [needsConfirmation, setNeedsConfirmation] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const clearMessages = () => { setErrors({}); setSuccessMsg('') }
  const switchTab = (t: Tab) => { setTab(t); clearMessages(); setNeedsConfirmation(false) }

  const validateLogin = (): boolean => {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = '이메일을 입력해주세요.'
    else if (!isValidEmail(email)) errs.email = '올바른 이메일 형식을 입력해주세요.'
    if (!password) errs.password = '비밀번호를 입력해주세요.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateSignup = (): boolean => {
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = '이메일을 입력해주세요.'
    else if (!isValidEmail(email)) errs.email = '올바른 이메일 형식을 입력해주세요.'
    if (!nickname.trim()) errs.nickname = '닉네임을 입력해주세요.'
    else if (!isValidNickname(nickname)) errs.nickname = '닉네임은 2~10자, 한글/영문/숫자만 가능합니다.'
    if (!password) errs.password = '비밀번호를 입력해주세요.'
    else if (!isValidPassword(password)) errs.password = '8자 이상, 영문과 숫자를 조합해주세요.'
    if (!passwordConfirm) errs.passwordConfirm = '비밀번호 확인을 입력해주세요.'
    else if (password !== passwordConfirm) errs.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    if (!agreeTerms) errs.terms = '서비스 이용약관에 동의해주세요.'
    if (!agreePrivacy) errs.privacy = '개인정보 처리방침에 동의해주세요.'
    if (!agreeAge) errs.age = '만 14세 이상 확인이 필요합니다.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleLogin = useCallback(async () => {
    clearMessages()
    if (!validateLogin()) return
    setLoading(true)
    try {
      const result = await signInWithEmail(email.trim(), password)
      if (result.success) {
        setSuccessMsg('로그인 성공!')
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
        }, 800)
      } else if (result.needsConfirmation) {
        setNeedsConfirmation(true)
        setPendingEmail(email.trim())
        setConfirmMessage(result.error ?? '이메일 인증이 필요합니다.')
      } else {
        setErrors({ general: result.error ?? '로그인에 실패했습니다.' })
      }
    } finally {
      setLoading(false)
    }
  }, [email, password, navigation])

  const handleSignup = useCallback(async () => {
    clearMessages()
    if (!validateSignup()) return
    setLoading(true)
    try {
      const result = await signUpWithEmail(email.trim(), password, nickname.trim())
      if (result.success && result.needsConfirmation) {
        setPendingEmail(email.trim())
        setNeedsConfirmation(true)
        setConfirmMessage(`${email.trim()}로 인증 메일을 보냈습니다.\n메일함을 확인하고 링크를 클릭해주세요.`)
      } else if (result.success) {
        setSuccessMsg('회원가입 완료!')
        setTimeout(() => {
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] })
        }, 800)
      } else {
        setErrors({ general: result.error ?? '회원가입에 실패했습니다.' })
      }
    } finally {
      setLoading(false)
    }
  }, [email, password, nickname, passwordConfirm, agreeTerms, agreePrivacy, agreeAge, navigation])

  const handleResendEmail = async () => {
    setLoading(true)
    try {
      const result = await resendConfirmationEmail(pendingEmail)
      if (result.success) {
        Alert.alert('발송 완료', '인증 메일을 재발송했습니다.\n메일함을 확인해주세요.')
      } else {
        Alert.alert('발송 실패', result.error ?? '잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      setErrors({ email: '비밀번호 재설정을 위해 이메일을 먼저 입력해주세요.' })
      return
    }
    setLoading(true)
    try {
      const result = await sendPasswordReset(email.trim())
      if (result.success) {
        Alert.alert('메일 발송', `${email.trim()}로 비밀번호 재설정 링크를 보냈습니다.`)
      } else {
        Alert.alert('발송 실패', result.error ?? '잠시 후 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  const allAgreed = agreeTerms && agreePrivacy && agreeAge
  const toggleAllAgree = () => {
    const next = !allAgreed
    setAgreeTerms(next); setAgreePrivacy(next); setAgreeAge(next)
  }

  // 이메일 인증 대기 화면
  if (needsConfirmation) {
    return (
      <View style={styles.root}>
        <LinearGradient colors={['#0a0118', '#1a0f3e', '#0f0520']} style={StyleSheet.absoluteFill} />
        <View style={styles.orbContainer}>
          <View style={[styles.orb, styles.orbPurple]} />
          <View style={[styles.orb, styles.orbBlue]} />
        </View>
        {STARS.map((star, i) => (
          <View key={i} style={[styles.star, { left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, opacity: star.opacity, borderRadius: star.size }]} />
        ))}
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerWrap}>
            <View style={styles.confirmCard}>
              <LinearGradient
                colors={['rgba(88, 28, 135, 0.4)', 'rgba(30, 58, 138, 0.4)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.confirmCardGradient}
              >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← 뒤로</Text>
                </TouchableOpacity>
                <View style={styles.confirmIconWrap}>
                  <Text style={styles.confirmIcon}>✉️</Text>
                </View>
                <Text style={styles.confirmTitle}>메일함을 확인해주세요</Text>
                <Text style={styles.confirmDesc}>{confirmMessage}</Text>
                <View style={styles.confirmEmailBox}>
                  <Text style={styles.confirmEmail}>{pendingEmail}</Text>
                </View>
                <Text style={styles.confirmSub}>메일이 오지 않았나요? 스팸함도 확인해주세요.</Text>
                <TouchableOpacity style={styles.resendButton} onPress={handleResendEmail} disabled={loading}>
                  {loading
                    ? <ActivityIndicator color={C.TEXT} />
                    : <Text style={styles.resendButtonText}>인증 메일 재발송</Text>
                  }
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmLoginBtn}
                  onPress={() => { setNeedsConfirmation(false); setTab('login'); setPassword('') }}
                >
                  <Text style={styles.confirmLoginText}>인증 완료 후 로그인하기</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {/* Background */}
      <LinearGradient colors={['#0a0118', '#1a0f3e', '#0f0520']} style={StyleSheet.absoluteFill} />
      <View style={styles.orbContainer}>
        <View style={[styles.orb, styles.orbPurple]} />
        <View style={[styles.orb, styles.orbBlue]} />
      </View>
      {STARS.map((star, i) => (
        <View key={i} style={[styles.star, { left: `${star.left}%`, top: `${star.top}%`, width: star.size, height: star.size, opacity: star.opacity, borderRadius: star.size }]} />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.card,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <LinearGradient
                colors={['rgba(88, 28, 135, 0.4)', 'rgba(30, 58, 138, 0.4)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconWrap}>
                    <LinearGradient
                      colors={['rgba(168, 85, 247, 0.3)', 'rgba(59, 130, 246, 0.3)']}
                      style={styles.iconGradient}
                    >
                      <Text style={styles.iconText}>🔒</Text>
                    </LinearGradient>
                  </View>
                  <Text style={styles.title}>Still After</Text>
                  <Text style={styles.tagline}>당신 곁을 여전히</Text>
                </View>

                {/* Mode Toggle - Pill style */}
                <View style={styles.toggleWrap}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tab === 'login' && styles.toggleBtnActive]}
                    onPress={() => switchTab('login')}
                  >
                    {tab === 'login' ? (
                      <LinearGradient
                        colors={['#7C3AED', '#3B82F6']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.toggleBtnGradient}
                      >
                        <Text style={styles.toggleTextActive}>로그인</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.toggleText}>로그인</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, tab === 'signup' && styles.toggleBtnActive]}
                    onPress={() => switchTab('signup')}
                  >
                    {tab === 'signup' ? (
                      <LinearGradient
                        colors={['#7C3AED', '#3B82F6']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.toggleBtnGradient}
                      >
                        <Text style={styles.toggleTextActive}>회원가입</Text>
                      </LinearGradient>
                    ) : (
                      <Text style={styles.toggleText}>회원가입</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Error message */}
                {errors.general ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBoxText}>⚠️ {errors.general}</Text>
                  </View>
                ) : null}

                {/* Success message */}
                {successMsg ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successBoxText}>✅ {successMsg}</Text>
                  </View>
                ) : null}

                {/* Signup: Nickname */}
                {tab === 'signup' && (
                  <>
                    <Text style={styles.label}>닉네임</Text>
                    <View style={[styles.inputWrap, errors.nickname ? styles.inputError : null]}>
                      <Text style={styles.inputIcon}>👤</Text>
                      <TextInput
                        style={styles.inputField}
                        value={nickname}
                        onChangeText={setNickname}
                        placeholder="2~10자 (한글, 영문, 숫자)"
                        placeholderTextColor="rgba(167, 139, 250, 0.5)"
                        maxLength={10}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    {errors.nickname ? <Text style={styles.fieldError}>{errors.nickname}</Text> : null}
                  </>
                )}

                {/* Email */}
                <Text style={styles.label}>이메일</Text>
                <View style={[styles.inputWrap, errors.email ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.inputField}
                    value={email}
                    onChangeText={(v) => { setEmail(v); if (errors.email) setErrors(prev => { const { email: _, ...rest } = prev; return rest }) }}
                    placeholder="your@email.com"
                    placeholderTextColor="rgba(167, 139, 250, 0.5)"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

                {/* Password */}
                <Text style={styles.label}>비밀번호</Text>
                <View style={[styles.inputWrap, errors.password ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.inputField}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={tab === 'signup' ? '8자 이상, 영문+숫자 조합' : '••••••••'}
                    placeholderTextColor="rgba(167, 139, 250, 0.5)"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

                {/* Signup: Password confirm + Terms */}
                {tab === 'signup' && (
                  <>
                    <Text style={styles.label}>비밀번호 확인</Text>
                    <View style={[styles.inputWrap, errors.passwordConfirm ? styles.inputError : null]}>
                      <Text style={styles.inputIcon}>🔒</Text>
                      <TextInput
                        style={styles.inputField}
                        value={passwordConfirm}
                        onChangeText={setPasswordConfirm}
                        placeholder="비밀번호 재입력"
                        placeholderTextColor="rgba(167, 139, 250, 0.5)"
                        secureTextEntry={!showPasswordConfirm}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity onPress={() => setShowPasswordConfirm(p => !p)} style={styles.eyeBtn}>
                        <Text style={styles.eyeIcon}>{showPasswordConfirm ? '🙈' : '👁️'}</Text>
                      </TouchableOpacity>
                    </View>
                    {errors.passwordConfirm ? <Text style={styles.fieldError}>{errors.passwordConfirm}</Text> : null}

                    {/* Terms */}
                    <View style={styles.agreeSection}>
                      <TouchableOpacity style={styles.agreeRow} onPress={toggleAllAgree}>
                        <View style={[styles.checkbox, allAgreed && styles.checkboxChecked]}>
                          {allAgreed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <Text style={styles.agreeAllText}>전체 동의</Text>
                      </TouchableOpacity>
                      <View style={styles.agreeDivider} />
                      {[
                        { key: 'terms', val: agreeTerms, set: setAgreeTerms, label: '[필수] 서비스 이용약관 동의' },
                        { key: 'privacy', val: agreePrivacy, set: setAgreePrivacy, label: '[필수] 개인정보 처리방침 동의' },
                        { key: 'age', val: agreeAge, set: setAgreeAge, label: '[필수] 만 14세 이상입니다' },
                      ].map(({ key, val, set, label }) => (
                        <React.Fragment key={key}>
                          <TouchableOpacity style={styles.agreeRow} onPress={() => set((v: boolean) => !v)}>
                            <View style={[styles.checkbox, val && styles.checkboxChecked]}>
                              {val && <Text style={styles.checkmark}>✓</Text>}
                            </View>
                            <Text style={styles.agreeText}>{label}</Text>
                          </TouchableOpacity>
                          {errors[key] ? <Text style={styles.fieldError}>{errors[key]}</Text> : null}
                        </React.Fragment>
                      ))}
                    </View>
                  </>
                )}

                {/* Submit button - gradient */}
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={tab === 'login' ? handleLogin : handleSignup}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={loading ? ['rgba(124, 58, 237, 0.5)', 'rgba(59, 130, 246, 0.5)'] : ['#7C3AED', '#3B82F6']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.submitBtnGradient}
                  >
                    {loading
                      ? <ActivityIndicator color="#FFFFFF" />
                      : <Text style={styles.submitBtnText}>{tab === 'login' ? '로그인' : '회원가입'}</Text>
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {tab === 'login' && (
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
                  </TouchableOpacity>
                )}

                {/* Info box */}
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💳 카드 등록 없이 바로 시작할 수 있습니다.{'\n'}
                    10회 이후 결제 화면으로 이동합니다.
                  </Text>
                </View>

                {/* Back */}
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                  <Text style={styles.backBtnText}>← 돌아가기</Text>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.BG },
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  centerWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16,
  },

  // Background
  orbContainer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  orb: { position: 'absolute', width: 384, height: 384, borderRadius: 192 },
  orbPurple: { top: -100, left: width * 0.25 - 192, backgroundColor: 'rgba(124, 58, 237, 0.2)' },
  orbBlue: { bottom: -100, right: width * 0.25 - 192, backgroundColor: 'rgba(37, 99, 235, 0.2)' },
  star: { position: 'absolute', backgroundColor: '#E9D5FF' },

  // Card
  card: {
    width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  cardGradient: {
    padding: 28, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },

  // Header
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: { marginBottom: 20 },
  iconGradient: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  iconText: { fontSize: 24 },
  title: { fontSize: 28, fontWeight: '700', color: C.TEXT, marginBottom: 6, letterSpacing: 1 },
  tagline: { fontSize: 13, color: 'rgba(196, 181, 253, 0.8)' },

  // Toggle
  toggleWrap: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 999, padding: 4, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  toggleBtn: {
    flex: 1, borderRadius: 999, overflow: 'hidden',
  },
  toggleBtnActive: {},
  toggleBtnGradient: {
    paddingVertical: 10, alignItems: 'center', borderRadius: 999,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 3,
  },
  toggleText: {
    textAlign: 'center', paddingVertical: 10,
    fontSize: 14, fontWeight: '500', color: 'rgba(196, 181, 253, 0.8)',
  },
  toggleTextActive: {
    fontSize: 14, fontWeight: '500', color: '#FFFFFF',
  },

  // Messages
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: RADIUS.MD, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.5)',
    flexDirection: 'row', alignItems: 'center',
  },
  errorBoxText: { fontSize: 13, color: '#FCA5A5', lineHeight: 20 },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)', borderRadius: RADIUS.MD, padding: 12,
    marginBottom: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.5)',
    flexDirection: 'row', alignItems: 'center',
  },
  successBoxText: { fontSize: 13, color: '#86EFAC', lineHeight: 20 },
  fieldError: { fontSize: 12, color: '#FCA5A5', marginTop: 4, marginLeft: 4 },

  // Input
  label: {
    fontSize: 13, fontWeight: '500', color: '#E9D5FF',
    marginBottom: 8, marginTop: 14,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RADIUS.MD, borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  inputError: { borderColor: 'rgba(239, 68, 68, 0.5)' },
  inputIcon: { fontSize: 16, marginLeft: 12 },
  inputField: {
    flex: 1, paddingHorizontal: 10, paddingVertical: 13,
    fontSize: 15, color: '#FFFFFF',
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 13 },
  eyeIcon: { fontSize: 16 },

  // Agree
  agreeSection: { marginTop: 20, marginBottom: 4 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  agreeAllText: { fontSize: 15, fontWeight: '600', color: C.TEXT, flex: 1 },
  agreeDivider: { height: 1, backgroundColor: 'rgba(167, 139, 250, 0.15)', marginBottom: 12 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.4)', alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  agreeText: { fontSize: 14, color: 'rgba(167, 139, 250, 0.8)', flex: 1 },

  // Submit
  submitBtn: {
    borderRadius: RADIUS.MD, overflow: 'hidden', marginTop: 20,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnGradient: {
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.MD, flexDirection: 'row', gap: 8,
  },
  submitBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500', letterSpacing: 0.3 },

  forgotBtn: { alignItems: 'center', marginTop: 14 },
  forgotText: { fontSize: 13, color: 'rgba(167, 139, 250, 0.7)' },

  // Info
  infoBox: {
    backgroundColor: 'rgba(88, 28, 135, 0.3)', borderRadius: RADIUS.MD,
    padding: 16, marginTop: 20, borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    ...(({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }) as any),
  },
  infoText: {
    fontSize: 12, color: 'rgba(196, 181, 253, 0.7)',
    textAlign: 'center', lineHeight: 20,
  },

  // Back
  backBtn: { alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  backBtnText: { fontSize: 14, fontWeight: '500', color: 'rgba(196, 181, 253, 0.8)' },

  // Confirmation screen
  confirmCard: {
    width: '100%', maxWidth: 420, borderRadius: 24, overflow: 'hidden',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 24, elevation: 10,
  },
  confirmCardGradient: {
    padding: 32, borderRadius: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    ...(({ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }) as any),
  },
  confirmIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 20,
  },
  confirmIcon: { fontSize: 36 },
  confirmTitle: { fontSize: 22, fontWeight: '600', color: C.TEXT, marginBottom: 12 },
  confirmDesc: { fontSize: 15, color: 'rgba(167, 139, 250, 0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  confirmEmailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: RADIUS.SM,
    borderWidth: 1, borderColor: 'rgba(167, 139, 250, 0.3)',
    paddingHorizontal: 20, paddingVertical: 12, marginBottom: 20,
  },
  confirmEmail: { fontSize: 15, fontWeight: '600', color: C.TEXT },
  confirmSub: { fontSize: 13, color: 'rgba(167, 139, 250, 0.7)', textAlign: 'center', marginBottom: 24 },
  resendButton: {
    borderWidth: 2, borderColor: 'rgba(167, 139, 250, 0.4)', borderRadius: RADIUS.LG,
    paddingVertical: 14, paddingHorizontal: 32, marginBottom: 12,
  },
  resendButtonText: { fontSize: 15, fontWeight: '600', color: C.TEXT },
  confirmLoginBtn: { padding: 12 },
  confirmLoginText: { fontSize: 14, color: 'rgba(167, 139, 250, 0.7)' },
})
