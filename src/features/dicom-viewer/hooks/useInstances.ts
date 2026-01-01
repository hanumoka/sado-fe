import { useQuery } from '@tanstack/react-query';
import { MOCK_INSTANCES, MOCK_SERIES } from '@/lib/mockData';
import type { Instance, ViewerSeries } from '../types/viewer';

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
 * 현재: Mock 데이터 사용
 * Week 6+: Real API로 전환 예정
 */

/**
 * Series 정보 조회 함수
 */
const fetchSeries = async (seriesId: string): Promise<ViewerSeries | null> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const series = MOCK_SERIES.find((s) => s.id === seriesId);
  if (!series) return null;

  return {
    id: series.id,
    seriesInstanceUid: series.seriesInstanceUid,
    seriesNumber: series.seriesNumber,
    modality: series.modality,
    seriesDescription: series.seriesDescription,
    instancesCount: series.instancesCount,
  };
};

/**
 * Instance 목록 조회 함수
 *
 * @param seriesId - Series ID
 * @returns Promise<Instance[]>
 *
 * Week 1-5: Mock 데이터 필터링
 * Week 6+: api.get('/wado-rs/.../instances')
 */
const fetchInstances = async (seriesId: string): Promise<Instance[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const instances = MOCK_INSTANCES.filter((i) => i.seriesId === seriesId);

  // Mock Instance에 추가 정보 (실제로는 DICOM 파일에서 파싱)
  return instances.map((instance, index) => ({
    id: instance.id,
    sopInstanceUid: instance.sopInstanceUid,
    seriesId: instance.seriesId,
    studyId: 'STU-001', // Mock: 실제로는 Series에서 가져옴
    instanceNumber: instance.instanceNumber,
    storageUri: instance.storageUri,
    rows: 512,
    columns: 512,
    pixelSpacing: [0.5, 0.5] as [number, number],
  }));
};

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
        fetchSeries(seriesId),
        fetchInstances(seriesId),
      ]);

      if (!series) {
        throw new Error('Series not found');
      }

      return { series, instances };
    },
    staleTime: 1000 * 60 * 10, // 10분
    enabled: !!seriesId, // seriesId가 있을 때만 실행
  });
}
