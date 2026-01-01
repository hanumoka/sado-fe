/**
 * api.ts
 *
 * API 관련 공통 타입 정의
 */

/**
 * 기본 API 응답 wrapper
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

/**
 * 페이지네이션 정보
 */
export interface Pagination {
  total: number // 전체 개수
  page: number // 현재 페이지 (1부터 시작)
  limit: number // 페이지당 개수
  totalPages: number // 전체 페이지 수
}

/**
 * 페이지네이션이 포함된 API 응답
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination
}

/**
 * API 에러 응답
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * 페이지네이션 요청 파라미터
 */
export interface PaginationParams {
  page?: number
  limit?: number
}
