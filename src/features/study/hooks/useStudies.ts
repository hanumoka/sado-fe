import { useQuery } from '@tanstack/react-query'
import { fetchStudies } from '@/lib/services'
import type { StudySearchParams } from '../types/study'

/**
 * useStudies.ts
 *
 * TanStack Query를 사용한 Study 목록 조회 Hook
 *
 * 목적:
 * - Study 데이터 fetching 로직 재사용
 * - 자동 캐싱 및 refetch
 * - 로딩/에러 상태 관리
 *
 * 서비스 레이어:
 * - VITE_USE_MOCK=true: Mock 데이터
 * - VITE_USE_MOCK=false: Real API
 */

/**
 * useStudies Hook
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns TanStack Query 결과
 *   - data: Study[] (Study 목록)
 *   - isLoading: boolean (로딩 중 여부)
 *   - error: Error | null (에러 객체)
 *   - refetch: () => void (수동 refetch 함수)
 *
 * 사용 예시:
 * const { data: studies, isLoading, error } = useStudies({ patientId: 'PAT-001' });
 */
export function useStudies(searchParams?: StudySearchParams) {
  return useQuery({
    // queryKey: 캐시 키 (searchParams 변경 시 자동 refetch)
    queryKey: ['studies', searchParams],

    // queryFn: 데이터 fetch 함수
    queryFn: () => fetchStudies(searchParams),

    // staleTime: 5분 (queryClient 기본값 사용)
    // 5분간 데이터를 fresh로 간주하여 재요청하지 않음
    staleTime: 1000 * 60 * 5,
  })
}
