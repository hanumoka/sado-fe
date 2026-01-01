/**
 * response.ts
 *
 * API 응답 타입 정의
 *
 * BE 연동 시 사용할 응답 타입
 */

import type { Patient, Study, Series } from './entities'
import type { ApiResponse, PaginatedResponse } from './api'

// ============================================================
// Patient 응답 타입
// ============================================================

/**
 * 환자 목록 응답
 */
export type PatientListResponse = PaginatedResponse<Patient>

/**
 * 환자 상세 응답
 */
export type PatientDetailResponse = ApiResponse<Patient>

// ============================================================
// Study 응답 타입
// ============================================================

/**
 * Study 목록 응답
 */
export type StudyListResponse = PaginatedResponse<Study>

/**
 * Study 상세 응답
 */
export type StudyDetailResponse = ApiResponse<Study>

/**
 * Series 목록 응답
 */
export type SeriesListResponse = ApiResponse<Series[]>

// ============================================================
// Instance 응답 타입 (DICOM Viewer)
// ============================================================

/**
 * Viewer용 Series 정보
 */
export interface ViewerSeriesData {
  id: string
  seriesInstanceUid: string
  seriesNumber: number
  modality: string
  seriesDescription: string
  instancesCount: number
}

/**
 * Viewer용 Instance 정보
 */
export interface ViewerInstanceData {
  id: string
  sopInstanceUid: string
  seriesId: string
  studyId: string
  instanceNumber: number
  storageUri: string
  /** 이미지 높이 (픽셀) */
  rows: number
  /** 이미지 너비 (픽셀) */
  columns: number
  /** 픽셀 간격 [행, 열] */
  pixelSpacing: [number, number]
}

/**
 * Series 상세 응답 (Viewer용)
 */
export type SeriesDetailResponse = ApiResponse<ViewerSeriesData>

/**
 * Instance 목록 응답 (Viewer용)
 */
export type InstanceListResponse = ApiResponse<ViewerInstanceData[]>

// ============================================================
// Upload 응답 타입
// ============================================================

/**
 * DICOM 업로드 응답
 */
export interface UploadDicomResponse {
  success: boolean
  message: string
  /** 생성된 Instance ID */
  instanceId?: string
  /** Study Instance UID */
  studyInstanceUid?: string
  /** Series Instance UID */
  seriesInstanceUid?: string
  /** SOP Instance UID */
  sopInstanceUid?: string
  /** 에러 메시지 (실패 시) */
  error?: string
}

// ============================================================
// 에러 응답 타입
// ============================================================

/**
 * 에러 코드 상수
 */
export const ErrorCodes = {
  // 404 Not Found
  PATIENT_NOT_FOUND: 'PATIENT_NOT_FOUND',
  STUDY_NOT_FOUND: 'STUDY_NOT_FOUND',
  SERIES_NOT_FOUND: 'SERIES_NOT_FOUND',
  INSTANCE_NOT_FOUND: 'INSTANCE_NOT_FOUND',

  // 400 Bad Request
  INVALID_DICOM: 'INVALID_DICOM',
  INVALID_REQUEST: 'INVALID_REQUEST',

  // 500 Server Error
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  STORAGE_ERROR: 'STORAGE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * 에러 상세 정보
 */
export interface ApiErrorDetail {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}

/**
 * 에러 응답
 */
export interface ApiErrorResponse {
  success: false
  error: ApiErrorDetail
}
