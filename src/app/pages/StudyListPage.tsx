import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import StudySearchForm from '@/features/study/components/StudySearchForm';
import StudyList from '@/features/study/components/StudyList';
import { useStudies } from '@/features/study/hooks/useStudies';
import type { StudySearchParams } from '@/features/study/types/study';

/**
 * StudyListPage.tsx
 *
 * Study 목록 페이지
 *
 * 통합:
 * 1. StudySearchForm (검색 폼)
 * 2. StudyList (목록 테이블)
 * 3. useStudies Hook (데이터 조회)
 * 4. URL 쿼리 파라미터 지원 (환자 선택 시 자동 필터링)
 */
export default function StudyListPage() {
  const [urlSearchParams] = useSearchParams();
  const [searchParams, setSearchParams] = useState<StudySearchParams>({});

  // URL 쿼리 파라미터에서 patientId 가져오기
  // 예: /studies?patientId=PAT-001
  useEffect(() => {
    const patientId = urlSearchParams.get('patientId');
    if (patientId) {
      setSearchParams({ patientId });
    }
  }, [urlSearchParams]);

  // TanStack Query Hook
  const { data: studies, isLoading, error } = useStudies(searchParams);

  const handleSearch = (params: StudySearchParams) => {
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study 목록</h1>
          <p className="mt-1 text-sm text-gray-600">
            검사 기록을 검색하고 상세 정보를 확인하세요
          </p>
        </div>
      </div>

      {/* 검색 폼 */}
      <StudySearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Study 목록을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            오류가 발생했습니다: {(error as Error).message}
          </p>
        </div>
      )}

      {/* Study 목록 */}
      {!isLoading && !error && studies && (
        <StudyList studies={studies} />
      )}
    </div>
  );
}
