import { useState } from 'react';
import { Users } from 'lucide-react';
import PatientSearchForm from '@/features/patient/components/PatientSearchForm';
import PatientList from '@/features/patient/components/PatientList';
import { usePatients } from '@/features/patient/hooks/usePatients';
import type { PatientSearchParams } from '@/features/patient/types/patient';

/**
 * PatientListPage.tsx
 *
 * 환자 목록 페이지
 *
 * 통합:
 * 1. PatientSearchForm (검색 폼)
 * 2. PatientList (목록 테이블)
 * 3. usePatients Hook (데이터 조회)
 */
export default function PatientListPage() {
  const [searchParams, setSearchParams] = useState<PatientSearchParams>({});

  // TanStack Query Hook
  const { data: patients, isLoading, error } = usePatients(searchParams);

  const handleSearch = (params: PatientSearchParams) => {
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">환자 목록</h1>
          <p className="mt-1 text-sm text-gray-600">
            환자를 검색하고 Study를 조회하세요
          </p>
        </div>
      </div>

      {/* 검색 폼 */}
      <PatientSearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">환자 목록을 불러오는 중...</p>
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

      {/* 환자 목록 */}
      {!isLoading && !error && patients && (
        <PatientList patients={patients} />
      )}
    </div>
  );
}
