import { useQuery } from '@tanstack/react-query'
import { fetchSeriesById, fetchInstancesBySeriesId } from '@/lib/services'

/**
 * useInstances.ts
 *
 * TanStack Query를 사용한 Instance 목록 조회 Hook
 *
 * 목적:
 * - Series에 속한 Instance 목록 조회
 * - Series 정보 함께 조회
 * - 자동 캐싱 및 refetch
 *
 * 서비스 레이어:
 * - VITE_USE_MOCK=true: Mock 데이터
 * - VITE_USE_MOCK=false: Real API (DICOMWeb QIDO-RS)
 */

/**
 * useInstances Hook
 *
 * @param seriesId - Series ID
 * @returns TanStack Query 결과
 *   - data: { series, instances }
 *   - isLoading: boolean
 *   - error: Error | null
 *
 * 사용 예시:
 * const { data, isLoading } = useInstances('SER-001');
 * if (data) {
 *   console.log(data.series); // Series 정보
 *   console.log(data.instances); // Instance 목록
 * }
 */
export function useInstances(seriesId: string) {
  return useQuery({
    queryKey: ['instances', seriesId],
    queryFn: async () => {
      const [series, instances] = await Promise.all([
        fetchSeriesById(seriesId),
        fetchInstancesBySeriesId(seriesId),
      ])

      if (!series) {
        throw new Error('Series not found')
      }

      return { series, instances }
    },
    staleTime: 1000 * 60 * 5, // 5분 (전역 설정과 일관성 유지)
    enabled: !!seriesId, // seriesId가 있을 때만 실행
  })
}
