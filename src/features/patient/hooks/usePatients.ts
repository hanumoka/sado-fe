import { useQuery } from '@tanstack/react-query';
import { MOCK_PATIENTS } from '@/lib/mockData';
import type {Patient, PatientSearchParams} from '../types/patient';

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
 * 현재: Mock 데이터 사용
 * Week 6+: Real API로 전환 예정
 */

/**
 * 환자 목록 조회 함수
 *
 * @param searchParams - 검색 파라미터 (선택적)
 * @returns Promise<Patient[]>
 *
 * Week 1-5: Mock 데이터 필터링
 * Week 6+: api.get<Patient[]>('/api/patients', { params: searchParams })
 */
const fetchPatients = async (
  searchParams?: PatientSearchParams
): Promise<Patient[]> => {
  // Mock 데이터 복사 (원본 훼손 방지)
  let patients = [...MOCK_PATIENTS];

  // 이름 필터링
  if (searchParams?.name) {
    const searchName = searchParams.name.toLowerCase();
    patients = patients.filter((p) =>
      p.name.toLowerCase().includes(searchName)
    );
  }

  // 성별 필터링
  if (searchParams?.gender && searchParams.gender !== 'ALL') {
    patients = patients.filter((p) => p.gender === searchParams.gender);
  }

  // API 지연 시뮬레이션 (500ms)
  // 실제 네트워크 환경을 시뮬레이션하여 로딩 상태 테스트
  await new Promise((resolve) => setTimeout(resolve, 500));

  return patients;
};

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
  });
}
