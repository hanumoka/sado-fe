/**
 * patientService.ts
 *
 * Patient 관련 API 서비스
 *
 * POC 단계: DICOMweb QIDO-RS를 사용하여 Patient 정보 조회
 * - Gateway API 대신 QIDO-RS로 Study를 조회하고 PatientID로 그룹화
 * - DICOMweb 표준에서는 Patient 엔티티가 별도로 없으므로 Study에서 추출
 */

import type { Patient } from '@/types'
import type { PatientSearchParams } from '@/features/patient/types/patient'
import { searchStudies, type DicomStudy } from './dicomWebService'

/**
 * DicomStudy를 Patient로 변환
 *
 * DICOMweb에서는 Patient 엔티티가 별도로 없으므로
 * Study에서 Patient 정보를 추출합니다.
 */
function adaptDicomStudyToPatient(study: DicomStudy): Patient {
  return {
    id: study.patientId || 'UNKNOWN',
    name: study.patientName || 'Unknown Patient',
    gender: 'UNKNOWN', // DICOMweb QIDO-RS에서는 기본적으로 성별을 반환하지 않음
    birthDate: undefined, // DICOMweb QIDO-RS에서는 기본적으로 생년월일을 반환하지 않음
    studyCount: 1, // 각 Study당 1개로 계산 (나중에 그룹화하여 합산)
  }
}

/**
 * Study 목록을 Patient 목록으로 그룹화
 *
 * 같은 PatientID를 가진 Study들을 하나의 Patient로 그룹화합니다.
 */
function groupStudiesByPatient(studies: DicomStudy[]): Patient[] {
  const patientMap = new Map<string, Patient>()

  studies.forEach((study) => {
    const patientId = study.patientId || 'UNKNOWN'

    if (patientMap.has(patientId)) {
      // 이미 존재하는 환자 - Study 수만 증가
      const patient = patientMap.get(patientId)!
      patient.studyCount += 1
    } else {
      // 새로운 환자
      patientMap.set(patientId, adaptDicomStudyToPatient(study))
    }
  })

  return Array.from(patientMap.values())
}

/**
 * 환자 목록 조회 (QIDO-RS 기반)
 *
 * @param searchParams - 검색 파라미터
 * @returns Promise<Patient[]>
 */
async function fetchPatientsImpl(
  searchParams?: PatientSearchParams
): Promise<Patient[]> {
  // QIDO-RS 검색 파라미터 변환
  const qidoParams: {
    PatientName?: string
    limit?: number
  } = {}

  if (searchParams?.name) {
    qidoParams.PatientName = `*${searchParams.name}*` // DICOMweb 와일드카드 검색
  }

  // 전체 Study 조회 (limit을 크게 설정하여 모든 환자 조회)
  qidoParams.limit = 1000

  const studies = await searchStudies(qidoParams)

  // Study를 Patient로 그룹화
  let patients = groupStudiesByPatient(studies)

  // 성별 필터링 (클라이언트 측)
  // Note: DICOMweb QIDO-RS에서 성별 정보가 없으므로 필터링 불가
  // 향후 확장된 QIDO-RS 쿼리로 성별 필드를 요청하면 가능
  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    // POC에서는 성별 필터링 생략 (모든 환자 반환)
    console.warn('Gender filtering is not supported in DICOMweb QIDO-RS POC')
  }

  return patients
}

/**
 * 환자 상세 조회 (QIDO-RS 기반)
 *
 * @param patientId - 환자 ID
 * @returns Promise<Patient | null>
 */
async function fetchPatientByIdImpl(
  patientId: string
): Promise<Patient | null> {
  // 특정 PatientID로 Study 검색
  const studies = await searchStudies({
    PatientID: patientId,
  })

  if (studies.length === 0) {
    return null
  }

  // 첫 번째 Study에서 Patient 정보 추출
  const patient = adaptDicomStudyToPatient(studies[0])
  // Study 수 업데이트
  patient.studyCount = studies.length

  return patient
}

// Export
export const fetchPatients = fetchPatientsImpl
export const fetchPatientById = fetchPatientByIdImpl
