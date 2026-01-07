/**
 * patientService.ts
 *
 * Patient 관련 API 서비스
 *
 * Backend REST API 사용 (/api/patients)
 * - DICOMweb 표준에는 Patient 레벨 API가 없음
 * - 커스텀 REST API로 Patient 정보 제공 (studiesCount, lastStudyDate 포함)
 */

import { api } from '@/lib/api'
import type { Patient, Gender } from '@/types'
import type { PatientSearchParams } from '@/features/patient/types/patient'

/**
 * Backend PatientResponse DTO
 */
interface PatientResponse {
  id: number
  uuid: string | null // UUID v7 (외부 노출용 식별자)
  dicomPatientId: string
  issuerOfPatientId: string | null
  issuerTypeCode: string | null
  patientName: string | null
  patientBirthDate: string | null // ISO date (YYYY-MM-DD)
  patientSex: string | null
  emrPatientId: string | null
  matchingConfidence: number | null
  matchingStatus: string | null
  studiesCount: number | null
  lastStudyDate: string | null // ISO date (YYYY-MM-DD)
  createdAt: string | null
  updatedAt: string | null
  tenantId: number | null
}

/**
 * 생년월일로부터 나이 계산
 */
function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 0

  const birth = new Date(birthDate)
  const today = new Date()

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * 성별 문자열을 Gender 타입으로 변환
 */
function toGender(sex: string | null): Gender {
  if (sex === 'M' || sex === 'F' || sex === 'O') {
    return sex
  }
  return 'U'
}

/**
 * Backend PatientResponse → Frontend Patient 변환
 */
function adaptPatientResponse(response: PatientResponse): Patient {
  return {
    id: String(response.id),
    uuid: response.uuid ?? undefined,
    dicomPatientId: response.dicomPatientId || '',
    name: response.patientName || 'Unknown',
    age: calculateAge(response.patientBirthDate),
    gender: toGender(response.patientSex),
    issuer: response.issuerOfPatientId || '',
    studiesCount: response.studiesCount ?? 0,
    lastStudyDate: response.lastStudyDate ?? undefined,
  }
}

/**
 * 환자 목록 조회
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Patient[]>
 */
async function fetchPatientsImpl(
  searchParams?: PatientSearchParams
): Promise<Patient[]> {
  // 쿼리 파라미터 구성
  const params = new URLSearchParams()

  if (searchParams?.name) {
    params.append('name', searchParams.name)
  }

  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    params.append('gender', searchParams.gender)
  }

  const queryString = params.toString()
  const url = queryString ? `/api/patients?${queryString}` : '/api/patients'

  const response = await api.get<PatientResponse[]>(url)

  if (!response) {
    return []
  }

  return response.map(adaptPatientResponse)
}

/**
 * 환자 상세 조회
 *
 * @param patientId - 환자 ID (내부 PK)
 * @returns Promise<Patient | null>
 */
async function fetchPatientByIdImpl(
  patientId: string
): Promise<Patient | null> {
  const response = await api.get<PatientResponse>(`/api/patients/${patientId}`)

  if (!response) {
    return null
  }

  return adaptPatientResponse(response)
}

// Export
export const fetchPatients = fetchPatientsImpl
export const fetchPatientById = fetchPatientByIdImpl
