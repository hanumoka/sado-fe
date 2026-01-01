/**
 * errors.ts
 *
 * 커스텀 에러 클래스 및 에러 코드 정의
 */

/**
 * 에러 코드 상수
 */
export const ErrorCodes = {
  // 네트워크 에러
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',

  // 인증/인가 에러
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // 클라이언트 에러
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // 서버 에러
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 알 수 없는 에러
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * API 에러 클래스
 *
 * HTTP 에러를 구조화된 형태로 처리
 */
export class ApiError extends Error {
  public readonly code: ErrorCode
  public readonly status?: number
  public readonly details?: Record<string, unknown>

  constructor(
    code: ErrorCode,
    message: string,
    status?: number,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details

    // Error 클래스 상속 시 prototype chain 유지
    Object.setPrototypeOf(this, ApiError.prototype)
  }

  /**
   * HTTP 상태 코드로부터 ApiError 생성
   */
  static fromHttpStatus(status: number, statusText?: string): ApiError {
    switch (status) {
      case 400:
        return new ApiError(ErrorCodes.BAD_REQUEST, '잘못된 요청입니다', status)
      case 401:
        return new ApiError(
          ErrorCodes.UNAUTHORIZED,
          '인증이 필요합니다. 다시 로그인해주세요',
          status
        )
      case 403:
        return new ApiError(
          ErrorCodes.FORBIDDEN,
          '접근 권한이 없습니다',
          status
        )
      case 404:
        return new ApiError(
          ErrorCodes.NOT_FOUND,
          '요청한 리소스를 찾을 수 없습니다',
          status
        )
      case 408:
        return new ApiError(
          ErrorCodes.REQUEST_TIMEOUT,
          '요청 시간이 초과되었습니다',
          status
        )
      case 409:
        return new ApiError(
          ErrorCodes.CONFLICT,
          '리소스 충돌이 발생했습니다',
          status
        )
      case 422:
        return new ApiError(
          ErrorCodes.VALIDATION_ERROR,
          '입력값이 올바르지 않습니다',
          status
        )
      case 429:
        return new ApiError(
          ErrorCodes.TOO_MANY_REQUESTS,
          '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
          status
        )
      case 500:
        return new ApiError(
          ErrorCodes.SERVER_ERROR,
          '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요',
          status
        )
      case 502:
      case 503:
      case 504:
        return new ApiError(
          ErrorCodes.SERVICE_UNAVAILABLE,
          '서비스를 일시적으로 사용할 수 없습니다',
          status
        )
      default:
        return new ApiError(
          ErrorCodes.UNKNOWN,
          statusText || `HTTP 오류 (${status})`,
          status
        )
    }
  }

  /**
   * 네트워크 에러 생성
   */
  static networkError(originalError?: Error): ApiError {
    return new ApiError(
      ErrorCodes.NETWORK_ERROR,
      '네트워크 연결을 확인해주세요',
      undefined,
      { originalError: originalError?.message }
    )
  }

  /**
   * 타임아웃 에러 생성
   */
  static timeoutError(): ApiError {
    return new ApiError(
      ErrorCodes.TIMEOUT,
      '요청 시간이 초과되었습니다. 다시 시도해주세요'
    )
  }
}

/**
 * ApiError 타입 가드
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
