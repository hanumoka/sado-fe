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
  id: string // 내부 ID (DB PK)
  uuid?: string // UUID v7 (외부 노출용 식별자)
  dicomPatientId: string // DICOM Patient ID
  name: string // 환자 이름
  age: number // 나이
  gender: Gender // 성별
  issuer: string // 발급 기관
  studiesCount?: number // Study 개수
  lastStudyDate?: string // 최근 Study 날짜 (YYYY-MM-DD)
  tenantId?: number // 테넌트 ID (멀티테넌시)
}

/**
 * Study (검사) 정보
 */
export interface Study {
  id: string // 내부 ID (DB PK)
  uuid?: string // UUID v7 (외부 노출용 식별자, REST API에서만 제공)
  studyInstanceUid: string // DICOM Study Instance UID
  patientId: string // 환자 ID
  patientName: string // 환자 이름
  studyDate: string // 검사 날짜 (YYYY-MM-DD)
  studyTime: string // 검사 시간 (HH:mm:ss)
  modality: string // Modality (CT, MR, XR, US)
  studyDescription: string // Study 설명
  seriesCount: number // Series 개수
  instancesCount: number // Instance 개수
  tenantId?: number // 테넌트 ID (멀티테넌시)
}

/**
 * Series 정보
 */
export interface Series {
  id: string // 내부 ID (DB PK)
  uuid?: string // UUID v7 (외부 노출용 식별자, REST API에서만 제공)
  seriesInstanceUid: string // DICOM Series Instance UID
  studyId: string // Study ID
  studyDescription?: string // Study 설명 (Series 목록에서 컨텍스트 표시용)
  patientName?: string // 환자 이름 (Series 목록에서 컨텍스트 표시용)
  seriesNumber: number // Series 번호
  modality: string // Modality
  seriesDescription: string // Series 설명
  bodyPartExamined?: string // 검사 부위
  manufacturer?: string // 장비 제조사
  manufacturerModelName?: string // 장비 모델명
  instancesCount: number // Instance 개수
  tenantId?: number // 테넌트 ID (멀티테넌시)
}

/**
 * Instance (개별 이미지) 정보
 */
export interface Instance {
  id: string // 내부 ID (DB PK)
  uuid?: string // UUID v7 (외부 노출용 식별자, REST API에서만 제공)
  sopInstanceUid: string // DICOM SOP Instance UID
  sopClassUid?: string // DICOM SOP Class UID
  seriesId: string // Series ID
  studyId?: string // Study ID (상위 계층)
  patientId?: string // Patient ID (상위 계층)
  instanceNumber: number // Instance 번호
  rows?: number // 이미지 높이
  columns?: number // 이미지 너비
  numberOfFrames?: number // 멀티프레임 이미지의 프레임 수
  frameRate?: number // 프레임 레이트 (fps)
  transferSyntaxUid?: string // Transfer Syntax UID (압축 형식)
  storagePath?: string // 스토리지 경로
  storageUri: string // Pre-signed URL 또는 Proxy URL
  fileSize?: number // 파일 크기 (bytes)
  transcodingStatus?: string // 트랜스코딩 상태 (NONE, PENDING, PROCESSING, COMPLETED, FAILED)
  thumbnailPath?: string // 썸네일 경로
  videoPath?: string // 비디오 경로
  storageTier?: string // 스토리지 티어 (HOT, WARM, COLD)
  createdAt?: string // 생성일시
  updatedAt?: string // 수정일시
  tenantId?: number // 테넌트 ID (멀티테넌시)
}

/**
 * Modality 타입 (확장 가능)
 */
export type Modality = 'CT' | 'MR' | 'XR' | 'US' | 'PT' | 'NM' | 'CR' | 'DX'
