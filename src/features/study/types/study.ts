/**
 * study.ts
 *
 * Study Feature 타입 정의
 */

// 엔티티 타입은 @/types에서 re-export
export type { Study, Series } from '@/types'

/**
 * Study 검색 파라미터
 */
export interface StudySearchParams {
  patientId?: string // 환자 ID로 필터링
  patientName?: string // 환자 이름 검색
  studyDate?: string // 검사 날짜 (YYYY-MM-DD)
  modality?: string // Modality 필터
}
