/**
 * studyService.ts
 *
 * Study 관련 API 서비스
 *
 * 목적:
 * - Mock/Real API 전환 로직 중앙화
 * - Hook에서 데이터 로직 분리
 * - BE 연동 시 수정 최소화
 */

import { MOCK_STUDIES, MOCK_SERIES } from '@/lib/mockData'
import { api } from '@/lib/api'
import { apiConfig, mockConfig } from '@/lib/config'
import type { Study, Series } from '@/types'
import type { StudySearchParams } from '@/features/study/types/study'

/**
 * Mock: Study 목록 조회
 */
async function mockFetchStudies(
  searchParams?: StudySearchParams
): Promise<Study[]> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  let studies = [...MOCK_STUDIES]

  // 환자 ID 필터링
  if (searchParams?.patientId) {
    studies = studies.filter((s) => s.patientId === searchParams.patientId)
  }

  // 환자 이름 필터링
  if (searchParams?.patientName) {
    const searchName = searchParams.patientName.toLowerCase()
    studies = studies.filter((s) =>
      s.patientName.toLowerCase().includes(searchName)
    )
  }

  // 검사 날짜 필터링
  if (searchParams?.studyDate) {
    studies = studies.filter((s) => s.studyDate === searchParams.studyDate)
  }

  // Modality 필터링
  if (searchParams?.modality && searchParams.modality !== 'ALL') {
    studies = studies.filter((s) => s.modality === searchParams.modality)
  }

  return studies
}

/**
 * Real: Study 목록 조회 (DICOMWeb QIDO-RS)
 */
async function realFetchStudies(
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

  return api.get<Study[]>(url)
}

/**
 * Mock: Study 상세 조회
 */
async function mockFetchStudyById(studyId: string): Promise<Study | null> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  const study = MOCK_STUDIES.find((s) => s.id === studyId)
  return study || null
}

/**
 * Real: Study 상세 조회
 */
async function realFetchStudyById(studyId: string): Promise<Study | null> {
  return api.get<Study>(`/api/studies/${studyId}`)
}

/**
 * Mock: Study의 Series 목록 조회
 */
async function mockFetchSeriesByStudyId(studyId: string): Promise<Series[]> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  return MOCK_SERIES.filter((s) => s.studyId === studyId)
}

/**
 * Real: Study의 Series 목록 조회 (DICOMWeb QIDO-RS)
 */
async function realFetchSeriesByStudyId(studyId: string): Promise<Series[]> {
  return api.get<Series[]>(`/dicomweb/studies/${studyId}/series`)
}

// ============================================================
// Export: 환경에 따라 Mock 또는 Real 함수 선택
// ============================================================

/**
 * Study 목록 조회
 */
export const fetchStudies = apiConfig.useMock
  ? mockFetchStudies
  : realFetchStudies

/**
 * Study 상세 조회
 */
export const fetchStudyById = apiConfig.useMock
  ? mockFetchStudyById
  : realFetchStudyById

/**
 * Study의 Series 목록 조회
 */
export const fetchSeriesByStudyId = apiConfig.useMock
  ? mockFetchSeriesByStudyId
  : realFetchSeriesByStudyId
