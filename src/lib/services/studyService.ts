/**
 * studyService.ts
 *
 * Study 관련 API 서비스
 *
 * 목적:
 * - Hook에서 데이터 로직 분리
 * - Backend DICOMweb API 연동
 */

import { api } from '@/lib/api'
import type { Study, Series } from '@/types'
import type { StudySearchParams } from '@/features/study/types/study'
import { adaptDicomWebStudy } from '@/lib/adapters/studyAdapter'
import { adaptDicomWebSeries } from '@/lib/adapters/seriesAdapter'

/**
 * Study 목록 조회 (DICOMWeb QIDO-RS)
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Study[]>
 */
async function fetchStudiesImpl(
  searchParams?: StudySearchParams
): Promise<Study[]> {
  const params = new URLSearchParams()

  if (searchParams?.patientId) {
    params.append('PatientID', searchParams.patientId)
  }
  if (searchParams?.patientName) {
    params.append('PatientName', searchParams.patientName)
  }
  if (searchParams?.studyDate) {
    params.append('StudyDate', searchParams.studyDate)
  }
  if (searchParams?.modality && searchParams.modality !== 'ALL') {
    params.append('ModalitiesInStudy', searchParams.modality)
  }

  const queryString = params.toString()
  const url = queryString
    ? `/dicomweb/studies?${queryString}`
    : '/dicomweb/studies'

  const response = await api.get<any[]>(url)

  // DICOMweb DTO → Frontend Entity 변환
  return response.map((dicomStudy) => adaptDicomWebStudy(dicomStudy))
}

/**
 * Study 상세 조회
 * studyId가 StudyInstanceUID인 경우 DICOMweb으로 조회
 *
 * @param studyId - Study Instance UID
 * @returns Promise<Study | null>
 */
async function fetchStudyByIdImpl(studyId: string): Promise<Study | null> {
  // DICOMweb QIDO-RS로 StudyInstanceUID 기반 조회
  const studies = await api.get<any[]>(`/dicomweb/studies?StudyInstanceUID=${studyId}`)

  if (studies.length === 0) {
    return null
  }

  return adaptDicomWebStudy(studies[0])
}

/**
 * Study의 Series 목록 조회 (DICOMWeb QIDO-RS)
 *
 * @param studyId - Study Instance UID
 * @returns Promise<Series[]>
 */
async function fetchSeriesByStudyIdImpl(studyId: string): Promise<Series[]> {
  const response = await api.get<any[]>(`/dicomweb/studies/${studyId}/series`)

  // DICOMweb DTO → Frontend Entity 변환
  return response.map((dicomSeries) => {
    // Adapter 호출 시 studyId 전달
    return adaptDicomWebSeries(dicomSeries, studyId)
  })
}

// Export
export const fetchStudies = fetchStudiesImpl
export const fetchStudyById = fetchStudyByIdImpl
export const fetchSeriesByStudyId = fetchSeriesByStudyIdImpl
