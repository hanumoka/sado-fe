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
import { adaptSeriesResponse, type SeriesResponse } from './adapters'

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
