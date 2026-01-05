/**
 * Error Handling Module Exports
 *
 * 에러 처리 관련 모든 유틸리티 중앙 export
 *
 * mini-pacs-poc 참고
 */

// Error classes and types
export {
  DicomError,
  ErrorCode,
  ErrorSeverity,
  isDicomError,
  isError,
  createNetworkError,
  createTimeoutError,
  createCorsError,
  createImageLoadError,
  createInvalidDicomError,
  createServerError,
  createErrorFromResponse,
  wrapUnknownError,
  type DicomErrorOptions,
} from './DicomError'

// Error handlers
export {
  getErrorMessage,
  getUserFriendlyMessage,
  handleDicomError,
  withErrorHandling,
  handleHttpResponse,
  withRetry,
  createErrorLog,
  logError,
  type RetryOptions,
  type ErrorLog,
} from './errorHandler'
