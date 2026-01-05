import type { Patient, Gender } from '@/types/entities'

// Backend 응답 타입 정의 (PatientResponse DTO와 일치)
interface BackendPatient {
  id: number  // Long (Java)
  dicomPatientId: string
  patientName: string
  patientBirthDate: string  // "YYYYMMDD" 형식
  patientSex: string  // "M" | "F" | "O" | "U"
  issuerOfPatientId: string | null
  studiesCount: number | null  // 통계 필드
  lastStudyDate: string | null  // LocalDate → "YYYY-MM-DD" 형식
  tenantId: number
  createdAt: string
  updatedAt: string
}

/**
 * DICOM 날짜 형식(YYYYMMDD)에서 나이 계산
 * @param birthDate DICOM 형식의 생년월일 (예: "19900115")
 * @returns 만 나이
 */
function calculateAge(birthDate: string | null): number {
  if (!birthDate || birthDate.length !== 8) return 0

  const year = parseInt(birthDate.substring(0, 4))
  const month = parseInt(birthDate.substring(4, 6))
  const day = parseInt(birthDate.substring(6, 8))

  const birth = new Date(year, month - 1, day)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Backend Patient DTO → Frontend Patient Entity 변환
 * @param backend Backend API 응답 객체
 * @returns Frontend Patient 타입
 */
export function adaptBackendPatient(backend: BackendPatient): Patient {
  return {
    id: String(backend.id),  // number → string 변환
    dicomPatientId: backend.dicomPatientId,
    name: backend.patientName || '',
    age: calculateAge(backend.patientBirthDate),
    gender: (backend.patientSex || 'U') as Gender,
    issuer: backend.issuerOfPatientId || '',
    studiesCount: backend.studiesCount ?? undefined,  // ✅ 백엔드에서 제공
    lastStudyDate: backend.lastStudyDate ?? undefined,  // ✅ 백엔드에서 제공 (YYYY-MM-DD 형식)
  }
}
