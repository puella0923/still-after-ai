/** 온보딩 RelationSetup 칩 키 */
export const PERSON_RELATION_KEYS = ['parents', 'spouse', 'child', 'friend', 'partner', 'other'] as const

/** PersonaCreate / PersonaEdit 관계 칩 키 */
export const PERSON_RELATION_KEYS_FULL = ['parents', 'spouse', 'partner', 'friend', 'sibling', 'child', 'other'] as const

/** PersonaEdit 관계 칩 키 (반려동물 포함) */
export const EDIT_RELATION_KEYS = [...PERSON_RELATION_KEYS_FULL, 'pet'] as const

export const PET_TYPE_KEYS = ['dog', 'cat', 'parrot', 'hamster', 'rabbit', 'fish', 'other'] as const

export type PersonRelationKey = (typeof PERSON_RELATION_KEYS_FULL)[number]
export type PetTypeKey = (typeof PET_TYPE_KEYS)[number]
