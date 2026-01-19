/**
 * adapters.ts
 *
 * Backend DTO -> Frontend 타입 변환 어댑터
 *
 * 공통 사용되는 Response 인터페이스와 어댑터 함수를 중앙화하여
 * 코드 중복을 방지하고 일관성을 유지합니다.
 */

import type { Series } from '@/types'

/**
 * Backend SeriesResponse DTO
 *
 * BE /api/series 엔드포인트에서 반환하는 데이터 구조
 */
export interface SeriesResponse {
  id: number
  uuid: string | null
  studyId: number
  studyDescription: string | null
  patientName: string | null
  seriesInstanceUid: string
  modality: string | null
  seriesDescription: string | null
  bodyPartExamined: string | null
  manufacturer: string | null
  manufacturerModelName: string | null
  seriesNumber: number | null
  numberOfInstances: number | null
  createdAt: string | null
  updatedAt: string | null
  tenantId: number | null
}

/**
 * Backend SeriesResponse -> Frontend Series 변환
 *
 * @param response - Backend SeriesResponse DTO
 * @returns Frontend Series 타입
 */
export function adaptSeriesResponse(response: SeriesResponse): Series {
  return {
    id: String(response.id),
    uuid: response.uuid ?? undefined,
    seriesInstanceUid: response.seriesInstanceUid,
    studyId: String(response.studyId),
    studyDescription: response.studyDescription ?? undefined,
    patientName: response.patientName ?? undefined,
    seriesNumber: response.seriesNumber ?? 0,
    modality: response.modality || '',
    seriesDescription: response.seriesDescription || '',
    bodyPartExamined: response.bodyPartExamined ?? undefined,
    manufacturer: response.manufacturer ?? undefined,
    manufacturerModelName: response.manufacturerModelName ?? undefined,
    instancesCount: response.numberOfInstances ?? 0,
    tenantId: response.tenantId ?? undefined,
  }
}
