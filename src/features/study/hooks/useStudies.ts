import { useQuery } from '@tanstack/react-query';
import { MOCK_STUDIES } from '@/lib/mockData';
import type { Study, StudySearchParams } from '../types/study';

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
 * 현재: Mock 데이터 사용
 * Week 6+: Real API로 전환 예정
 */

/**
 * Study 목록 조회 함수
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns Promise<Study[]>
 *
 * Week 1-5: Mock 데이터 필터링
 * Week 6+: api.get<Study[]>('/qido-rs/studies', { params: searchParams })
 */
const fetchStudies = async (
  searchParams?: StudySearchParams
): Promise<Study[]> => {
  // Mock 데이터 복사 (원본 훼손 방지)
  let studies = [...MOCK_STUDIES];

  // 환자 ID 필터링
  if (searchParams?.patientId) {
    studies = studies.filter((s) => s.patientId === searchParams.patientId);
  }

  // 환자 이름 필터링
  if (searchParams?.patientName) {
    const searchName = searchParams.patientName.toLowerCase();
    studies = studies.filter((s) =>
      s.patientName.toLowerCase().includes(searchName)
    );
  }

  // 검사 날짜 필터링
  if (searchParams?.studyDate) {
    studies = studies.filter((s) => s.studyDate === searchParams.studyDate);
  }

  // Modality 필터링
  if (searchParams?.modality && searchParams.modality !== 'ALL') {
    studies = studies.filter((s) => s.modality === searchParams.modality);
  }

  // API 지연 시뮬레이션 (500ms)
  // 실제 네트워크 환경을 시뮬레이션하여 로딩 상태 테스트
  await new Promise((resolve) => setTimeout(resolve, 500));

  return studies;
};

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
  });
}
