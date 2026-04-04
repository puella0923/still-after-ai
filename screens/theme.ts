/**
 * Still After — Dark Cosmic Design System
 * 우주적 다크 테마 컬러 토큰
 */

export const C = {
  // ─── 배경 ───
  BG: '#0a0118',            // 가장 어두운 배경
  BG_MID: '#1a0f3e',        // 중간 배경
  BG_LIGHT: '#0f0520',      // 약간 밝은 배경
  BG_CARD: '#1e0a3c',       // 카드 배경
  BG_CARD_ALT: '#2d1147',   // 다른 카드 배경
  BG_INPUT: '#1a0a30',      // 인풋 배경
  BG_TAG: 'rgba(139, 92, 246, 0.2)',  // 태그/배지 배경

  // ─── 텍스트 ───
  TEXT: '#F3E8FF',           // 기본 텍스트 (purple-100)
  TEXT_SECONDARY: '#C4B5FD', // 보조 텍스트 (purple-200)
  TEXT_MUTED: '#A78BFA',     // 흐린 텍스트 (purple-300)
  TEXT_DIM: '#7C3AED',       // 더 흐린 텍스트 (purple-600)
  TEXT_PLACEHOLDER: 'rgba(167, 139, 250, 0.5)', // placeholder

  // ─── 테두리 ───
  BORDER: 'rgba(167, 139, 250, 0.25)', // 기본 테두리 (purple-400/25)
  BORDER_FOCUS: 'rgba(167, 139, 250, 0.7)', // 포커스 테두리
  BORDER_DASHED: 'rgba(167, 139, 250, 0.4)', // 점선 테두리

  // ─── 버튼 ───
  BTN_PRIMARY: '#7C3AED',      // 주요 버튼 (purple-600)
  BTN_SECONDARY: 'rgba(255, 255, 255, 0.1)', // 보조 버튼
  BTN_SECONDARY_BORDER: 'rgba(255, 255, 255, 0.2)',

  // ─── 상태색 ───
  DANGER: '#F87171',         // 에러 (red-400)
  DANGER_BG: 'rgba(239, 68, 68, 0.1)',
  SUCCESS: '#34D399',        // 성공 (emerald-400)
  WARNING: '#FBBF24',        // 경고 (amber-400)

  // ─── 단계별 색상 ───
  STAGE_REPLAY: '#EC4899',   // 재연 (pink-500)
  STAGE_REPLAY_BG: 'rgba(236, 72, 153, 0.15)',
  STAGE_STABLE: '#60A5FA',   // 안정 (blue-400)
  STAGE_STABLE_BG: 'rgba(96, 165, 250, 0.15)',
  STAGE_CLOSURE: '#818CF8',  // 이별 (indigo-400)
  STAGE_CLOSURE_BG: 'rgba(129, 140, 248, 0.15)',

  // ─── 구분선 ───
  DIVIDER: 'rgba(167, 139, 250, 0.15)',

  // ─── 오버레이 ───
  OVERLAY: 'rgba(10, 1, 24, 0.8)',
}

export const FONTS = {
  LOGO: { fontSize: 36, fontWeight: '300' as const, letterSpacing: 3, color: C.TEXT },
  LOGO_SM: { fontSize: 24, fontWeight: '300' as const, letterSpacing: 2, color: C.TEXT },
  TAGLINE: { fontSize: 14, color: C.TEXT_SECONDARY, letterSpacing: 0.5 },
  SECTION: { fontSize: 16, fontWeight: '700' as const, color: C.TEXT },
  SECTION_SUB: { fontSize: 13, color: C.TEXT_MUTED, lineHeight: 20 },
  BODY: { fontSize: 15, color: C.TEXT },
  SMALL: { fontSize: 13, color: C.TEXT_SECONDARY },
  TINY: { fontSize: 11, color: C.TEXT_MUTED, lineHeight: 17 },
  LABEL: { fontSize: 13, fontWeight: '500' as const, color: C.TEXT_SECONDARY },
  BTN: { fontSize: 16, fontWeight: '500' as const, color: C.TEXT, letterSpacing: 0.3 },
}

export const RADIUS = {
  SM: 8,
  MD: 12,
  LG: 16,
  XL: 20,
  FULL: 999,
}

export const SHADOW = {
  SM: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  MD: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
}
