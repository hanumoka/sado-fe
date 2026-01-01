import { QueryClient } from '@tanstack/react-query';

/**
 * queryClient.ts
 *
 * TanStack Query 설정
 *
 * 주요 설정:
 * 1. staleTime: 5분 (5분간 데이터를 fresh로 간주)
 * 2. gcTime: 10분 (10분간 캐시 유지)
 * 3. refetchOnWindowFocus: false (포커스 시 자동 refetch 비활성화)
 * 4. retry: 1 (실패 시 1번만 재시도)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5분
      gcTime: 1000 * 60 * 10,          // 10분 (기존 cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
