/**
 * 채팅 화면 관련 상수 모음
 * 감정 단계 전환 조건, 사용량 제한 등
 */

/** 현재 단계에서 "다음 단계로" 버튼을 노출하기 위한 최소 메시지 수 */
export const STAGE_TRANSITION_MIN = 5

/** 이별(closure) 단계에서 마지막 편지 말풍선 제안이 나오는 사용자 메시지 수 */
export const CLOSURE_MESSAGE_LIMIT = 20

/** 안정(stable) 단계에서 "이별 단계로" 버튼 노출 최소 메시지 수 */
export const STABLE_TRANSITION_MIN = 5

/** 최근 대화 기록을 AI 컨텍스트에 포함할 최대 개수 */
export const MAX_HISTORY_LENGTH = 20

/** 페르소나당 무료 대화 한도 */
export const FREE_MESSAGE_LIMIT = 10
