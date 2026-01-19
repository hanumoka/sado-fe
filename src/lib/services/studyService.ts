/**
 * studyService.ts
 *
 * Study 관련 API 서비스
 *
 * Backend REST API 사용 (/api/studies, /api/series)
 * - uuid 필드 포함
 * - patientName 포함
 */

import { api } from '@/lib/api'
import type { Study, Series } from '@/types'
import type { StudySearchParams } from '@/features/study/types/study'
import { adaptSeriesResponse, type SeriesResponse } from './adapters'

/**
 * Backend StudyResponse DTO
 */
interface StudyResponse {
  id: number
  uuid: string | null
  patientId: number
  patientName: string | null
  studyInstanceUid: string
  studyDate: string | null // ISO date (YYYY-MM-DD)
  studyDescription: string | null
  numberOfSeries: number | null
  numberOfInstances: number | null
  createdAt: string | null
  updatedAt: string | null
  tenantId: number | null
}

/**
 * Backend StudyResponse → Frontend Study 변환
 */
function adaptStudyResponse(response: StudyResponse): Study {
  return {
    id: String(response.id),
    uuid: response.uuid ?? undefined,
    studyInstanceUid: response.studyInstanceUid,
    patientId: String(response.patientId),
    patientName: response.patientName || 'Unknown',
    studyDate: response.studyDate || '',
    studyTime: '', // BE에서 제공하지 않음
    modality: '', // Study 레벨에서는 없음, Series에서 조회 필요
    studyDescription: response.studyDescription || '',
    seriesCount: response.numberOfSeries ?? 0,
    instancesCount: response.numberOfInstances ?? 0,
    tenantId: response.tenantId ?? undefined,
  }
}

/**
 * Study 목록 조회 (REST API)
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Study[]>
 */
async function fetchStudiesImpl(
  searchParams?: StudySearchParams
): Promise<Study[]> {
  const params = new URLSearchParams()

  if (searchParams?.patientId) {
    params.append('patientId', searchParams.patientId)
  }
  if (searchParams?.patientName) {
    params.append('patientName', searchParams.patientName)
  }
  if (searchParams?.studyDate) {
    params.append('studyDate', searchParams.studyDate)
  }
  // Note: modality 필터는 BE에서 지원하지 않음 (Series 레벨)

  const queryString = params.toString()
  const url = queryString ? `/api/studies?${queryString}` : '/api/studies'

  const response = await api.get<StudyResponse[]>(url)

  if (!response) {
    return []
  }

  return response.map(adaptStudyResponse)
}

/**
 * Study 상세 조회 (REST API)
 *
 * @param studyId - Study ID (내부 PK)
 * @returns Promise<Study | null>
 */
async function fetchStudyByIdImpl(studyId: string): Promise<Study | null> {
  const response = await api.get<StudyResponse>(`/api/studies/${studyId}`)

  if (!response) {
    return null
  }

  return adaptStudyResponse(response)
}

/**
 * Study의 Series 목록 조회 (REST API)
 *
 * @param studyId - Study ID (내부 PK)
 * @returns Promise<Series[]>
 */
async function fetchSeriesByStudyIdImpl(studyId: string): Promise<Series[]> {
  const response = await api.get<SeriesResponse[]>(
    `/api/series?studyId=${studyId}`
  )

  if (!response) {
    return []
  }

  return response.map(adaptSeriesResponse)
}

// Export
export const fetchStudies = fetchStudiesImpl
export const fetchStudyById = fetchStudyByIdImpl
export const fetchSeriesByStudyId = fetchSeriesByStudyIdImpl
