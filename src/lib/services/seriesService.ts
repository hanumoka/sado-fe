/**
 * seriesService.ts
 *
 * Series 관련 API 서비스
 *
 * Backend REST API 사용 (/api/series)
 * - uuid 필드 포함
 * - studyDescription, patientName 포함 (컨텍스트 표시용)
 */

import { api } from '@/lib/api'
import type { Series } from '@/types'
import type { SeriesSearchParams } from '@/features/series/types/series'

/**
 * Backend SeriesResponse DTO
 */
interface SeriesResponse {
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
 * Backend SeriesResponse → Frontend Series 변환
 */
function adaptSeriesResponse(response: SeriesResponse): Series {
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
  }
}

/**
 * Series 목록 조회 (REST API)
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Series[]>
 */
async function fetchSeriesImpl(
  searchParams?: SeriesSearchParams
): Promise<Series[]> {
  const params = new URLSearchParams()

  if (searchParams?.modality) {
    params.append('modality', searchParams.modality)
  }
  if (searchParams?.studyId) {
    params.append('studyId', searchParams.studyId)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/series?${queryString}` : '/api/series'

  const response = await api.get<SeriesResponse[]>(url)

  if (!response) {
    return []
  }

  return response.map(adaptSeriesResponse)
}

/**
 * Series 상세 조회 (REST API)
 *
 * @param seriesId - Series ID (내부 PK)
 * @returns Promise<Series | null>
 */
async function fetchSeriesByIdImpl(seriesId: string): Promise<Series | null> {
  const response = await api.get<SeriesResponse>(`/api/series/${seriesId}`)

  if (!response) {
    return null
  }

  return adaptSeriesResponse(response)
}

// Export
export const fetchSeries = fetchSeriesImpl
export const fetchSeriesById = fetchSeriesByIdImpl
