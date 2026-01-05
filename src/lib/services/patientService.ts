/**
 * patientService.ts
 *
 * Patient 관련 API 서비스
 *
 * 목적:
 * - Hook에서 데이터 로직 분리
 * - Backend API 연동
 */

import { api } from '@/lib/api'
import type { Patient } from '@/types'
import type { PatientSearchParams } from '@/features/patient/types/patient'
import { adaptBackendPatient } from '@/lib/adapters/patientAdapter'

/**
 * 환자 목록 조회
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Patient[]>
 */
async function fetchPatientsImpl(
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

  const response = await api.get<any[]>(url)

  // Backend DTO → Frontend Entity 변환
  return response.map(adaptBackendPatient)
}

/**
 * 환자 상세 조회
 *
 * @param patientId - 환자 ID
 * @returns Promise<Patient | null>
 */
async function fetchPatientByIdImpl(
  patientId: string
): Promise<Patient | null> {
  const response = await api.get<any>(`/api/patients/${patientId}`)

  // Backend DTO → Frontend Entity 변환
  return adaptBackendPatient(response)
}

// Export
export const fetchPatients = fetchPatientsImpl
export const fetchPatientById = fetchPatientByIdImpl
