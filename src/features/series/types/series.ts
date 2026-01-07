/**
 * series.ts
 *
 * Series Feature 타입 정의
 */

// 엔티티 타입은 @/types에서 re-export
export type { Series } from '@/types'

/**
 * Series 검색 파라미터
 */
export interface SeriesSearchParams {
  modality?: string // Modality 필터 (CT, MR, US 등)
  studyId?: string // Study ID로 필터링
}
