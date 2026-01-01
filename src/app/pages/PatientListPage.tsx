import { useState } from 'react'
import { Users } from 'lucide-react'
import PatientSearchForm from '@/features/patient/components/PatientSearchForm'
import PatientList from '@/features/patient/components/PatientList'
import PatientDetailModal from '@/features/patient/components/PatientDetailModal'
import { usePatients } from '@/features/patient/hooks/usePatients'
import type {
  Patient,
  PatientSearchParams,
} from '@/features/patient/types/patient'
import {
  PageHeader,
  ErrorMessage,
  EmptyState,
  TableSkeleton,
} from '@/components/common'

/**
 * PatientListPage.tsx
 *
 * 환자 목록 페이지
 *
 * 통합:
 * 1. PatientSearchForm (검색 폼)
 * 2. PatientList (목록 테이블 + 정렬 + 페이지네이션)
 * 3. PatientDetailModal (상세 모달)
 * 4. usePatients Hook (데이터 조회)
 */
export default function PatientListPage() {
  const [searchParams, setSearchParams] = useState<PatientSearchParams>({})
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

  // TanStack Query Hook
  const {
    data: patients,
    isLoading,
    error,
    refetch,
  } = usePatients(searchParams)

  const handleSearch = (params: PatientSearchParams) => {
    setSearchParams(params)
  }

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient)
  }

  const handleCloseModal = () => {
    setSelectedPatient(null)
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <PageHeader
        icon={Users}
        title="환자 목록"
        description="환자를 검색하고 Study를 조회하세요. 행을 더블클릭하면 상세 정보를 확인할 수 있습니다."
      />

      {/* 검색 폼 */}
      <PatientSearchForm onSearch={handleSearch} />

      {/* 로딩 상태 */}
      {isLoading && <TableSkeleton rows={5} columns={6} />}

      {/* 에러 상태 */}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}

      {/* 빈 상태 */}
      {!isLoading && !error && patients && patients.length === 0 && (
        <EmptyState
          icon={Users}
          title="검색 결과가 없습니다"
          description="다른 검색 조건으로 시도해보세요"
        />
      )}

      {/* 환자 목록 */}
      {!isLoading && !error && patients && patients.length > 0 && (
        <PatientList
          patients={patients}
          onPatientSelect={handlePatientSelect}
        />
      )}

      {/* 환자 상세 모달 */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
