/**
 * patientService.ts
 *
 * Patient 관련 API 서비스
 *
 * 목적:
 * - Mock/Real API 전환 로직 중앙화
 * - Hook에서 데이터 로직 분리
 * - BE 연동 시 수정 최소화
 */

import { MOCK_PATIENTS } from '@/lib/mockData'
import { api } from '@/lib/api'
import { apiConfig, mockConfig } from '@/lib/config'
import type { Patient } from '@/types'
import type { PatientSearchParams } from '@/features/patient/types/patient'

/**
 * Mock: 환자 목록 조회
 */
async function mockFetchPatients(
  searchParams?: PatientSearchParams
): Promise<Patient[]> {
  // API 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  let patients = [...MOCK_PATIENTS]

  // 이름 필터링
  if (searchParams?.name) {
    const searchName = searchParams.name.toLowerCase()
    patients = patients.filter((p) => p.name.toLowerCase().includes(searchName))
  }

  // 성별 필터링
  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    patients = patients.filter((p) => p.gender === searchParams.gender)
  }

  return patients
}

/**
 * Real: 환자 목록 조회
 * Week 6+ BE API 완성 후 활성화
 */
async function realFetchPatients(
  searchParams?: PatientSearchParams
): Promise<Patient[]> {
  const params = new URLSearchParams()

  if (searchParams?.name) {
    params.append('name', searchParams.name)
  }
  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    params.append('gender', searchParams.gender)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/patients?${queryString}` : '/api/patients'

  return api.get<Patient[]>(url)
}

/**
 * Mock: 환자 상세 조회
 */
async function mockFetchPatientById(
  patientId: string
): Promise<Patient | null> {
  await new Promise((resolve) => setTimeout(resolve, mockConfig.delay))

  const patient = MOCK_PATIENTS.find((p) => p.id === patientId)
  return patient || null
}

/**
 * Real: 환자 상세 조회
 */
async function realFetchPatientById(
  patientId: string
): Promise<Patient | null> {
  return api.get<Patient>(`/api/patients/${patientId}`)
}

// ============================================================
// Export: 환경에 따라 Mock 또는 Real 함수 선택
// ============================================================

/**
 * 환자 목록 조회
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Patient[]>
 */
export const fetchPatients = apiConfig.useMock
  ? mockFetchPatients
  : realFetchPatients

/**
 * 환자 상세 조회
 *
 * @param patientId - 환자 ID
 * @returns Promise<Patient | null>
 */
export const fetchPatientById = apiConfig.useMock
  ? mockFetchPatientById
  : realFetchPatientById
