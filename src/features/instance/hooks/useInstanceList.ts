import { useQuery } from '@tanstack/react-query'
import { fetchInstances } from '@/lib/services'
import type { InstanceSearchParams, InstancePageResponse } from '../types/instance'

/**
 * useInstanceList.ts
 *
 * TanStack Query를 사용한 Instance 목록 조회 Hook (서버사이드 페이지네이션)
 *
 * 목적:
 * - Instance 데이터 fetching 로직 재사용
 * - 자동 캐싱 및 refetch
 * - 로딩/에러 상태 관리
 * - 서버사이드 페이지네이션 지원
 *
 * 서비스 레이어:
 * - Real API: /api/instances?page=0&size=10
 */

/**
 * useInstanceList Hook
 *
 * @param searchParams - 검색 파라미터 (선택적)
 *   - sopInstanceUid: SOP Instance UID 부분 일치 검색
 *   - storageTier: HOT, WARM, COLD
 *   - page: 페이지 번호 (0부터 시작)
 *   - size: 페이지 크기 (기본값: 10)
 * @returns TanStack Query 결과
 *   - data: InstancePageResponse (Instance 페이지 응답)
 *   - isLoading: boolean (로딩 중 여부)
 *   - error: Error | null (에러 객체)
 *   - refetch: () => void (수동 refetch 함수)
 *
 * 사용 예시:
 * const { data, isLoading, error } = useInstanceList({ storageTier: 'HOT', page: 0, size: 10 });
 * // data.content: Instance[]
 * // data.totalPages: 전체 페이지 수
 * // data.totalElements: 전체 아이템 수
 */
export function useInstanceList(searchParams?: InstanceSearchParams) {
  return useQuery<InstancePageResponse>({
    // queryKey: 캐시 키 (searchParams 변경 시 자동 refetch)
    queryKey: ['instances', searchParams],

    // queryFn: 데이터 fetch 함수
    queryFn: () => fetchInstances(searchParams),

    // staleTime: 5분 (5분간 데이터를 fresh로 간주하여 재요청하지 않음)
    staleTime: 1000 * 60 * 5,
  })
}
