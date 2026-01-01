import { Loader2 } from 'lucide-react'

/**
 * LoadingSpinner Props
 */
interface LoadingSpinnerProps {
  /** 스피너 크기 */
  size?: 'sm' | 'md' | 'lg'
  /** 로딩 메시지 (선택적) */
  message?: string
  /** 전체 화면 중앙 정렬 여부 */
  fullScreen?: boolean
  /** 추가 클래스명 */
  className?: string
}

/**
 * 스피너 크기 매핑
 */
const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

/**
 * LoadingSpinner
 *
 * 로딩 상태를 표시하는 스피너 컴포넌트
 *
 * @example
 * // 기본 사용
 * <LoadingSpinner />
 *
 * // 메시지와 함께
 * <LoadingSpinner message="환자 목록을 불러오는 중..." />
 *
 * // 전체 화면 중앙
 * <LoadingSpinner fullScreen message="로딩 중..." />
 */
export default function LoadingSpinner({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex flex-col items-center justify-center ${className}`}
    >
      <Loader2
        className={`${sizeClasses[size]} text-blue-600 animate-spin`}
        aria-hidden="true"
      />
      {message && <p className="mt-4 text-gray-600 text-sm">{message}</p>}
      {!message && <span className="sr-only">로딩 중...</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {spinner}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-12 text-center">{spinner}</div>
  )
}
