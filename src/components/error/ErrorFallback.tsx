import type { FallbackProps } from 'react-error-boundary'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * ErrorFallback
 *
 * react-error-boundary의 FallbackComponent로 사용
 * 에러 발생 시 표시되는 UI
 */
export default function ErrorFallback({
  error,
  resetErrorBoundary,
}: FallbackProps) {
  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-8">
        {/* 에러 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="bg-red-100 p-4 rounded-full">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
        </div>

        {/* 에러 메시지 */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          문제가 발생했습니다
        </h1>
        <p className="text-center text-gray-600 mb-6">
          예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </p>

        {/* 개발 모드에서만 에러 상세 표시 */}
        {isDev && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-mono text-red-800 break-all">
              {error.message}
            </p>
            {error.stack && (
              <details className="mt-2">
                <summary className="text-xs text-red-600 cursor-pointer">
                  스택 트레이스 보기
                </summary>
                <pre className="mt-2 text-xs text-red-700 overflow-auto max-h-40">
                  {error.stack}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            다시 시도
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <Home className="h-5 w-5" />
            홈으로 이동
          </button>
        </div>
      </div>
    </div>
  )
}
