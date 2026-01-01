import { AlertCircle, RefreshCw } from 'lucide-react'
import { getErrorMessage } from '@/lib/errorMessages'

/**
 * ErrorMessage Props
 */
interface ErrorMessageProps {
  /** 에러 객체 또는 메시지 */
  error: unknown
  /** 재시도 버튼 클릭 핸들러 (선택적) */
  onRetry?: () => void
  /** 제목 (기본값: "오류가 발생했습니다") */
  title?: string
  /** 추가 클래스명 */
  className?: string
}

/**
 * ErrorMessage
 *
 * 에러 상태를 표시하는 컴포넌트
 *
 * @example
 * // 기본 사용
 * <ErrorMessage error={error} />
 *
 * // 재시도 버튼 포함
 * <ErrorMessage error={error} onRetry={() => refetch()} />
 *
 * // 커스텀 제목
 * <ErrorMessage
 *   error={error}
 *   title="데이터를 불러올 수 없습니다"
 *   onRetry={handleRetry}
 * />
 */
export default function ErrorMessage({
  error,
  onRetry,
  title = '오류가 발생했습니다',
  className = '',
}: ErrorMessageProps) {
  const message = getErrorMessage(error)

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800">{title}</h3>
          <p className="mt-1 text-red-700">{message}</p>

          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              다시 시도
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
