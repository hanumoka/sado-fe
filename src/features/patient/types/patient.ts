/**
 * patient.ts
 *
 * Patient Feature 타입 정의
 */

// 엔티티 타입은 @/types에서 re-export
export type { Patient } from '@/types'

/**
 * 환자 검색 파라미터
 */
export interface PatientSearchParams {
  name?: string // 이름 검색
  gender?: 'M' | 'F' | 'ALL' // 성별 필터
}
