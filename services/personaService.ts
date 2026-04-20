/**
 * Supabase 기반 페르소나/대화 CRUD 서비스
 * 모든 쿼리에 user_id 조건 포함 (RLS 보조)
 */

import { supabase } from './supabase'

export type Persona = {
  id: string
  user_id: string
  name: string
  relationship: string
  care_type: string             // 'human' | 'pet'
  timing: string | null         // 떠난 시점
  raw_chat_text: string | null
  parsed_messages: any[]
  system_prompt: string | null
  message_style: any
  emotional_stage: string
  is_active: boolean
  photo_url: string | null
  user_nickname: string | null  // 페르소나가 사용자를 부르던 애칭
  is_archived: boolean | null   // 이별 완료 여부
  archived_at: string | null    // 이별 완료 시각
  created_at: string
  updated_at: string
  // 반려동물 전용 필드
  pet_personality: string[] | null
  pet_habits: string | null
  pet_bond: string | null
  pet_favorites: string | null
  pet_last_memory: string | null
  pet_unsaid: string | null
}

export type Conversation = {
  id: string
  user_id: string
  persona_id: string
  role: 'user' | 'assistant'
  content: string
  emotional_stage: string
  is_danger_detected: boolean
  created_at: string
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')
  return user.id
}

/** 페르소나 생성 → persona id 반환 */
export async function createPersona(data: {
  name: string
  relationship: string
  careType?: string
  timing?: string | null
  rawChatText: string
  systemPrompt: string
  parsedMessages: any[]
  messageStyle: any
  photoUrl?: string | null
  userNickname?: string | null
  // 반려동물 전용
  petPersonality?: string[] | null
  petHabits?: string | null
  petBond?: string | null
  petFavorites?: string | null
  petLastMemory?: string | null
  petUnsaid?: string | null
}): Promise<string> {
  const userId = await getCurrentUserId()

  const basePayload: Record<string, unknown> = {
    user_id: userId,
    name: data.name,
    relationship: data.relationship,
    care_type: data.careType ?? 'human',
    raw_chat_text: data.rawChatText,
    system_prompt: data.systemPrompt,
    parsed_messages: data.parsedMessages,
    message_style: data.messageStyle,
    is_active: true,
    emotional_stage: 'replay',
  }

  if (data.timing)           basePayload.timing           = data.timing
  if (data.userNickname)     basePayload.user_nickname    = data.userNickname
  if (data.photoUrl)         basePayload.photo_url        = data.photoUrl
  if (data.petPersonality)   basePayload.pet_personality  = data.petPersonality
  if (data.petHabits)        basePayload.pet_habits       = data.petHabits
  if (data.petBond)          basePayload.pet_bond         = data.petBond
  if (data.petFavorites)     basePayload.pet_favorites    = data.petFavorites
  if (data.petLastMemory)    basePayload.pet_last_memory  = data.petLastMemory
  if (data.petUnsaid)        basePayload.pet_unsaid       = data.petUnsaid

  const { data: persona, error } = await supabase
    .from('personas')
    .insert(basePayload)
    .select('id')
    .single()

  if (error) throw new Error(`페르소나 생성 실패: ${error.message}`)

  return persona!.id
}

/** 사진 업로드 → public URL 반환 */
export async function uploadPersonaPhoto(
  userId: string,
  fileBlob: Blob,
  fileName: string
): Promise<string | null> {
  try {
    const ext = fileName.split('.').pop() ?? 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error } = await supabase.storage
      .from('persona-photos')
      .upload(path, fileBlob, { contentType: fileBlob.type || 'image/jpeg', upsert: true })

    if (error) {
      console.error('[personaService] 사진 업로드 실패:', error.message, '| path:', path, '| size:', fileBlob.size)
      return null
    }

    const { data } = supabase.storage.from('persona-photos').getPublicUrl(path)
    const url = data?.publicUrl ?? null
    if (__DEV__) console.log('[personaService] 사진 업로드 성공:', url)
    return url
  } catch (e: any) {
    console.error('[personaService] 사진 업로드 예외:', e?.message)
    return null
  }
}

/** 현재 유저의 페르소나 목록 조회 (활성만) */
export async function getPersonas(): Promise<Persona[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`페르소나 조회 실패: ${error.message}`)
  return data ?? []
}

/** 이별 완료된(아카이브) 페르소나 목록 조회 */
export async function getArchivedPersonas(): Promise<Persona[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', true)
    .order('archived_at', { ascending: false })

  if (error) return [] // 조회 실패 시 빈 배열 (아카이브는 필수 아님)
  return data ?? []
}

/** 특정 페르소나 조회 */
export async function getPersonaById(id: string): Promise<Persona | null> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}

/** 페르소나 수정 (이름, 사진, 애칭 등) */
export async function updatePersona(id: string, data: {
  name?: string
  photoUrl?: string | null
  userNickname?: string | null
  relationship?: string | null
}): Promise<void> {
  const userId = await getCurrentUserId()

  const payload: Record<string, unknown> = {}
  if ('name' in data && data.name !== undefined) payload.name = data.name
  if ('photoUrl' in data) payload.photo_url = data.photoUrl
  if ('userNickname' in data) payload.user_nickname = data.userNickname
  if ('relationship' in data && data.relationship !== undefined && data.relationship !== null) payload.relationship = data.relationship

  if (Object.keys(payload).length === 0) return

  const { error } = await supabase
    .from('personas')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(`페르소나 수정 실패: ${error.message}`)
}

/** 페르소나 삭제 (소프트 삭제) */
export async function deletePersona(id: string): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from('personas')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(`페르소나 삭제 실패: ${error.message}`)
}

/** 대화 저장 (1회 재시도 포함) */
export async function saveConversation(data: {
  personaId: string
  role: 'user' | 'assistant'
  content: string
  isDangerDetected?: boolean
  emotionalStage?: string
}): Promise<void> {
  const userId = await getCurrentUserId()

  const payload = {
    user_id: userId,
    persona_id: data.personaId,
    role: data.role,
    content: data.content,
    is_danger_detected: data.isDangerDetected ?? false,
    emotional_stage: data.emotionalStage ?? 'replay',
  }

  const { error } = await supabase.from('conversations').insert(payload)

  if (error) {
    console.warn('[saveConversation] 1차 저장 실패, 재시도:', error.message)
    // 1회 재시도 (네트워크 일시 오류 대비)
    await new Promise(r => setTimeout(r, 800))
    const { error: retryError } = await supabase.from('conversations').insert(payload)
    if (retryError) {
      console.error('[saveConversation] 재시도도 실패:', retryError.message)
      throw new Error(`대화 저장 실패: ${retryError.message}`)
    }
  }
}

/** 페르소나별 대화 기록 조회 */
export async function getConversations(personaId: string): Promise<Conversation[]> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('persona_id', personaId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getConversations] 조회 실패:', error.message, '| code:', error.code)
    // 테이블 미존재(42P01) 등 스키마 문제 → 진단 메시지 포함해서 throw
    if (error.code === '42P01') {
      throw new Error('conversations 테이블이 없어요. Supabase SQL Editor에서 001_create_tables.sql을 실행해주세요.')
    }
    throw new Error(`대화 기록 조회 실패: ${error.message}`)
  }
  return data ?? []
}

/** DB 연결 및 스키마 진단 (앱 시작 시 호출) */
export async function diagnoseDatabaseHealth(): Promise<{ ok: boolean; issues: string[] }> {
  const issues: string[] = []
  try {
    // conversations 테이블 접근 가능 여부
    const { error: convErr } = await supabase.from('conversations').select('id').limit(1)
    if (convErr) issues.push(`conversations: ${convErr.message}`)

    // personas 테이블 user_nickname 컬럼 확인
    const { error: pErr } = await supabase.from('personas').select('user_nickname').limit(1)
    if (pErr) issues.push(`personas.user_nickname 컬럼 없음 — supabase_006 실행 필요`)

    // user_usage 테이블 확인
    const { error: uErr } = await supabase.from('user_usage').select('id').limit(1)
    if (uErr) issues.push(`user_usage: ${uErr.message}`)

  } catch (err) {
    issues.push(`DB 연결 실패: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (issues.length > 0) {
    console.error('[DB 진단] 문제 발견:', issues)
  } else {
    if (__DEV__) console.log('[DB 진단] 모든 테이블 정상')
  }
  return { ok: issues.length === 0, issues }
}
