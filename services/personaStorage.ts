import AsyncStorage from '@react-native-async-storage/async-storage'
import { Persona } from '../types/persona'

const PERSONA_KEY = '@still_after:persona'

export async function savePersona(persona: Persona): Promise<void> {
  try {
    await AsyncStorage.setItem(PERSONA_KEY, JSON.stringify(persona))
  } catch (error) {
    console.error('[PersonaStorage] 저장 실패:', error)
    throw new Error('페르소나 저장에 실패했습니다.')
  }
}

export async function loadPersona(): Promise<Persona | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSONA_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Persona
  } catch (error) {
    console.error('[PersonaStorage] 로드 실패:', error)
    return null
  }
}

export async function clearPersona(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PERSONA_KEY)
  } catch (error) {
    console.error('[PersonaStorage] 삭제 실패:', error)
  }
}
