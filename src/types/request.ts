/**
 * request.ts
 *
 * API 요청 파라미터 타입 정의
 *
 * BE 연동 시 사용할 요청 타입
 */

import type { Gender, Modality } from './entities'
import type { PaginationParams } from './api'

// ============================================================
// Patient 요청 타입
// ============================================================

/**
 * 환자 목록 검색 파라미터
 */
export interface PatientListRequest extends PaginationParams {
  /** 환자 이름 (부분 일치) */
  name?: string
  /** 성별 필터 */
  gender?: Gender | 'ALL'
  /** DICOM Patient ID */
  patientId?: string
}

/**
 * 환자 상세 조회 파라미터
 */
export interface PatientDetailRequest {
  /** 환자 ID (내부 ID) */
  patientId: string
}

// ============================================================
// Study 요청 타입 (DICOMWeb QIDO-RS)
// ============================================================

/**
 * Study 목록 검색 파라미터
 */
export interface StudyListRequest extends PaginationParams {
  /** 환자 ID */
  PatientID?: string
  /** 환자 이름 (부분 일치) */
  PatientName?: string
  /** 검사 날짜 (YYYYMMDD 또는 범위) */
  StudyDate?: string
  /** Modality 필터 */
  ModalitiesInStudy?: Modality | 'ALL'
}

/**
 * Study 상세 조회 파라미터
 */
export interface StudyDetailRequest {
  /** Study ID (내부 ID) */
  studyId: string
}

/**
 * Series 목록 조회 파라미터
 */
export interface SeriesListRequest {
  /** Study ID (내부 ID) */
  studyId: string
}

// ============================================================
// Instance 요청 타입 (DICOM Viewer)
// ============================================================

/**
 * Series 상세 조회 파라미터
 */
export interface SeriesDetailRequest {
  /** Series ID (내부 ID) */
  seriesId: string
}

/**
 * Instance 목록 조회 파라미터
 */
export interface InstanceListRequest {
  /** Series ID (내부 ID) */
  seriesId: string
}

// ============================================================
// Upload 요청 타입 (STOW-RS)
// ============================================================

/**
 * DICOM 파일 업로드 요청
 */
export interface UploadDicomRequest {
  /** DICOM 파일 */
  file: File
}

// ============================================================
// WADO-RS 요청 타입 (Week 6+)
// ============================================================

/**
 * DICOM 이미지 조회 파라미터
 */
export interface RetrieveInstanceRequest {
  /** Study Instance UID */
  studyInstanceUid: string
  /** Series Instance UID */
  seriesInstanceUid: string
  /** SOP Instance UID */
  sopInstanceUid: string
}

/**
 * 렌더링된 이미지 조회 파라미터
 */
export interface RenderedImageRequest extends RetrieveInstanceRequest {
  /** Window Center/Width (예: "40/400") */
  window?: string
  /** 렌더링 크기 (예: "512/512") */
  viewport?: string
}
