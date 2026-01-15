/**
 * config.ts
 *
 * 환경 변수 및 설정 중앙 관리
 *
 * 모든 환경 변수 접근은 이 파일을 통해 수행
 *
 * ## 환경별 API 라우팅
 * - 개발: Vite 프록시가 /dicomweb, /api 요청을 백엔드로 전달
 * - 프로덕션: Nginx 등 리버스 프록시 필요
 *
 * ## 환경 변수 (vite.config.ts에서 사용)
 * - VITE_API_TARGET: 백엔드 서버 주소 (기본값: http://localhost:10201)
 */

/**
 * API 설정
 *
 * 상대 경로(/dicomweb, /api)를 사용하여 CORS 문제 방지
 * - 개발: Vite proxy가 VITE_API_TARGET으로 전달
 * - 프로덕션: Nginx 등 리버스 프록시가 백엔드로 전달
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
