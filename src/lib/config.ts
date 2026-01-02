/**
 * config.ts
 *
 * 환경 변수 및 설정 중앙 관리
 *
 * 모든 환경 변수 접근은 이 파일을 통해 수행
 */

/**
 * API 설정
 */
export const apiConfig = {
  /** API 서버 Base URL */
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:10200',

  /** API 요청 타임아웃 (ms) */
  timeout: 30000,

  /** 업로드 타임아웃 (ms) */
  uploadTimeout: 120000,
} as const

/**
 * 페이지네이션 기본값
 */
export const paginationConfig = {
  /** 기본 페이지 크기 */
  defaultLimit: 20,

  /** 최대 페이지 크기 */
  maxLimit: 100,
} as const

/**
 * 업로드 설정
 */
export const uploadConfig = {
  /** 동시 업로드 수 */
  concurrentUploads: 3,

  /** 허용 파일 확장자 */
  allowedExtensions: ['.dcm', '.dicom'],

  /** 최대 파일 크기 (bytes) - 500MB */
  maxFileSize: 500 * 1024 * 1024,
} as const
