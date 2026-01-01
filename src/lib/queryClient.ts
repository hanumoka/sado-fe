import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './errors'

/**
 * queryClient.ts
 *
 * TanStack Query 설정
 *
 * 주요 설정:
 * 1. staleTime: 5분 (5분간 데이터를 fresh로 간주)
 * 2. gcTime: 10분 (10분간 캐시 유지)
 * 3. refetchOnWindowFocus: false (포커스 시 자동 refetch 비활성화)
 * 4. retry: 조건부 재시도 (네트워크/서버 에러만)
 */

/**
 * 재시도 가능한 에러인지 확인
 * 4xx 클라이언트 에러는 재시도해도 의미 없음
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  // 최대 2회 재시도
  if (failureCount >= 2) return false

  // ApiError인 경우 상태 코드 확인
  if (isApiError(error)) {
    const status = error.status
    // 4xx 클라이언트 에러는 재시도하지 않음
    if (status && status >= 400 && status < 500) {
      return false
    }
    // 5xx 서버 에러, 네트워크 에러는 재시도
    return true
  }

  // 알 수 없는 에러는 재시도 (네트워크 에러일 수 있음)
  return true
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      gcTime: 1000 * 60 * 10, // 10분 (기존 cacheTime)
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
  },
})
