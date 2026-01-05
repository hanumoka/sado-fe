/**
 * errorHandler.ts
 *
 * 에러 처리 및 사용자 친화적 메시지 생성
 *
 * mini-pacs-poc 참고
 */
import {
  DicomError,
  ErrorCode,
  ErrorSeverity,
  isDicomError,
  isError,
  wrapUnknownError,
} from './DicomError'

// ==================== User-Friendly Error Messages ====================

/**
 * 에러 코드별 사용자 친화적 메시지 매핑
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 네트워크 에러
  [ErrorCode.NETWORK_ERROR]: '네트워크 연결에 문제가 발생했습니다. 인터넷 연결을 확인해주세요.',
  [ErrorCode.TIMEOUT]: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  [ErrorCode.CORS_ERROR]: '서버 접근 권한이 없습니다. 관리자에게 문의하세요.',

  // DICOM 데이터 에러
  [ErrorCode.INVALID_DICOM]: '유효하지 않은 DICOM 데이터입니다.',
  [ErrorCode.INVALID_RESPONSE]: '서버 응답이 올바르지 않습니다.',
  [ErrorCode.MISSING_REQUIRED_TAG]: '필수 DICOM 태그가 누락되었습니다.',

  // 이미지 로딩 에러
  [ErrorCode.LOAD_IMAGE_FAILED]: '이미지를 불러오는데 실패했습니다.',
  [ErrorCode.DECODE_IMAGE_FAILED]: '이미지 디코딩에 실패했습니다.',
  [ErrorCode.UNSUPPORTED_FORMAT]: '지원하지 않는 이미지 형식입니다.',

  // WADO 에러
  [ErrorCode.WADO_RS_ERROR]: 'WADO-RS 요청에 실패했습니다.',
  [ErrorCode.WADO_URI_ERROR]: 'WADO-URI 요청에 실패했습니다.',
  [ErrorCode.QIDO_RS_ERROR]: 'QIDO-RS 검색에 실패했습니다.',
  [ErrorCode.STOW_RS_ERROR]: 'DICOM 업로드에 실패했습니다.',

  // 서버 에러
  [ErrorCode.SERVER_ERROR]: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCode.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다.',
  [ErrorCode.UNAUTHORIZED]: '인증이 필요합니다. 로그인해주세요.',
  [ErrorCode.FORBIDDEN]: '접근 권한이 없습니다.',

  // 클라이언트 에러
  [ErrorCode.INVALID_PARAMETER]: '잘못된 요청 파라미터입니다.',
  [ErrorCode.MISSING_PARAMETER]: '필수 파라미터가 누락되었습니다.',

  // 캐시/리소스 에러
  [ErrorCode.CACHE_ERROR]: '캐시 처리 중 오류가 발생했습니다.',
  [ErrorCode.OUT_OF_MEMORY]: '메모리가 부족합니다. 일부 이미지를 닫아주세요.',

  // 알 수 없는 에러
  [ErrorCode.UNKNOWN_ERROR]: '알 수 없는 오류가 발생했습니다.',
}

/**
 * 에러 코드에 대한 사용자 친화적 메시지 반환
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN_ERROR]
}

/**
 * DicomError를 사용자 친화적 메시지로 변환
 */
export function getUserFriendlyMessage(error: DicomError): string {
  const baseMessage = getErrorMessage(error.code)

  // 추가 컨텍스트가 있으면 포함
  if (error.details && typeof error.details === 'object') {
    const details = error.details as Record<string, unknown>
    if (details.context) {
      return `${baseMessage} (${details.context})`
    }
  }

  return baseMessage
}

// ==================== Error Handlers ====================

/**
 * DICOM 에러 처리 및 사용자 메시지 반환
 */
export function handleDicomError(error: unknown, context?: string): string {
  // DicomError인 경우
  if (isDicomError(error)) {
    console.error(`[DicomError] ${error.toString()}`, {
      code: error.code,
      severity: error.severity,
      details: error.details,
      stack: error.stack,
    })
    return getUserFriendlyMessage(error)
  }

  // 일반 Error인 경우
  if (isError(error)) {
    console.error(`[Error] ${context || 'Unknown context'}:`, error)
    return getErrorMessage(ErrorCode.UNKNOWN_ERROR)
  }

  // 기타 경우
  console.error(`[Unknown Error] ${context || 'Unknown context'}:`, error)
  return getErrorMessage(ErrorCode.UNKNOWN_ERROR)
}

/**
 * 비동기 함수를 에러 핸들링으로 래핑
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      throw wrapUnknownError(error, context)
    }
  }) as T
}

/**
 * HTTP Response를 검증하고 에러 처리
 */
export async function handleHttpResponse(
  response: Response,
  context?: string
): Promise<Response> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`

    // 응답 본문에서 에러 메시지 추출 시도
    try {
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const body = await response.json()
        if (body.message) {
          errorMessage = body.message
        } else if (body.error) {
          errorMessage = body.error
        }
      }
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }

    // HTTP 상태 코드별 에러 생성
    let code: ErrorCode
    switch (response.status) {
      case 404:
        code = ErrorCode.NOT_FOUND
        break
      case 401:
        code = ErrorCode.UNAUTHORIZED
        break
      case 403:
        code = ErrorCode.FORBIDDEN
        break
      case 408:
        code = ErrorCode.TIMEOUT
        break
      default:
        code = response.status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.NETWORK_ERROR
    }

    throw new DicomError(code, errorMessage, {
      severity: ErrorSeverity.ERROR,
      statusCode: response.status,
      details: context ? { context } : undefined,
    })
  }

  return response
}

// ==================== Retry Logic ====================

/**
 * 재시도 옵션
 */
export interface RetryOptions {
  /** 최대 재시도 횟수 */
  maxRetries: number

  /** 재시도 간격 (ms) */
  retryDelay: number

  /** 재시도 가능한 에러 코드 */
  retryableErrors?: ErrorCode[]

  /** 백오프 전략 사용 여부 (지수 백오프) */
  useBackoff?: boolean
}

/**
 * 기본 재시도 옵션
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableErrors: [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT, ErrorCode.SERVER_ERROR],
  useBackoff: true,
}

/**
 * 재시도 로직으로 함수 래핑
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: DicomError | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const dicomError = isDicomError(error) ? error : wrapUnknownError(error)
      lastError = dicomError

      // 재시도 가능한 에러인지 확인
      const isRetryable = opts.retryableErrors?.includes(dicomError.code) ?? true

      // 마지막 시도이거나 재시도 불가능한 에러인 경우
      if (attempt === opts.maxRetries || !isRetryable) {
        throw dicomError
      }

      // 재시도 전 대기
      const delay = opts.useBackoff
        ? opts.retryDelay * Math.pow(2, attempt) // 지수 백오프
        : opts.retryDelay

      console.warn(
        `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed. Retrying in ${delay}ms...`,
        dicomError.code
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // 이 코드에 도달하지 않아야 하지만, 타입 안정성을 위해 추가
  throw lastError || new DicomError(ErrorCode.UNKNOWN_ERROR, 'Retry failed')
}

// ==================== Error Logging ====================

/**
 * 에러 로그 인터페이스
 */
export interface ErrorLog {
  timestamp: string
  code: ErrorCode
  severity: ErrorSeverity
  message: string
  details?: unknown
  stackTrace?: string
}

/**
 * 에러를 로그로 변환
 */
export function createErrorLog(error: DicomError): ErrorLog {
  return {
    timestamp: error.timestamp.toISOString(),
    code: error.code,
    severity: error.severity,
    message: error.message,
    details: error.details,
    stackTrace: error.stack,
  }
}

/**
 * 에러를 콘솔에 로깅 (개발 환경용)
 */
export function logError(error: DicomError, context?: string): void {
  const log = createErrorLog(error)
  const prefix = context ? `[${context}]` : '[Error]'

  switch (error.severity) {
    case ErrorSeverity.INFO:
      console.info(prefix, log)
      break
    case ErrorSeverity.WARNING:
      console.warn(prefix, log)
      break
    case ErrorSeverity.ERROR:
      console.error(prefix, log)
      break
    case ErrorSeverity.CRITICAL:
      console.error(`${prefix} [CRITICAL]`, log)
      break
  }
}
