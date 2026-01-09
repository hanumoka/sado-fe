/**
 * config.ts
 *
 * 환경 변수 및 설정 중앙 관리
 *
 * 모든 환경 변수 접근은 이 파일을 통해 수행
 *
 * POC 단계: DICOMweb 표준 API만 사용, Gateway API는 비활성화
 */

/**
 * API Base URL
 *
 * 환경 변수 VITE_API_BASE_URL이 설정되어 있으면 해당 값을 사용하고,
 * 그렇지 않으면 기본값 'http://localhost:10201'을 사용합니다.
 *
 * 사용처:
 * - WADO-RS/WADO-URI imageId 생성
 * - 배치 프리페처 URL 생성
 * - 썸네일 URL 생성
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:10201'

/**
 * API 설정
 *
 * POC 단계: DICOMweb 표준 API만 사용
 * - baseUrl을 빈 문자열로 설정하여 상대 경로(/dicomweb) 사용
 * - Vite proxy를 통해 /dicomweb → http://localhost:10201 로 프록시
 */
export const apiConfig = {
  /** API 서버 Base URL - 빈 문자열 (상대 경로 사용) */
  baseUrl: '',

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

  /** 한 번에 최대 업로드 가능한 파일 개수 */
  maxFileCount: 100,

  /** 한 번 요청의 최대 총 크기 (bytes) - 2GB */
  maxTotalSize: 2 * 1024 * 1024 * 1024,
} as const
