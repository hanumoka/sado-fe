/**
 * modality.ts
 *
 * DICOM Modality 관련 상수 정의
 *
 * 중복 코드 방지를 위해 중앙 집중화
 */

/**
 * Modality 배지 스타일 (텍스트 배지용)
 *
 * @example
 * <span className={MODALITY_BADGE_COLORS[study.modality] || MODALITY_BADGE_COLORS.default}>
 *   {study.modality}
 * </span>
 */
export const MODALITY_BADGE_COLORS: Record<string, string> = {
  CT: 'bg-blue-100 text-blue-800',
  MR: 'bg-purple-100 text-purple-800',
  XR: 'bg-green-100 text-green-800',
  US: 'bg-orange-100 text-orange-800',
  PT: 'bg-pink-100 text-pink-800',
  NM: 'bg-yellow-100 text-yellow-800',
  default: 'bg-gray-100 text-gray-800',
}

/**
 * Modality 썸네일 카드 스타일 (배경 + 그라데이션)
 *
 * @example
 * const colors = MODALITY_CARD_COLORS[series.modality] || MODALITY_CARD_COLORS.default
 * <div className={colors.bg}>
 *   <div className={`bg-gradient-to-br ${colors.gradient}`} />
 * </div>
 */
export const MODALITY_CARD_COLORS: Record<
  string,
  { bg: string; gradient: string }
> = {
  CT: { bg: 'bg-blue-50', gradient: 'from-blue-400 to-blue-600' },
  MR: { bg: 'bg-purple-50', gradient: 'from-purple-400 to-purple-600' },
  XR: { bg: 'bg-green-50', gradient: 'from-green-400 to-green-600' },
  US: { bg: 'bg-orange-50', gradient: 'from-orange-400 to-orange-600' },
  PT: { bg: 'bg-pink-50', gradient: 'from-pink-400 to-pink-600' },
  NM: { bg: 'bg-yellow-50', gradient: 'from-yellow-400 to-yellow-600' },
  default: { bg: 'bg-gray-50', gradient: 'from-gray-400 to-gray-600' },
}

/**
 * Modality 배지 스타일 조회 헬퍼 함수
 */
export function getModalityBadgeColor(modality: string): string {
  return MODALITY_BADGE_COLORS[modality] || MODALITY_BADGE_COLORS.default
}

/**
 * Modality 카드 스타일 조회 헬퍼 함수
 */
export function getModalityCardColor(modality: string): {
  bg: string
  gradient: string
} {
  return MODALITY_CARD_COLORS[modality] || MODALITY_CARD_COLORS.default
}
