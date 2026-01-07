/**
 * DicomError.ts
 *
 * DICOM 뷰어 전용 커스텀 에러 클래스
 *
 * mini-pacs-poc 참고
 */

/**
 * 에러 코드 정의 (const object - TypeScript erasableSyntaxOnly 호환)
 */
export const ErrorCode = {
  // 네트워크 에러
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CORS_ERROR: 'CORS_ERROR',

  // DICOM 데이터 에러
  INVALID_DICOM: 'INVALID_DICOM',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  MISSING_REQUIRED_TAG: 'MISSING_REQUIRED_TAG',

  // 이미지 로딩 에러
  LOAD_IMAGE_FAILED: 'LOAD_IMAGE_FAILED',
  DECODE_IMAGE_FAILED: 'DECODE_IMAGE_FAILED',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',

  // WADO 에러
  WADO_RS_ERROR: 'WADO_RS_ERROR',
  WADO_URI_ERROR: 'WADO_URI_ERROR',
  QIDO_RS_ERROR: 'QIDO_RS_ERROR',
  STOW_RS_ERROR: 'STOW_RS_ERROR',

  // 서버 에러
  SERVER_ERROR: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // 클라이언트 에러
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',

  // 캐시/리소스 에러
  CACHE_ERROR: 'CACHE_ERROR',
  OUT_OF_MEMORY: 'OUT_OF_MEMORY',

  // 알 수 없는 에러
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode]

/**
 * 에러 심각도 (const object - TypeScript erasableSyntaxOnly 호환)
 */
export const ErrorSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL',
} as const

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity]

/**
 * DicomError 옵션
 */
export interface DicomErrorOptions {
  /** 에러 심각도 */
  severity?: ErrorSeverity
  /** HTTP 상태 코드 */
  statusCode?: number
  /** 추가 상세 정보 */
  details?: unknown
  /** 원본 에러 */
  cause?: Error
}

/**
 * DICOM 뷰어 전용 커스텀 에러 클래스
 */
export class DicomError extends Error {
  /** 에러 코드 */
  code: ErrorCode

  /** 에러 심각도 */
  severity: ErrorSeverity

  /** HTTP 상태 코드 (있는 경우) */
  statusCode?: number

  /** 추가 상세 정보 */
  details?: unknown

  /** 에러 발생 시간 */
  timestamp: Date

  /** 원본 에러 */
  cause?: Error

  constructor(code: ErrorCode, message: string, options?: DicomErrorOptions) {
    super(message)

    this.name = 'DicomError'
    this.code = code
    this.severity = options?.severity ?? ErrorSeverity.ERROR
    this.statusCode = options?.statusCode
    this.details = options?.details
    this.timestamp = new Date()
    this.cause = options?.cause

    // Error 상속 시 프로토타입 체인 유지
    Object.setPrototypeOf(this, DicomError.prototype)
  }

  /**
   * 에러를 문자열로 변환
   */
  toString(): string {
    const parts = [
      `[${this.severity}]`,
      `${this.code}:`,
      this.message,
    ]

    if (this.statusCode) {
      parts.push(`(HTTP ${this.statusCode})`)
    }

    return parts.join(' ')
  }

  /**
   * JSON 형식으로 변환
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }
}

// ==================== Type Guards ====================

/**
 * DicomError 타입 가드
 */
export function isDicomError(error: unknown): error is DicomError {
  return error instanceof DicomError
}

/**
 * Error 타입 가드
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error
}

// ==================== Error Factory Functions ====================

/**
 * 네트워크 에러 생성
 */
export function createNetworkError(message: string, details?: unknown): DicomError {
  return new DicomError(ErrorCode.NETWORK_ERROR, message, {
    severity: ErrorSeverity.ERROR,
    details,
  })
}

/**
 * 타임아웃 에러 생성
 */
export function createTimeoutError(message: string, details?: unknown): DicomError {
  return new DicomError(ErrorCode.TIMEOUT, message, {
    severity: ErrorSeverity.WARNING,
    details,
  })
}

/**
 * CORS 에러 생성
 */
export function createCorsError(message: string, details?: unknown): DicomError {
  return new DicomError(ErrorCode.CORS_ERROR, message, {
    severity: ErrorSeverity.ERROR,
    details,
  })
}

/**
 * 이미지 로딩 에러 생성
 */
export function createImageLoadError(
  message: string,
  imageId?: string,
  cause?: Error
): DicomError {
  return new DicomError(ErrorCode.LOAD_IMAGE_FAILED, message, {
    severity: ErrorSeverity.ERROR,
    details: { imageId },
    cause,
  })
}

/**
 * 유효하지 않은 DICOM 에러 생성
 */
export function createInvalidDicomError(message: string, details?: unknown): DicomError {
  return new DicomError(ErrorCode.INVALID_DICOM, message, {
    severity: ErrorSeverity.ERROR,
    details,
  })
}

/**
 * 서버 에러 생성
 */
export function createServerError(
  message: string,
  statusCode: number,
  details?: unknown
): DicomError {
  let code: ErrorCode

  switch (statusCode) {
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
      code = statusCode >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.NETWORK_ERROR
  }

  return new DicomError(code, message, {
    severity: ErrorSeverity.ERROR,
    statusCode,
    details,
  })
}

/**
 * HTTP Response에서 에러 생성
 */
export async function createErrorFromResponse(
  response: Response,
  context?: string
): Promise<DicomError> {
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

  return createServerError(errorMessage, response.status, context ? { context } : undefined)
}

/**
 * 알 수 없는 에러를 DicomError로 래핑
 */
export function wrapUnknownError(error: unknown, context?: string): DicomError {
  if (isDicomError(error)) {
    return error
  }

  if (isError(error)) {
    return new DicomError(ErrorCode.UNKNOWN_ERROR, error.message, {
      severity: ErrorSeverity.ERROR,
      details: context ? { context } : undefined,
      cause: error,
    })
  }

  const message = context
    ? `${context}: ${String(error)}`
    : `알 수 없는 오류: ${String(error)}`

  return new DicomError(ErrorCode.UNKNOWN_ERROR, message, {
    severity: ErrorSeverity.ERROR,
    details: { originalError: error },
  })
}
