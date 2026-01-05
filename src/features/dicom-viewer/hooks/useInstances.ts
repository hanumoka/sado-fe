import { useQuery } from '@tanstack/react-query'
import { fetchInstancesBySeriesId } from '@/lib/services'
import type { ViewerSeries } from '@/features/dicom-viewer/types/viewer'

/**
 * useInstances.ts
 *
 * TanStack Query를 사용한 Instance 목록 조회 Hook
 *
 * 목적:
 * - Series에 속한 Instance 목록 조회
 * - 자동 캐싱 및 refetch
 *
 * 서비스 레이어:
 * - VITE_USE_MOCK=false: Real API (DICOMWeb QIDO-RS)
 */

/**
 * useInstances Hook
 *
 * @param studyInstanceUid - Study Instance UID
 * @param seriesInstanceUid - Series Instance UID
 * @param seriesMetadata - Series 메타데이터 (선택사항)
 * @returns TanStack Query 결과
 *   - data: { series, instances }
 *   - isLoading: boolean
 *   - error: Error | null
 *
 * 사용 예시:
 * const { data, isLoading } = useInstances(studyInstanceUid, seriesInstanceUid);
 * if (data) {
 *   console.log(data.instances); // Instance 목록
 * }
 */
export function useInstances(
  studyInstanceUid: string,
  seriesInstanceUid: string,
  seriesMetadata?: Partial<ViewerSeries>
) {
  return useQuery({
    queryKey: ['instances', studyInstanceUid, seriesInstanceUid],
    queryFn: async () => {
      // Instance 목록 조회 (DICOMWeb QIDO-RS)
      const instances = await fetchInstancesBySeriesId(
        studyInstanceUid,
        seriesInstanceUid
      )

      // Series 메타데이터 구성 (전달받은 데이터 사용 또는 기본값)
      const series: ViewerSeries = {
        id: seriesMetadata?.id || '',
        seriesInstanceUid,
        studyId: seriesMetadata?.studyId || '', // 내부 Study ID
        studyInstanceUid, // DICOM Study UID
        seriesNumber: seriesMetadata?.seriesNumber || 0,
        modality: seriesMetadata?.modality || 'UN',
        seriesDescription: seriesMetadata?.seriesDescription || '',
        instancesCount: instances.length,
      }

      return { series, instances }
    },
    staleTime: 1000 * 60 * 5, // 5분 (전역 설정과 일관성 유지)
    enabled: !!studyInstanceUid && !!seriesInstanceUid, // 둘 다 있을 때만 실행
  })
}
