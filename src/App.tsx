import { ErrorBoundary } from 'react-error-boundary'
import Router from '@/app/Router'
import { ErrorFallback } from '@/components/error'

/**
 * App.tsx
 *
 * 앱의 루트 컴포넌트
 * react-error-boundary로 전역 에러 처리
 */
function App() {
  const handleError = (error: Error, info: React.ErrorInfo) => {
    // 에러 로깅 (나중에 Sentry 등 연동 가능)
    console.error('App Error:', error)
    console.error('Component Stack:', info.componentStack)
  }

  const handleReset = () => {
    // 에러 리셋 시 상태 초기화 (필요시 추가 로직)
    window.location.href = '/'
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={handleReset}
    >
      <Router />
    </ErrorBoundary>
  )
}

export default App
