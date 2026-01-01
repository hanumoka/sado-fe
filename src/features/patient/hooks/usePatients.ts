import { useQuery } from '@tanstack/react-query'
import { fetchPatients } from '@/lib/services'
import type { PatientSearchParams } from '../types/patient'

/**
 * usePatients.ts
 *
 * TanStack Query를 사용한 환자 목록 조회 Hook
 *
 * 목적:
 * - 환자 데이터 fetching 로직 재사용
 * - 자동 캐싱 및 refetch
 * - 로딩/에러 상태 관리
 *
 * 서비스 레이어:
 * - VITE_USE_MOCK=true: Mock 데이터
 * - VITE_USE_MOCK=false: Real API
 */

/**
 * usePatients Hook
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns TanStack Query 결과
 *   - data: Patient[] (환자 목록)
 *   - isLoading: boolean (로딩 중 여부)
 *   - error: Error | null (에러 객체)
 *   - refetch: () => void (수동 refetch 함수)
 *
 * 사용 예시:
 * const { data: patients, isLoading, error } = usePatients({ name: 'John' });
 */
export function usePatients(searchParams?: PatientSearchParams) {
  return useQuery({
    // queryKey: 캐시 키 (searchParams 변경 시 자동 refetch)
    queryKey: ['patients', searchParams],

    // queryFn: 데이터 fetch 함수
    queryFn: () => fetchPatients(searchParams),

    // staleTime: 5분 (queryClient 기본값 사용)
    // 5분간 데이터를 fresh로 간주하여 재요청하지 않음
    staleTime: 1000 * 60 * 5,
  })
}
