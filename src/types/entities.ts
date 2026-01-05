/**
 * entities.ts
 *
 * 도메인 엔티티 타입 정의 (Single Source of Truth)
 *
 * 모든 엔티티 타입은 이 파일에서 정의하고,
 * 다른 파일에서는 이 파일을 import하여 사용
 */

/**
 * 성별 타입 (DICOM 표준)
 * M: Male, F: Female, O: Other, U: Unknown
 */
export type Gender = 'M' | 'F' | 'O' | 'U'

/**
 * 환자 정보
 */
export interface Patient {
  id: string // 내부 ID (PAT-001)
  dicomPatientId: string // DICOM Patient ID
  name: string // 환자 이름
  age: number // 나이
  gender: Gender // 성별
  issuer: string // 발급 기관
  studiesCount?: number // Study 개수 (Backend API 미구현)
  lastStudyDate?: string // 최근 Study 날짜 (YYYY-MM-DD, Backend API 미구현)
}

/**
 * Study (검사) 정보
 */
export interface Study {
  id: string // 내부 ID (STU-001)
  studyInstanceUid: string // DICOM Study Instance UID
  patientId: string // 환자 ID (PAT-001)
  patientName: string // 환자 이름
  studyDate: string // 검사 날짜 (YYYY-MM-DD)
  studyTime: string // 검사 시간 (HH:mm:ss)
  modality: string // Modality (CT, MR, XR, US)
  studyDescription: string // Study 설명
  seriesCount: number // Series 개수
  instancesCount: number // Instance 개수
}

/**
 * Series 정보
 */
export interface Series {
  id: string // 내부 ID (SER-001)
  seriesInstanceUid: string // DICOM Series Instance UID
  studyId: string // Study ID (STU-001)
  seriesNumber: number // Series 번호
  modality: string // Modality
  seriesDescription: string // Series 설명
  instancesCount: number // Instance 개수
}

/**
 * Instance (개별 이미지) 정보
 */
export interface Instance {
  id: string // 내부 ID (INS-001)
  sopInstanceUid: string // DICOM SOP Instance UID
  seriesId: string // Series ID (SER-001)
  instanceNumber: number // Instance 번호
  storageUri: string // 저장 경로 (SeaweedFS URI)
}

/**
 * Modality 타입 (확장 가능)
 */
export type Modality = 'CT' | 'MR' | 'XR' | 'US' | 'PT' | 'NM' | 'CR' | 'DX'
