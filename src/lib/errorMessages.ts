/**
 * errorMessages.ts
 *
 * 에러 메시지 헬퍼 함수
 */

import { ErrorCodes, isApiError, type ErrorCode } from './apiErrors'

/**
 * 에러 코드별 사용자 친화적 메시지 매핑
 */
const errorMessages: Record<ErrorCode, string> = {
  [ErrorCodes.NETWORK_ERROR]: '네트워크 연결을 확인해주세요',
  [ErrorCodes.TIMEOUT]: '요청 시간이 초과되었습니다',
  [ErrorCodes.UNAUTHORIZED]: '로그인이 필요합니다',
  [ErrorCodes.FORBIDDEN]: '접근 권한이 없습니다',
  [ErrorCodes.TOKEN_EXPIRED]: '세션이 만료되었습니다. 다시 로그인해주세요',
  [ErrorCodes.BAD_REQUEST]: '잘못된 요청입니다',
  [ErrorCodes.NOT_FOUND]: '요청한 정보를 찾을 수 없습니다',
  [ErrorCodes.VALIDATION_ERROR]: '입력값을 확인해주세요',
  [ErrorCodes.CONFLICT]: '중복된 데이터가 존재합니다',
  [ErrorCodes.REQUEST_TIMEOUT]: '요청 시간이 초과되었습니다',
  [ErrorCodes.TOO_MANY_REQUESTS]:
    '요청이 너무 많습니다. 잠시 후 다시 시도해주세요',
  [ErrorCodes.SERVER_ERROR]: '서버 오류가 발생했습니다',
  [ErrorCodes.SERVICE_UNAVAILABLE]: '서비스를 일시적으로 사용할 수 없습니다',
  [ErrorCodes.UNKNOWN]: '알 수 없는 오류가 발생했습니다',
}

/**
 * 에러로부터 사용자 친화적 메시지 추출
 *
 * @param error - 에러 객체
 * @returns 사용자에게 표시할 메시지
 *
 * @example
 * try {
 *   await api.get('/some-endpoint');
 * } catch (error) {
 *   const message = getErrorMessage(error);
 *   toast.error(message);
 * }
 */
export function getErrorMessage(error: unknown): string {
  // ApiError인 경우
  if (isApiError(error)) {
    return (
      error.message ||
      errorMessages[error.code] ||
      errorMessages[ErrorCodes.UNKNOWN]
    )
  }

  // 일반 Error인 경우
  if (error instanceof Error) {
    return error.message
  }

  // 문자열인 경우
  if (typeof error === 'string') {
    return error
  }

  // 그 외
  return errorMessages[ErrorCodes.UNKNOWN]
}

/**
 * 에러 코드로부터 메시지 조회
 *
 * @param code - 에러 코드
 * @returns 메시지
 */
export function getMessageByCode(code: ErrorCode): string {
  return errorMessages[code] || errorMessages[ErrorCodes.UNKNOWN]
}

/**
 * 에러가 재시도 가능한지 확인
 *
 * @param error - 에러 객체
 * @returns 재시도 가능 여부
 */
export function isRetryableError(error: unknown): boolean {
  if (!isApiError(error)) return false

  const retryableCodes: ErrorCode[] = [
    ErrorCodes.NETWORK_ERROR,
    ErrorCodes.TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
  ]

  return retryableCodes.includes(error.code)
}

/**
 * 에러가 인증 관련인지 확인
 *
 * @param error - 에러 객체
 * @returns 인증 관련 여부
 */
export function isAuthError(error: unknown): boolean {
  if (!isApiError(error)) return false

  const authCodes: ErrorCode[] = [
    ErrorCodes.UNAUTHORIZED,
    ErrorCodes.FORBIDDEN,
    ErrorCodes.TOKEN_EXPIRED,
  ]

  return authCodes.includes(error.code)
}
